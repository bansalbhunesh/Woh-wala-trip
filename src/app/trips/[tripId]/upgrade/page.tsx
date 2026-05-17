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
        body: JSON.stringify({ tripId, tier: 'digital' }),
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
            await upgradeTier.mutateAsync({
              tripId,
              tier: 'digital',
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
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

        <header className="pt-6 pb-12 text-center space-y-3">
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

        <div className="space-y-4">
          <Plan
            name="Digital"
            price="₹399"
            features={[
              'Unlimited members + photos',
              'No watermark on share card',
              'Permanent archive',
              'Anniversary drops every year',
              'Missing person cards',
            ]}
            onClick={payDigital}
            featured
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
            onClick={() => router.push(`/trips/${tripId}/print-order`)}
          />
        </div>
      </div>
    </div>
  );
}

function Plan({
  name,
  price,
  features,
  onClick,
  featured,
}: {
  name: string;
  price: string;
  features: string[];
  onClick: () => void;
  featured?: boolean;
}) {
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
      {featured && (
        <div
          className="absolute top-5 right-5 font-mono text-[7px] uppercase tracking-[0.4em] px-3 py-1 rounded-full"
          style={{
            background: 'rgba(255,77,77,0.15)',
            color: 'rgba(255,77,77,0.7)',
            border: '1px solid rgba(255,77,77,0.2)',
          }}
        >
          Best for Lore
        </div>
      )}

      <div className="flex justify-between items-baseline mb-6">
        <h3 className="font-cinematic italic text-xl">{name}</h3>
        <p
          className="font-cinematic font-black text-3xl"
          style={{ color: featured ? '#FF4D4D' : 'rgba(245,240,232,0.7)' }}
        >
          {price}
        </p>
      </div>

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
        Choose {name}
      </button>
    </div>
  );
}
