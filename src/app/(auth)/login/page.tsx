'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const AMBIENT_PHRASES = [
  '"The Golden Retriever has been identified."',
  '"Chaos Index: 87. Historically cooked."',
  '"Your photo dump is now mythology."',
  '"NPC Energy: 2/10. Still valid."',
  '"The inside jokes have been archived."',
];

export default function LoginPage() {
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp]     = useState('');
  const [step, setStep]   = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % AMBIENT_PHRASES.length), 3200);
    return () => clearInterval(t);
  }, []);

  const sendOtp = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) setError(error.message);
    else setStep('otp');
  };

  const verifyOtp = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setLoading(false);
    if (error) setError(error.message);
    else router.push('/trips');
  };

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-cooked-accent selection:text-white">
      {/* Film grain */}
      <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04] mix-blend-overlay animate-grain bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27noise%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23noise)%27/%3E%3C/svg%3E')] bg-[length:180px_180px]" />

      {/* Ambient glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-[180px] bg-cooked-accent pointer-events-none" />

      {/* Rotating ambient phrase */}
      <div className="absolute top-10 left-0 right-0 text-center text-[10px] font-mono text-white/10 uppercase tracking-[0.3em] px-4 transition-all duration-1000">
        {AMBIENT_PHRASES[phraseIdx]}
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 bg-white/5 text-[9px] font-vibe font-black uppercase tracking-[0.4em] text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
            The Gateway
          </div>
          <h1 className="text-6xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] uppercase">
            Woh<br />Wala<br /><span className="italic text-cooked-accent">Trip</span>
          </h1>
          <p className="text-sm text-white/25 font-cinematic italic">Your friendships, narrated.</p>
        </div>

        {/* Form */}
        {step === 'phone' ? (
          <div className="space-y-4">
            <label className="block text-[9px] uppercase tracking-[0.3em] text-white/30 font-vibe font-black">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl font-data text-[#F5F0E8] placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/8 transition-all"
              placeholder="+91 98765 43210"
              autoFocus
            />
            <button
              onClick={sendOtp}
              disabled={loading || phone.length < 10}
              className="w-full py-5 bg-[#F5F0E8] text-black rounded-full disabled:opacity-20 text-[10px] uppercase tracking-[0.4em] font-vibe font-black hover:scale-[1.02] active:scale-95 transition-all shadow-3xl"
            >
              {loading ? 'Sending...' : 'Enter the Archive'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-[9px] uppercase tracking-[0.3em] text-white/30 font-vibe font-black">The Lore Key</label>
            <input
              type="number"
              value={otp}
              onChange={e => setOtp(e.target.value.slice(0, 6))}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-3xl font-mono tracking-[0.6em] text-center text-[#F5F0E8] focus:outline-none focus:border-white/20 transition-all"
              placeholder="000000"
              autoFocus
            />
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full py-5 bg-[#F5F0E8] text-black rounded-full disabled:opacity-20 text-[10px] uppercase tracking-[0.4em] font-vibe font-black hover:scale-[1.02] active:scale-95 transition-all shadow-3xl"
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full py-3 text-[10px] uppercase tracking-[0.2em] text-white/20 font-vibe hover:text-white/40 transition-colors"
            >
              Change number
            </button>
          </div>
        )}

        {error && (
          <div className="p-5 bg-cooked-accent/10 border border-cooked-accent/20 rounded-2xl">
            <p className="text-[9px] uppercase tracking-[0.3em] text-cooked-accent font-vibe font-black mb-1">Access Denied</p>
            <p className="text-sm text-cooked-accent/70 font-data leading-snug">{error}</p>
          </div>
        )}

        {/* Dev skip — only rendered client-side to avoid hydration mismatch */}
        {process.env.NODE_ENV === 'development' && (
          <div className="pt-8 border-t border-white/5 text-center">
            <button
              onClick={() => router.push('/trips')}
              className="text-[9px] uppercase tracking-widest font-vibe font-black text-white/15 hover:text-white/30 transition-colors"
            >
              Skip to Archive →
            </button>
          </div>
        )}
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-[9px] uppercase tracking-[0.4em] text-white/10 font-vibe">
        Season 2026 · AI Friendship Lore
      </div>
    </div>
  );
}
