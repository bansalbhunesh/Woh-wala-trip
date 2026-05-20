'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sentry = (window as unknown as { Sentry?: { captureException: (e: unknown) => void } })
        .Sentry;
      sentry?.captureException(error);
    }
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#060604', color: '#F5F0E8' }}
    >
      <div className="film-grain pointer-events-none" />

      <div className="relative z-10 space-y-5 max-w-sm">
        <p
          className="font-mono text-[9px] uppercase tracking-[0.6em]"
          style={{ color: 'rgba(255,77,77,0.55)' }}
        >
          ● SIGNAL LOST
        </p>

        <h1
          className="font-display font-black uppercase leading-[0.88] tracking-tighter"
          style={{ fontSize: 'clamp(32px, 8vw, 60px)' }}
        >
          Something
          <br />
          <em className="italic" style={{ color: 'rgba(255,77,77,0.7)' }}>
            broke
          </em>
        </h1>

        <p
          className="font-display italic text-sm leading-relaxed"
          style={{ color: 'rgba(245,240,232,0.4)' }}
        >
          The archive hit an unexpected error. Your data is safe — this is on us.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{ background: '#F5F0E8', color: '#060604', border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest transition-all"
            style={{
              border: '1px solid rgba(245,240,232,0.15)',
              color: 'rgba(245,240,232,0.7)',
              textDecoration: 'none',
            }}
          >
            ← Yaarlore
          </a>
        </div>

        {error?.digest && (
          <p
            className="font-mono text-[8px] pt-2"
            style={{ color: 'rgba(245,240,232,0.2)', letterSpacing: '0.2em' }}
          >
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
