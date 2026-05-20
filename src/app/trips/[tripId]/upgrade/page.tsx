'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain } from '@/components/ui/atoms';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function UpgradePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const upgradeTier = trpc.trips.upgradeTier.useMutation();
  const [error, setError] = useState<string | null>(null);

  // MONETIZATION-03: Annual subscription — ₹799/year (save 33% vs monthly)
  const payAnnual = async () => {
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, plan: 'annual' }),
      });
      if (!orderRes.ok) throw new Error(`Order failed: ${orderRes.status}`);
      const order = await orderRes.json();

      if (order.amount == null) {
        throw new Error('Server did not return a payment amount. Cannot proceed.');
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'Yaarlore',
        description: 'Yaarlore+ Annual — unlimited trips for a year',
        order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            // orderId and signature are no longer sent — the webhook is the sole
            // authoritative source of payment confirmation. This call verifies that
            // the webhook has already fired (webhook_payment_id is set on the trip).
            const result = await upgradeTier.mutateAsync({
              tripId,
              tier: 'digital',
              paymentId: response.razorpay_payment_id,
            });
            if ('pending' in result && result.pending) {
              // Webhook hasn't fired yet — show a brief confirmation message
              setError(
                'Payment received — confirming with Razorpay. This takes a few seconds; refresh in a moment.'
              );
              return;
            }
            router.push('/trips');
          } catch (err) {
            console.error('[upgrade] annual activation failed:', err);
            setError(
              'Payment received but subscription activation failed. Contact support at hello@yaarlore.app.'
            );
          }
        },
        theme: { color: '#FF4D4D' },
      });
      rzp.open();
    } catch (err) {
      console.error('[upgrade] annual payment init failed:', err);
      setError('Could not start payment. Try again.');
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);

  const payDigital = async () => {
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, tier: 'digital', plan: 'single' }),
      });
      if (!orderRes.ok) throw new Error(`Order failed: ${orderRes.status}`);
      const order = await orderRes.json();

      if (order.amount == null) {
        throw new Error('Server did not return a payment amount. Cannot proceed.');
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'Yaarlore',
        description: 'Digital trip archive',
        order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            // Webhook-first: the tRPC call verifies webhook_payment_id is set, not the signature
            const result = await upgradeTier.mutateAsync({
              tripId,
              tier: 'digital',
              paymentId: response.razorpay_payment_id,
            });
            if ('pending' in result && result.pending) {
              setError(
                'Payment received — confirming with Razorpay. This takes a few seconds; refresh in a moment.'
              );
              return;
            }
            router.push(`/trips/${tripId}`);
          } catch (err) {
            console.error('[upgrade] tier update failed:', err);
            setError('Payment received but upgrade failed. Contact support at hello@yaarlore.app.');
          }
        },
        theme: { color: '#FF4D4D' },
      });
      rzp.open();
    } catch (err) {
      console.error('[upgrade] payment init failed:', err);
      setError('Could not start payment. Try again.');
    }
  };

  // MONETIZATION-02: Monthly subscription — ₹99/month, unlimited trips for the whole friend group
  const paySubscription = async () => {
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, plan: 'monthly' }),
      });
      if (!orderRes.ok) throw new Error(`Order failed: ${orderRes.status}`);
      const order = await orderRes.json();

      if (order.amount == null) {
        throw new Error('Server did not return a payment amount. Cannot proceed.');
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'Yaarlore',
        description: 'Monthly subscription — unlimited trips',
        order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            // Subscription: verify webhook has confirmed, then redirect to trips home.
            // Webhook-first: orderId and signature are no longer sent to the tRPC mutation.
            const result = await upgradeTier.mutateAsync({
              tripId,
              tier: 'digital',
              paymentId: response.razorpay_payment_id,
            });
            if ('pending' in result && result.pending) {
              setError(
                'Payment received — confirming with Razorpay. This takes a few seconds; refresh in a moment.'
              );
              return;
            }
            router.push('/trips');
          } catch (err) {
            console.error('[upgrade] subscription activation failed:', err);
            setError(
              'Payment received but subscription activation failed. Contact support at hello@yaarlore.app.'
            );
          }
        },
        theme: { color: '#FF4D4D' },
      });
      rzp.open();
    } catch (err) {
      console.error('[upgrade] subscription payment init failed:', err);
      setError('Could not start payment. Try again.');
    }
  };

  const payPrint = async () => {
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, tier: 'print', plan: 'single' }),
      });
      if (!orderRes.ok) throw new Error(`Order failed: ${orderRes.status}`);
      const order = await orderRes.json();

      if (order.amount == null) {
        throw new Error('Server did not return a payment amount. Cannot proceed.');
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        name: 'Yaarlore',
        description: 'Physical hardcover book + digital bundle',
        order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            const result = await upgradeTier.mutateAsync({
              tripId,
              tier: 'print',
              paymentId: response.razorpay_payment_id,
            });
            if ('pending' in result && result.pending) {
              setError(
                'Payment received — confirming with Razorpay. This takes a few seconds; refresh in a moment.'
              );
              return;
            }
            router.push(`/trips/${tripId}`);
          } catch (err) {
            console.error('[upgrade] print activation failed:', err);
            setError('Payment received but upgrade failed. Contact support at hello@yaarlore.app.');
          }
        },
        theme: { color: '#FF4D4D' },
      });
      rzp.open();
    } catch (err) {
      console.error('[upgrade] print payment init failed:', err);
      setError('Could not start payment. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] relative overflow-hidden">
      <FilmGrain />

      {/* Atmospheric glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,77,77,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-sm mx-auto px-6 pb-20">
        <button
          onClick={() => router.back()}
          className="mt-10 mb-8 font-mono text-[8px] uppercase tracking-[0.45em] transition-colors"
          style={{ color: 'rgba(245,240,232,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.25)')}
        >
          ← BACK
        </button>

        {error && (
          <div
            className="mb-6 rounded-2xl px-5 py-4 text-[11px] font-mono"
            style={{
              background: 'rgba(255,77,77,0.08)',
              border: '1px solid rgba(255,77,77,0.18)',
              color: 'rgba(255,77,77,0.8)',
            }}
          >
            {error}
          </div>
        )}

        <header className="pt-6 pb-10 text-center space-y-3">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.5em]"
            style={{ color: 'rgba(255,77,77,0.45)' }}
          >
            ● THE FINAL RECUT
          </p>
          <h1 className="font-cinematic font-black italic text-[clamp(2.5rem,10vw,3.5rem)] leading-[0.9] uppercase tracking-tight text-[#F5F0E8]">
            Seal the
            <br />
            Lore
          </h1>
          <p
            className="font-cinematic italic text-[13px] leading-snug max-w-[220px] mx-auto"
            style={{ color: 'rgba(245,240,232,0.3)' }}
          >
            Free trips are transient. Upgrade to keep the group&apos;s downfall permanent.
          </p>
        </header>

        {/* What you get — shown above plans to anchor value */}
        <WhatYouGet />

        <div className="mt-8 space-y-4">
          {/* MONETIZATION-02: Monthly — PRIMARY / MOST POPULAR */}
          <Plan
            name="Yaarlore+ Monthly"
            price="₹99/mo"
            badge="Most Popular"
            badgeStyle="popular"
            subtext="Unlimited trips for your whole friend group"
            valueNote="₹17/person for 6 friends"
            features={[
              'Unlimited lore generations every month',
              'All trips permanently archived',
              'No watermarks — ever',
              'Anniversary drops + nostalgia emails',
              'Battle challenges enabled',
            ]}
            onClick={paySubscription}
            featured
          />

          {/* MONETIZATION-03: Annual — BEST VALUE */}
          <Plan
            name="Yaarlore+ Annual"
            price="₹799/yr"
            badge="Best Value"
            badgeStyle="value"
            subtext="Save ₹389 vs monthly · billed once a year"
            valueNote="≈ ₹67/mo · ₹133/person for 6 friends"
            features={[
              'Everything in Monthly — for a full year',
              'Unlimited lore generations',
              'All trips permanently archived',
              'No watermarks — ever',
              'Anniversary drops + nostalgia emails',
              'Battle challenges enabled',
            ]}
            onClick={payAnnual}
          />

          {/* Comparison table */}
          <ComparisonTable />

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(245,240,232,0.06)' }} />
            <p
              className="font-mono text-[8px] uppercase tracking-[0.4em] whitespace-nowrap"
              style={{ color: 'rgba(245,240,232,0.18)' }}
            >
              just this trip
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(245,240,232,0.06)' }} />
          </div>

          {/* One-time — demoted, secondary */}
          <Plan
            name="Digital"
            price="₹399"
            subtext="One-time · this trip only · no subscription"
            features={[
              'Unlimited members + photos',
              'No watermark on share card',
              'Permanent archive',
              'Anniversary drops every year',
              'Missing person cards',
            ]}
            onClick={payDigital}
          />

          <Plan
            name="Printed book"
            price="₹799"
            features={[
              'Everything in Digital',
              'Physical hardcover book',
              '20–40 pages, AI-designed',
              'Delivered pan-India',
              'Gift packaging available',
            ]}
            onClick={payPrint}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// What you get — anchors value before the pricing cards
// ────────────────────────────────────────────────────────────────────────────
function WhatYouGet() {
  const perks = [
    'AI lore for all your trips',
    'Character roles for every member',
    'Trip battles',
    'Yearly Wrap',
    'Public story sharing',
    'Cancel anytime',
  ];
  return (
    <div
      className="rounded-2xl px-6 py-5 space-y-3"
      style={{ background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.05)' }}
    >
      <p
        className="font-mono text-[8px] uppercase tracking-[0.45em] mb-4"
        style={{ color: 'rgba(255,77,77,0.4)' }}
      >
        Subscribers get
      </p>
      <ul className="space-y-2.5">
        {perks.map((perk, i) => (
          <li
            key={i}
            className="flex items-center gap-3 font-mono text-[10px]"
            style={{ color: 'rgba(245,240,232,0.5)' }}
          >
            <span style={{ color: 'rgba(45,158,139,0.8)' }}>✓</span>
            {perk}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Comparison table
// ────────────────────────────────────────────────────────────────────────────
function ComparisonTable() {
  type Tier = 'Free' | 'Monthly' | 'Annual' | 'One-time';
  const rows: { label: string; values: Record<Tier, string | boolean> }[] = [
    {
      label: 'AI lore',
      values: { Free: '1 trip', Monthly: true, Annual: true, 'One-time': '1 trip' },
    },
    {
      label: 'Archived trips',
      values: { Free: false, Monthly: true, Annual: true, 'One-time': '1 trip' },
    },
    {
      label: 'No watermark',
      values: { Free: false, Monthly: true, Annual: true, 'One-time': true },
    },
    {
      label: 'Battle challenges',
      values: { Free: false, Monthly: true, Annual: true, 'One-time': false },
    },
    {
      label: 'Yearly Wrap',
      values: { Free: false, Monthly: true, Annual: true, 'One-time': false },
    },
    {
      label: 'Character roles',
      values: { Free: false, Monthly: true, Annual: true, 'One-time': false },
    },
    {
      label: 'Anniversary drops',
      values: { Free: false, Monthly: true, Annual: true, 'One-time': true },
    },
    {
      label: 'Price',
      values: { Free: '₹0', Monthly: '₹99/mo', Annual: '₹799/yr', 'One-time': '₹399' },
    },
  ];

  const tiers: Tier[] = ['Free', 'Monthly', 'Annual', 'One-time'];
  const highlightCol = (t: Tier) => t === 'Monthly';

  const renderCell = (val: string | boolean, col: Tier) => {
    const hi = highlightCol(col);
    if (val === true)
      return <span style={{ color: hi ? 'rgba(255,77,77,0.9)' : 'rgba(45,158,139,0.7)' }}>✓</span>;
    if (val === false) return <span style={{ color: 'rgba(245,240,232,0.12)' }}>—</span>;
    return (
      <span style={{ color: hi ? 'rgba(255,77,77,0.9)' : 'rgba(245,240,232,0.35)' }}>{val}</span>
    );
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(245,240,232,0.06)' }}
    >
      {/* Header */}
      <div className="grid grid-cols-5 text-center">
        <div className="py-3 px-2" />
        {tiers.map(t => (
          <div
            key={t}
            className="py-3 px-1"
            style={{
              background: highlightCol(t) ? 'rgba(255,77,77,0.08)' : 'rgba(245,240,232,0.015)',
              borderLeft: '1px solid rgba(245,240,232,0.05)',
            }}
          >
            <p
              className="font-mono text-[7px] uppercase tracking-[0.3em] leading-tight"
              style={{ color: highlightCol(t) ? 'rgba(255,77,77,0.7)' : 'rgba(245,240,232,0.25)' }}
            >
              {t}
            </p>
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="grid grid-cols-5 text-center"
          style={{
            borderTop: '1px solid rgba(245,240,232,0.04)',
            background: ri % 2 === 0 ? 'rgba(245,240,232,0.01)' : 'transparent',
          }}
        >
          <div
            className="py-3 px-3 text-left font-mono text-[8px] leading-tight"
            style={{ color: 'rgba(245,240,232,0.3)' }}
          >
            {row.label}
          </div>
          {tiers.map(t => (
            <div
              key={t}
              className="py-3 px-1 flex items-center justify-center font-mono text-[8px]"
              style={{
                background: highlightCol(t) ? 'rgba(255,77,77,0.04)' : 'transparent',
                borderLeft: '1px solid rgba(245,240,232,0.04)',
              }}
            >
              {renderCell(row.values[t], t)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Plan card
// ────────────────────────────────────────────────────────────────────────────
function Plan({
  name,
  price,
  features,
  onClick,
  featured,
  badge,
  badgeStyle,
  subtext,
  valueNote,
}: {
  name: string;
  price: string;
  features: string[];
  onClick: () => void;
  featured?: boolean;
  badge?: string;
  badgeStyle?: 'popular' | 'value';
  subtext?: string;
  valueNote?: string;
}) {
  // Popular badge uses the accent red; Value badge uses the green/teal
  const badgeColor =
    badgeStyle === 'value'
      ? {
          bg: 'rgba(45,158,139,0.12)',
          text: 'rgba(45,158,139,0.8)',
          border: 'rgba(45,158,139,0.2)',
        }
      : { bg: 'rgba(255,77,77,0.15)', text: 'rgba(255,77,77,0.7)', border: 'rgba(255,77,77,0.2)' };

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] p-7 transition-all duration-500 cursor-pointer"
      style={{
        background: featured ? 'rgba(255,77,77,0.08)' : 'rgba(245,240,232,0.03)',
        border: `1px solid ${featured ? 'rgba(255,77,77,0.25)' : 'rgba(245,240,232,0.07)'}`,
        boxShadow: featured ? '0 0 40px rgba(255,77,77,0.08)' : 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = featured
          ? '0 8px 60px rgba(255,77,77,0.15)'
          : '0 4px 30px rgba(245,240,232,0.04)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = featured
          ? '0 0 40px rgba(255,77,77,0.08)'
          : 'none';
      }}
    >
      {badge && (
        <div
          className="absolute top-5 right-5 font-mono text-[7px] uppercase tracking-[0.4em] px-3 py-1 rounded-full"
          style={{
            background: badgeColor.bg,
            color: badgeColor.text,
            border: `1px solid ${badgeColor.border}`,
          }}
        >
          {badge}
        </div>
      )}

      <div className="flex justify-between items-baseline mb-2">
        <h3 className="font-cinematic italic text-xl">{name}</h3>
        <p
          className="font-cinematic font-black text-3xl"
          style={{ color: featured ? '#FF4D4D' : 'rgba(245,240,232,0.7)' }}
        >
          {price}
        </p>
      </div>

      {subtext && (
        <p className="font-mono text-[9px] mb-2" style={{ color: 'rgba(245,240,232,0.3)' }}>
          {subtext}
        </p>
      )}

      {valueNote && (
        <p
          className="font-mono text-[9px] mb-5 px-3 py-1.5 rounded-full inline-block"
          style={{
            background: 'rgba(45,158,139,0.1)',
            color: 'rgba(45,158,139,0.8)',
            border: '1px solid rgba(45,158,139,0.2)',
          }}
        >
          {valueNote}
        </p>
      )}

      {!subtext && !valueNote && <div className="mb-4" />}

      <ul className="space-y-2.5 mb-8">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-center gap-3 font-mono text-[10px]"
            style={{ color: 'rgba(245,240,232,0.55)' }}
          >
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: featured ? 'rgba(255,77,77,0.6)' : 'rgba(245,158,45,0.5)' }}
            />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        className="w-full py-4 rounded-full font-ui font-black uppercase tracking-[0.25em] text-[9px] transition-all active:scale-95"
        style={{
          background: featured ? '#FF4D4D' : 'rgba(245,240,232,0.06)',
          color: featured ? '#060604' : 'rgba(245,240,232,0.7)',
          border: featured ? 'none' : '1px solid rgba(245,240,232,0.1)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        {featured ? `Subscribe — ${price}` : `Choose ${name}`}
      </button>
    </div>
  );
}
