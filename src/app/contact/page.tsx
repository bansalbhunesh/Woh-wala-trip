import Link from 'next/link';

export const metadata = {
  title: 'Contact — Yaarlore',
  description: 'Get in touch with the Yaarlore team.',
};

const CONTACT_ITEMS = [
  {
    label: 'General Enquiries',
    detail: 'Questions about the product, pricing, or features.',
    email: 'hello@yaarlore.app',
    subject: 'General Enquiry',
  },
  {
    label: 'Privacy & Data Requests',
    detail: 'Account deletion, data export, privacy concerns.',
    email: 'hello@yaarlore.app',
    subject: 'Privacy Request',
  },
  {
    label: 'Report a Problem',
    detail: 'Bugs, broken features, or technical issues.',
    email: 'hello@yaarlore.app',
    subject: 'Bug Report',
  },
  {
    label: 'Safety & Abuse',
    detail: 'Content violations or inappropriate use.',
    email: 'hello@yaarlore.app',
    subject: 'Safety Report',
  },
];

export default function ContactPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: '#060604', color: '#F5F0E8', fontFamily: 'var(--font-ui, system-ui)' }}
    >
      <div className="film-grain" />

      <header
        className="sticky top-0 z-20 flex items-center px-6 py-4"
        style={{
          borderBottom: '1px solid rgba(245,240,232,0.05)',
          background: 'rgba(6,6,4,0.85)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70"
          style={{ color: 'rgba(245,240,232,0.45)' }}
        >
          ← Back
        </Link>
        <span
          className="ml-auto font-mono text-[8px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(245,240,232,0.15)' }}
        >
          YAARLORE
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 pb-32">
        <div className="mb-14 space-y-3">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.55em]"
            style={{ color: 'rgba(255,77,77,0.5)' }}
          >
            ● GET IN TOUCH
          </p>
          <h1
            className="font-display font-black uppercase leading-[0.9] tracking-tighter"
            style={{ fontSize: 'clamp(36px, 7vw, 64px)', color: 'rgba(245,240,232,0.95)' }}
          >
            Contact
            <br />
            <em className="italic" style={{ color: '#FF4D4D' }}>
              Us
            </em>
          </h1>
          <p
            className="font-display italic text-base max-w-sm pt-1"
            style={{ color: 'rgba(245,240,232,0.45)' }}
          >
            We&apos;re a small team and we read every message. Typical response time is 1–2 business
            days.
          </p>
        </div>

        <div className="space-y-3 mb-14">
          {CONTACT_ITEMS.map(item => (
            <a
              key={item.label}
              href={`mailto:${item.email}?subject=${encodeURIComponent(item.subject)}`}
              className="group flex items-start justify-between gap-4 px-5 py-5 rounded-2xl transition-all"
              style={{
                background: 'rgba(245,240,232,0.025)',
                border: '1px solid rgba(245,240,232,0.07)',
              }}
            >
              <div className="space-y-1">
                <p
                  className="font-display font-black text-base uppercase tracking-tight"
                  style={{ color: 'rgba(245,240,232,0.85)' }}
                >
                  {item.label}
                </p>
                <p
                  className="font-display italic text-sm"
                  style={{ color: 'rgba(245,240,232,0.4)' }}
                >
                  {item.detail}
                </p>
                {/* Explicit mailto signal — prevents confusion about what clicking does */}
                <p
                  className="font-mono text-[9px] pt-1.5 flex items-center gap-1.5"
                  style={{ color: 'rgba(245,240,232,0.4)' }}
                >
                  <span style={{ color: 'rgba(245,240,232,0.25)' }}>✉</span>
                  {item.email}
                  <span
                    className="ml-1 uppercase tracking-wider"
                    style={{ color: 'rgba(245,240,232,0.2)' }}
                  >
                    · opens email
                  </span>
                </p>
              </div>
              <span
                className="font-mono text-sm flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform"
                style={{ color: 'rgba(245,240,232,0.3)' }}
              >
                →
              </span>
            </a>
          ))}
        </div>

        <div
          className="rounded-2xl px-6 py-5 space-y-2"
          style={{ background: 'rgba(45,158,139,0.06)', border: '1px solid rgba(45,158,139,0.15)' }}
        >
          <p
            className="font-mono text-[9px] uppercase tracking-[0.4em]"
            style={{ color: 'rgba(45,158,139,0.7)' }}
          >
            ✦ FASTEST RESPONSE
          </p>
          <p
            className="font-display italic text-sm"
            style={{ color: 'rgba(245,240,232,0.55)', lineHeight: 1.7 }}
          >
            For account-specific issues, include the email address you signed up with and a brief
            description of the problem. This helps us resolve your request without additional
            back-and-forth.
          </p>
        </div>

        <div
          className="mt-12 pt-8 flex gap-6 flex-wrap"
          style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}
        >
          <Link
            href="/privacy"
            className="font-mono text-[9px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(245,240,232,0.3)' }}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-mono text-[9px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(245,240,232,0.3)' }}
          >
            Terms of Service
          </Link>
          <Link
            href="/status"
            className="font-mono text-[9px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(245,240,232,0.3)' }}
          >
            System Status
          </Link>
        </div>
      </main>
    </div>
  );
}
