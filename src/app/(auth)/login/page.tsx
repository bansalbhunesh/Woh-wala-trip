'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/trips');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white selection:bg-cooked-bg selection:text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
           <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-vibe">The Gateway</p>
           <h1 className="text-5xl font-cinematic font-medium text-cooked-bg leading-none">Woh Wala Trip</h1>
           <p className="text-sm text-gray-400 font-data font-light">Your friendships, narrated.</p>
        </div>

        {step === 'phone' ? (
          <>
            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe ml-1">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-5 text-xl font-data focus:outline-none focus:ring-2 focus:ring-cooked-accent/20 focus:bg-white transition-all"
                placeholder="+91 98765 43210"
                autoFocus
              />
              <button
                onClick={sendOtp}
                disabled={loading || phone.length < 10}
                className="w-full py-5 bg-cooked-bg text-white rounded-full disabled:opacity-30 text-[10px] uppercase tracking-[0.3em] font-vibe font-bold shadow-xl shadow-cooked-bg/20 hover:scale-[1.02] transition-all"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe ml-1">The Lore Key (OTP)</label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-5 text-3xl font-vibe tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-cooked-accent/20 focus:bg-white transition-all"
                placeholder="000000"
                autoFocus
              />
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-5 bg-cooked-bg text-white rounded-full disabled:opacity-30 text-[10px] uppercase tracking-[0.3em] font-vibe font-bold shadow-xl shadow-cooked-bg/20 hover:scale-[1.02] transition-all"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
              <button
                onClick={() => setStep('phone')}
                className="w-full py-3 text-[10px] uppercase tracking-[0.1em] text-gray-400 font-vibe hover:text-cooked-bg transition-colors"
              >
                Change number
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl animate-slide-up">
            <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-vibe mb-1 font-bold">Access Denied</p>
            <p className="text-sm text-red-600 font-data font-medium leading-snug">{error}</p>
          </div>
        )}

        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
           <div className="pt-10 border-t border-gray-50 text-center space-y-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe">Developer Tools</p>
              <button 
                onClick={() => router.push('/trips')}
                className="text-[10px] uppercase tracking-widest font-vibe font-bold text-gray-400 hover:text-cooked-bg transition-colors"
              >
                Skip to Archive →
              </button>
           </div>
        )}
      </div>
    </div>
  );
}
