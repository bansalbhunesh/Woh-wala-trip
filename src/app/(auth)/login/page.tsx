'use client';
import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const E164_RE = /^\+[1-9]\d{9,14}$/;

function normalizePhone(raw: string) {
  return raw.replace(/[\s\-\(\)]/g, '');
}

function friendlyError(msg: string): string {
  if (/unsupported_phone/i.test(msg) || /invalid.*phone/i.test(msg))
    return 'Use international format: +91 98765 43210';
  if (/rate.*limit/i.test(msg) || /too many/i.test(msg))
    return 'Too many attempts. Try again in a few minutes.';
  if (/otp.*expired/i.test(msg) || /token.*expired/i.test(msg))
    return 'Code expired — request a new one.';
  if (/invalid.*otp/i.test(msg) || /wrong.*code/i.test(msg) || /invalid.*token/i.test(msg))
    return 'Wrong code. Double-check and try again.';
  return msg;
}

const AMBIENT = [
  'Chaos Index: 87. Historically cooked.',
  'The Golden Retriever has been identified.',
  'Your photo dump is now mythology.',
  'NPC Energy: 2/10. Still valid.',
  'The inside jokes have been archived.',
];

export default function LoginPage() {
  const [phone, setPhone] = useState('+91 ');
  const [otp, setOtp]     = useState(['', '', '', '', '', '']);
  const [step, setStep]   = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [formatHint, setFormatHint] = useState(false);
  const [phraseIdx, setPhraseIdx]   = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router  = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % AMBIENT.length), 3500);
    return () => clearInterval(t);
  }, []);

  const sendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!E164_RE.test(normalized)) {
      setFormatHint(true);
      return;
    }
    setFormatHint(false);
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);
    if (error) setError(friendlyError(error.message));
    else { setStep('otp'); setTimeout(() => otpRefs.current[0]?.focus(), 80); }
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const focusIdx = Math.min(digits.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const verifyOtp = async () => {
    const token = otp.join('');
    if (token.length !== 6) return;
    setLoading(true); setError('');
    const normalized = normalizePhone(phone);
    const { error } = await supabase.auth.verifyOtp({ phone: normalized, token, type: 'sms' });
    setLoading(false);
    if (error) setError(friendlyError(error.message));
    else router.push('/trips');
  };

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col md:flex-row">
      <div className="light-grain" />

      {/* Left panel — decorative */}
      <div className="hidden md:flex md:w-[45%] relative overflow-hidden items-center justify-center p-12"
           style={{ background: 'oklch(93% 0.018 55)' }}>
        {/* Layered blobs */}
        <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-60 animate-float-a"
             style={{ background: 'oklch(88% 0.06 40)' }} />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-50 animate-float-b"
             style={{ background: 'oklch(85% 0.05 180)' }} />
        <div className="absolute top-[40%] left-[35%] w-[40%] h-[40%] rounded-full opacity-40 animate-float-c"
             style={{ background: 'oklch(90% 0.04 280)' }} />

        {/* Content */}
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

          <p className="font-display italic text-sm leading-relaxed"
             style={{ color: 'oklch(40% 0.015 60)' }}>
            "Your friendships,<br />narrated."
          </p>

          {/* Rotating phrase */}
          <p className="text-[10px] font-ui font-semibold uppercase tracking-[0.25em] transition-all duration-700"
             style={{ color: 'oklch(50% 0.015 60)' }}>
            {AMBIENT[phraseIdx]}
          </p>

          {/* Mini archetype chips */}
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

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm space-y-10">

          {/* Mobile brand */}
          <div className="md:hidden text-center space-y-2">
            <p className="font-display font-black text-4xl tracking-tight" style={{ color: 'var(--text)' }}>
              Woh Wala <em className="italic" style={{ color: 'var(--accent)' }}>Trip</em>
            </p>
          </div>

          {step === 'phone' ? (
            <>
              <div className="space-y-1">
                <h1 className="font-display font-black text-3xl tracking-tight" style={{ color: 'var(--text)' }}>
                  Enter the<br /><em className="italic" style={{ color: 'var(--accent)' }}>Archive</em>
                </h1>
                <p className="text-sm font-ui" style={{ color: 'var(--text-muted)' }}>
                  We'll send you a code. No passwords.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-ui font-bold uppercase tracking-widest"
                         style={{ color: 'var(--text-muted)' }}>
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setFormatHint(false); }}
                    onKeyDown={e => e.key === 'Enter' && sendOtp()}
                    className="w-full rounded-2xl px-5 py-4 text-lg font-ui font-semibold outline-none transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1.5px solid ${formatHint ? 'var(--accent)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                    placeholder="+91 98765 43210"
                    autoFocus
                  />
                  {formatHint && (
                    <p className="text-xs font-ui animate-slide-up"
                       style={{ color: 'var(--accent)' }}>
                      Use international format: +91 98765 43210
                    </p>
                  )}
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading || phone.replace(/[\s\-\(\)]/g, '').length < 10}
                  className="w-full py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}
                >
                  {loading ? 'Sending…' : 'Send Code →'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="font-display font-black text-3xl tracking-tight" style={{ color: 'var(--text)' }}>
                  Enter the<br /><em className="italic" style={{ color: 'var(--accent)' }}>Code</em>
                </h1>
                <p className="text-sm font-ui" style={{ color: 'var(--text-muted)' }}>
                  Sent to {phone}
                </p>
              </div>

              <div className="space-y-6">
                {/* 6-box OTP */}
                <div className="flex gap-2.5 justify-between" onPaste={handleOtpPaste}>
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      className="w-full aspect-square rounded-xl text-center text-2xl font-display font-black outline-none transition-all"
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1.5px solid ${d ? 'var(--accent)' : 'var(--border)'}`,
                        color: 'var(--text)',
                        boxShadow: d ? '0 0 0 3px oklch(60% 0.22 25 / 0.12)' : 'none',
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}
                >
                  {loading ? 'Verifying…' : 'Unlock →'}
                </button>

                <button
                  onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }}
                  className="w-full py-2 text-[10px] font-ui font-bold uppercase tracking-widest transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ← Change number
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="px-5 py-4 rounded-2xl animate-slide-up"
                 style={{ background: 'oklch(60% 0.22 25 / 0.08)', border: '1px solid oklch(60% 0.22 25 / 0.2)' }}>
              <p className="text-sm font-ui font-medium" style={{ color: 'var(--accent)' }}>
                {error}
              </p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <div className="pt-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => router.push('/trips')}
                className="text-[9px] font-ui font-bold uppercase tracking-widest transition-colors hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                Skip → Archive (dev)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
