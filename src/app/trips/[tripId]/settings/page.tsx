'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function TripSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const {
    data: tripData,
    isLoading,
    refetch,
  } = trpc.trips.getFull.useQuery(
    { tripId },
    { refetchOnMount: true, refetchOnWindowFocus: false, staleTime: 30_000 }
  );

  const setStoryVisible = trpc.trips.setStoryVisible.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const supabase = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id ?? null);
      setAuthLoading(false);
    });
  }, []);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060604] text-[#F5F0E8]">
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid rgba(245,240,232,0.1)',
            borderTopColor: '#FF4D4D',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p className="font-mono text-[8px] uppercase tracking-[0.4em] mt-4 text-[#F5F0E8]/40">
          Loading settings...
        </p>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const trip = (tripData as any)?.trip;
  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060604] text-[#F5F0E8] p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[#FF4D4D] mb-4" />
        <h1 className="font-display font-black text-xl uppercase tracking-tight mb-2">
          Trip Not Found
        </h1>
        <p className="font-display italic text-sm text-[#F5F0E8]/40 mb-6">
          The requested archive is unreachable or missing.
        </p>
        <button
          onClick={() => router.push('/trips')}
          className="font-mono text-[9px] uppercase tracking-[0.3em] border border-white/20 px-6 py-3 rounded-full hover:bg-white/5 transition-all text-[#F5F0E8]/80 hover:text-white"
        >
          ← Return to Dashboard
        </button>
      </div>
    );
  }

  const isCreator = currentUserId !== null && trip.creator_id === currentUserId;

  if (!isCreator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060604] text-[#F5F0E8] p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[#FF4D4D] mb-4" />
        <h1 className="font-display font-black text-xl uppercase tracking-tight mb-2">
          Access Restrained
        </h1>
        <p className="font-display italic text-sm text-[#F5F0E8]/40 mb-6">
          Only the director of this trip is authorized to modify control settings.
        </p>
        <button
          onClick={() => router.push(`/trips/${tripId}`)}
          className="font-mono text-[9px] uppercase tracking-[0.3em] border border-white/20 px-6 py-3 rounded-full hover:bg-white/5 transition-all text-[#F5F0E8]/80 hover:text-white"
        >
          ← Back to Scene Hub
        </button>
      </div>
    );
  }

  const storyVisible = trip.story_visible !== false;

  const handleToggle = () => {
    setStoryVisible.mutate({ tripId, visible: !storyVisible });
  };

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col font-sans relative overflow-hidden">
      {/* Cinematic subtle background light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-[0.03]"
          style={{ background: '#FF4D4D' }}
        />
        <div
          className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[120px] opacity-[0.03]"
          style={{ background: '#2D9E8B' }}
        />
      </div>

      <header className="z-10 px-6 py-8 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => router.push(`/trips/${tripId}`)}
          className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.35em] text-[#F5F0E8]/45 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Scene Hub
        </button>
        <div className="font-mono text-[8px] text-[#F5F0E8]/25 uppercase tracking-[0.40em]">
          Dossier Config
        </div>
      </header>

      <main className="flex-1 z-10 max-w-xl mx-auto w-full px-6 py-12 space-y-12">
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.6em] text-[#FF4D4D]">
            ● Director Controls
          </p>
          <h1 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tighter leading-none">
            {trip.name}
          </h1>
          <p className="font-display italic text-sm text-[#F5F0E8]/40">
            Configure public visibility and archive settings for this documentary season.
          </p>
        </div>

        {/* Visibility Setting Card */}
        <section className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[#F5F0E8]/50">
                01 / STORY SHARING
              </h2>
              <h3 className="font-display font-black text-lg text-[#F5F0E8]/90">
                Public Story Page
              </h3>
              <p className="text-xs text-[#F5F0E8]/40 leading-relaxed max-w-sm">
                When enabled, anyone with your invite code can view the public web documentary at{' '}
                <span className="font-mono text-[#F5F0E8]/60 underline">
                  /t/{trip.invite_code}/story
                </span>
                . Turn off to hide it.
              </p>
            </div>

            <button
              onClick={handleToggle}
              disabled={setStoryVisible.isPending}
              aria-label={storyVisible ? 'Hide public story' : 'Show public story'}
              className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200  mt-1"
              style={{
                background: storyVisible ? 'rgba(45,158,139,0.7)' : 'rgba(0,0,0,0.15)',
                opacity: setStoryVisible.isPending ? 0.6 : 1,
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                style={{ transform: storyVisible ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          <div className="pt-6 border-t border-white/5 flex items-center gap-3 text-xs text-[#F5F0E8]/55">
            {storyVisible ? (
              <>
                <Eye className="w-4 h-4 text-[#2D9E8B]" />
                <span>
                  The story is currently{' '}
                  <strong className="text-[#2D9E8B] font-semibold">visible</strong> to the public.
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-[#FF4D4D]" />
                <span>
                  The story is currently{' '}
                  <strong className="text-[#FF4D4D] font-semibold">hidden</strong>. Visitors see a
                  placeholder page.
                </span>
              </>
            )}
          </div>
        </section>

        {/* Export Setting Card */}
        <section className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] space-y-6">
          <div className="space-y-1">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#F5F0E8]/50">
              02 / OFFLINE BACKUP
            </h2>
            <h3 className="font-display font-black text-lg text-[#F5F0E8]/90">
              Export Trip Archive
            </h3>
            <p className="text-xs text-[#F5F0E8]/40 leading-relaxed max-w-md">
              Download a complete ZIP file containing your structured trip lore, character
              descriptions, and 24-hour signed URLs for all uploaded photos.
            </p>
          </div>

          <button
            onClick={() => {
              window.open(`/api/trips/${tripId}/export`, '_blank');
            }}
            className="w-full py-4 rounded-xl font-mono text-[9px] uppercase tracking-[0.3em] bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all active:scale-[0.98]"
          >
            Download Archive (.zip)
          </button>
        </section>
      </main>
    </div>
  );
}
