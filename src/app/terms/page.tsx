import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Yaarlore',
  description: 'Terms governing your use of the Yaarlore app.',
};

export default function TermsPage() {
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
          YAARLORE
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
            Terms of
            <br />
            <em className="italic" style={{ color: '#FF4D4D' }}>
              Service
            </em>
          </h1>
          <p className="font-data text-sm pt-2" style={{ color: 'rgba(245,240,232,0.35)' }}>
            Last updated: May 2025 &nbsp;·&nbsp; Effective immediately
          </p>
        </div>

        <div className="space-y-12 font-data">
          {/* Intro */}
          <section className="space-y-3">
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of Yaarlore,
              an AI-powered trip photo analysis app operated as an Indian startup (&quot;we&quot;,
              &quot;our&quot;, or &quot;the app&quot;) available at{' '}
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>yaarlore.app</span>. By creating an
              account or using the app, you agree to these Terms. If you do not agree, do not use
              the app.
            </p>
          </section>

          <Divider />

          {/* 1 — Eligibility */}
          <section className="space-y-5">
            <SectionLabel index="01" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Eligibility
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              You must be at least 13 years old to use the app. By using the app, you represent that
              you meet this requirement. If you are under 18, you confirm you have your parent or
              guardian&apos;s permission to use the service.
            </p>
          </section>

          <Divider />

          {/* 2 — Accounts */}
          <section className="space-y-5">
            <SectionLabel index="02" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Accounts &amp; Authentication
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              We use email one-time password (OTP) authentication — no passwords are stored. You are
              responsible for keeping your email account secure. If you suspect unauthorised access
              to your Yaarlore account, contact us immediately at{' '}
              <a
                href="mailto:bhuneshbansal20039888@gmail.com"
                className="underline underline-offset-2 hover:opacity-80"
                style={{ color: 'rgba(245,240,232,0.8)' }}
              >
                bhuneshbansal20039888@gmail.com
              </a>
              .
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              You may not create accounts on behalf of others without their consent, or use another
              person&apos;s email address to create an account.
            </p>
          </section>

          <Divider />

          {/* 3 — User content */}
          <section className="space-y-5">
            <SectionLabel index="03" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Your Content &amp; Rights
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              You retain full ownership of the photos and data you upload (&quot;Your
              Content&quot;). By uploading content, you grant us a limited, non-exclusive,
              royalty-free licence to store, transmit, and process Your Content solely to provide
              the service — including sending photos to our AI provider (Anthropic) for lore
              generation.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              This licence ends when you delete the content or close your account. We will not use
              Your Content for advertising, share it publicly, or sell it.
            </p>
            <div
              className="rounded-2xl p-5 space-y-2"
              style={{
                background: 'rgba(245,240,232,0.03)',
                border: '1px solid rgba(245,240,232,0.07)',
              }}
            >
              <p
                className="font-mono text-[9px] uppercase tracking-[0.4em]"
                style={{ color: 'rgba(255,77,77,0.5)' }}
              >
                YOU CONFIRM THAT YOUR CONTENT
              </p>
              <ul
                className="space-y-2"
                style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.875rem', lineHeight: 1.7 }}
              >
                <li>
                  — Is owned by you, or you have permission from all people depicted to upload it
                </li>
                <li>
                  — Does not contain illegal material (CSAM, non-consensual intimate imagery, etc.)
                </li>
                <li>— Does not infringe anyone else&apos;s copyright or privacy rights</li>
                <li>
                  — Does not depict graphic violence or content intended to harass individuals
                </li>
              </ul>
            </div>
          </section>

          <Divider />

          {/* 4 — AI-generated content */}
          <section className="space-y-5">
            <SectionLabel index="04" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              AI-Generated Lore
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              The app uses Anthropic&apos;s Claude AI to analyse your photos and generate narrative
              text (&quot;friendship lore&quot;). AI-generated content is provided for entertainment
              and personal memory purposes only.
            </p>
            <ul className="space-y-4">
              <ListItem
                label="Accuracy"
                body="AI-generated lore may not accurately represent events, people, or facts. Do not treat it as a factual record."
              />
              <ListItem
                label="Ownership"
                body="The AI-generated lore produced for your trip is made available to you for personal, non-commercial use. We do not claim ownership of the lore output produced from your photos."
              />
              <ListItem
                label="Sharing"
                body="You may share your trip lore with friends via the in-app share feature. Public sharing links reveal only the lore text and any photos you choose to include. You are responsible for the privacy of people depicted."
              />
            </ul>
          </section>

          <Divider />

          {/* 5 — Acceptable use */}
          <section className="space-y-5">
            <SectionLabel index="05" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Acceptable Use
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              You agree not to:
            </p>
            <ul
              className="space-y-3"
              style={{ color: 'rgba(245,240,232,0.6)', fontSize: '0.875rem', lineHeight: 1.7 }}
            >
              {[
                'Upload content that violates any applicable Indian or international law',
                'Attempt to reverse-engineer, scrape, or extract data from the app or its AI outputs at scale',
                'Use the app to harass, defame, or violate the privacy of others',
                "Circumvent authentication mechanisms or attempt to access other users' data",
                'Use automated scripts or bots to upload content or trigger AI generation at scale',
                "Resell or commercialise the app's lore output without our written permission",
              ].map((item, i) => (
                <li key={i} className="flex gap-3" style={{ paddingLeft: '0.5rem' }}>
                  <span style={{ color: 'rgba(255,77,77,0.4)', flexShrink: 0 }}>—</span>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              We reserve the right to suspend or terminate accounts that violate these rules, with
              or without notice depending on the severity.
            </p>
          </section>

          <Divider />

          {/* 6 — Free & paid tiers */}
          <section className="space-y-5">
            <SectionLabel index="06" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Service &amp; Pricing
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              The app is currently offered free of charge. We may introduce paid tiers in the
              future; if so, pricing, features, and billing terms will be clearly communicated
              before any charge is applied. No payment details are collected through the app at this
              time.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              We reserve the right to modify, limit, or discontinue any free features at any time
              with reasonable notice.
            </p>
          </section>

          <Divider />

          {/* 7 — No warranty */}
          <section className="space-y-5">
            <SectionLabel index="07" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              No Warranty
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              The app is provided{' '}
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>&quot;as is&quot;</span> and{' '}
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>&quot;as available&quot;</span>{' '}
              without any warranty of any kind, express or implied, including but not limited to
              warranties of merchantability, fitness for a particular purpose, or uninterrupted
              availability.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              AI-generated content may be inaccurate, incomplete, or unintentionally offensive. We
              are not liable for any reliance placed on AI outputs. The service depends on
              third-party infrastructure (Supabase, Anthropic, Vercel) and we do not guarantee
              uptime or data availability.
            </p>
          </section>

          <Divider />

          {/* 8 — Limitation of liability */}
          <section className="space-y-5">
            <SectionLabel index="08" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Limitation of Liability
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              To the fullest extent permitted by Indian law, we shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of the
              app, including loss of data, loss of profits, or damage arising from reliance on
              AI-generated content.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              Our total aggregate liability for any claim arising out of these Terms or your use of
              the service shall not exceed ₹1,000 (Indian Rupees one thousand) or the amount you
              paid us in the previous 12 months, whichever is greater.
            </p>
          </section>

          <Divider />

          {/* 9 — Intellectual property */}
          <section className="space-y-5">
            <SectionLabel index="09" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Intellectual Property
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              All app design, branding, code, and non-user-generated content is owned by Woh Wala
              Trip or its licensors. You may not copy, reproduce, or create derivative works of the
              app&apos;s interface or branding without written permission.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              &quot;Yaarlore&quot; and associated visual identity are unregistered trademarks of the
              operator. All rights reserved.
            </p>
          </section>

          <Divider />

          {/* 10 — Governing law */}
          <section className="space-y-5">
            <SectionLabel index="10" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Governing Law &amp; Disputes
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              These Terms are governed by the laws of India. Any disputes arising out of or in
              connection with these Terms shall be subject to the exclusive jurisdiction of the
              courts located in India. We encourage resolving disputes amicably — please contact us
              before initiating any formal proceeding.
            </p>
          </section>

          <Divider />

          {/* 11 — Changes */}
          <section className="space-y-5">
            <SectionLabel index="11" />
            <h2
              className="font-cinematic font-black text-2xl uppercase tracking-tight"
              style={{ color: 'rgba(245,240,232,0.92)' }}
            >
              Changes to These Terms
            </h2>
            <p style={{ color: 'rgba(245,240,232,0.65)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
              We may update these Terms as the app grows. Material changes will be communicated via
              the &quot;Last updated&quot; date at the top of this page and, where practical, via
              email. Continued use of the app after changes take effect constitutes acceptance.
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
              Questions about these Terms:{' '}
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
        <p
          className="font-mono text-[7.5px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(245,240,232,0.15)' }}
        >
          YAARLORE
        </p>
        <Link
          href="/privacy"
          className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          style={{ color: 'rgba(245,240,232,0.2)' }}
        >
          Privacy Policy →
        </Link>
      </footer>
    </div>
  );
}

/* ─── Helper components ───────────────────────────────────────── */

function SectionLabel({ index }: { index: string }) {
  return (
    <p
      className="font-mono text-[8px] uppercase tracking-[0.5em]"
      style={{ color: 'rgba(245,240,232,0.2)' }}
    >
      § {index}
    </p>
  );
}

function Divider() {
  return (
    <div
      className="w-full h-px"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(245,240,232,0.08), transparent)',
      }}
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
      <p
        className="font-cinematic font-black text-[13px] uppercase tracking-wide"
        style={{ color: 'rgba(245,240,232,0.75)' }}
      >
        {label}
      </p>
      <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '0.875rem', lineHeight: 1.7 }}>
        {body}
      </p>
    </li>
  );
}
