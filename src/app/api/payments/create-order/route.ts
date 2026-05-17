import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const TIER_AMOUNTS: Record<string, number> = {
  digital: 39900, // ₹399 in paise
  print: 79900, // ₹799 in paise
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await supabaseSSR.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, tier } = await req.json();
    if (!tripId || !tier || !TIER_AMOUNTS[tier]) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Verify user is a member of this trip
    const admin = createSupabaseServiceClient();
    const { data: membership } = await admin
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 });
    }

    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await rzp.orders.create({
      amount: TIER_AMOUNTS[tier],
      currency: 'INR',
      receipt: `trip_${tripId}_${tier}_${Date.now()}`,
      notes: { tripId, tier, userId: user.id },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('[payments/create-order] error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
