// Web push notification sender — server-side only.
// Uses the web-push library with VAPID authentication.
// Called from tRPC mutations and cron routes.

import webpush from 'web-push';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// VAPID keys — public key is also in .env.example / Vercel env vars
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL = process.env.VAPID_CONTACT_EMAIL ?? 'mailto:hello@yaarlore.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tripId?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Send a push notification to all registered devices for a user.
 * Non-fatal: errors are logged but never thrown to the caller.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — skipping push notification');
    return { sent: 0, failed: 0 };
  }

  const admin = createSupabaseServiceClient();
  const { data: subs } = await admin
    .from('push_subscriptions' as never)
    .select('id, endpoint, p256dh_key, auth_key')
    .eq('user_id', userId);

  const subscriptions = (subs as any[]) ?? [];
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        JSON.stringify(payload),
        { TTL: 86400 } // 24 hour TTL
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — remove it
        staleIds.push(sub.id);
      }
      failed++;
    }
  }

  // Clean up expired subscriptions
  if (staleIds.length > 0) {
    await admin
      .from('push_subscriptions' as never)
      .delete()
      .in('id', staleIds);
  }

  return { sent, failed };
}

/**
 * Send push notifications to all members of a trip.
 * Excludes the actor (they triggered the event, no need to notify them).
 */
export async function sendPushToTripMembers(
  tripId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<void> {
  const admin = createSupabaseServiceClient();
  const { data: members } = await admin
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId);

  const userIds = ((members as any[]) ?? [])
    .map((m: any) => m.user_id as string)
    .filter(id => id !== excludeUserId);

  // Fire all pushes concurrently (best effort)
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, payload)));
}
