import Link from 'next/link';

// Brand-coherent 404. Replaces the default Next.js framework 404 so a missing
// route still feels like Yaarlore.
export default function NotFound() {
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
        ● ARCHIVE MISSING
      </p>
      <h1
        style={{
          fontSize: 'clamp(36px, 9vw, 72px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          textTransform: 'uppercase',
          margin: 0,
          lineHeight: 0.9,
        }}
      >
        404
      </h1>
      <p
        style={{
          maxWidth: 320,
          fontSize: 13,
          color: 'rgba(245,240,232,0.4)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        We have no record of this page. The mythology you&apos;re looking for either never existed —
        or got lost in the archive.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.5rem',
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
      </Link>
    </div>
  );
}
