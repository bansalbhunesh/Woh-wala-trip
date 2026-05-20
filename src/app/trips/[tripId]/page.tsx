'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain } from '@/components/ui/atoms';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ArchiveNavbar,
  ArchiveHero,
  ArchiveFooter,
  LoreWrapped,
} from '@/components/cinematic/ArchiveRoom';
import {
  CinematicBreak,
  CookedLevelReveal,
  FriendshipExpose,
  DocumentaryEra,
  PlotTwistMoment,
  FriendshipVerdict,
  ClosingVerdict,
  EmotionalTimestamp,
  RecoveredArtifact,
  MemoryCollage,
  SuperlativeCard,
  StickyChapter,
  EvidenceBoard,
} from '@/components/cinematic/Documentary';
import { AnimatePresence } from 'framer-motion';
import { analytics } from '@/lib/analytics';
import { LoreCapsules } from '@/components/experience/LoreCapsules';
import { LoadingState, NotFoundState } from '@/components/experience/LoadingStates';
import dynamic from 'next/dynamic';

// PROOF-OF-LOVE strip-down: removed DeeperRecord (disputes + memory review +
// incidents), IncidentButton, ExportArchiveButton, RecurringIdentityWidget,
// and the entire DECLASSIFY-RAW-DATA toggle (CookedScoreLight, BadFeelingsChart,
// DonutChart, LightCastWidget). These were speculative retention surfaces with
// no behavioral evidence. The trip room's only job now is: present the lore,
// land the share. Everything else moved to /trips/[tripId]/settings or was deleted.

const GeneratingState = dynamic(
  () => import('@/components/experience/GeneratingState').then(mod => mod.GeneratingState),
  { ssr: false }
);
const FailedState = dynamic(
  () => import('@/components/experience/FailedState').then(mod => mod.FailedState),
  { ssr: false }
);
const UploadState = dynamic(
  () => import('@/components/experience/UploadState').then(mod => mod.UploadState),
  { ssr: false }
);
const EmotionalDamageScan = dynamic(
  () => import('@/components/experience/EmotionalDamageScan').then(mod => mod.EmotionalDamageScan),
  { ssr: false }
);
const ReferralShareWidget = dynamic(
  () => import('@/components/experience/TripWidgets').then(mod => mod.ReferralShareWidget),
  { ssr: false }
);
const StoryVisibilityToggle = dynamic(
  () => import('@/components/experience/TripWidgets').then(mod => mod.StoryVisibilityToggle),
  { ssr: false }
);

