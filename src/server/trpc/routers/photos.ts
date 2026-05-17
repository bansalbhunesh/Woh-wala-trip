import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

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

      const { data: insertedRaw, error } = await ctx.supabase
        .from('photos')
        .insert({
          trip_id: input.tripId,
          user_id: ctx.user.id,
          storage_path: input.storagePath,
          file_size: input.fileSize ?? null,
        } as never)
        .select()
        .single();
      const data = insertedRaw as PhotoRow | null;

      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Photo insert returned no data',
        });
      }

      // total_photos is now maintained atomically by a Postgres trigger (see
      // supabase/migrations/002_total_photos_trigger.sql) — no app-level increment needed.

      // Fire-and-forget thumbnail + CLIP embedding — never block/fail the upload if worker is down
      const workerUrl = process.env.AI_WORKER_URL;
      if (workerUrl && !workerUrl.includes('localhost')) {
        const workerHeaders = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
        };
        const photoBody = JSON.stringify({ photo_id: data.id });
        fetch(`${workerUrl}/generate-thumbnail`, {
          method: 'POST',
          headers: workerHeaders,
          body: photoBody,
          signal: AbortSignal.timeout(6000),
        }).catch(e => console.warn('[thumbnail] worker unreachable:', (e as Error).message));

        fetch(`${workerUrl}/embed-photo`, {
          method: 'POST',
          headers: workerHeaders,
          body: photoBody,
          signal: AbortSignal.timeout(6000),
        }).catch(e => console.warn('[embed] worker unreachable:', (e as Error).message));
      }

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

      await ctx.supabase.from('photo_views' as never).insert({
        photo_id: input.photoId,
        trip_id: input.tripId,
        user_id: ctx.user.id,
        view_duration_ms: input.viewDurationMs,
      } as never);
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
      const { data, error } = await ctx.supabase.rpc(
        'find_similar_photos' as never,
        {
          p_photo_id: input.photoId,
          p_user_id: ctx.user.id,
          p_limit: input.limit,
        } as never
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
      const { data, error } = await ctx.supabase.rpc(
        'get_nostalgia_moments' as never,
        {
          p_user_id: ctx.user.id,
          p_limit: input.limit,
        } as never
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
      const { data: rawData, error } = input.cursor
        ? await ctx.supabase
            .from('photos')
            .select('*')
            .eq('trip_id', input.tripId)
            .lt('created_at', input.cursor)
            .order('created_at', { ascending: false })
            .limit(input.limit)
        : await ctx.supabase
            .from('photos')
            .select('*')
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

        // Persist refreshed URLs back to the DB so the next call within the hour skips regeneration.
        // Fire all updates in parallel; errors are non-fatal (stale cache is safe — next call regenerates).
        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        await Promise.all(
          needsRefresh.map(p => {
            const newUrl = urlByPath.get(p.storage_path);
            if (!newUrl) return Promise.resolve();
            return adminSupabase
              .from('photos')
              .update({
                signed_url: newUrl,
                thumb_signed_url: p.thumbnail_path
                  ? (urlByPath.get(p.thumbnail_path) ?? null)
                  : null,
                url_expires_at: expiresAt,
              } as never)
              .eq('id', p.id);
          })
        );
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
