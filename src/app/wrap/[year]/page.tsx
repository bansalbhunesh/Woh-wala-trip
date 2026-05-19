'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { analytics } from '@/lib/analytics';
import { createBrowserClient } from '@supabase/ssr';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface WrapJson {
  headline?: string;
  chaos_average?: number;
  trip_count?: number;
  top_destination?: string;
  year_verdict?: string;
  era_title?: string;
  superlative?: string;
  chaos_tier?: string;
  destinations?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAOS TIER COLOUR MAP
// ─────────────────────────────────────────────────────────────────────────────
function tierColor(tier?: string): string {
  switch (tier) {
    case 'Certified Unhinged':
      return '#FF4D4D';
    case 'Cooked':
      return '#D49E2D';
    case 'Simmering':
      return '#7C6AFF';
    default:
      return '#2D9E8B';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WRAP VIEWER
// ─────────────────────────────────────────────────────────────────────────────
function WrapViewer({
  wrap,
  year,
  userId,
}: {
  wrap: { wrap_json: WrapJson; status: string; trip_ids: string[] };
  year: number;
  userId?: string;
}) {
  const wj = wrap.wrap_json;
  const color = tierColor(wj?.chaos_tier);

  return (
    <main className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center py-16 px-6 relative overflow-hidden">
      {/* Background atmospheric glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${color}18, transparent 60%)`,
        }}
      />

      {/* Header eyebrow */}
      <p
        className="font-mono text-[8px] uppercase tracking-[0.55em] mb-6 relative z-10"
        style={{ color: `${color}80` }}
      >
        ● YAARLORE YEARLY WRAP
      </p>

      {/* Year + era title */}
      <div className="text-center space-y-2 mb-12 relative z-10">
        <h1
          className="font-black uppercase tracking-tighter leading-none"
          style={{ fontSize: 'clamp(56px, 12vw, 120px)', color }}
        >
          {year}
        </h1>
        {wj?.era_title && (
          <p className="font-mono text-sm uppercase tracking-widest text-white/40">
            &ldquo;{wj.era_title}&rdquo;
          </p>
        )}
      </div>

      {/* Headline */}
      {wj?.headline && (
        <div
          className="w-full max-w-2xl text-center mb-10 relative z-10 px-6 py-8 rounded-3xl"
          style={{ background: `${color}0D`, border: `1px solid ${color}30` }}
        >
          <p className="font-black text-2xl md:text-3xl tracking-tight leading-snug">
            {wj.headline}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="w-full max-w-lg grid grid-cols-3 gap-4 mb-10 relative z-10">
        {[
          { label: 'Trips', value: wj?.trip_count ?? wrap.trip_ids.length },
          {
            label: 'Avg Chaos',
            value: wj?.chaos_average != null ? `${wj.chaos_average}/100` : '—',
          },
          { label: 'Chaos Tier', value: wj?.chaos_tier ?? '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="text-center px-4 py-5 rounded-2xl"
            style={{
              background: 'rgba(245,240,232,0.04)',
              border: '1px solid rgba(245,240,232,0.08)',
            }}
          >
            <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/30 mb-1">
              {label}
            </p>
            <p className="font-black text-lg" style={{ color }}>
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Year verdict */}
      {wj?.year_verdict && (
        <blockquote className="w-full max-w-xl text-center italic font-light text-white/50 text-base leading-relaxed mb-10 relative z-10 px-4">
          &ldquo;{wj.year_verdict}&rdquo;
        </blockquote>
      )}

      {/* Destinations */}
      {wj?.destinations && wj.destinations.length > 0 && (
        <div className="w-full max-w-lg mb-10 relative z-10">
          <p className="font-mono text-[8px] uppercase tracking-[0.45em] text-white/25 mb-3 text-center">
            Places you survived
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {wj.destinations.map((d, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider"
                style={{
                  background: 'rgba(245,240,232,0.06)',
                  border: '1px solid rgba(245,240,232,0.1)',
                  color: 'rgba(245,240,232,0.55)',
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Superlative */}
      {wj?.superlative && (
        <div
          className="w-full max-w-sm text-center px-6 py-4 rounded-2xl mb-10 relative z-10"
          style={{ background: `${color}0A`, border: `1px solid ${color}25` }}
        >
          <p
            className="font-mono text-[8px] uppercase tracking-[0.5em] mb-2"
            style={{ color: `${color}80` }}
          >
            Yaarlore Verdict
          </p>
          <p className="font-black text-base tracking-tight">{wj.superlative}</p>
        </div>
      )}

      {/* Share row */}
      <ShareButton year={year} userId={userId} />

      {/* Back link */}
      <a
        href="/trips"
        className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/25 hover:text-white/60 transition-colors relative z-10 mt-4"
      >
        ← Back to trips
      </a>
    </main>
  );
}

function ShareButton({ year, userId }: { year: number; userId?: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/wrap/${year}` : `/wrap/${year}`;
  const cardUrl = userId ? `/api/card/wrap/${userId}/${year}` : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      analytics.wrapShared(year);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 relative z-10 mt-6 mb-2">
      <button
        onClick={handleCopy}
        className="px-8 py-3 rounded-full font-mono font-black text-[10px] uppercase tracking-[0.35em] transition-all hover:scale-105 active:scale-95"
        style={{
          background: copied ? 'rgba(45,158,139,0.12)' : 'rgba(255,77,77,0.1)',
          border: `1px solid ${copied ? 'rgba(45,158,139,0.4)' : 'rgba(255,77,77,0.35)'}`,
          color: copied ? 'rgba(45,158,139,0.95)' : 'rgba(255,77,77,0.9)',
        }}
      >
        {copied ? '✓ Link Copied!' : `↑ Share ${year} Wrap`}
      </button>
      {cardUrl && (
        <a
          href={cardUrl}
          download={`yaarlore-wrap-${year}.png`}
          className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/25 hover:text-white/50 transition-colors"
          onClick={() => analytics.wrapShared(year)}
        >
          ↓ Download card
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function GenerateWrapPrompt({ year }: { year: number }) {
  const router = useRouter();
  const generate = trpc.trips.generateYearlyWrap.useMutation({
    onSuccess: () => {
      // Refresh to show the processing state
      router.refresh();
    },
  });

  return (
    <main className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="font-mono text-[8px] uppercase tracking-[0.55em] mb-6 text-[#FF4D4D80]">
        ● YEARLY WRAP UNAVAILABLE
      </p>
      <h1
        className="font-black uppercase tracking-tighter leading-none mb-4"
        style={{ fontSize: 'clamp(56px, 10vw, 96px)', color: '#FF4D4D' }}
      >
        {year}
      </h1>
      <p className="font-mono text-sm text-white/40 mb-10 max-w-xs leading-relaxed">
        No wrap generated yet for {year}. Generate your yearly documentary from your completed
        trips.
      </p>

      <button
        onClick={() => generate.mutate({ year })}
        disabled={generate.isPending}
        className="px-10 py-4 rounded-full font-mono font-black text-[10px] uppercase tracking-[0.35em] transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
        style={{
          background: 'rgba(255,77,77,0.12)',
          border: '1px solid rgba(255,77,77,0.4)',
          color: 'rgba(255,77,77,0.95)',
          boxShadow: '0 0 30px rgba(255,77,77,0.12)',
        }}
      >
        {generate.isPending ? 'GENERATING...' : `GENERATE ${year} WRAP →`}
      </button>

      {generate.error && (
        <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-red-400/70 max-w-xs">
          {generate.error.message}
        </p>
      )}

      {generate.isSuccess && (
        <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-green-400/70">
          Processing — reload in a minute to see your wrap.
        </p>
      )}

      <a
        href="/trips"
        className="mt-8 font-mono text-[8px] uppercase tracking-[0.4em] text-white/25 hover:text-white/60 transition-colors"
      >
        ← Back to trips
      </a>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESSING STATE
// ─────────────────────────────────────────────────────────────────────────────
function ProcessingState({ year }: { year: number }) {
  return (
    <main className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="font-mono text-[8px] uppercase tracking-[0.55em] mb-6 text-[#D49E2D80] animate-pulse">
        ◌ WRITING YOUR {year} WRAP...
      </p>
      <h1
        className="font-black uppercase tracking-tighter leading-none mb-4 opacity-40"
        style={{ fontSize: 'clamp(56px, 10vw, 96px)', color: '#D49E2D' }}
      >
        {year}
      </h1>
      <p className="font-mono text-sm text-white/30 mb-10 max-w-xs leading-relaxed">
        The AI historian is reviewing your trips. This usually takes under a minute.
      </p>
      <a
        href="/trips"
        className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/25 hover:text-white/60 transition-colors"
      >
        ← Back to trips
      </a>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function WrapPage() {
  const params = useParams();
  const yearStr = params.year as string;
  const year = parseInt(yearStr, 10);
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? undefined));
  }, []);

  // Basic validation
  const validYear = !isNaN(year) && year >= 2020 && year <= 2030;

  const { data: wrap, isLoading } = trpc.trips.getYearlyWrap.useQuery(
    { year },
    {
      enabled: validYear,
      refetchInterval: query => {
        // Poll every 10s while processing
        if (query.state.data && (query.state.data as any)?.status === 'processing') return 10000;
        return false;
      },
    }
  );

  if (!validYear) {
    return (
      <main className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center">
        <p className="font-mono text-white/40">Invalid year.</p>
        <a
          href="/trips"
          className="mt-4 font-mono text-[9px] uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors"
        >
          ← Back
        </a>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#060604] text-[#F5F0E8] flex items-center justify-center">
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/20 animate-pulse">
          Loading...
        </p>
      </main>
    );
  }

  if (!wrap) {
    return <GenerateWrapPrompt year={year} />;
  }

  const status = (wrap as any)?.status;

  if (status === 'processing') {
    return <ProcessingState year={year} />;
  }

  if (status === 'failed' || !(wrap as any)?.wrap_json) {
    return <GenerateWrapPrompt year={year} />;
  }

  return <WrapViewer wrap={wrap as any} year={year} userId={userId} />;
}