export default function TripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const [showWrapped, setShowWrapped] = useState(false); // start false — set true only after localStorage check
  // (Tab system removed earlier — content is linear scroll. The section IDs
  // below are still used as scroll anchors by the Chapter Deck cards in the hub.)

  const { data: tripData, isLoading, refetch } = trpc.trips.getFull.useQuery({ tripId });
  // Stable refetch ref — channel subscription dep array stays stable so the
  // WebSocket is never torn down and rebuilt unnecessarily between renders.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);
  const { data: photoList } = trpc.photos.list.useQuery({ tripId }, { enabled: !!tripId });

  // Single shared Supabase browser client — fixes the previous dual-client issue
  // where two createBrowserClient() calls created competing WebSocket connections.
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // PROD-02: Track current user ID so we can gate creator-only controls.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = supabaseRef.current;
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const hasSeen = localStorage.getItem(`wrapped_${tripId}`);
    if (!hasSeen) setShowWrapped(true);
    analytics.storyRevisited(tripId);
  }, [tripId]);

  // Realtime subscription — uses the shared supabase client (no duplicate WebSocket)
  const loreStatus = (tripData as any)?.trip?.lore_status;
  useEffect(() => {
    let mounted = true;
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`trip-status-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        payload => {
          if (!mounted) return;
          const newStatus = (payload.new as any)?.lore_status;
          if (newStatus === 'ready' || newStatus === 'failed') refetchRef.current();
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]); // refetch intentionally excluded — use refetchRef for stability

  useEffect(() => {
    if (loreStatus === 'ready' && !localStorage.getItem(`wrapped_${tripId}`)) {
      setShowWrapped(true);
    }
    // refetch intentionally excluded — this effect never calls refetch, the dep was spurious
  }, [loreStatus, tripId]);

  const handleFinishWrapped = () => {
    setShowWrapped(false);
    localStorage.setItem(`wrapped_${tripId}`, 'true');
  };

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const raw = tripData as any;
  // Normalize data shape
  const trip = {
    ...raw.trip,
    members: raw.members || [],
    stats: raw.stats || [],
    eras: raw.eras || [],
    cover_photo: raw.cover_photo || null,
  };

  const lore = trip.lore_json;
  const members = trip.members;

  // PROD-02: Derived flag — true only when the signed-in user is the trip creator.
  const isCreator = currentUserId !== null && trip.creator_id === currentUserId;

  // Find key cast members from lore or member roles
  const villain =
    members.find(
      (m: any) =>
        m.role_title?.toLowerCase().includes('villain') ||
        m.role_title?.toLowerCase().includes('chaos') ||
        m.role_chaos_rating >= 8
    ) || (members.length > 1 ? members[1] : undefined);

  const mvp =
    members.find(
      (m: any) =>
        m.role_title?.toLowerCase().includes('mvp') ||
        m.role_title?.toLowerCase().includes('retriever') ||
        (m.role_chaos_rating !== undefined && m.role_chaos_rating <= 4)
    ) || (members.length > 0 ? members[0] : undefined);

  const insideJoke = lore?.trip_lore_awards?.core_memory;

  const isReady = trip.lore_status === 'ready' && lore;
  const isProcessing = trip.lore_status === 'processing';
  const isFailed = trip.lore_status === 'failed';

  return (
    <div className="min-h-screen selection:bg-cooked-accent selection:text-white font-cinematic overflow-x-hidden transition-colors duration-300 bg-[#060604] text-[#F5F0E8]">
      <AnimatePresence>
        {showWrapped && isReady && (
          <ErrorBoundary name="lore-wrapped">
            <LoreWrapped trip={trip} onFinish={handleFinishWrapped} />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      <FilmGrain />
      <ArchiveNavbar trip={trip} />

      {/* Full-width hero outside the grid */}
      <div className="max-w-[1600px] mx-auto px-6 pt-12">
        {/* Pre-trip "prophecy" prediction card removed — it added a stacked
            retention surface before the user had any reason to care about it.
            Users land on this page to upload photos and unlock lore; that's the
            only flow that needs to be obvious. */}

        {isProcessing ? (
          <GeneratingState tripId={tripId} />
        ) : isFailed ? (
          <FailedState trip={trip} tripId={tripId} onRetry={() => refetch()} />
        ) : !isReady ? (
          <UploadState trip={trip} tripId={tripId} onPhotosChanged={() => refetch()} />
        ) : null}
      </div>

      {isReady && (
        <main className="max-w-[1600px] mx-auto px-6 pb-16">
          {/* Hero — full width */}
          <div className="py-10">
            <ArchiveHero trip={trip} />
          </div>

          {/* Lore Capsules — tap-to-unlock reveals (villain, MVP, core memory) */}
          {lore && <LoreCapsules lore={lore} members={members} tripId={tripId} />}

          {/* Letterboxed 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 items-start">
            {/* ── LEFT: documentary interactive visual deck ──────────────── */}
            <div className="space-y-6">
              {
                <div className="space-y-8">
                  {/* ① Delusion Index — giant emotional beat acts as hook */}
                  <ErrorBoundary name="cooked-level-reveal">
                    <CookedLevelReveal trip={trip} />
                  </ErrorBoundary>

                  {/* Visual Scene Selection Shelf */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div id="section-hub" className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase tracking-[0.45em] text-[#FF4D4D] font-vibe font-black">
                          ● CHAPTER DECK
                        </div>
                        <h2 className="text-3xl font-cinematic font-black italic tracking-tight text-[#F5F0E8] uppercase leading-none">
                          Select a Scene
                        </h2>
                      </div>
                      <span className="font-mono text-[9px] text-white/35 uppercase tracking-wider">
                        {photoList?.photos?.length || 0} Assets Available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          id: 'chaos',
                          num: '01',
                          title: 'THE CRACKDOWN',
                          desc: 'Unmasking primary chaos scapegoats, culprits, and unhinged energy ratings.',
                          accent: '#FF4D4D',
                          photoIndex: 0,
                        },
                        {
                          id: 'evidence',
                          num: '02',
                          title: 'THE CLUES',
                          desc: 'Physical evidence: Polaroid memory collage, inside jokes, and witness statements.',
                          accent: '#D49E2D',
                          photoIndex: 1,
                        },
                        {
                          id: 'timeline',
                          num: '03',
                          title: 'CHRONOLOGY',
                          desc: 'Chronological timeline reconstruction of the day-by-day collapse.',
                          accent: '#7C6AFF',
                          photoIndex: 2,
                        },
                        {
                          id: 'verdict',
                          num: '04',
                          title: 'FINAL DECREE',
                          desc: 'AI psychological profiles, yearbook superlatives, and closing verdicts.',
                          accent: '#2D9E8B',
                          photoIndex: 3,
                        },
                      ].map(ch => {
                        const photo = photoList?.photos?.[ch.photoIndex];
                        return (
                          <button
                            key={ch.id}
                            aria-label={`Open scene: ${ch.title} — ${ch.desc}`}
                            onClick={() => {
                              // Scroll to the named section — setActiveTab is now a no-op
                              // since content is linear. Each section has id="section-{id}".
                              const el = document.getElementById(`section-${ch.id}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className="group relative h-48 rounded-[2rem] overflow-hidden text-left border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-98 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                          >
                            {/* Background photo with gradient overlay */}
                            {photo ? (
                              <img
                                src={photo.thumbnailUrl || photo.url || ''}
                                alt={ch.title}
                                className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-35 group-hover:scale-105 transition-all duration-700"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 opacity-15"
                                style={{
                                  background: `radial-gradient(circle at 80% 20%, ${ch.accent}40, transparent 60%)`,
                                }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#060604] via-[#060604]/70 to-transparent" />

                            {/* Hover accent bar */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ backgroundColor: ch.accent }}
                            />

                            {/* Content */}
                            <div className="relative h-full flex flex-col justify-end p-6 space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[8px] font-mono uppercase tracking-[0.3em] font-bold"
                                  style={{ color: ch.accent }}
                                >
                                  SCENE {ch.num}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-[7px] font-mono text-white/40 uppercase tracking-[0.2em]">
                                  Documentary Recurrent
                                </span>
                              </div>
                              <h4 className="text-xl font-cinematic font-black tracking-tight text-[#F5F0E8] group-hover:text-white transition-colors">
                                {ch.title}
                              </h4>
                              <p className="text-[10px] text-white/45 font-data leading-snug line-clamp-2">
                                {ch.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              }

              {
                <div id="section-chaos" className="space-y-6 pt-4">
                  {/* Section header — scroll IS the nav, no chrome needed. */}
                  <div className="pb-4 border-b border-white/5">
                    <div className="text-[8px] font-mono text-white/30 uppercase tracking-[0.35em]">
                      Scene 01 · The Culprits
                    </div>
                  </div>

                  {/* Chaos rankings & Friendship Expose */}
                  {members.some((m: any) => m.role_chaos_rating != null) && (
                    <section className="py-2 space-y-4">
                      <EmotionalTimestamp
                        time="2:13 AM"
                        text="The AI identified a primary chaos source. The data is not flattering."
                        accent="#FF4D4D"
                      />
                      <CinematicBreak
                        text="Nobody could agree on who started it. The algorithm, however, has a very clear opinion."
                        sub="AI Findings · Cross-referenced · 0 appeals accepted"
                        accent="#FF4D4D"
                      />
                      <ErrorBoundary name="emotional-damage-scan">
                        <EmotionalDamageScan members={members} />
                      </ErrorBoundary>
                      <ErrorBoundary name="friendship-expose">
                        <FriendshipExpose
                          members={members}
                          tripId={tripId}
                          creatorId={trip.creator_id}
                        />
                      </ErrorBoundary>
                    </section>
                  )}
                </div>
              }

              {
                <div id="section-evidence" className="space-y-6 pt-4">
                  {/* Section header — scroll IS the nav, no chrome needed. */}
                  <div className="pb-4 border-b border-white/5">
                    <div className="text-[8px] font-mono text-white/30 uppercase tracking-[0.35em]">
                      Scene 02 · Clues & Artifacts
                    </div>
                  </div>

                  {/* Evidence Board */}
                  {(mvp || villain || insideJoke) && (
                    <section className="py-2">
                      <ErrorBoundary name="evidence-board">
                        <EvidenceBoard
                          mvp={mvp}
                          villain={villain}
                          insideJoke={insideJoke}
                          lore={lore}
                        />
                      </ErrorBoundary>
                    </section>
                  )}

                  {/* Memory Collage */}
                  <section className="py-2">
                    <EmotionalTimestamp
                      day="Day 1"
                      text="Everyone was still behaving normally."
                      accent="#2D9E8B"
                    />
                    <MemoryCollage
                      label="Photos Recovered From Device Storage"
                      count={6}
                      accent={lore?.cooked_level >= 76 ? '#FF4D4D' : '#D49E2D'}
                      photos={(photoList?.photos ?? []).slice(0, 6)}
                      tripId={tripId}
                    />
                  </section>

                  {/* Recovered evidence artifacts */}
                  {(lore?.season_recap?.act_1 || lore?.cooked_explanation) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                      {lore?.season_recap?.act_1 && (
                        <RecoveredArtifact
                          label="Witness Statement · Act I"
                          content={
                            lore.season_recap.act_1.slice(0, 160) +
                            (lore.season_recap.act_1.length > 160 ? '...' : '')
                          }
                          type="note"
                          rotation={-1.5}
                        />
                      )}
                      {lore?.cooked_level && (
                        <RecoveredArtifact
                          label="Yaarlore Chaos Receipt · Official"
                          content={`Trip: ${trip?.name || '—'}\nChaos Score: ${lore.cooked_level}/100\nVerdict: ${lore.cooked_verdict || '—'}\nPhotos Analyzed: ${trip?.total_photos || 0}\nCast Members: ${members.length}`}
                          subtext={`Archive ID: ${trip?.id?.slice(0, 8)?.toUpperCase() || '——'}`}
                          type="receipt"
                          rotation={1}
                        />
                      )}
                    </div>
                  )}

                  {/* Plot Twist moment */}
                  {lore && (
                    <div className="py-2">
                      <PlotTwistMoment lore={lore} />
                    </div>
                  )}
                </div>
              }

              {
                <div id="section-timeline" className="space-y-6 pt-4">
                  {/* Section header — scroll IS the nav, no chrome needed. */}
                  <div className="pb-4 border-b border-white/5">
                    <div className="text-[8px] font-mono text-white/30 uppercase tracking-[0.35em]">
                      Scene 03 · Timeline Reconstructed
                    </div>
                  </div>

                  {/* Timeline */}
                  {lore?.trip_eras?.length > 0 && (
                    <section className="py-2 space-y-4">
                      <EmotionalTimestamp
                        text="The timeline of events, reconstructed."
                        accent="#7C6AFF"
                      />
                      <div className="pt-2">
                        {lore.trip_eras.map((era: any, i: number) => (
                          <DocumentaryEra
                            key={i}
                            era={era}
                            index={i}
                            total={lore.trip_eras.length}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              }

              {
                <div id="section-verdict" className="space-y-6 pt-4">
                  {/* Section header — scroll IS the nav, no chrome needed. */}
                  <div className="pb-4 border-b border-white/5">
                    <div className="text-[8px] font-mono text-white/30 uppercase tracking-[0.35em]">
                      Scene 04 · Verdict Decree
                    </div>
                  </div>

                  {/* AI Psychological Profile */}
                  {lore && (
                    <section className="py-2">
                      <ErrorBoundary name="friendship-verdict">
                        <FriendshipVerdict lore={lore} />
                      </ErrorBoundary>
                    </section>
                  )}

                  {/* Superlatives — yearbook awards */}
                  {lore?.superlatives?.length > 0 && (
                    <section className="py-2 space-y-4">
                      <div className="space-y-4">
                        {lore.superlatives.slice(0, 4).map((sup: any, i: number) => (
                          <SuperlativeCard key={i} sup={sup} index={i} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Closing cinematic break */}
                  {lore && (
                    <CinematicBreak
                      text={
                        lore.what_this_trip_was_really_about ||
                        `${trip?.name} happened. The rest is mythology.`
                      }
                      sub="What this trip was really about"
                      accent="#2D9E8B"
                    />
                  )}

                  {/* Final verdict */}
                  {lore && (
                    <ErrorBoundary name="closing-verdict">
                      <ClosingVerdict lore={lore} />
                    </ErrorBoundary>
                  )}
                </div>
              }
            </div>

            {/* ── RIGHT: case dossier panel ─────────────────────────────── */}
            <div className="lg:sticky lg:top-[73px] space-y-3">
              {/* Dossier header stamp */}
              <div className="px-6 py-4 rounded-[2rem] bg-[#FAF1E4] border border-[#E8E0D0] space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[7px] font-mono text-black/25 uppercase tracking-[0.5em] mb-1">
                      Yaarlore Dossier · Classified
                    </div>
                    <h3 className="text-sm font-cinematic font-black tracking-tight text-lore-ink uppercase leading-none">
                      {trip?.name}
                    </h3>
                  </div>
                  <div
                    className="text-[7px] font-mono text-cooked-accent/60 uppercase tracking-[0.3em] border border-cooked-accent/30 px-2 py-1 rounded"
                    style={{ transform: 'rotate(5deg)' }}
                  >
                    {lore?.cooked_verdict ? 'Confirmed' : 'Pending'}
                  </div>
                </div>
                <div className="text-[8px] font-mono text-black/40 uppercase tracking-[0.3em]">
                  {trip?.destination && `${trip.destination} · `}
                  {trip?.total_photos || 0} photos · {members.length} subjects
                </div>
                {/* VIRAL-04: Director badge */}
                {(() => {
                  const creatorMember = members.find((m: any) => m.user_id === trip.creator_id);
                  const creatorName = creatorMember?.display_name;
                  return creatorName ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[7px] font-mono text-black/25 uppercase tracking-[0.3em]">
                        Directed by
                      </span>
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[7px] font-mono uppercase tracking-wider"
                        style={{
                          background: 'rgba(212,158,45,0.12)',
                          border: '1px solid rgba(212,158,45,0.25)',
                          color: '#A07825',
                        }}
                      >
                        &#127916; {creatorName}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/*
                ConfessionInput removed from the post-lore panel: confessions only
                affect generation, and at this point lore is already locked. Leaving
                the input here suggested it would change the lore, which it cannot.
              */}

              {/* WhatsApp-first share — the entire trip room exists to drive this tap. */}
              {lore && trip?.invite_code && (
                <div className="space-y-2">
                  {/* Primary: WhatsApp with AI-generated caption — highest virality */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `${(lore as any).whatsapp_caption ?? lore.tagline ?? trip.name}\n\nhttps://${typeof window !== 'undefined' ? window.location.host : 'yaarlore.app'}/t/${trip.invite_code}/story`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-mono font-black text-[9px] uppercase tracking-[0.35em] transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      background: 'rgba(37,211,102,0.1)',
                      border: '1px solid rgba(37,211,102,0.3)',
                      color: 'rgba(37,211,102,0.9)',
                    }}
                  >
                    &#9654; Share in WhatsApp
                  </a>
                  {/* Instagram Story portrait card — for reels/stories sharing */}
                  <a
                    href={`/api/card/story/${trip.id}`}
                    download={`yaarlore-${trip.invite_code}-story.png`}
                    className="flex items-center justify-center w-full py-3 rounded-2xl font-mono font-black text-[8px] uppercase tracking-[0.35em] transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      background: 'rgba(124,106,255,0.08)',
                      border: '1px solid rgba(124,106,255,0.2)',
                      color: 'rgba(124,106,255,0.7)',
                    }}
                  >
                    ↓ Instagram Story Card
                  </a>
                </div>
              )}

              {/* PROD-02: Story visibility toggle — only shown to the trip creator */}
              {isCreator && (
                <>
                  <StoryVisibilityToggle
                    tripId={tripId}
                    initialVisible={trip.story_visible !== false}
                    onToggled={() => refetch()}
                  />
                  <a
                    href={`/trips/${tripId}/settings`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-mono font-black text-[8px] uppercase tracking-[0.35em] transition-all hover:scale-[1.02] active:scale-95 border border-black/10 bg-black/[0.04] text-black/60 hover:text-black"
                    style={{ marginTop: 4 }}
                  >
                    ⚙ Settings
                  </a>
                </>
              )}

              {/* REFERRAL-01: Referral share widget — this IS the viral loop, kept. */}
              <ReferralShareWidget />

              {/*
                Removed in PROOF-OF-LOVE strip-down:
                  - ExportArchiveButton (low-frequency utility, distracts from share)
                  - DECLASSIFY RAW DATA toggle and its child widgets
                    (CookedScoreLight, BadFeelingsChart, DonutChart, LightCastWidget,
                    RecurringIdentityWidget). These were dashboard surfaces with no
                    behavioral evidence of use. The lore IS the data presentation.
                  - DeeperRecord (disputes / memory review / incidents).
                Settings still surface the export and visibility controls for the
                creator who needs them; the default view stays focused on the share.
              */}
            </div>
          </div>

          <ArchiveFooter
            publicUrl={trip?.invite_code ? `/t/${trip.invite_code}` : undefined}
            posterUrl={trip?.id ? `/api/card/${trip.id}` : undefined}
          />
        </main>
      )}
    </div>
  );
}
