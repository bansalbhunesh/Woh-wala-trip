import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    // We listen for the 'order.paid' or 'payment.captured' event
    if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
      const paymentEntity =
        payload.event === 'order.paid'
          ? payload.payload.order.entity
          : payload.payload.payment.entity;

      const tripId = paymentEntity.notes?.tripId;
      const tier = paymentEntity.notes?.tier;
      const paymentId = payload.event === 'payment.captured' ? paymentEntity.id : undefined;

      if (!tripId || !tier) {
        // Missing metadata, can't map to a trip
        return NextResponse.json({ error: 'Missing trip metadata in notes' }, { status: 400 });
      }

      const admin = createSupabaseServiceClient();

      // Ensure we don't downgrade or do weird things. Just set the tier and payment_id.
      // We don't check for 'free' strictly here because it's a webhook, it's the source of truth.
      const { error } = await admin
        .from('trips')
        .update({ tier, payment_id: paymentId, expires_at: null })
        .eq('id', tripId);

      if (error) {
        console.error('[payments/webhook] Failed to update trip tier:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[payments/webhook] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
