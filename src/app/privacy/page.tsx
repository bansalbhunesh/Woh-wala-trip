import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Woh Wala Trip',
  description: 'How Woh Wala Trip collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen bg-[#060604] text-[#F5F0E8]"
      style={{ fontFamily: 'var(--font-ui), system-ui, sans-serif' }}
    >
      {/* Film grain overlay */}
      <div className="film-grain" />

      {/* Top nav bar */}
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
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70"
          style={{ color: 'rgba(245,240,232,0.45)' }}
        >
          ← Back
        </Link>
        <span
          className="ml-auto font-mono text-[8px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(245,240,232,0.15)' }}
        >
          WOH WALA TRIP
        </span>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-2xl px-6 py-16 pb-32">

        {/* Header block */}
        <div className="mb-14 space-y-3">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.55em]"
            style={{ color: 'rgba(255,77,77,0.5)' }}
          >
            ● LEGAL DOCUMENT
          </p>
          <h1
            className="font-cinematic font-black uppercase leading-[0.9] tracking-tighter"
            style={{
              fontSize: 'clamp(36px, 7vw, 64px)',
              color: 'rgba(245,240,232,0.95)',
            }}
          >
            Privacy<br />
            <em className="italic" style={{ color: '#FF4D4D' }}>Policy</em>
          </h1>
          <p
            className="font-data text-sm pt-2"
            style={{ color: 'rgba(245,240,232,0.35)' }}
          >
            Last updated: May 2025 &nbsp;·&nbsp; Effective immediately
          </p>
        </div>

        <div className="space-y-12 font-data">

          {/* Intro */}
          <section className="space-y-3">
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              Woh Wala Trip (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) is an AI-powered trip photo analysis service
              operated as an Indian startup. This Privacy Policy explains what personal data we
              collect, why we collect it, how AI processes your photos, and your rights over
              that data. By using the app at{' '}
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>woh-wala-trip.vercel.app</span>,
              you agree to this policy.
            </p>
          </section>

          <Divider />

          {/* 1 — What data we collect */}
          <section className="space-y-5">
            <SectionLabel index="01" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              What Data We Collect
            </h2>
            <ul className="space-y-4">
              <ListItem
                label="Email address"
                body="Collected at sign-up and used only for one-time password (OTP) authentication. We never store passwords. Your email is used to identify your account and send occasional product updates (you can opt out at any time)."
              />
              <ListItem
                label="Trip photos"
                body="Photos you upload are stored securely in Supabase Storage (cloud object storage). Photos are used exclusively to generate AI-powered friendship lore for your trip. We do not use your photos for advertising, training public AI models, or any purpose beyond the lore generation you explicitly triggered."
              />
              <ListItem
                label="Trip metadata"
                body="Trip name, destination, dates, and member names you enter. Stored in a Supabase Postgres database."
              />
              <ListItem
                label="Usage data"
                body="Basic anonymised analytics (page views, feature interactions) may be collected via Vercel's built-in analytics to help us improve the product. No third-party ad-tracking scripts are used."
              />
              <ListItem
                label="Device / session data"
                body="Standard HTTP information (IP address, browser type) retained in server access logs for up to 30 days for security and debugging."
              />
            </ul>
          </section>

          <Divider />

          {/* 2 — How AI processes your photos */}
          <section className="space-y-5">
            <SectionLabel index="02" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              How AI Processes Your Photos
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              When you trigger lore generation, your uploaded photos are sent to{' '}
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>Anthropic&apos;s Claude API</span>{' '}
              (a third-party AI provider) for analysis. The Claude model reads visual content in
              your photos to produce narrative text — &quot;friendship lore&quot; — and no other output.
            </p>
            <div
              className="rounded-2xl p-5 space-y-2"
              style={{
                background: 'rgba(245,240,232,0.03)',
                border: '1px solid rgba(245,240,232,0.07)',
              }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.4em]" style={{ color: 'rgba(255,77,77,0.5)' }}>
                KEY POINTS
              </p>
              <ul className="space-y-2" style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                <li>— Photos are transmitted to Anthropic only for the duration of inference; Anthropic&apos;s data-handling is governed by their own{' '}
                  <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                    style={{ color: 'rgba(245,240,232,0.8)' }}>
                    Privacy Policy
                  </a>.
                </li>
                <li>— We do not use your photos to train any AI model ourselves.</li>
                <li>— AI-generated text is stored alongside your trip data and visible only to you and people you explicitly share the trip with.</li>
                <li>— No facial recognition is performed; the AI analyses scenes and activities, not identities.</li>
              </ul>
            </div>
          </section>

          <Divider />

          {/* 3 — Sharing of data */}
          <section className="space-y-5">
            <SectionLabel index="03" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              How We Share Your Data
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              We do not sell, rent, or trade your personal data. Data is shared only as follows:
            </p>
            <ul className="space-y-4">
              <ListItem
                label="Supabase"
                body="Our database and file storage provider. Data is stored on Supabase infrastructure under their terms. Supabase is SOC 2 Type II certified."
              />
              <ListItem
                label="Anthropic (Claude API)"
                body="Photos are sent for AI inference as described above. Anthropic acts as a data processor on our behalf."
              />
              <ListItem
                label="Vercel"
                body="Our hosting platform. Server logs and edge-network data pass through Vercel's infrastructure."
              />
              <ListItem
                label="Legal obligation"
                body="We may disclose data if required by Indian law, court order, or to protect the rights and safety of users."
              />
            </ul>
          </section>

          <Divider />

          {/* 4 — User rights */}
          <section className="space-y-5">
            <SectionLabel index="04" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              Your Rights Over Your Data
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              You have the following rights at any time:
            </p>
            <ul className="space-y-4">
              <ListItem
                label="Access"
                body="Request a copy of the personal data we hold about you."
              />
              <ListItem
                label="Correction"
                body="Ask us to correct inaccurate or incomplete data."
              />
              <ListItem
                label="Deletion"
                body="Request deletion of your account and all associated data — photos, trip lore, metadata, and email address. See the deletion policy section below."
              />
              <ListItem
                label="Data portability"
                body="Request your trip data in a machine-readable format (JSON). Email us with the subject line 'Data Export Request'."
              />
              <ListItem
                label="Withdrawal of consent"
                body="Stop using the app at any time. Requests to exercise any of these rights should be sent to bhuneshbansal20039888@gmail.com."
              />
            </ul>
          </section>

          <Divider />

          {/* 5 — Deletion policy */}
          <section className="space-y-5">
            <SectionLabel index="05" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              Deletion Policy
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              You can delete individual trips (and all photos within them) directly from the app at
              any time. Deleting a trip permanently removes photos from Supabase Storage and trip
              lore from the database within 24 hours.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              To delete your entire account, email{' '}
              <a
                href="mailto:bhuneshbansal20039888@gmail.com"
                className="underline underline-offset-2 hover:opacity-80"
                style={{ color: 'rgba(245,240,232,0.8)' }}
              >
                bhuneshbansal20039888@gmail.com
              </a>{' '}
              with the subject line <span style={{ color: 'rgba(245,240,232,0.8)' }}>&quot;Delete My Account&quot;</span>.
              We will permanently erase all your data within 7 days and confirm via email.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              Note: anonymised, aggregated analytics data (which cannot identify you) may be
              retained after account deletion for product-improvement purposes.
            </p>
          </section>

          <Divider />

          {/* 6 — Data security */}
          <section className="space-y-5">
            <SectionLabel index="06" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              Data Security
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              All data is transmitted over HTTPS/TLS. Files in Supabase Storage are encrypted at
              rest. We use row-level security (RLS) policies to ensure users can access only their
              own data. We do not store passwords — authentication is OTP-only via email.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              Despite these measures, no system is completely secure. In the unlikely event of a
              data breach that affects you, we will notify you via email within 72 hours of
              becoming aware of it.
            </p>
          </section>

          <Divider />

          {/* 7 — Children */}
          <section className="space-y-5">
            <SectionLabel index="07" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              Children&apos;s Privacy
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              The app is not directed at children under 13. We do not knowingly collect personal
              data from children. If you believe a child has provided us with personal data, please
              contact us and we will delete it promptly.
            </p>
          </section>

          <Divider />

          {/* 8 — Changes */}
          <section className="space-y-5">
            <SectionLabel index="08" />
            <h2 className="font-cinematic font-black text-2xl uppercase tracking-tight" style={{ color: 'rgba(245,240,232,0.92)' }}>
              Changes to This Policy
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              We may update this Privacy Policy as the app evolves. If we make material changes, we
              will update the &quot;Last updated&quot; date above and, where practical, send a notice to your
              registered email address. Continued use of the app after changes constitutes
              acceptance of the revised policy.
            </p>
          </section>

          <Divider />

          {/* Contact */}
          <section className="space-y-4">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.45em]"
              style={{ color: 'rgba(245,240,232,0.25)' }}
            >
              CONTACT
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              Questions or requests about this policy:{' '}
              <a
                href="mailto:bhuneshbansal20039888@gmail.com"
                className="underline underline-offset-2 hover:opacity-80"
                style={{ color: 'rgba(245,240,232,0.8)' }}
              >
                bhuneshbansal20039888@gmail.com
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-8 py-3 z-20"
        style={{
          borderTop: '1px solid rgba(245,240,232,0.04)',
          background: 'rgba(6,6,4,0.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="font-mono text-[7.5px] uppercase tracking-[0.5em]" style={{ color: 'rgba(245,240,232,0.15)' }}>
          WOH WALA TRIP
        </p>
        <Link href="/terms" className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          style={{ color: 'rgba(245,240,232,0.2)' }}>
          Terms of Service →
        </Link>
      </footer>
    </div>
  );
}

/* ─── Helper components ───────────────────────────────────────── */

function SectionLabel({ index }: { index: string }) {
  return (
    <p className="font-mono text-[8px] uppercase tracking-[0.5em]"
      style={{ color: 'rgba(245,240,232,0.2)' }}>
      § {index}
    </p>
  );
}

function Divider() {
  return (
    <div
      className="w-full h-px"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(245,240,232,0.08), transparent)' }}
    />
  );
}

function ListItem({ label, body }: { label: string; body: string }) {
  return (
    <li
      className="rounded-xl p-4 space-y-1"
      style={{
        background: 'rgba(245,240,232,0.025)',
        border: '1px solid rgba(245,240,232,0.06)',
      }}
    >
      <p className="font-cinematic font-black text-[13px] uppercase tracking-wide"
        style={{ color: 'rgba(245,240,232,0.75)' }}>
        {label}
      </p>
      <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '0.875rem', lineHeight: 1.7 }}>
        {body}
      </p>
    </li>
  );
}
