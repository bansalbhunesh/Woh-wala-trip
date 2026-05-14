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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAF8F4]">
      <div className="w-full max-w-sm">
        <header className="mb-12">
          <h1 className="text-4xl font-outfit font-medium mb-2 tracking-tight">Woh Wala Trip</h1>
          <p className="text-gray-500 font-inter">Your trips, narrated.</p>
        </header>
        
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {step === 'phone' ? (
            <>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  placeholder="+91 98765 43210"
                  autoFocus
                />
              </div>
              <button
                onClick={sendOtp}
                disabled={loading || phone.length < 10}
                className="btn-primary w-full shadow-premium"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">Enter the 6-digit code</label>
                <input
                  type="number"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  className="input-field text-2xl tracking-[1em] font-mono"
                  placeholder="123456"
                  autoFocus
                />
              </div>
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full shadow-premium"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
              <button
                onClick={() => setStep('phone')}
                className="w-full text-sm text-gray-400 hover:text-black transition-colors"
              >
                Change number
              </button>
            </>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}
        </div>
        
        <footer className="mt-24 text-center">
          <p className="text-xs text-gray-300 font-inter tracking-wide">MADE WITH ❤️ IN INDIA</p>
        </footer>
      </div>
    </div>
  );
}
