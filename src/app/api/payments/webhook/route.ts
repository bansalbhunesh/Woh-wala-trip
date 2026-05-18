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

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify HMAC-SHA256 signature using constant-time comparison to prevent timing attacks
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

  // Buffers must be same length for timingSafeEqual; hex strings of the same HMAC always are
  let signatureValid = false;
  try {
    signatureValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch {
    // timingSafeEqual throws if buffers differ in length (i.e. signature is malformed)
    signatureValid = false;
  }

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Handle payment.captured — authoritative signal that money has settled
  if (event.event === 'payment.captured') {
    const paymentEntity = (
      event.payload as { payment: { entity: Record<string, unknown> } } | undefined
    )?.payment?.entity;

    if (!paymentEntity) {
      return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
    }

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
    const { data: tripRow } = await admin
      .from('trips' as never)
      .select('tier')
      .eq('id' as never, tripId)
      .single();

    const currentTier = (tripRow as { tier: string } | null)?.tier ?? 'free';
    const currentRank = TIER_RANK[currentTier] ?? 0;
    const newRank = TIER_RANK[tier] ?? 0;

    if (newRank <= currentRank) {
      // Already at this tier or higher — idempotent no-op
      console.info(
        `[payments/webhook] skipping upgrade for trip ${tripId}: ` +
          `current="${currentTier}" (rank=${currentRank}) >= requested="${tier}" (rank=${newRank})`
      );
      return NextResponse.json({ received: true });
    }

    const { error } = await admin
      .from('trips' as never)
      .update({ tier, payment_id: paymentId, expires_at: null } as never)
      .eq('id' as never, tripId);

    if (error) {
      console.error('[payments/webhook] Failed to update trip tier:', error);
      // Return 500 so Razorpay retries this webhook
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    console.info(
      `[payments/webhook] upgraded trip ${tripId} to tier "${tier}" via payment ${paymentId}`
    );
  }

  return NextResponse.json({ received: true });
}
