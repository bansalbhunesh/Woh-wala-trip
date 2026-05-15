'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AMBIENT = [
  'Chaos Index: 87. Historically cooked.',
  'The Golden Retriever has been identified.',
  'Your photo dump is now mythology.',
  'NPC Energy: 2/10. Still valid.',
  'The inside jokes have been archived.',
];

function LoginForm() {
  const [email, setEmail]       = useState('');
  const [step, setStep]         = useState<'email' | 'sent'>('email');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [formatHint, setFormatHint] = useState(false);
  const [phraseIdx, setPhraseIdx]   = useState(0);
  const router   = useRouter();
  const params   = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  // Show error if callback returned ?error=auth_failed
  useEffect(() => {
    if (params.get('error') === 'auth_failed') {
      setError('Magic link expired or invalid. Request a new one.');
    }
  }, [params]);

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % AMBIENT.length), 3500);
    return () => clearInterval(t);
  }, []);

  const sendLink = async () => {
    if (!EMAIL_RE.test(email.trim())) { setFormatHint(true); return; }
    setFormatHint(false);
    setLoading(true); setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      if (
        /over_email_send_rate_limit/i.test(error.message) ||
        /rate.*limit/i.test(error.message) ||
        /too many/i.test(error.message) ||
        (error as { code?: string }).code === 'over_email_send_rate_limit'
      )
        setError('You just requested a link. Wait 60 seconds before requesting another.');
      else
        setError(error.message);
    } else {
      setStep('sent');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      {/* Left panel */}
      <div className="hidden md:flex md:w-[45%] relative overflow-hidden items-center justify-center p-12"
           style={{ background: 'oklch(93% 0.018 55)' }}>
        <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-60 animate-float-a"
             style={{ background: 'oklch(88% 0.06 40)' }} />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-50 animate-float-b"
             style={{ background: 'oklch(85% 0.05 180)' }} />
        <div className="absolute top-[40%] left-[35%] w-[40%] h-[40%] rounded-full opacity-40 animate-float-c"
             style={{ background: 'oklch(90% 0.04 280)' }} />

        <div className="relative z-10 text-center space-y-8 max-w-xs">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-ui font-bold uppercase tracking-[0.3em]"
               style={{ background: 'oklch(30% 0.02 60 / 0.08)', color: 'oklch(35% 0.02 60)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            Season 2026 Open
          </div>
          <h2 className="font-display font-black tracking-tight leading-[0.85]"
              style={{ fontSize: 'clamp(40px, 6vw, 72px)', color: 'oklch(16% 0.015 60)' }}>
            Woh<br />Wala<br /><em className="italic" style={{ color: 'var(--accent)' }}>Trip</em>
          </h2>
          <p className="font-display italic text-sm leading-relaxed" style={{ color: 'oklch(40% 0.015 60)' }}>
            "Your friendships,<br />narrated."
          </p>
          <p className="text-[10px] font-ui font-semibold uppercase tracking-[0.25em]"
             style={{ color: 'oklch(50% 0.015 60)' }}>
            {AMBIENT[phraseIdx]}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['⚡ Chaos Source', '🐈‍⬛ Black Cat', '🐕 Golden Retriever'].map(a => (
              <span key={a} className="px-3 py-1.5 rounded-full text-[9px] font-ui font-bold uppercase tracking-wider"
                    style={{ background: 'oklch(30% 0.02 60 / 0.07)', color: 'oklch(40% 0.015 60)' }}>
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm space-y-10">

          <div className="md:hidden text-center">
            <p className="font-display font-black text-4xl tracking-tight">
              Woh Wala <em className="italic" style={{ color: 'var(--accent)' }}>Trip</em>
            </p>
          </div>

          {step === 'email' ? (
            <>
              <div className="space-y-1">
                <h1 className="font-display font-black text-3xl tracking-tight" style={{ color: 'var(--text)' }}>
                  Enter the<br /><em className="italic" style={{ color: 'var(--accent)' }}>Archive</em>
                </h1>
                <p className="text-sm font-ui" style={{ color: 'var(--text-muted)' }}>
                  We'll email you a magic link. No password needed.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-ui font-bold uppercase tracking-widest"
                         style={{ color: 'var(--text-muted)' }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFormatHint(false); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && sendLink()}
                    className="w-full rounded-2xl px-5 py-4 text-base font-ui font-semibold outline-none transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1.5px solid ${formatHint ? 'var(--accent)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                    placeholder="you@example.com"
                    autoFocus
                  />
                  {formatHint && (
                    <p className="text-xs font-ui animate-slide-up" style={{ color: 'var(--accent)' }}>
                      Enter a valid email address.
                    </p>
                  )}
                </div>

                <button
                  onClick={sendLink}
                  disabled={loading || !email.trim()}
                  className="w-full py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}>
                  {loading ? 'Sending…' : 'Send Magic Link →'}
                </button>
              </div>
            </>
          ) : (
            /* Sent state */
            <div className="space-y-8 text-center animate-slide-up">
              <div className="text-6xl">📬</div>
              <div className="space-y-2">
                <h1 className="font-display font-black text-3xl tracking-tight" style={{ color: 'var(--text)' }}>
                  Check your<br /><em className="italic" style={{ color: 'var(--accent)' }}>Email</em>
                </h1>
                <p className="text-sm font-ui" style={{ color: 'var(--text-muted)' }}>
                  Magic link sent to
                </p>
                <p className="text-sm font-ui font-bold" style={{ color: 'var(--text)' }}>
                  {email}
                </p>
              </div>

              <div className="px-5 py-4 rounded-2xl text-left"
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-ui font-bold uppercase tracking-widest mb-2"
                   style={{ color: 'var(--text-muted)' }}>How it works</p>
                <ol className="space-y-1.5 text-sm font-ui" style={{ color: 'var(--text-muted)' }}>
                  <li>1. Open the email from Woh Wala Trip</li>
                  <li>2. Click the <strong style={{ color: 'var(--text)' }}>"Log In"</strong> button</li>
                  <li>3. You're in — no password needed</li>
                </ol>
              </div>

              <button
                onClick={() => { setStep('email'); setError(''); }}
                className="text-[10px] font-ui font-bold uppercase tracking-widest transition-colors hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}>
                ← Use a different email
              </button>

              <button
                onClick={sendLink}
                disabled={loading}
                className="block w-full text-[10px] font-ui font-bold uppercase tracking-widest transition-colors hover:opacity-70 disabled:opacity-40"
                style={{ color: 'var(--text-muted)' }}>
                {loading ? 'Resending…' : 'Resend link'}
              </button>
            </div>
          )}

          {error && (
            <div className="px-5 py-4 rounded-2xl animate-slide-up"
                 style={{ background: 'oklch(60% 0.22 25 / 0.08)', border: '1px solid oklch(60% 0.22 25 / 0.2)' }}>
              <p className="text-sm font-ui font-medium" style={{ color: 'var(--accent)' }}>{error}</p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <div className="pt-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => router.push('/trips')}
                className="text-[9px] font-ui font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-muted)' }}>
                Skip → Archive (dev)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg)' }} />}>
      <LoginForm />
    </Suspense>
  );
}
