import { Suspense } from 'react';
import CinematicAuth from '@/components/experience/CinematicAuth';

export const metadata = {
  title: 'Sign in — Yaarlore',
  description: 'Enter your email to receive a one-time code.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <CinematicAuth />
    </Suspense>
  );
}

// Visible skeleton — shows the form structure immediately so users never see a black screen
function LoginSkeleton() {
  return (
    <div
      style={{
        background: '#060604',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 8,
            letterSpacing: '0.7em',
            textTransform: 'uppercase',
            color: 'rgba(255,140,30,0.4)',
            marginBottom: 16,
          }}
        >
          ● MEMORY GATEWAY
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontWeight: 900,
            fontSize: 'clamp(40px, 7vw, 64px)',
            letterSpacing: '-0.02em',
            color: 'rgba(245,240,232,0.85)',
            lineHeight: 0.9,
            textTransform: 'uppercase',
            marginBottom: 32,
          }}
        >
          IDENTIFY
          <br />
          <em style={{ color: '#FFA020', fontStyle: 'italic' }}>YOURSELF</em>
        </h1>
        <div
          style={{
            height: 60,
            background: 'rgba(245,240,232,0.06)',
            border: '1px solid rgba(245,240,232,0.18)',
            borderRadius: 14,
          }}
        />
      </div>
    </div>
  );
}
