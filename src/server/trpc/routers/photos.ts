import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

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
      const supabase = ctx.supabase as any;
      const { data: member } = await supabase
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

      const { data: trip } = await supabase
        .from('trips')
        .select('tier')
        .eq('id', input.tripId)
        .single();

      if ((trip as any)?.tier === 'free') {
        // Count real rows — cached total_photos column can lag on concurrent uploads
        const { count: realPhotoCount } = await supabase
          .from('photos')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', input.tripId);

        if ((realPhotoCount || 0) >= 50) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Free tier limit: 50 photos. Upgrade to add unlimited photos.',
          });
        }
      }

      // Derive extension from validated contentType, not from user-supplied filename
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp',
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
      const supabase = ctx.supabase as any;
      // Verify membership before allowing photo creation
      const { data: member } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this trip' });
      }
      const { data, error } = await supabase
        .from('photos')
        .insert({
          trip_id: input.tripId,
          user_id: ctx.user.id,
          storage_path: input.storagePath,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      // total_photos is now maintained atomically by a Postgres trigger (see
      // supabase/migrations/002_total_photos_trigger.sql) — no app-level increment needed.

      // Fire-and-forget thumbnail — never block/fail the upload if worker is down
      const workerUrl = process.env.AI_WORKER_URL;
      if (workerUrl && !workerUrl.includes('localhost')) {
        fetch(`${workerUrl}/generate-thumbnail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AI_WORKER_SECRET!}`,
          },
          body: JSON.stringify({ photo_id: data.id }),
          signal: AbortSignal.timeout(6000),
        }).catch(e => console.warn('[thumbnail] worker unreachable:', e.message));
      }

      return { photoId: data.id };
    }),

  list: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = ctx.supabase as any;
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('trip_id', input.tripId)
        .order('created_at', { ascending: false });

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });

      const photos = (data as any[] || []);
      if (photos.length === 0) return [];

      const adminSupabase = createSupabaseServiceClient();

      // Batch all paths into 2 API calls instead of N*2 individual calls
      const photoPaths = photos.map((p: any) => p.storage_path);
      const thumbPaths = photos.filter((p: any) => p.thumbnail_path).map((p: any) => p.thumbnail_path);

      const [photoUrls, thumbUrls] = await Promise.all([
        adminSupabase.storage.from('trip-photos').createSignedUrls(photoPaths, 3600),
        thumbPaths.length > 0
          ? adminSupabase.storage.from('trip-photos').createSignedUrls(thumbPaths, 3600)
          : Promise.resolve({ data: [] }),
      ]);

      // Build lookup maps by path
      const urlByPath = new Map<string, string>();
      (photoUrls.data || []).forEach((u: any) => { if (u.signedUrl) urlByPath.set(u.path, u.signedUrl); });
      (thumbUrls.data || []).forEach((u: any) => { if (u.signedUrl) urlByPath.set(u.path, u.signedUrl); });

      return photos.map((photo: any) => ({
        ...photo,
        url: urlByPath.get(photo.storage_path) ?? null,
        thumbnailUrl: photo.thumbnail_path ? (urlByPath.get(photo.thumbnail_path) ?? null) : null,
      }));
    }),
});
