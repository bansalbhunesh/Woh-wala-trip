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
      <header className="mb-8 pt-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4">
          ← Back
        </button>
        <h1 className="text-2xl font-medium">New trip</h1>
      </header>

      <div className="space-y-6">
        <Field label="Trip name" value={name} onChange={setName} placeholder="Goa 2024" />
        <Field
          label="Destination"
          value={destination}
          onChange={setDestination}
          placeholder="Goa"
        />
        <Field label="Start date" value={startDate} onChange={setStartDate} type="date" />
        <Field label="End date" value={endDate} onChange={setEndDate} type="date" />

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
          className="w-full py-4 bg-black text-white rounded-xl disabled:opacity-30 font-medium mt-12"
        >
          {createTrip.isPending ? 'Creating...' : 'Create trip'}
        </button>

        {createTrip.error && <p className="text-sm text-red-500">{createTrip.error.message}</p>}
      </div>
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
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-b border-gray-300 py-3 text-base focus:outline-none focus:border-black"
      />
    </div>
  );
}
