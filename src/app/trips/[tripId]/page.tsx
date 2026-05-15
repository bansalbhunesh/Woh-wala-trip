'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain } from '@/components/ui/atoms';
import {
  ArchiveNavbar, ArchiveHero, ArchiveReveal,
  CookedScoreLight, BadFeelingsChart, DonutChart, LightCastWidget,
  ArchiveFooter, LoreWrapped
} from '@/components/cinematic/ArchiveRoom';
import {
  CinematicBreak, CookedLevelReveal, FriendshipExpose,
  DocumentaryEra, PlotTwistMoment, FriendshipVerdict, ClosingVerdict,
  EmotionalTimestamp, RecoveredArtifact, MemoryCollage, SuperlativeCard,
  StickyChapter, EvidenceBoard,
} from '@/components/cinematic/Documentary';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function TripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const [showWrapped, setShowWrapped] = useState(true);

  const { data: tripData, isLoading, refetch } = trpc.trips.getFull.useQuery({ tripId });

  useEffect(() => {
    const hasSeen = localStorage.getItem(`wrapped_${tripId}`);
    if (hasSeen) setShowWrapped(false);
  }, [tripId]);

  // Poll while generating
  const loreStatus = (tripData as any)?.trip?.lore_status;
  useEffect(() => {
    if (loreStatus === 'processing') {
      const t = setInterval(() => refetch(), 5000);
      return () => clearInterval(t);
    }
    if (loreStatus === 'ready' && !localStorage.getItem(`wrapped_${tripId}`)) {
      setShowWrapped(true);
    }
  }, [loreStatus, refetch, tripId]);

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

  // Find key cast members from lore or member roles
  const villain = members.find((m: any) =>
    m.role_title?.toLowerCase().includes('villain') ||
    m.role_title?.toLowerCase().includes('chaos') ||
    m.role_chaos_rating >= 8
  ) || members[1];

  const mvp = members.find((m: any) =>
    m.role_title?.toLowerCase().includes('mvp') ||
    m.role_title?.toLowerCase().includes('retriever') ||
    (m.role_chaos_rating !== undefined && m.role_chaos_rating <= 4)
  ) || members[0];

  const insideJoke = lore?.trip_lore_awards?.core_memory;

  const isReady = trip.lore_status === 'ready' && lore;
  const isProcessing = trip.lore_status === 'processing';

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] selection:bg-cooked-accent selection:text-white font-cinematic overflow-x-hidden">
      <AnimatePresence>
        {showWrapped && isReady && (
          <LoreWrapped trip={trip} onFinish={handleFinishWrapped} />
        )}
      </AnimatePresence>

      <FilmGrain />
      <ArchiveNavbar trip={trip} />

      {/* Full-width hero outside the grid */}
      <div className="max-w-[1600px] mx-auto px-6 pt-12">
        {isProcessing ? (
          <GeneratingState tripId={tripId} />
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

          {/* Letterboxd 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 items-start">

            {/* ── LEFT: documentary scroll column ──────────────────────── */}
            <div className="space-y-0">

              {/* ① Delusion Index — giant emotional beat */}
              <CookedLevelReveal trip={trip} />

              {/* ② Cinematic break */}
              <CinematicBreak
                text="The following is a reconstruction of documented events. Some memories have been enhanced for dramatic effect."
                sub="Archive Reconstruction · AI Narration Active"
                accent="#FF4D4D"
                timestamp={`Archive No. ${trip?.id?.slice(0, 6)?.toUpperCase() || '——'} · Classified`}
              />

              {/* ③ Evidence board — investigation wall replaces equal-weight cards */}
              {(mvp || villain || insideJoke) && (
                <section className="py-4">
                  <StickyChapter number="Chapter 01" title="The Evidence" accent="#FF4D4D" />
                  <EvidenceBoard mvp={mvp} villain={villain} insideJoke={insideJoke} lore={lore} />
                </section>
              )}

              {/* ④ Emotional timestamp + memory collage */}
              <EmotionalTimestamp
                day="Day 1"
                text="Everyone was still behaving normally."
                accent="#2D9E8B"
              />

              <MemoryCollage
                label="Photos Recovered From Device Storage"
                count={6}
                accent={lore?.cooked_level >= 76 ? '#FF4D4D' : '#D49E2D'}
              />

              {/* ⑤ Chaos rankings */}
              {members.some((m: any) => m.role_chaos_rating != null) && (
                <section className="py-4">
                  <EmotionalTimestamp
                    time="2:13 AM"
                    text="The AI identified a primary chaos source. The data is not flattering."
                    accent="#FF4D4D"
                  />
                  <StickyChapter number="Chapter 02" title="Who Caused The Collapse" accent="#FF4D4D" />
                  <CinematicBreak
                    text="Nobody could agree on who started it. The algorithm, however, has a very clear opinion."
                    sub="AI Findings · Cross-referenced · 0 appeals accepted"
                    accent="#FF4D4D"
                  />
                  <FriendshipExpose members={members} />
                </section>
              )}

              {/* ⑦ Recovered evidence artifacts */}
              {(lore?.season_recap?.act_1 || lore?.cooked_explanation) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  {lore?.season_recap?.act_1 && (
                    <RecoveredArtifact
                      label="Witness Statement · Act I"
                      content={lore.season_recap.act_1.slice(0, 160) + (lore.season_recap.act_1.length > 160 ? '...' : '')}
                      type="note"
                      rotation={-1.5}
                    />
                  )}
                  {lore?.cooked_level && (
                    <RecoveredArtifact
                      label="WWT Chaos Receipt · Official"
                      content={`Trip: ${trip?.name || '—'}\nChaos Score: ${lore.cooked_level}/100\nVerdict: ${lore.cooked_verdict || '—'}\nPhotos Analyzed: ${trip?.total_photos || 0}\nCast Members: ${members.length}`}
                      subtext={`Archive ID: ${trip?.id?.slice(0, 8)?.toUpperCase() || '——'}`}
                      type="receipt"
                      rotation={1}
                    />
                  )}
                </div>
              )}

              {/* ⑧ Plot Twist moment */}
              {lore && (
                <div className="py-2">
                  <PlotTwistMoment lore={lore} />
                </div>
              )}

              {/* ⑨ Season Timeline as documentary scenes */}
              {lore?.trip_eras?.length > 0 && (
                <section className="py-4 space-y-0">
                  <EmotionalTimestamp
                    text="The timeline of events, reconstructed."
                    accent="#7C6AFF"
                  />
                  <StickyChapter number="Chapter 03" title="How It Unfolded" accent="#7C6AFF" />
                  <div className="pt-4">
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

              {/* ⑩ AI Psychological Profile */}
              {lore && (
                <section className="py-4">
                  <StickyChapter number="Chapter 04" title="AI Psychological Profile" accent="#2D9E8B" />
                  <FriendshipVerdict lore={lore} />
                </section>
              )}

              {/* ⑪ Superlatives — yearbook awards */}
              {lore?.superlatives?.length > 0 && (
                <section className="py-4 space-y-6">
                  <StickyChapter number="Chapter 05" title="The Official Superlatives" accent="#D49E2D" />
                  <div className="space-y-4">
                    {lore.superlatives.slice(0, 4).map((sup: any, i: number) => (
                      <SuperlativeCard key={i} sup={sup} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* ⑫ Closing cinematic break */}
              {lore && (
                <CinematicBreak
                  text={lore.what_this_trip_was_really_about || `${trip?.name} happened. The rest is mythology.`}
                  sub="What this trip was really about"
                  accent="#2D9E8B"
                />
              )}

              {/* ⑬ Final verdict */}
              {lore && <ClosingVerdict lore={lore} />}
            </div>

            {/* ── RIGHT: case dossier panel ─────────────────────────────── */}
            <div className="lg:sticky lg:top-[73px] space-y-3">
              {/* Dossier header stamp */}
              <div className="px-6 py-4 rounded-[2rem] bg-[#FAF1E4] border border-[#E8E0D0] space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[7px] font-mono text-black/25 uppercase tracking-[0.5em] mb-1">
                      WWT Dossier · Classified
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
                <div className="text-[8px] font-mono text-black/20 uppercase tracking-[0.3em]">
                  {trip?.destination && `${trip.destination} · `}
                  {trip?.total_photos || 0} photos · {members.length} subjects
                </div>
              </div>

              <CookedScoreLight trip={trip} />
              <BadFeelingsChart trip={trip} />
              <DonutChart trip={trip} />
              <LightCastWidget trip={trip} />
            </div>
          </div>

          <ArchiveFooter />
        </main>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD STATE
// ─────────────────────────────────────────────────────────────────────────────
interface UploadToast { id: number; name: string; status: 'uploading' | 'done' | 'error'; }

function UploadState({ trip, tripId, onPhotosChanged }: { trip: any; tripId: string; onPhotosChanged: () => void }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<UploadToast[]>([]);
  const { data: photos, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });
  const getUploadUrl = trpc.photos.getUploadUrl.useMutation();
  const confirmUpload = trpc.photos.confirmUpload.useMutation();
  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => router.push(`/trips/${tripId}/generating`),
  });

  const addToast = (id: number, name: string, status: UploadToast['status']) => {
    setToasts(prev => {
      const existing = prev.findIndex(t => t.id === id);
      if (existing >= 0) {
        const next = [...prev]; next[existing] = { id, name, status }; return next;
      }
      return [...prev, { id, name, status }];
    });
    if (status !== 'uploading') {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
    }
  };

  const handleFiles = async (files: FileList) => {
    let toastId = Date.now();
    for (const file of Array.from(files)) {
      const tid = toastId++;
      addToast(tid, file.name, 'uploading');
      try {
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          tripId, fileName: file.name, contentType: file.type as any,
        });
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        await confirmUpload.mutateAsync({ tripId, storagePath, fileSize: file.size, mimeType: file.type });
        addToast(tid, file.name, 'done');
      } catch {
        addToast(tid, file.name, 'error');
      }
    }
    onPhotosChanged(); refetchPhotos();
  };

  const photoCount = photos?.length || 0;
  const canGenerate = photoCount >= 5;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-12 py-20">
      <div className="text-center space-y-4">
        <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe font-black">Upload Evidence</p>
        <h2 className="text-6xl font-cinematic font-black tracking-tighter text-[#F5F0E8] uppercase leading-none">
          {trip.name}
        </h2>
        <p className="text-white/30 font-cinematic italic text-lg">The lore engine needs your photo dump.</p>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-w-lg w-full px-6">
        {(photos || []).map((photo: any) => (
          <div key={photo.id} className="aspect-square rounded-2xl bg-white/5 overflow-hidden border border-white/10">
            {photo.thumbnailUrl && <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
          </div>
        ))}
        <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all group">
          <Plus size={20} className="text-white/20 group-hover:text-white/40 transition-colors mb-1" />
          <span className="text-[8px] text-white/20 font-vibe font-black uppercase tracking-wider">Add</span>
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)} />
        </label>
      </div>

      {/* Per-file upload toasts — bottom-right stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" style={{ maxWidth: 280 }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-mono text-[9px] uppercase tracking-[0.25em] animate-slide-up"
              style={{
                background: toast.status === 'error' ? 'rgba(255,77,77,0.12)' : toast.status === 'done' ? 'rgba(45,158,139,0.12)' : 'rgba(245,240,232,0.06)',
                border: `1px solid ${toast.status === 'error' ? 'rgba(255,77,77,0.3)' : toast.status === 'done' ? 'rgba(45,158,139,0.3)' : 'rgba(245,240,232,0.12)'}`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {toast.status === 'uploading' && (
                  <div className="w-3 h-3 rounded-full border border-white/30 border-t-white/80"
                       style={{ animation: 'spin 0.8s linear infinite' }} />
                )}
                {toast.status === 'done' && <span style={{ color: '#2D9E8B' }}>✓</span>}
                {toast.status === 'error' && <span style={{ color: '#FF4D4D' }}>✕</span>}
              </div>
              <span
                className="truncate"
                style={{ color: toast.status === 'error' ? 'rgba(255,77,77,0.8)' : toast.status === 'done' ? 'rgba(45,158,139,0.8)' : 'rgba(245,240,232,0.5)' }}
              >
                {toast.status === 'uploading' ? 'Uploading' : toast.status === 'done' ? 'Uploaded' : 'Failed'}{' '}
                <span className="opacity-70">{toast.name.length > 18 ? toast.name.slice(0, 16) + '…' : toast.name}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {!canGenerate && photoCount > 0 && (
        <p className="text-[10px] text-white/25 font-data">
          {5 - photoCount} more photo{5 - photoCount !== 1 ? 's' : ''} needed
        </p>
      )}

      <button
        onClick={() => generateLore.mutate({ tripId })}
        disabled={!canGenerate || generateLore.isPending}
        className="px-14 py-6 bg-[#F5F0E8] text-black rounded-full text-[11px] font-vibe font-black uppercase tracking-[0.4em] disabled:opacity-20 hover:scale-105 active:scale-95 transition-all shadow-3xl"
      >
        {generateLore.isPending ? 'Starting...' : 'Start the Lore Engine'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATING STATE
// ─────────────────────────────────────────────────────────────────────────────
function GeneratingState({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dots, setDots] = useState('');

  const PHASES = [
    { label: 'Reviewing the evidence', sub: 'Reading your photo dump...' },
    { label: 'Identifying the chaos source', sub: 'Someone is responsible for 37% of this.' },
    { label: 'Calculating delusion index', sub: 'How cooked were you, really?' },
    { label: 'Assigning character roles', sub: 'The Golden Retriever has been identified.' },
    { label: 'Writing the season recap', sub: 'The AI historian is taking notes.' },
    { label: 'Finalising the lore', sub: 'Almost ready to expose everything.' },
  ];

  useEffect(() => {
    if (phaseIdx >= PHASES.length - 1) return;
    const t = setTimeout(() => setPhaseIdx(i => i + 1), 5000);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-16 py-20">
      <div className="text-center space-y-8 max-w-md">
        <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black">
          Season {new Date().getFullYear()} Archive
        </p>
        <h2 className="text-5xl font-cinematic font-black text-[#F5F0E8] uppercase leading-tight">
          Writing the lore
        </h2>
        <div className="space-y-2 min-h-[60px]">
          <p className="text-xl font-vibe font-medium text-white/80 transition-all duration-700">
            {PHASES[phaseIdx].label}{dots}
          </p>
          <p className="text-sm font-data font-light text-white/30 italic">{PHASES[phaseIdx].sub}</p>
        </div>
      </div>

      {/* Phase dots */}
      <div className="flex gap-2">
        {PHASES.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${
            i < phaseIdx ? 'w-2 h-2 bg-chill-accent'
            : i === phaseIdx ? 'w-8 h-2 bg-cooked-accent animate-pulse-soft'
            : 'w-2 h-2 bg-white/10'
          }`} />
        ))}
      </div>

      <p className="text-[9px] uppercase tracking-widest text-white/15 font-vibe">Usually 2–5 minutes</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-6">
      <div className="w-10 h-10 border-2 border-cooked-accent/20 border-t-cooked-accent rounded-full animate-spin" />
      <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black animate-pulse-soft">
        Opening Archives...
      </p>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-6">
      <p className="text-white/20 font-cinematic italic text-xl">Archive not found.</p>
      <Link href="/trips" className="text-[10px] uppercase tracking-widest font-vibe font-black text-white/30 hover:text-white transition-colors">
        ← Return to Dossier
      </Link>
    </div>
  );
}
