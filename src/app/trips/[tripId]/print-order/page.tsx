'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';

const SPECS = [
  'Hardcover, 20–40 pages',
  'AI-designed layout per trip',
  'Every era gets its own spread',
  'Character cards printed inside',
  'Receipt page included',
  'Delivered pan-India',
  'Gift packaging available',
];

export default function PrintOrderPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const submit = async () => {
    if (status === 'submitting' || status === 'done') return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/print-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, name }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#060604] flex flex-col px-6 py-8 relative overflow-hidden">
      {/* Atmospheric grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      <button
        onClick={() => router.push(`/trips/${tripId}/upgrade`)}
        className="text-xs font-vibe uppercase tracking-widest text-white/30 hover:text-white/55 transition-colors mb-12 self-start"
      >
        ← Back
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {status === 'done' ? (
          <div
            className="text-center space-y-6"
            style={{ animation: 'print-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{
                background: 'rgba(45,158,139,0.12)',
                border: '1px solid rgba(45,158,139,0.35)',
              }}
            >
              <span className="text-2xl" style={{ color: 'rgba(45,158,139,0.9)' }}>
                ✓
              </span>
            </div>
            <h2 className="text-3xl font-cinematic font-medium text-white leading-tight">
              You&apos;re on the list
            </h2>
            <p className="text-sm font-data font-light text-white/45 leading-relaxed">
              We&apos;ll email you the moment print orders open for this trip. The archive is
              already sealed — we just need to bind it.
            </p>
            <button
              onClick={() => router.push(`/trips/${tripId}`)}
              className="text-[10px] font-vibe uppercase tracking-widest text-white/30 hover:text-white/55 transition-colors"
            >
              ← Back to trip
            </button>
          </div>
        ) : (
          <div
            className="space-y-10"
            style={{ animation: 'print-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <div className="space-y-3">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/30 font-vibe">
                Printed Book
              </p>
              <h1 className="text-5xl font-cinematic font-medium text-white leading-[0.9]">
                Bind the
                <br />
                Lore
              </h1>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-vibe font-bold" style={{ color: '#FF4D4D' }}>
                  ₹799
                </span>
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-vibe">
                  per book · coming soon
                </span>
              </div>
            </div>

            <ul className="space-y-3">
              {SPECS.map((spec, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm font-data font-light text-white/55"
                >
                  <span className="w-1 h-1 rounded-full bg-chill-accent/70 flex-shrink-0" />
                  {spec}
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={60}
                  className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm font-data font-light py-3 outline-none"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
              </div>

              <button
                onClick={submit}
                disabled={status === 'submitting'}
                className="w-full py-5 rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-40"
                style={{
                  background: status === 'submitting' ? 'rgba(255,77,77,0.2)' : '#FF4D4D',
                  color: '#060604',
                  boxShadow: status !== 'submitting' ? '0 0 40px rgba(255,77,77,0.2)' : 'none',
                }}
              >
                {status === 'submitting' ? 'Registering…' : 'Notify me when ready →'}
              </button>

              {status === 'error' && (
                <p
                  className="text-center text-[9px] font-mono uppercase tracking-widest"
                  style={{ color: 'rgba(255,77,77,0.7)' }}
                >
                  Something went wrong — try again or email hello@yaarlore.app
                </p>
              )}

              <p className="text-center text-[8px] uppercase tracking-[0.3em] text-white/20 font-vibe pt-2">
                No payment now · We&apos;ll reach out when print opens
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes print-rise {
          from {
            opacity: 0;
            transform: translateY(24px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}
