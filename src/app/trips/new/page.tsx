'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ChevronLeft, Sparkles } from 'lucide-react';

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName]             = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (trip) => router.push(`/trips/${trip.id}/invite`),
  });

  const isReady = name.trim() && startDate && endDate && !createTrip.isPending;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      <div className="relative z-10 max-w-xl mx-auto px-6 pt-10 pb-20">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-10 text-[10px] font-ui font-bold uppercase tracking-widest transition-colors group"
          style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="space-y-2 mb-10">
          <p className="text-[9px] font-ui font-bold uppercase tracking-[0.45em]"
             style={{ color: 'var(--text-muted)' }}>New Archive</p>
          <h1 className="font-display font-black tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(36px, 6vw, 64px)', color: 'var(--text)' }}>
            New <em className="italic" style={{ color: 'var(--accent)' }}>Season</em>
          </h1>
          <p className="text-sm font-display italic" style={{ color: 'var(--text-muted)' }}>
            "Every disaster starts with a group chat and a date."
          </p>
        </div>

        <div className="space-y-0" style={{ border: '1.5px solid var(--border)', borderRadius: '1.5rem', overflow: 'hidden', background: 'var(--bg-surface)' }}>
          <Field label="Season Title" value={name} onChange={setName}
                 placeholder="e.g. The Bus That Betrayed Us" first />
          <Field label="Location" value={destination} onChange={setDestination}
                 placeholder="e.g. Coimbatore at 2 AM" />
          <Field label="Start Date" value={startDate} onChange={setStartDate} type="date" />
          <Field label="End Date" value={endDate} onChange={setEndDate} type="date" last />
        </div>

        <button
          onClick={() => createTrip.mutate({ name, destination: destination || undefined, startDate, endDate })}
          disabled={!isReady}
          className="mt-6 w-full py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-35 flex items-center justify-center gap-3"
          style={{ background: isReady ? 'var(--text)' : 'var(--bg-surface)', color: isReady ? 'var(--bg)' : 'var(--text-muted)', border: isReady ? 'none' : '1.5px solid var(--border)' }}>
          <Sparkles size={16} className={createTrip.isPending ? 'animate-spin' : ''} />
          {createTrip.isPending ? 'Creating…' : 'Launch the Season →'}
        </button>

        {createTrip.error && (
          <p className="mt-4 text-center text-sm font-ui" style={{ color: 'var(--accent)' }}>
            {createTrip.error.message}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', first, last }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; first?: boolean; last?: boolean;
}) {
  return (
    <div className="px-6 py-5" style={!last ? { borderBottom: '1px solid var(--border)' } : {}}>
      <label className="block text-[9px] font-ui font-bold uppercase tracking-[0.35em] mb-2"
             style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-base font-ui font-semibold outline-none"
        style={{ color: 'var(--text)' }}
        autoFocus={first}
      />
    </div>
  );
}
