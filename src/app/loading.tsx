// Brand-coherent loading shell. Replaces the default Next.js white flash so
// users on slow networks never see an un-styled blank screen. Kept tiny on
// purpose — no client JS, no animations beyond a single CSS keyframe.
export default function Loading() {
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
        gap: '1rem',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#FF4D4D',
          boxShadow: '0 0 18px rgba(255,77,77,0.6)',
          animation: 'yaarlore-pulse 1.2s ease-in-out infinite',
        }}
      />
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.5em',
          textTransform: 'uppercase',
          color: 'rgba(245,240,232,0.3)',
          margin: 0,
        }}
      >
        Yaarlore
      </p>
      <style>{`
        @keyframes yaarlore-pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
