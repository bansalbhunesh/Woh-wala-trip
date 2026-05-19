import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    autocapture: false,
  });
}

export const analytics = {
  // ── Existing events ────────────────────────────────────────────────────────
  tripCreated: (tripId: string, name: string) => posthog.capture('trip_created', { tripId, name }),
  photosUploaded: (tripId: string, count: number) =>
    posthog.capture('photos_uploaded', { tripId, count }),
  generationStarted: (tripId: string) => posthog.capture('generation_started', { tripId }),
  generationCompleted: (tripId: string, cookedScore: number, duration_s?: number) =>
    posthog.capture('generation_completed', { tripId, cookedScore, duration_s }),
  storyShared: (tripId: string, method: 'link' | 'whatsapp' | 'instagram' | 'download') =>
    posthog.capture('story_shared', { tripId, method }),
  friendInvited: (tripId: string) => posthog.capture('friend_invited', { tripId }),
  storyRevisited: (tripId: string) => posthog.capture('story_revisited', { tripId }),

  // ── Demo funnel ────────────────────────────────────────────────────────────
  demoViewed: () => posthog.capture('demo_viewed'),
  demoCTAClicked: () => posthog.capture('demo_cta_clicked'),
  demoShared: () => posthog.capture('demo_shared'),

  // ── Onboarding funnel ──────────────────────────────────────────────────────
  signupStarted: (source: string) => posthog.capture('signup_started', { source }),
  otpSent: () => posthog.capture('otp_sent'),
  otpVerified: () => posthog.capture('otp_verified'),
  firstTripCreated: () => posthog.capture('first_trip_created'),
  photoUploaded: (count: number) =>
    posthog.capture('photo_uploaded', { count, milestone: count >= 5 ? '5+' : '<5' }),
  loreGenerationStarted: (isFirstTrip: boolean) =>
    posthog.capture('lore_generation_started', { is_first_trip: isFirstTrip }),
  loreGenerationCompleted: (tripId: string) =>
    posthog.capture('lore_generation_completed', { trip_id: tripId }),

  // ── Revenue funnel ─────────────────────────────────────────────────────────
  upgradePageViewed: (tripId: string) =>
    posthog.capture('upgrade_page_viewed', { trip_id: tripId }),
  planSelected: (plan: 'monthly' | 'annual' | 'digital' | 'print') =>
    posthog.capture('plan_selected', { plan }),
  paymentCompleted: (plan: string, amountPaise: number) =>
    posthog.capture('payment_completed', { plan, amount_inr: amountPaise / 100 }),

  // ── Virality funnel ────────────────────────────────────────────────────────
  battleCreated: (tripId: string) => posthog.capture('battle_created', { trip_id: tripId }),
  battleShared: (battleId: string) => posthog.capture('battle_shared', { battle_id: battleId }),
  wrapShared: (year: number) => posthog.capture('wrap_shared', { year }),

  // ── Retention feature instrumentation ─────────────────────────────────────
  // These events track engagement with depth features to measure actual usage.
  // All were untracked before — meaning we had zero signal on whether they worked.
  disputeFiled: (tripId: string) => posthog.capture('dispute_filed', { trip_id: tripId }),
  disputeVoted: (disputeId: string, vote: 'ai' | 'user') =>
    posthog.capture('dispute_voted', { dispute_id: disputeId, vote }),
  memoryReviewOpened: (tripId: string) =>
    posthog.capture('memory_review_opened', { trip_id: tripId }),
  memoryContributed: (tripId: string, type: 'confirm' | 'addition') =>
    posthog.capture('memory_contributed', { trip_id: tripId, type }),
  prophecyRevealed: (tripId: string) => posthog.capture('prophecy_revealed', { trip_id: tripId }),
  incidentLogOpened: (tripId: string) =>
    posthog.capture('incident_log_opened', { trip_id: tripId }),
  anthemRevealed: (tripId: string) => posthog.capture('anthem_revealed', { trip_id: tripId }),
  deeperRecordOpened: (tripId: string) =>
    posthog.capture('deeper_record_opened', { trip_id: tripId }),
};
