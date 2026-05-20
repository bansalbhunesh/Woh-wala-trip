'use client';
import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';

interface Props {
  tripId: string;
  disabled?: boolean;
}

export function ConfessionInput({ tripId, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [heard, setHeard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = trpc.trips.submitConfession.useMutation({
    onSuccess: () => {
      setText('');
      setHeard(true);
      setTimeout(() => {
        setHeard(false);
        inputRef.current?.focus();
      }, 2400);
    },
  });

  const fire = () => {
    if (text.trim().length < 10 || submit.isPending) return;
    submit.mutate({ tripId, confession: text.trim() });
  };

  return (
    <div className="w-full" style={{ paddingTop: 4 }}>
      {heard ? (
        <p
          key="heard"
          className="font-cinematic italic text-[11px] text-center py-3"
          style={{
            color: 'rgba(45,158,139,0.55)',
            animation: 'cf-fade 0.4s ease',
          }}
        >
          heard.
        </p>
      ) : (
        <Booth
          inputRef={inputRef}
          value={text}
          onChange={setText}
          onSubmit={fire}
          isPending={submit.isPending}
          disabled={disabled}
          error={submit.error?.message}
        />
      )}
      <style jsx>{`
        @keyframes cf-fade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function Booth({
  inputRef,
  value,
  onChange,
  onSubmit,
  isPending,
  disabled = false,
  error,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-2">
      {/* PROD-01: Explicit disclosure shown before the user types — cannot claim surprise */}
      <p
        className="font-mono text-[8px] uppercase tracking-wider leading-relaxed transition-opacity"
        style={{ color: disabled ? 'rgba(255,200,100,0.2)' : 'rgba(255,200,100,0.55)' }}
      >
        ⚠ Your confession may appear in the AI-generated story shared with all trip members and
        publicly via the invite link.
      </p>
      <div
        className="relative"
        style={{
          borderBottom: `1px solid ${focused ? 'rgba(255,77,77,0.18)' : 'rgba(255,255,255,0.055)'}`,
          transition: 'border-color 0.25s',
        }}
      >
        <label htmlFor="confession-input" className="sr-only">
          Anonymous confession for the trip lore
        </label>
        <input
          id="confession-input"
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={disabled || isPending}
          placeholder={
            disabled
              ? 'Lore generation in progress...'
              : 'Something the group would never admit out loud…'
          }
          maxLength={500}
          autoComplete="off"
          className="w-full bg-transparent text-[13px] font-cinematic italic py-3 pr-10 outline-none leading-snug placeholder-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'rgba(245,240,232,0.6)', caretColor: '#FF4D4D' }}
        />

        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
          {isPending ? (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: '1px solid rgba(255,77,77,0.25)',
                borderTopColor: 'rgba(255,77,77,0.65)',
                animation: 'cf-spin 0.7s linear infinite',
              }}
            />
          ) : value.length >= 10 && !disabled ? (
            <button
              onClick={onSubmit}
              disabled={disabled}
              tabIndex={-1}
              className="font-mono text-[9px] transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'rgba(255,77,77,0.45)', letterSpacing: '0.05em', lineHeight: 1 }}
            >
              ↵
            </button>
          ) : null}
        </div>

        {error && (
          <p
            className="absolute -bottom-5 left-0 font-mono text-[7px] uppercase tracking-wider"
            style={{ color: 'rgba(255,77,77,0.5)' }}
          >
            {error.slice(0, 55)}
          </p>
        )}

        <style jsx>{`
          @keyframes cf-spin {
            to {
              transform: rotate(360deg) translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
