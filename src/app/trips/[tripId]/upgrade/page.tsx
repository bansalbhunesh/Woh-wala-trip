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
    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ tripId, tier: 'digital' }),
    });
    const order = await orderRes.json();

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: 29900,
      currency: 'INR',
      name: 'Woh Wala Trip',
      description: 'Digital trip archive',
      order_id: order.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (response: any) => {
        await upgradeTier.mutateAsync({
          tripId,
          tier: 'digital',
          paymentId: response.razorpay_payment_id,
        });
        router.push(`/trips/${tripId}`);
      },
      theme: { color: '#000000' },
    });
    rzp.open();
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-8">
        ← Back
      </button>

      <h1 className="text-2xl font-medium mb-2">Upgrade your trip</h1>
      <p className="text-sm text-gray-500 mb-8">
        Free trips expire in 7 days. Upgrade to keep your archive forever.
      </p>

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
    <div className={`border-2 rounded-2xl p-6 ${featured ? 'border-black' : 'border-gray-200'}`}>
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="font-medium">{name}</h3>
        <p className="text-2xl font-medium">{price}</p>
      </div>
      <ul className="text-sm text-gray-600 space-y-1 mb-6">
        {features.map((f, i) => (
          <li key={i}>· {f}</li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`w-full py-3 rounded-xl font-medium ${
          featured ? 'bg-black text-white' : 'border border-gray-300'
        }`}
      >
        Choose {name}
      </button>
    </div>
  );
}
