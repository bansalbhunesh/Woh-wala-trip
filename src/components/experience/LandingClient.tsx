'use client';
import dynamic from 'next/dynamic';

const CinematicLanding = dynamic(() => import('./CinematicLanding'), {
  ssr: false,
  loading: () => <LandingSkeleton />,
});

// Dark loading skeleton that matches the new memory-constellation hero — no flash
function LandingSkeleton() {
  return (
    <div
      style={{
        background: '#060604',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 9,
          letterSpacing: '0.55em',
          textTransform: 'uppercase',
          color: 'rgba(255,77,77,0.4)',
        }}
      >
        ● AI MEMORY SYSTEM / INITIALISING
      </p>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '2px solid rgba(245,240,232,0.15)',
          borderTopColor: 'rgba(255,160,40,0.85)',
          animation: 'landing-spin 0.9s linear infinite',
        }}
      />
      <style>{`@keyframes landing-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function LandingClient() {
  return <CinematicLanding />;
}
