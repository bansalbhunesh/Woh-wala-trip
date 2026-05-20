import Link from 'next/link';

// Brand-coherent 404 — uses design-system fonts loaded by the root layout.
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#060604', color: '#F5F0E8' }}
      role="main"
    >
      <div className="film-grain pointer-events-none" />

      {/* Ghost 404 number */}
      <div
        className="font-display font-black select-none pointer-events-none absolute"
        style={{
          fontSize: 'clamp(180px, 30vw, 320px)',
          color: 'rgba(255,77,77,0.04)',
          lineHeight: 1,
          letterSpacing: '-0.04em',
          userSelect: 'none',
        }}
      >
        404
      </div>

      <div className="relative z-10 space-y-5 max-w-sm">
        <p
          className="font-mono text-[9px] uppercase tracking-[0.6em]"
          style={{ color: 'rgba(255,77,77,0.55)' }}
        >
          ● ARCHIVE MISSING
        </p>

        <h1
          className="font-display font-black uppercase leading-[0.88] tracking-tighter"
          style={{ fontSize: 'clamp(36px, 9vw, 72px)' }}
        >
          This page
          <br />
          <em className="italic" style={{ color: 'rgba(255,77,77,0.7)' }}>
            doesn&apos;t exist
          </em>
        </h1>

        <p
          className="font-display italic text-sm leading-relaxed"
          style={{ color: 'rgba(245,240,232,0.4)' }}
        >
          "We have no record of this page. The mythology you&apos;re looking for either never
          existed — or got lost in the archive."
        </p>

        <div
          className="inline-block font-mono text-[8px] uppercase tracking-[0.4em] px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,77,77,0.06)',
            border: '1px solid rgba(255,77,77,0.2)',
            color: 'rgba(255,77,77,0.6)',
          }}
        >
          COOKED SCORE: 0 / 100
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{ background: '#F5F0E8', color: '#060604' }}
          >
            ← Back to Yaarlore
          </Link>
          <Link
            href="/trips"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest transition-all"
            style={{
              border: '1px solid rgba(245,240,232,0.15)',
              color: 'rgba(245,240,232,0.7)',
            }}
          >
            My Archive
          </Link>
        </div>
      </div>
    </div>
  );
}
