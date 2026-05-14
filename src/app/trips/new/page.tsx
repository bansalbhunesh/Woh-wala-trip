'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (trip) => {
      router.push(`/trips/${trip.id}/invite`);
    },
  });

  return (
    <div className="min-h-screen bg-white p-6">
      <header className="px-6 pt-20 pb-10">
        <button onClick={() => router.back()} className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-vibe mb-4 hover:text-black transition-colors">
          ← Cancel
        </button>
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-vibe mb-2">The Setup</p>
        <h1 className="text-5xl font-cinematic font-medium text-cooked-bg">New Season</h1>
      </header>

      <main className="px-6 space-y-10">
        <Field label="Season Title" value={name} onChange={setName} placeholder="The Goa Downfall" />
        <Field
          label="Location"
          value={destination}
          onChange={setDestination}
          placeholder="Goa, India"
        />
        <div className="grid grid-cols-2 gap-6">
          <Field label="Premiere" value={startDate} onChange={setStartDate} type="date" />
          <Field label="Finale" value={endDate} onChange={setEndDate} type="date" />
        </div>

        <button
          onClick={() =>
            createTrip.mutate({
              name,
              destination: destination || undefined,
              startDate,
              endDate,
            })
          }
          disabled={!name || !startDate || !endDate || createTrip.isPending}
          className="w-full py-6 bg-cooked-bg text-white rounded-full text-[10px] uppercase tracking-[0.3em] font-vibe font-bold shadow-2xl shadow-cooked-bg/20 hover:scale-[1.02] transition-all disabled:opacity-20"
        >
          {createTrip.isPending ? 'Preparing Archive...' : 'Start the Season'}
        </button>

        {createTrip.error && <p className="text-center text-[10px] uppercase tracking-widest text-red-500 font-vibe">{createTrip.error.message}</p>}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-5 text-lg font-data focus:outline-none focus:ring-2 focus:ring-cooked-accent/20 focus:bg-white transition-all"
      />
    </div>
  );
}
