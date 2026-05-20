'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// ── Types ──────────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `t-${++counter.current}`;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastPortal toasts={toasts} />
    </ToastContext.Provider>
  );
}

// ── Portal container ──────────────────────────────────────────────────────────
function ToastPortal({ toasts }: { toasts: ToastItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <ToastPill key={t.id} item={t} />
      ))}
    </div>,
    document.body
  );
}

// ── Individual toast pill ─────────────────────────────────────────────────────
const VARIANTS: Record<ToastVariant, { bg: string; border: string; text: string; dot: string }> = {
  success: {
    bg: 'rgba(245,240,232,0.97)',
    border: 'rgba(245,240,232,0.15)',
    text: '#0A0A08',
    dot: '#22C55E',
  },
  error: {
    bg: 'rgba(20,8,8,0.96)',
    border: 'rgba(255,77,77,0.45)',
    text: '#F5F0E8',
    dot: '#FF4D4D',
  },
  info: {
    bg: 'rgba(12,11,9,0.96)',
    border: 'rgba(245,240,232,0.12)',
    text: '#F5F0E8',
    dot: '#FF4D4D',
  },
};

function ToastPill({ item }: { item: ToastItem }) {
  const c = VARIANTS[item.variant];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: 100,
        padding: '10px 22px 10px 16px',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.06) inset',
        animation: 'toast-rise 0.5s cubic-bezier(0.16,1,0.3,1) both',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: c.dot,
          flexShrink: 0,
          boxShadow: `0 0 6px ${c.dot}`,
        }}
      />
      {item.message}
    </div>
  );
}
