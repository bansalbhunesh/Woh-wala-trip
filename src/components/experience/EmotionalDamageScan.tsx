'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  members: any[];
}

export function EmotionalDamageScan({ members }: Props) {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !scanning && !scanComplete) {
          setScanning(true);
          setTimeout(() => setScanComplete(true), 2200);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [scanning, scanComplete]);

  const sorted = [...members]
    .filter((m: any) => m.role_chaos_rating != null)
    .sort((a: any, b: any) => (b.role_chaos_rating ?? 0) - (a.role_chaos_rating ?? 0))
    .slice(0, 4);

  if (sorted.length === 0) return null;

  return (
    <div
      ref={ref}
      className="relative rounded-2xl overflow-hidden my-6 p-6 space-y-4"
      style={{ background: 'rgba(255,77,77,0.04)', border: '1px solid rgba(255,77,77,0.1)' }}
    >
      {/* Scan status header */}
      <div className="flex items-center gap-3">
        <div
          className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]"
          style={{
            animation: scanning && !scanComplete ? 'pulse-soft 0.8s ease-in-out infinite' : 'none',
          }}
        />
        <p
          aria-live="polite"
          className="font-mono text-[8px] uppercase tracking-[0.45em]"
          style={{ color: scanComplete ? 'rgba(255,77,77,0.6)' : 'rgba(255,77,77,0.35)' }}
        >
          {scanComplete
            ? '● CHAOS SIGNATURE ANALYSIS COMPLETE'
            : scanning
              ? '◌ SCANNING CHAOS SIGNATURES...'
              : '● AWAITING SCAN'}
        </p>
      </div>

      {/* Member rows — reveal one by one after scan */}
      <div className="space-y-3">
        {sorted.map((m: any, i: number) => {
          const delay = 400 + i * 280;
          const name = m.display_name || m.role_title || '?';
          const rating = m.role_chaos_rating ?? 0;
          const barW = Math.round((rating / 10) * 100);
          const color = rating >= 8 ? '#FF4D4D' : rating >= 5 ? '#D49E2D' : '#2D9E8B';

          return (
            <div
              key={m.user_id || i}
              className="space-y-1.5"
              style={{
                opacity: scanComplete ? 1 : 0,
                transform: scanComplete ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-mono text-[9px] uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(245,240,232,0.55)' }}
                >
                  {name}
                </p>
                <p
                  className="font-mono text-[9px] font-bold tabular-nums"
                  aria-label={`Chaos rating: ${rating} out of 10`}
                  style={{ color }}
                >
                  {rating}/10
                </p>
              </div>
              <div
                className="h-0.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(245,240,232,0.06)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    background: color,
                    width: `${barW}%`,
                    boxShadow: `0 0 6px ${color}`,
                    transition: `width 0.8s cubic-bezier(0.16,1,0.3,1) ${delay + 200}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* The scan line — sweeps down */}
      {scanning && !scanComplete && (
        <div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.6), transparent)',
            animation: 'scan-sweep 2s linear forwards',
          }}
        />
      )}

      <style jsx>{`
        @keyframes pulse-soft {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
        @keyframes scan-sweep {
          from {
            top: 0;
          }
          to {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
}
