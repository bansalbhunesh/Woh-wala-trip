'use client';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

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

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount ?? 29900, // use server amount, fallback to 299 INR
        currency: order.currency ?? 'INR',
        name: 'Woh Wala Trip',
        description: 'Digital trip archive',
        order_id: order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            await upgradeTier.mutateAsync({
              tripId,
              tier: 'digital',
              paymentId: response.razorpay_payment_id,
            });
            router.push(`/trips/${tripId}`);
          } catch (err) {
            console.error('[upgrade] tier update failed:', err);
            alert('Payment received but upgrade failed. Contact support.');
          }
        },
        theme: { color: '#000000' },
      });
      rzp.open();
    } catch (err) {
      console.error('[upgrade] payment init failed:', err);
      alert('Could not start payment. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-8">
        ← Back
      </button>

      <header className="pt-12 pb-10 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-vibe">The Final Recut</p>
        <h1 className="text-5xl font-cinematic font-medium text-cooked-bg leading-tight">Seal the Lore</h1>
        <p className="text-sm text-gray-400 font-data font-light max-w-xs mx-auto">
          Free trips are transient. Upgrade to keep the group&apos;s downfall permanent.
        </p>
      </header>

      <div className="space-y-4">
        <Plan
          name="Digital"
          price="₹299"
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
            '20-40 pages, AI-designed',
            'Delivered pan-India',
            'Gift packaging available',
          ]}
          onClick={() => router.push(`/trips/${tripId}/print-order`)}
        />
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
    <div className={`relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-500 ${featured ? 'bg-cooked-bg text-white shadow-2xl shadow-cooked-bg/20' : 'bg-gray-50 border border-gray-100 text-gray-800'}`}>
      <div className="flex justify-between items-baseline mb-6">
        <h3 className="text-2xl font-cinematic italic">{name}</h3>
        <p className="text-3xl font-vibe font-bold">{price}</p>
      </div>
      <ul className="text-sm space-y-3 mb-10 font-data font-light opacity-90">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3">
             <span className={`w-1.5 h-1.5 rounded-full ${featured ? 'bg-chill-accent' : 'bg-gray-300'}`} />
             {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`w-full py-5 rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] ${
          featured ? 'bg-white text-cooked-bg' : 'bg-cooked-bg text-white'
        }`}
      >
        Choose {name}
      </button>

      {featured && (
         <div className="absolute top-4 right-4 bg-chill-accent text-white text-[8px] px-3 py-1 rounded-full font-vibe uppercase tracking-widest">
            Best for Lore
         </div>
      )}
    </div>
  );
}
