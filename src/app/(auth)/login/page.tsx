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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-medium mb-2">Woh Wala Trip</h1>
        <p className="text-sm text-gray-500 mb-8">Your trips, narrated.</p>

        {step === 'phone' ? (
          <>
            <label className="block text-xs text-gray-500 mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border-b border-gray-300 py-3 text-lg focus:outline-none focus:border-black"
              placeholder="+91 98765 43210"
              autoFocus
            />
            <button
              onClick={sendOtp}
              disabled={loading || phone.length < 10}
              className="w-full mt-8 py-4 bg-black text-white rounded-xl disabled:opacity-30 text-base font-medium"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <label className="block text-xs text-gray-500 mb-1">Enter the 6-digit code</label>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              className="w-full border-b border-gray-300 py-3 text-2xl tracking-widest focus:outline-none focus:border-black"
              placeholder="123456"
              autoFocus
            />
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full mt-8 py-4 bg-black text-white rounded-xl disabled:opacity-30 text-base font-medium"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full mt-4 py-3 text-sm text-gray-500"
            >
              Change number
            </button>
          </>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
