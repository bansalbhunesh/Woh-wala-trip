import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';

export const photosRouter = router({
  getUploadUrl: protectedProcedure
    .input(z.object({
      tripId: z.string().uuid(),
      fileName: z.string(),
      contentType: z.string().regex(/^image\/(jpeg|png|heic|webp)$/),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: member } = await ctx.supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', input.tripId)
        .eq('user_id', ctx.user.id)
        .single();
      
      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this trip' });
      }
      
      const { data: trip } = await ctx.supabase
        .from('trips')
        .select('tier, total_photos')
        .eq('id', input.tripId)
        .single();
      
      if (trip?.tier === 'free' && trip.total_photos >= 50) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Free tier limit: 50 photos. Upgrade to add unlimited photos.',
        });
      }
      
      const ext = input.fileName.split('.').pop() || 'jpg';
      const storagePath = `${input.tripId}/${ctx.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      
      const { data, error } = await ctx.supabase.storage
        .from('trip-photos')
        .createSignedUploadUrl(storagePath);
      
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      
      return {
        uploadUrl: data.signedUrl,
        storagePath,
        token: data.token,
      };
    }),
  
  confirmUpload: protectedProcedure
    .input(z.object({
      tripId: z.string().uuid(),
      storagePath: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      takenAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('photos')
        .insert({
          trip_id: input.tripId,
          uploader_id: ctx.user.id,
          storage_path: input.storagePath,
          width: input.width,
          height: input.height,
          file_size_bytes: input.fileSize,
          mime_type: input.mimeType,
          taken_at: input.takenAt,
        })
        .select()
        .single();
      
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      
      await fetch(`${process.env.AI_WORKER_URL}/generate-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AI_WORKER_SECRET}`,
        },
        body: JSON.stringify({ photo_id: data.id }),
      });
      
      return { photoId: data.id };
    }),
  
  list: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('photos')
        .select('*')
        .eq('trip_id', input.tripId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      
      const photosWithUrls = await Promise.all(data.map(async (photo: any) => {
        const { data: urlData } = await ctx.supabase.storage
          .from('trip-photos')
          .createSignedUrl(photo.storage_path, 3600);
        
        const { data: thumbData } = photo.thumbnail_path
          ? await ctx.supabase.storage
              .from('trip-photos')
              .createSignedUrl(photo.thumbnail_path, 3600)
          : { data: null };
        
        return {
          ...photo,
          url: urlData?.signedUrl,
          thumbnailUrl: thumbData?.signedUrl,
        };
      }));
      
      return photosWithUrls;
    }),
});
