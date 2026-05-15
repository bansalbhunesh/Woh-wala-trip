'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { CinematicShell } from '@/components/experience/CinematicShell';

const FIELD_LABELS: Record<string, string> = {
  name: 'SEASON TITLE',
  destination: 'FILMING LOCATION',
  startDate: 'PREMIERE DATE',
  endDate: 'FINALE DATE',
};

const FIELD_HINTS: Record<string, string> = {
  name: '"The Bus That Betrayed Us"',
  destination: '"Midnight Coimbatore"',
  startDate: '',
  endDate: '',
};

export default function NewTripPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ name: '', destination: '', startDate: '', endDate: '' });
  const [active, setActive] = useState<string | null>(null);

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (trip) => router.push(`/trips/${trip.id}/invite`),
  });

  const isReady = fields.name.trim() && fields.startDate && fields.endDate && !createTrip.isPending;

  return (
    <CinematicShell intensity={0.3}>
      <div className="film-grain" />

      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-12">

          {/* Header */}
          <div className="space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,77,77,0.5)' }}>
              ● INITIALIZING NEW TIMELINE
            </p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85]"
                style={{ fontSize: 'clamp(36px, 7vw, 72px)', color: 'rgba(245,240,232,0.92)' }}>
              NEW <em className="italic" style={{ color: '#FF4D4D' }}>SEASON</em>
            </h1>
            <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.25)' }}>
              "Every disaster starts with a date and a group chat."
            </p>
          </div>

          {/* Fields — terminal style */}
          <div className="space-y-1 rounded-2xl overflow-hidden"
               style={{ border: '1px solid rgba(245,240,232,0.07)', background: 'rgba(245,240,232,0.02)' }}>
            {(Object.keys(fields) as Array<keyof typeof fields>).map((key, idx) => (
              <div
                key={key}
                className="relative px-7 py-5 transition-all duration-300"
                style={{
                  borderBottom: idx < 3 ? '1px solid rgba(245,240,232,0.05)' : 'none',
                  background: active === key ? 'rgba(255,77,77,0.04)' : 'transparent',
                }}
              >
                <label className="block font-mono text-[7.5px] uppercase tracking-[0.5em] mb-2"
                       style={{ color: active === key ? 'rgba(255,77,77,0.6)' : 'rgba(245,240,232,0.25)' }}>
                  {FIELD_LABELS[key]}
                </label>
                <input
                  type={key.includes('Date') ? 'date' : 'text'}
                  value={fields[key]}
                  onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                  onFocus={() => setActive(key)}
                  onBlur={() => setActive(null)}
                  placeholder={FIELD_HINTS[key]}
                  autoFocus={key === 'name'}
                  className="w-full bg-transparent outline-none font-ui font-semibold text-base"
                  style={{
                    color: 'rgba(245,240,232,0.85)',
                    caretColor: '#FF4D4D',
                    colorScheme: 'dark',
                  }}
                />
                {active === key && (
                  <div className="absolute bottom-0 left-7 right-7 h-px"
                       style={{ background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.6), transparent)' }} />
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="space-y-4">
            <button
              onClick={() => createTrip.mutate({ name: fields.name, destination: fields.destination || undefined, startDate: fields.startDate, endDate: fields.endDate })}
              disabled={!isReady}
              className="w-full py-5 rounded-2xl font-ui font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-500 disabled:opacity-25 flex items-center justify-center gap-3"
              style={{
                background: isReady ? 'rgba(255,77,77,0.15)' : 'rgba(245,240,232,0.04)',
                border: `1px solid ${isReady ? 'rgba(255,77,77,0.5)' : 'rgba(245,240,232,0.08)'}`,
                color: isReady ? 'rgba(255,77,77,0.95)' : 'rgba(245,240,232,0.2)',
                boxShadow: isReady ? '0 0 30px rgba(255,77,77,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (isReady) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 50px rgba(255,77,77,0.3)'; }}
              onMouseLeave={e => { if (isReady) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(255,77,77,0.15)'; }}
            >
              {createTrip.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full" style={{ border: '1px solid rgba(255,77,77,0.4)', borderTopColor: '#FF4D4D', animation: 'spin 0.8s linear infinite' }} />
                  INITIALIZING TIMELINE...
                </>
              ) : (
                'LAUNCH THE SEASON →'
              )}
            </button>

            <button onClick={() => router.back()}
                    className="w-full py-2 font-mono text-[8px] uppercase tracking-[0.4em] transition-opacity hover:opacity-60"
                    style={{ color: 'rgba(245,240,232,0.2)' }}>
              ← ABORT
            </button>
          </div>

          {createTrip.error && (
            <div className="px-5 py-3 rounded-full text-center font-mono text-[8px] uppercase tracking-[0.3em]"
                 style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', color: 'rgba(255,77,77,0.8)' }}>
              {createTrip.error.message}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </CinematicShell>
  );
}
