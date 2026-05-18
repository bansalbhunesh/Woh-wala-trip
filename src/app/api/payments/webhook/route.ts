import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Must match TIER_AMOUNTS in create-order/route.ts
const TIER_AMOUNTS: Record<string, number> = {
  digital: 39900, // ₹399 in paise
  print: 79900, // ₹799 in paise
};

// Tier upgrade rank — used to prevent replay-based downgrades
const TIER_RANK: Record<string, number> = {
  free: 0,
  digital: 1,
  print: 2,
};

// TYPE-02: trips table has payment_id and webhook_payment_id added post-codegen.
// webhook_payment_id is written here (the authoritative source) so the tRPC
// upgradeTier mutation can verify confirmation without re-verifying signatures.
type TripWebhookUpdate = {
  tier?: string;
  payment_id?: string;
  webhook_payment_id?: string;
  expires_at?: null;
};
type TripWebhookClient = {
  from: (t: 'trips') => {
    select: (cols: string) => {
      eq: (c: string, v: string) => { single: () => Promise<{ data: unknown }> };
    };
    update: (d: TripWebhookUpdate) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/**
 * Verify the HMAC-SHA256 signature Razorpay sends on every webhook call.
 * Uses constant-time comparison to prevent timing-oracle attacks.
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    // timingSafeEqual throws when buffers differ in length (malformed signature)
    return false;
  }
}

/**
 * Upgrade a trip's tier and stamp webhook_payment_id so the tRPC upgradeTier
 * mutation can confirm the webhook already fired (idempotent handshake).
 *
 * This is the SOLE authoritative write path for tier upgrades.
 * The tRPC mutation is a read-only verification gate after this.
 */
async function handlePaymentCaptured(
  paymentEntity: Record<string, unknown>
): Promise<NextResponse> {
  const tripId = (paymentEntity.notes as Record<string, string> | undefined)?.tripId;
  const tier = (paymentEntity.notes as Record<string, string> | undefined)?.tier;
  const paymentId = paymentEntity.id as string | undefined;
  const amountPaid = paymentEntity.amount as number | undefined;

  if (!tripId || !tier || !paymentId) {
    // Notes missing — cannot map to a trip; return 200 so Razorpay doesn't retry
    console.warn('[payments/webhook] payment.captured missing notes metadata, skipping');
    return NextResponse.json({ received: true });
  }

  // Validate tier is a known value
  if (!TIER_AMOUNTS[tier]) {
    console.warn(`[payments/webhook] unknown tier "${tier}" in webhook notes, skipping`);
    return NextResponse.json({ received: true });
  }

  // Verify the amount paid matches the expected tier price (prevents price manipulation)
  const expectedAmount = TIER_AMOUNTS[tier];
  if (amountPaid !== expectedAmount) {
    console.error(
      `[payments/webhook] amount mismatch for trip ${tripId}: ` +
        `paid=${amountPaid} expected=${expectedAmount} tier=${tier}`
    );
    // Return 200 so Razorpay doesn't retry — this is a fraud signal, not a transient error
    return NextResponse.json({ received: true });
  }

  const admin = createSupabaseServiceClient();

  // Fetch current tier to guard against replay-based downgrades
  const { data: tripRow } = await (admin as unknown as TripWebhookClient)
    .from('trips')
    .select('tier')
    .eq('id', tripId)
    .single();

  const currentTier = (tripRow as { tier: string } | null)?.tier ?? 'free';
  const currentRank = TIER_RANK[currentTier] ?? 0;
  const newRank = TIER_RANK[tier] ?? 0;

  if (newRank <= currentRank) {
    // Already at this tier or higher — stamp webhook_payment_id for idempotency and return
    console.info(
      `[payments/webhook] skipping tier upgrade for trip ${tripId}: ` +
        `current="${currentTier}" (rank=${currentRank}) >= requested="${tier}" (rank=${newRank})`
    );
    // Still stamp webhook_payment_id so a delayed tRPC call gets a successful response
    await (admin as unknown as TripWebhookClient)
      .from('trips')
      .update({ webhook_payment_id: paymentId })
      .eq('id', tripId);
    return NextResponse.json({ received: true });
  }

  // Authoritative upgrade: set tier, payment_id, AND webhook_payment_id in one atomic write.
  // webhook_payment_id acts as a "webhook has fired" flag readable by the tRPC upgradeTier
  // mutation, eliminating the need for client-side signature verification there.
  const { error } = await (admin as unknown as TripWebhookClient)
    .from('trips')
    .update({ tier, payment_id: paymentId, webhook_payment_id: paymentId, expires_at: null })
    .eq('id', tripId);

  if (error) {
    console.error('[payments/webhook] Failed to update trip tier:', error);
    // Return 500 so Razorpay retries this webhook
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }

  console.info(
    `[payments/webhook] upgraded trip ${tripId} to tier "${tier}" via payment ${paymentId} ` +
      `(webhook_payment_id stamped — tRPC gate unlocked)`
  );
  return NextResponse.json({ received: true });
}

/**
 * Handle subscription.charged — fired by Razorpay each billing cycle for monthly/annual plans.
 * Upgrades the trip referenced in the subscription notes (if present) to 'digital' tier
 * and stamps webhook_payment_id so the tRPC upgradeTier confirmation gate passes.
 */
async function handleSubscriptionCharged(
  subscriptionEntity: Record<string, unknown>
): Promise<NextResponse> {
  // Razorpay subscription.charged payload: { subscription: { entity }, payment: { entity } }
  // We get the payment entity from the outer payload; the subscription entity carries the notes.
  const subscriptionId = subscriptionEntity.id as string | undefined;
  const tripId = (subscriptionEntity.notes as Record<string, string> | undefined)?.tripId;
  const userId = (subscriptionEntity.notes as Record<string, string> | undefined)?.userId;

  if (!tripId && !userId) {
    // Subscription not linked to a trip — nothing to upgrade
    console.info(
      `[payments/webhook] subscription.charged for sub ${subscriptionId} has no tripId/userId in notes, skipping trip upgrade`
    );
    return NextResponse.json({ received: true });
  }

  if (!tripId) {
    // Subscription renewal without a specific trip — acceptable; no trip to upgrade
    console.info(
      `[payments/webhook] subscription.charged for sub ${subscriptionId} (userId=${userId}): no tripId, skipping`
    );
    return NextResponse.json({ received: true });
  }

  const admin = createSupabaseServiceClient();

  // Fetch current trip tier
  const { data: tripRow } = await (admin as unknown as TripWebhookClient)
    .from('trips')
    .select('tier')
    .eq('id', tripId)
    .single();

  const currentTier = (tripRow as { tier: string } | null)?.tier ?? 'free';
  const currentRank = TIER_RANK[currentTier] ?? 0;
  // Subscription grants 'digital' tier
  const grantedTier = 'digital';
  const grantedRank = TIER_RANK[grantedTier];

  // Use subscription ID as the payment reference so it's idempotent across retries
  const webhookRef = subscriptionId ?? `sub_charged_${tripId}`;

  if (grantedRank <= currentRank) {
    // Trip already at or above digital — stamp webhook_payment_id and return
    console.info(
      `[payments/webhook] subscription.charged: trip ${tripId} already at "${currentTier}", stamping webhook ref`
    );
    await (admin as unknown as TripWebhookClient)
      .from('trips')
      .update({ webhook_payment_id: webhookRef })
      .eq('id', tripId);
    return NextResponse.json({ received: true });
  }

  const { error } = await (admin as unknown as TripWebhookClient)
    .from('trips')
    .update({
      tier: grantedTier,
      payment_id: webhookRef,
      webhook_payment_id: webhookRef,
      expires_at: null,
    })
    .eq('id', tripId);

  if (error) {
    console.error('[payments/webhook] subscription.charged: Failed to update trip tier:', error);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }

  console.info(
    `[payments/webhook] subscription.charged: upgraded trip ${tripId} to "${grantedTier}" ` +
      `via subscription ${subscriptionId} (webhook_payment_id stamped)`
  );
  return NextResponse.json({ received: true });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!verifyWebhookSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // payment.captured — one-time purchase confirmed; this is the sole authoritative upgrade path.
  if (event.event === 'payment.captured') {
    const paymentEntity = (
      event.payload as { payment: { entity: Record<string, unknown> } } | undefined
    )?.payment?.entity;

    if (!paymentEntity) {
      return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
    }

    return handlePaymentCaptured(paymentEntity);
  }

  // subscription.charged — recurring billing cycle settled; upgrade linked trip if present.
  if (event.event === 'subscription.charged') {
    const subscriptionEntity = (
      event.payload as { subscription: { entity: Record<string, unknown> } } | undefined
    )?.subscription?.entity;

    if (!subscriptionEntity) {
      return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
    }

    return handleSubscriptionCharged(subscriptionEntity);
  }

  // All other events acknowledged but not acted upon
  return NextResponse.json({ received: true });
}
