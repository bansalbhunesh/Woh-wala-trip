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
  
  const canSubmit = name && startDate && endDate && !createTrip.isPending;

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6">
      <header className="mb-12 pt-10">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 mb-8 shadow-sm active:scale-90 transition-all"
        >
          ←
        </button>
        <h1 className="text-3xl font-outfit font-medium tracking-tight">New trip</h1>
        <p className="text-gray-500 mt-1">Tell us where you went.</p>
      </header>
      
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Field
          label="Trip name"
          value={name}
          onChange={setName}
          placeholder="Goa 2024"
        />
        <Field
          label="Destination"
          value={destination}
          onChange={setDestination}
          placeholder="Goa"
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Start date"
            value={startDate}
            onChange={setStartDate}
            type="date"
          />
          <Field
            label="End date"
            value={endDate}
            onChange={setEndDate}
            type="date"
          />
        </div>
        
        <div className="pt-12">
          <button
            onClick={() => createTrip.mutate({
              name,
              destination: destination || undefined,
              startDate,
              endDate,
            })}
            disabled={!canSubmit}
            className="btn-primary w-full shadow-premium py-5 text-lg"
          >
            {createTrip.isPending ? 'Creating room...' : 'Create trip'}
          </button>
          
          {createTrip.error && (
            <p className="mt-4 text-center text-sm text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100">
              {createTrip.error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="group">
      <label className="block text-xs uppercase tracking-widest text-gray-400 font-medium mb-1 group-focus-within:text-black transition-colors">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  );
}
