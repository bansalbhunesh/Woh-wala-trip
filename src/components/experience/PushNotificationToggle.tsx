'use client';

import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATION TOGGLE
// Shows only when push is supported and not yet subscribed.
// Design: subtle, contextual, never intrusive.
// Surfaces on the generating page (high motivation moment) and settings.
// ─────────────────────────────────────────────────────────────────────────────
export function PushNotificationToggle({
  context = 'default',
}: {
  context?: 'generating' | 'default';
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check push support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);

    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub);
      })
    );

    // Check if dismissed
    setDismissed(localStorage.getItem('push_dismissed') === '1');
  }, []);

  if (!supported || subscribed || dismissed || !VAPID_PUBLIC_KEY) return null;

  const handleSubscribe = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setDismissed(true);
        localStorage.setItem('push_dismissed', '1');
        return;
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as string,
      });

      const subJson = sub.toJSON();

      // Send to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[push] subscription failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('push_dismissed', '1');
  };

  if (context === 'generating') {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl mt-4"
        style={{ background: 'rgba(212,158,45,0.08)', border: '1px solid rgba(212,158,45,0.15)' }}
      >
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#D49E2D]/80">
            Get notified when lore is ready
          </p>
          <p className="font-mono text-[7px] text-white/25 mt-0.5">
            The generation takes 3-5 minutes. We&apos;ll ping you.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="font-mono text-[7px] text-white/20 hover:text-white/40 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-4 py-2 rounded-xl font-mono font-black text-[8px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            style={{
              background: 'rgba(212,158,45,0.12)',
              border: '1px solid rgba(212,158,45,0.35)',
              color: '#D49E2D',
            }}
          >
            {loading ? '...' : 'Notify me →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/40">
          ◉ Enable notifications
        </p>
        <p className="font-mono text-[7px] text-white/20 mt-0.5">
          Lore ready · Dispute results · Battle verdicts
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="font-mono text-[7px] text-white/15 hover:text-white/30"
        >
          Later
        </button>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="px-3 py-2 rounded-xl font-mono font-black text-[7px] uppercase tracking-wider disabled:opacity-40"
          style={{
            background: 'rgba(45,158,139,0.1)',
            border: '1px solid rgba(45,158,139,0.25)',
            color: 'rgba(45,158,139,0.85)',
          }}
        >
          {loading ? '...' : 'Enable →'}
        </button>
      </div>
    </div>
  );
}
