'use client';

// Root error boundary. Replaces Next.js' default error overlay with a
// brand-coherent shell so production crashes still feel like Yaarlore.
// Per-route segments can still ship their own error.tsx; this only catches
// the cases that bubble all the way up.
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward to Sentry if it's wired (no-op otherwise — we don't add a hard
    // dependency here so this stays a tiny static shell).
    if (typeof window !== 'undefined') {
      const sentry = (window as unknown as { Sentry?: { captureException: (e: unknown) => void } })
        .Sentry;
      sentry?.captureException(error);
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060604',
        color: '#F5F0E8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'monospace',
        gap: '1.25rem',
      }}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.6em',
          textTransform: 'uppercase',
          color: 'rgba(255,77,77,0.55)',
          margin: 0,
        }}
      >
        ● SIGNAL LOST
      </p>
      <h1
        style={{
          fontSize: 'clamp(28px, 7vw, 48px)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          margin: 0,
          lineHeight: 0.9,
        }}
      >
        Something broke
      </h1>
      <p
        style={{
          maxWidth: 360,
          fontSize: 13,
          color: 'rgba(245,240,232,0.4)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        The archive hit an unexpected error. Try again — your data is safe.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            fontSize: 10,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            fontWeight: 900,
            color: '#060604',
            background: '#F5F0E8',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            fontSize: 10,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.7)',
            border: '1px solid rgba(245,240,232,0.15)',
            textDecoration: 'none',
          }}
        >
          ← Yaarlore
        </a>
      </div>
      {error?.digest && (
        <p
          style={{ fontSize: 9, color: 'rgba(245,240,232,0.2)', margin: 0, letterSpacing: '0.2em' }}
        >
          ref: {error.digest}
        </p>
      )}
    </div>
  );
}
