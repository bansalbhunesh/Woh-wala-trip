import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: true,
    autocapture: false,
  });
}

export const analytics = {
  tripCreated: (tripId: string, name: string) =>
    posthog.capture('trip_created', { tripId, name }),
  photosUploaded: (tripId: string, count: number) =>
    posthog.capture('photos_uploaded', { tripId, count }),
  generationStarted: (tripId: string) =>
    posthog.capture('generation_started', { tripId }),
  generationCompleted: (tripId: string, cookedScore: number, duration_s?: number) =>
    posthog.capture('generation_completed', { tripId, cookedScore, duration_s }),
  storyShared: (tripId: string, method: 'link' | 'whatsapp' | 'instagram' | 'download') =>
    posthog.capture('story_shared', { tripId, method }),
  friendInvited: (tripId: string) =>
    posthog.capture('friend_invited', { tripId }),
  storyRevisited: (tripId: string) =>
    posthog.capture('story_revisited', { tripId }),
};
