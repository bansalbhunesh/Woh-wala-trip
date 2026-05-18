import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { signWorkerRequest } from '@/lib/worker-auth';

// Shapes returned by RPCs that produce Json arrays
interface SimilarPhotoRow {
  photo_id: string;
  storage_path: string;
  thumbnail_path?: string;
  similarity?: number;
  [key: string]: unknown;
}
interface NostalgiaRow {
  photo_id: string;
  storage_path: string;
  thumbnail_path?: string;
  taken_at?: string;
  [key: string]: unknown;
}
interface PhotoRow {
  id: string;
  trip_id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string | null;
  signed_url?: string | null;
  thumb_signed_url?: string | null;
  url_expires_at?: string | null;
  file_size?: number | null;
  embedding_status?: string | null;
  [key: string]: unknown;
}
interface TripTierRow {
  tier: string;
  storage_used_bytes: number;
}

// TYPE-02/03: local type overrides for tables / columns added after last Supabase codegen.
// Remove once supabase gen types is re-run (TYPE-01).
type BackgroundJobInsert = {
  trip_id: string;
  job_type: string;
  status: string;
  payload?: Record<string, unknown>;
};

// Typed RPC client for RPCs added post-codegen (find_similar_photos, get_nostalgia_moments, etc.)
type SupabaseWithRpc = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export const photosRouter = router({
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        fileName: z.string(),
        contentType: z.string().regex(/^image\/(jpeg|png|heic|webp)$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this trip',
        });
      }

      const { data: tripRaw } = await ctx.supabase
        .from('trips')
        .select('tier, storage_used_bytes')
        .eq('id', input.tripId)
        .single();
      const trip = tripRaw as TripTierRow | null;

      if (trip?.tier === 'free') {
        // Count real rows — cached total_photos column can lag on concurrent uploads
        const { count: realPhotoCount } = await ctx.supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', input.tripId);

        if ((realPhotoCount || 0) >= 50) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Free tier limit: 50 photos. Upgrade to add unlimited photos.',
          });
        }

        // 500 MB storage soft limit for free trips
        const storageUsed = trip.storage_used_bytes ?? 0;
        if (storageUsed >= 500 * 1024 * 1024) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Free tier storage limit reached (500 MB). Upgrade to continue uploading.',
          });
        }
      }

      // Derive extension from validated contentType, not from user-supplied filename
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/heic': 'heic',
        'image/webp': 'webp',
      };
      const ext = extMap[input.contentType] ?? 'jpg';
      const storagePath = `${input.tripId}/${ctx.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      // Use service role for storage — RLS on storage.objects blocks the user session client
      const adminSupabase = createSupabaseServiceClient();
      const { data, error } = await adminSupabase.storage
        .from('trip-photos')
        .createSignedUploadUrl(storagePath);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return {
        uploadUrl: data.signedUrl,
        storagePath,
        token: data.token,
      };
    }),

  confirmUpload: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        storagePath: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        takenAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Security: validate storage_path matches expected prefix to prevent
      // cross-trip photo injection via crafted paths through the service client.
      const expectedPrefix = `${input.tripId}/${ctx.user.id}/`;
      if (!input.storagePath.startsWith(expectedPrefix)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid storage path — must match the expected trip/user prefix.',
        });
      }

      // Verify membership before allowing photo creation
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this trip' });
      }

      // Idempotency: if the storage_path already exists for this trip, return the
      // existing photo. This handles network retries and double-taps safely.
      const { data: existingRaw } = await ctx.supabase
        .from('photos')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('storage_path', input.storagePath)
        .single();
      const existing = existingRaw as { id: string } | null;
      if (existing) return { photoId: existing.id };

      // REL-07: query storage.objects for the authoritative file size.
      // Client-supplied fileSize is not trusted — a malicious client could report 0
      // to bypass the storage_used_bytes trigger and free-tier cap enforcement.
      // Using .schema('storage') requires the service role client (user session cannot
      // access the storage schema).
      const storageAdmin = createSupabaseServiceClient();
      // Fallback: .schema('storage') is not in generated types; use string cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: storageObj } = await (storageAdmin as any)
        .from('storage.objects')
        .select('metadata')
        .eq('bucket_id', 'trip-photos')
        .eq('name', input.storagePath)
        .single();

      const actualSize: number | null =
        (storageObj?.metadata as { size?: number } | null)?.size ?? null;

      // Per-photo 50MB cap — reject and clean up the orphaned storage object.
      // The trip-level 500MB cap is enforced upstream in getUploadUrl via storage_used_bytes;
      // this is a belt-and-suspenders guard against clients that forge the size or bypass
      // getUploadUrl entirely.
      const FIFTY_MB = 50 * 1024 * 1024;
      if (actualSize !== null && actualSize > FIFTY_MB) {
        // Remove the uploaded file before throwing so it doesn't orphan in storage
        await storageAdmin.storage.from('trip-photos').remove([input.storagePath]);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File exceeds the 50 MB per-photo limit.',
        });
      }

      // Use the authoritative server-side size; fall back to client-supplied value only
      // if the storage.objects lookup returned nothing (race condition on eventual consistency).
      const resolvedFileSize = actualSize ?? input.fileSize ?? null;

      // TYPE-02: photos.Insert is stale — file_size and user_id were added after last codegen.
      // Use a typed client wrapper so the insert shape is explicit instead of `as never`.
      type PhotoInsertRow = {
        trip_id: string;
        user_id: string;
        storage_path: string;
        file_size?: number | null;
      };
      type PhotoInsertClient = {
        from: (t: 'photos') => {
          insert: (d: PhotoInsertRow) => {
            select: () => {
              single: () => Promise<{ data: PhotoRow | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data: insertedRaw, error } = await (ctx.supabase as unknown as PhotoInsertClient)
        .from('photos')
        .insert({
          trip_id: input.tripId,
          user_id: ctx.user.id,
          storage_path: input.storagePath,
          file_size: resolvedFileSize,
        })
        .select()
        .single();
      const data = insertedRaw;

      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Photo insert returned no data',
        });
      }

      // total_photos is now maintained atomically by a Postgres trigger (see
      // supabase/migrations/002_total_photos_trigger.sql) — no app-level increment needed.

      // Fire-and-forget thumbnail — stays as HTTP for fast UX (users see thumbnail quickly).
      // Never block/fail the upload if worker is down.
      const workerUrl = process.env.AI_WORKER_URL;
      if (workerUrl && !workerUrl.includes('localhost')) {
        const photoBody = JSON.stringify({ photo_id: data.id });
        signWorkerRequest('POST', '/generate-thumbnail', photoBody)
          .then(({ signature: thumbSig, timestamp: thumbTs }) => {
            fetch(`${workerUrl}/generate-thumbnail`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
                'X-Timestamp': thumbTs,
                'X-Signature': thumbSig,
              },
              body: photoBody,
              signal: AbortSignal.timeout(6000),
            }).catch(e =>
              logger.warn(
                { procedure: 'photos.confirmUpload', photoId: data.id, tripId: input.tripId },
                `thumbnail worker unreachable: ${(e as Error).message}`
              )
            );
          })
          .catch(e =>
            logger.warn(
              { procedure: 'photos.confirmUpload', tripId: input.tripId },
              `HMAC signing failed for thumbnail: ${(e as Error).message}`
            )
          );
      }

      // PERF-05: CLIP embedding moved from per-photo HTTP fire-and-forget to background_jobs queue.
      // The worker's poll_background_jobs loop picks up 'embed_photo' jobs every 30s,
      // preventing 40 rapid-fire HTTP requests during a 20-photo bulk upload.
      const embedAdmin = createSupabaseServiceClient();
      const embedJob: BackgroundJobInsert = {
        trip_id: input.tripId,
        job_type: 'embed_photo',
        status: 'pending',
        payload: { photo_id: data.id },
      };
      (
        embedAdmin as unknown as {
          from: (t: string) => {
            insert: (d: BackgroundJobInsert) => Promise<{ error: { message: string } | null }>;
          };
        }
      )
        .from('background_jobs')
        .insert(embedJob)
        .then(({ error: jobErr }) => {
          if (jobErr)
            logger.warn(
              { procedure: 'photos.confirmUpload', photoId: data.id, tripId: input.tripId },
              `failed to enqueue embed_photo background job: ${jobErr.message}`
            );
        })
        .catch(e =>
          logger.warn(
            { procedure: 'photos.confirmUpload', tripId: input.tripId },
            `background job insert error: ${(e as Error).message}`
          )
        );

      return { photoId: data.id };
    }),

  recordView: protectedProcedure
    .input(
      z.object({
        photoId: z.string().uuid(),
        tripId: z.string().uuid(),
        viewDurationMs: z.number().int().min(0).max(300000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) return { recorded: false };

      // TYPE-02: photo_views not yet in generated types; typed locally.
      type PhotoViewInsert = {
        photo_id: string;
        trip_id: string;
        user_id: string;
        view_duration_ms: number;
      };
      await (
        ctx.supabase as unknown as {
          from: (t: string) => { insert: (d: PhotoViewInsert) => Promise<unknown> };
        }
      )
        .from('photo_views')
        .insert({
          photo_id: input.photoId,
          trip_id: input.tripId,
          user_id: ctx.user.id,
          view_duration_ms: input.viewDurationMs,
        });
      return { recorded: true };
    }),

  findSimilar: protectedProcedure
    .input(
      z.object({
        photoId: z.string().uuid(),
        limit: z.number().int().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      // TYPE-02: find_similar_photos RPC not in generated types (added post-codegen).
      // SupabaseWithRpc is defined at module level above.
      const { data, error } = await (ctx.supabase as unknown as SupabaseWithRpc).rpc(
        'find_similar_photos',
        {
          p_photo_id: input.photoId,
          p_user_id: ctx.user.id,
          p_limit: input.limit,
        }
      );
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      const rows = (data as unknown as SimilarPhotoRow[] | null) ?? [];
      if (rows.length === 0) return [];

      const adminSupabase = createSupabaseServiceClient();
      const paths = rows.flatMap(r =>
        [r.storage_path, r.thumbnail_path].filter(Boolean)
      ) as string[];
      const { data: signed } = await adminSupabase.storage
        .from('trip-photos')
        .createSignedUrls(paths, 3600);
      const urlByPath = new Map<string, string>();
      (signed || []).forEach(u => {
        if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
      });

      return rows.map(r => ({
        ...r,
        url: urlByPath.get(r.storage_path) ?? null,
        thumbnailUrl: r.thumbnail_path ? (urlByPath.get(r.thumbnail_path) ?? null) : null,
      }));
    }),

  nostalgiaFeed: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      // TYPE-02: get_nostalgia_moments RPC not in generated types (added post-codegen).
      const { data, error } = await (ctx.supabase as unknown as SupabaseWithRpc).rpc(
        'get_nostalgia_moments',
        {
          p_user_id: ctx.user.id,
          p_limit: input.limit,
        }
      );
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      const rows = (data as unknown as NostalgiaRow[] | null) ?? [];
      if (rows.length === 0) return [];

      const adminSupabase = createSupabaseServiceClient();
      const paths = rows.flatMap(r =>
        [r.storage_path, r.thumbnail_path].filter(Boolean)
      ) as string[];
      const { data: signed } = await adminSupabase.storage
        .from('trip-photos')
        .createSignedUrls(paths, 3600);
      const urlByPath = new Map<string, string>();
      (signed || []).forEach(u => {
        if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
      });

      return rows.map(r => ({
        ...r,
        url: urlByPath.get(r.storage_path) ?? null,
        thumbnailUrl: r.thumbnail_path ? (urlByPath.get(r.thumbnail_path) ?? null) : null,
      }));
    }),

  list: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(), // ISO timestamp — fetch photos older than this
      })
    )
    .query(async ({ ctx, input }) => {
      // Explicit membership guard — prevents leaking service-role signed URLs if RLS is bypassed.
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this trip' });
      }

      // PERF-02: explicit column list — excludes clip_embedding (~2KB/row of unused vector data)
      const PHOTO_COLUMNS =
        'id, trip_id, user_id, storage_path, thumbnail_path, signed_url, thumb_signed_url, url_expires_at, embedding_status, created_at, file_size';
      const { data: rawData, error } = input.cursor
        ? await ctx.supabase
            .from('photos')
            .select(PHOTO_COLUMNS)
            .eq('trip_id', input.tripId)
            .lt('created_at', input.cursor)
            .order('created_at', { ascending: false })
            .limit(input.limit)
        : await ctx.supabase
            .from('photos')
            .select(PHOTO_COLUMNS)
            .eq('trip_id', input.tripId)
            .order('created_at', { ascending: false })
            .limit(input.limit);
      const data = rawData as PhotoRow[] | null;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const photos = data ?? [];
      if (photos.length === 0) return { photos: [], nextCursor: undefined };

      const nextCursor =
        photos.length === input.limit
          ? (photos[photos.length - 1].created_at ?? undefined)
          : undefined;

      const adminSupabase = createSupabaseServiceClient();

      // Signed URL cache: reuse stored URLs if they have > 10 minutes remaining.
      // This reduces Supabase Storage API calls by ~80% for active trip rooms.
      const tenMinFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const needsRefresh = photos.filter(
        p => !p.url_expires_at || p.url_expires_at < tenMinFromNow
      );
      const hasValidCache = photos.filter(
        p => p.url_expires_at && p.url_expires_at >= tenMinFromNow
      );

      const urlByPath = new Map<string, string>();

      // Seed the map with still-valid cached URLs
      for (const p of hasValidCache) {
        if (p.signed_url) urlByPath.set(p.storage_path, p.signed_url);
        if (p.thumb_signed_url && p.thumbnail_path)
          urlByPath.set(p.thumbnail_path, p.thumb_signed_url);
      }

      if (needsRefresh.length > 0) {
        const photoPaths = needsRefresh.map(p => p.storage_path);
        const thumbPaths = needsRefresh
          .filter(p => p.thumbnail_path)
          .map(p => p.thumbnail_path as string);

        const [photoUrls, thumbUrls] = await Promise.all([
          adminSupabase.storage.from('trip-photos').createSignedUrls(photoPaths, 3600),
          thumbPaths.length > 0
            ? adminSupabase.storage.from('trip-photos').createSignedUrls(thumbPaths, 3600)
            : Promise.resolve({ data: [] as { path: string; signedUrl: string }[] }),
        ]);

        (photoUrls.data || []).forEach(u => {
          if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
        });
        (thumbUrls.data || []).forEach(u => {
          if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
        });

        // PERF-01: batch upsert — one DB write for all refreshed rows instead of N parallel UPDATEs.
        // Errors are non-fatal (stale cache is safe — next call regenerates).
        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        const urlsToUpsert = needsRefresh
          .filter(p => urlByPath.has(p.storage_path))
          .map(p => ({
            id: p.id,
            signed_url: urlByPath.get(p.storage_path)!,
            thumb_signed_url: p.thumbnail_path ? (urlByPath.get(p.thumbnail_path) ?? null) : null,
            url_expires_at: expiresAt,
          }));
        if (urlsToUpsert.length > 0) {
          await adminSupabase.from('photos').upsert(urlsToUpsert as never, { onConflict: 'id' });
        }
      }

      return {
        photos: photos.map(photo => ({
          ...photo,
          url: urlByPath.get(photo.storage_path) ?? null,
          thumbnailUrl: photo.thumbnail_path ? (urlByPath.get(photo.thumbnail_path) ?? null) : null,
        })),
        nextCursor,
      };
    }),

  embeddingHealth: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member' });

      const { data: rawHealth } = await ctx.supabase
        .from('photos')
        .select('embedding_status')
        .eq('trip_id', input.tripId);
      const rows = (rawHealth as { embedding_status: string | null }[] | null) ?? [];
      const total = rows.length;
      if (total === 0) return { total: 0, ready: 0, failed: 0, failureRate: 0, healthy: true };

      const ready = rows.filter(r => r.embedding_status === 'ready').length;
      const failed = rows.filter(r => r.embedding_status === 'failed').length;
      const failureRate = total > 0 ? failed / total : 0;
      return { total, ready, failed, failureRate, healthy: failureRate < 0.2 };
    }),
});
