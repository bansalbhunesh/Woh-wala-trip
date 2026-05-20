// Route-level loading shell. Appears during server-component data fetching.
// Kept intentionally minimal — fast render, no client JS, matches brand feel.
export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#060604', color: '#F5F0E8' }}
    >
      <div className="w-2 h-2 rounded-full glow-pulse-red" style={{ background: '#FF4D4D' }} />
      <p
        className="font-mono text-[9px] uppercase tracking-[0.5em]"
        style={{ color: 'rgba(245,240,232,0.25)' }}
      >
        Yaarlore
      </p>
    </div>
  );
}
