'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function NewTripPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ name: '', destination: '', startDate: '', endDate: '' });
  const [active, setActive] = useState<string | null>(null);

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (trip) => router.push(`/trips/${trip.id}/invite`),
  });

  const isReady = fields.name.trim() && fields.startDate && fields.endDate && !createTrip.isPending;

  const LABELS: Record<string, string> = {
    name: 'SEASON TITLE', destination: 'FILMING LOCATION',
    startDate: 'PREMIERE DATE', endDate: 'FINALE DATE',
  };
  const HINTS: Record<string, string> = {
    name: '"The Bus That Betrayed Us"', destination: '"Midnight Coimbatore"',
    startDate: '', endDate: '',
  };

  return (
    /* Light cream — intentional contrast with dark cinematic pages */
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(97% 0.008 70)', color: 'oklch(16% 0.015 60)' }}>
      <div className="light-grain" />

      {/* Thin nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4"
           style={{ borderBottom: '1px solid oklch(87% 0.015 72)' }}>
        <button onClick={() => router.back()}
                className="font-mono text-[8px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
                style={{ color: 'oklch(52% 0.015 60)' }}>
          ← BACK
        </button>
        <span className="font-display italic font-black text-base tracking-tight"
              style={{ color: 'oklch(60% 0.22 25)' }}>
          woh wala trip
        </span>
        <div className="w-12" />
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-10">

          <div className="space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'oklch(60% 0.22 25)' }}>
              NEW ARCHIVE
            </p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85]"
                style={{ fontSize: 'clamp(40px, 7vw, 80px)', color: 'oklch(16% 0.015 60)' }}>
              NEW <em className="italic" style={{ color: 'oklch(60% 0.22 25)' }}>SEASON</em>
            </h1>
            <p className="font-display italic text-sm" style={{ color: 'oklch(52% 0.015 60)' }}>
              "Every disaster starts with a date and a group chat."
            </p>
          </div>

          {/* Editorial bottom-border fields */}
          <div className="space-y-0 rounded-2xl overflow-hidden"
               style={{ border: '1.5px solid oklch(87% 0.015 72)', background: 'oklch(93.5% 0.012 72)' }}>
            {(Object.keys(fields) as Array<keyof typeof fields>).map((key, idx) => (
              <div key={key} className="relative px-7 py-5 transition-colors duration-300"
                   style={{
                     borderBottom: idx < 3 ? '1px solid oklch(87% 0.015 72)' : 'none',
                     background: active === key ? 'oklch(96% 0.012 25 / 0.4)' : 'transparent',
                   }}>
                <label className="block font-mono text-[7.5px] uppercase tracking-[0.5em] mb-2 transition-colors duration-300"
                       style={{ color: active === key ? 'oklch(60% 0.22 25)' : 'oklch(52% 0.015 60)' }}>
                  {LABELS[key]}
                </label>
                <input
                  type={key.includes('Date') ? 'date' : 'text'}
                  value={fields[key]}
                  onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                  onFocus={() => setActive(key)}
                  onBlur={() => setActive(null)}
                  placeholder={HINTS[key]}
                  autoFocus={key === 'name'}
                  max={key.includes('Date') ? new Date().toISOString().split('T')[0] : undefined}
                  className="w-full bg-transparent outline-none font-ui font-semibold text-base"
                  style={{ color: 'oklch(16% 0.015 60)', caretColor: 'oklch(60% 0.22 25)', colorScheme: 'light' }}
                />
                <div className="absolute bottom-0 left-7 right-7 h-px transition-opacity duration-400"
                     style={{ background: 'oklch(60% 0.22 25)', opacity: active === key ? 0.5 : 0 }} />
              </div>
            ))}
          </div>

          <button
            onClick={() => createTrip.mutate({ name: fields.name, destination: fields.destination || undefined, startDate: fields.startDate, endDate: fields.endDate })}
            disabled={!isReady}
            className="w-full py-4 rounded-2xl font-ui font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all duration-400 disabled:opacity-30"
            style={{
              background: isReady ? 'oklch(16% 0.015 60)' : 'oklch(93.5% 0.012 72)',
              color: isReady ? 'oklch(97% 0.008 70)' : 'oklch(52% 0.015 60)',
              border: `1.5px solid ${isReady ? 'transparent' : 'oklch(87% 0.015 72)'}`,
            }}>
            {createTrip.isPending ? (
              <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'nt-spin 0.8s linear infinite' }} /> CREATING...</>
            ) : 'LAUNCH THE SEASON →'}
          </button>

          {createTrip.error && (
            <p className="text-center text-sm font-ui" style={{ color: 'oklch(60% 0.22 25)' }}>
              {createTrip.error.message}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes nt-spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
