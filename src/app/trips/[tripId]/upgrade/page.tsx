'use client';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

declare global {
  interface Window {
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
    // In a real app, you'd fetch the order from your API
    // For this demo, we'll mock the success
    try {
      await upgradeTier.mutateAsync({
        tripId,
        tier: 'digital',
        paymentId: 'pay_' + Math.random().toString(36).substring(7),
      });
      router.push(`/trips/${tripId}`);
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6">
      <header className="mb-12 pt-10">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm active:scale-90 transition-all mb-8"
        >
          ←
        </button>
        <h1 className="text-3xl font-outfit font-medium tracking-tight">Upgrade Trip</h1>
        <p className="text-gray-500 mt-1">Make this history permanent.</p>
      </header>
      
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Plan
          name="Digital Archive"
          price="₹299"
          features={[
            'Unlimited members + photos',
            'No watermark on share card',
            'Permanent archive hosting',
            'Anniversary drops every year',
            'Chaos Missing Person cards',
          ]}
          onClick={payDigital}
          featured
        />
        
        <Plan
          name="Physical Book"
          price="₹799"
          features={[
            'Everything in Digital',
            'Physical hardcover photo book',
            '20-40 pages, AI-designed',
            'Delivered pan-India',
            'Gift packaging included',
          ]}
          onClick={() => alert('Print book coming soon!')}
        />
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-xs text-gray-300 font-inter uppercase tracking-widest">Secure payment via Razorpay</p>
      </div>
    </div>
  );
}

function Plan({ name, price, features, onClick, featured }: {
  name: string;
  price: string;
  features: string[];
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <div className={`rounded-[2.5rem] p-8 transition-all ${featured ? 'bg-black text-white shadow-2xl scale-105' : 'bg-white text-black shadow-premium border border-gray-100'}`}>
      <div className="flex justify-between items-baseline mb-8">
        <div>
          <h3 className="font-outfit text-2xl font-bold tracking-tight">{name}</h3>
          {featured && <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mt-1 block">Most Popular</span>}
        </div>
        <p className="text-3xl font-outfit font-bold tracking-tighter">{price}</p>
      </div>
      
      <ul className="space-y-4 mb-10">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm opacity-80 leading-snug">
            <span className={featured ? 'text-amber-500' : 'text-green-500'}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={onClick}
        className={`w-full py-5 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all ${featured ? 'bg-white text-black' : 'bg-black text-white'}`}
      >
        Choose {name}
      </button>
    </div>
  );
}
