'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

  const isReady      = trip.lore_status === 'ready' && lore;
  const isProcessing = trip.lore_status === 'processing';
  const isFailed     = trip.lore_status === 'failed';

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

          <ArchiveFooter
            publicUrl={trip?.invite_code ? `/t/${trip.invite_code}` : undefined}
            posterUrl={trip?.id ? `/api/card/${trip.id}` : undefined}
          />
        </main>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAILED STATE — shown when lore_status = 'failed'
// ─────────────────────────────────────────────────────────────────────────────
function FailedState({ trip, tripId, onRetry }: { trip: any; tripId: string; onRetry: () => void }) {
  const router = useRouter();
  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => { onRetry(); router.push(`/trips/${tripId}/generating`); },
  });

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 py-20 text-center">
      <div className="space-y-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.5em]" style={{ color: 'rgba(255,77,77,0.5)' }}>
          ● LORE ENGINE INTERRUPTED
        </p>
        <h2 className="font-display font-black uppercase tracking-tighter leading-tight"
            style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(245,240,232,0.9)' }}>
          {trip.name}
        </h2>
        <p className="font-display italic text-sm max-w-xs mx-auto" style={{ color: 'rgba(245,240,232,0.3)' }}>
          "The lore engine encountered an error. The archive is intact — retry to continue."
        </p>
      </div>

      {/* Photos are safe */}
      <div className="px-6 py-4 rounded-2xl" style={{ background: 'rgba(45,158,139,0.08)', border: '1px solid rgba(45,158,139,0.2)' }}>
        <p className="font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: 'rgba(45,158,139,0.7)' }}>
          ✓ YOUR PHOTOS ARE SAFE IN THE ARCHIVE
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => generateLore.mutate({ tripId })}
          disabled={generateLore.isPending}
          className="px-10 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.35em] transition-all hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-3"
          style={{ background: 'rgba(255,77,77,0.12)', border: '1px solid rgba(255,77,77,0.4)', color: 'rgba(255,77,77,0.9)', boxShadow: '0 0 30px rgba(255,77,77,0.1)' }}>
          {generateLore.isPending ? (
            <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(255,77,77,0.3)', borderTopColor: '#FF4D4D', animation: 'spin 0.8s linear infinite' }} /> RETRYING...</>
          ) : 'RETRY LORE ENGINE →'}
        </button>

        {generateLore.error && (
          <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-center max-w-xs mx-auto" style={{ color: 'rgba(255,77,77,0.6)' }}>
            {generateLore.error.message}
          </p>
        )}

        <button onClick={() => router.push(`/trips/${tripId}`)}
                className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
                style={{ color: 'rgba(245,240,232,0.2)' }}>
          ← BACK TO ARCHIVE
        </button>
      </div>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC UPLOAD STATE
// ─────────────────────────────────────────────────────────────────────────────
type UploadPhase = 'idle' | 'scanning' | 'uploading' | 'absorbing' | 'error';

interface ActiveUpload {
  file: File;
  preview: string;
  phase: UploadPhase;
  progress: number;
}

function UploadState({ trip, tripId, onPhotosChanged }: { trip: any; tripId: string; onPhotosChanged: () => void }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveUpload | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [optimisticCount, setOptimisticCount] = useState(0); // immediate count update
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: photos, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });
  const getUploadUrl = trpc.photos.getUploadUrl.useMutation();
  const confirmUpload = trpc.photos.confirmUpload.useMutation();
  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => router.push(`/trips/${tripId}/generating`),
  });

  // Process one file: scanning → uploading → absorbing
  const processFile = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    setErrorMsg('');

    // Phase 1: scanning (show preview + scan animation)
    setActive({ file, preview, phase: 'scanning', progress: 0 });
    await new Promise(r => setTimeout(r, 900));

    // Phase 2: uploading
    setActive(prev => prev ? { ...prev, phase: 'uploading', progress: 0 } : prev);
    try {
      const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
        tripId, fileName: file.name, contentType: file.type as any,
      });

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setActive(prev => prev ? { ...prev, progress: Math.min(prev.progress + 12, 88) } : prev);
      }, 180);

      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      clearInterval(progressInterval);
      setActive(prev => prev ? { ...prev, progress: 100 } : prev);

      await confirmUpload.mutateAsync({ tripId, storagePath, fileSize: file.size, mimeType: file.type });
      setOptimisticCount(c => c + 1); // enable Generate button immediately on 5th photo
      await refetchPhotos();
      onPhotosChanged();

      // Phase 3: absorbing — image flies into lore engine
      setActive(prev => prev ? { ...prev, phase: 'absorbing' } : prev);
      await new Promise(r => setTimeout(r, 900));

    } catch {
      setActive(prev => prev ? { ...prev, phase: 'error' } : prev);
      setErrorMsg('Upload failed. Tap to retry.');
      URL.revokeObjectURL(preview);
      await new Promise(r => setTimeout(r, 1800));
    }

    URL.revokeObjectURL(preview);
    setActive(null);
  }, [tripId, getUploadUrl, confirmUpload, refetchPhotos, onPhotosChanged]);

  // Drain the queue
  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    processFile(next);
  }, [active, queue, processFile]);

  const handleFiles = (files: FileList) => {
    const arr = Array.from(files);
    if (!active) {
      const [first, ...rest] = arr;
      setQueue(rest);
      processFile(first);
    } else {
      setQueue(q => [...q, ...arr]);
    }
  };

  // Use whichever is higher — optimistic (immediate) or confirmed (from DB)
  const photoCount = Math.max(photos?.length || 0, optimisticCount);
  const canGenerate = photoCount >= 5;
  const needed = Math.max(0, 5 - photoCount);
  const isActive = !!active;

  // SVG ring circumference for progress
  const R = 52; const C = 2 * Math.PI * R;
  const dash = active ? C * (active.progress / 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6 relative overflow-hidden">
      {/* Atmospheric background glow that pulses during upload */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
           style={{ opacity: isActive ? 1 : 0 }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
             style={{ background: 'radial-gradient(circle, rgba(255,77,77,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Header */}
      <div className="text-center space-y-3 mb-12 relative z-10">
        <p className="font-mono text-[8px] uppercase tracking-[0.5em]" style={{ color: 'rgba(255,77,77,0.5)' }}>
          ● FEEDING THE LORE ENGINE
        </p>
        <h2 className="font-display font-black tracking-tighter uppercase leading-none"
            style={{ fontSize: 'clamp(32px, 6vw, 64px)', color: 'rgba(245,240,232,0.92)' }}>
          {trip.name}
        </h2>
        <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.3)' }}>
          "Upload your recovered memories. The archive is hungry."
        </p>
      </div>

      {/* Central upload slot — this is the cinematic core */}
      <div className="relative flex flex-col items-center gap-8 mb-12 z-10">

        {/* The upload portal */}
        <div className="relative" style={{ width: 160, height: 160 }}>

          {/* Progress ring SVG */}
          {isActive && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ zIndex: 3 }}>
              {/* Track */}
              <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,77,77,0.12)" strokeWidth="2.5" />
              {/* Progress */}
              <circle cx="80" cy="80" r={R}
                fill="none"
                stroke={active?.phase === 'absorbing' ? '#2D9E8B' : '#FF4D4D'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                style={{ transition: 'stroke-dasharray 0.2s ease, stroke 0.4s ease', filter: 'drop-shadow(0 0 4px rgba(255,77,77,0.5))' }}
              />
            </svg>
          )}

          {/* The slot itself */}
          <label
            className="absolute inset-3 rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer"
            style={{
              background: isActive ? 'transparent' : 'rgba(245,240,232,0.03)',
              border: isActive ? 'none' : '1.5px dashed rgba(245,240,232,0.1)',
              transition: 'all 0.4s ease',
            }}
          >
            {/* Active upload — image preview */}
            {active && active.preview && (
              <div className="absolute inset-0"
                   style={{
                     opacity: active.phase === 'absorbing' ? 0 : 1,
                     transform: active.phase === 'absorbing' ? 'scale(0.1)' : 'scale(1)',
                     transition: 'opacity 0.7s cubic-bezier(0.4,0,1,1), transform 0.7s cubic-bezier(0.4,0,1,1)',
                   }}>
                {/* Photo */}
                <img src={active.preview} alt="" className="w-full h-full object-cover" />

                {/* Dark overlay during upload */}
                <div className="absolute inset-0 transition-opacity duration-500"
                     style={{ background: 'rgba(6,6,4,0.45)', opacity: active.phase === 'uploading' ? 1 : 0 }} />

                {/* Scan line sweep */}
                {active.phase === 'scanning' && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute left-0 right-0 h-0.5"
                         style={{
                           background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.8), transparent)',
                           boxShadow: '0 0 8px rgba(255,77,77,0.6)',
                           animation: 'scan-sweep 0.9s ease-in-out forwards',
                         }} />
                  </div>
                )}
              </div>
            )}

            {/* Idle — "+" plus */}
            {!active && (
              <>
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-all group-hover:scale-110"
                     style={{ border: '1px solid rgba(245,240,232,0.1)', background: 'rgba(245,240,232,0.04)' }}>
                  <Plus size={16} style={{ color: 'rgba(245,240,232,0.25)' }} />
                </div>
                <span className="font-mono text-[7px] uppercase tracking-[0.35em]"
                      style={{ color: 'rgba(245,240,232,0.2)' }}>
                  Upload
                </span>
              </>
            )}

            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
                   onChange={e => e.target.files && handleFiles(e.target.files)} />
          </label>

          {/* Phase label below ring */}
          {active && (
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <span className="font-mono text-[7.5px] uppercase tracking-[0.4em]"
                    key={active.phase}
                    style={{
                      color: active.phase === 'absorbing' ? 'rgba(45,158,139,0.7)' : active.phase === 'error' ? 'rgba(255,77,77,0.7)' : 'rgba(255,77,77,0.5)',
                      animation: 'fade-in 0.3s ease',
                    }}>
                {active.phase === 'scanning' && '● SCANNING'}
                {active.phase === 'uploading' && `● ${active.progress}% ARCHIVED`}
                {active.phase === 'absorbing' && '● FRAGMENT ABSORBED'}
                {active.phase === 'error' && '● SIGNAL LOST'}
              </span>
            </div>
          )}
        </div>

        {/* Queue indicator */}
        {queue.length > 0 && (
          <p className="font-mono text-[7.5px] uppercase tracking-[0.3em]"
             style={{ color: 'rgba(245,240,232,0.2)', marginTop: 16 }}>
            {queue.length} FRAGMENT{queue.length !== 1 ? 'S' : ''} QUEUED
          </p>
        )}

        {errorMsg && (
          <p className="font-mono text-[8px] uppercase tracking-[0.25em] cursor-pointer hover:opacity-80"
             onClick={() => { setActive(null); setErrorMsg(''); }}
             style={{ color: 'rgba(255,77,77,0.7)', marginTop: 8 }}>
            {errorMsg}
          </p>
        )}
      </div>

      {/* Archived fragments grid — confirmed photos */}
      {photoCount > 0 && (
        <div className="w-full max-w-md px-4 mb-10 z-10">
          <p className="font-mono text-[7.5px] uppercase tracking-[0.5em] mb-4 text-center"
             style={{ color: 'rgba(245,240,232,0.2)' }}>
            {photoCount} FRAGMENT{photoCount !== 1 ? 'S' : ''} IN ARCHIVE
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(photos || []).map((photo: any) => (
              <div key={photo.id}
                   className="rounded-xl overflow-hidden relative"
                   style={{
                     width: 48, height: 48,
                     border: '1px solid rgba(245,240,232,0.08)',
                     background: 'rgba(245,240,232,0.04)',
                     animation: 'fragment-in 0.5s cubic-bezier(0.16,1,0.3,1)',
                   }}>
                {(photo.thumbnailUrl || photo.url) ? (
                  <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  // Placeholder — photo uploaded but thumbnail not generated yet
                  <div className="w-full h-full flex items-center justify-center"
                       style={{ background: 'rgba(255,77,77,0.06)' }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,77,77,0.3)', animation: 'pulse-soft 1.5s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress toward lore generation */}
      {needed > 0 && photoCount > 0 && (
        <div className="flex items-center gap-3 mb-8 z-10">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-6 h-1 rounded-full transition-all duration-500"
                   style={{ background: i < photoCount ? '#FF4D4D' : 'rgba(245,240,232,0.1)', boxShadow: i < photoCount ? '0 0 4px rgba(255,77,77,0.4)' : 'none' }} />
            ))}
          </div>
          <span className="font-mono text-[7.5px] uppercase tracking-[0.3em]"
                style={{ color: 'rgba(245,240,232,0.25)' }}>
            {needed} MORE TO UNLOCK LORE
          </span>
        </div>
      )}

      {/* Lore engine CTA */}
      <div className="z-10">
        <button
          onClick={() => generateLore.mutate({ tripId })}
          disabled={!canGenerate || generateLore.isPending || isActive}
          className="px-12 py-5 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.35em] transition-all duration-500 disabled:opacity-20 flex items-center gap-3"
          style={{
            background: canGenerate ? 'rgba(255,77,77,0.12)' : 'rgba(245,240,232,0.04)',
            border: `1px solid ${canGenerate ? 'rgba(255,77,77,0.4)' : 'rgba(245,240,232,0.08)'}`,
            color: canGenerate ? 'rgba(255,77,77,0.95)' : 'rgba(245,240,232,0.2)',
            boxShadow: canGenerate ? '0 0 30px rgba(255,77,77,0.12)' : 'none',
          }}
          onMouseEnter={e => { if (canGenerate) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 50px rgba(255,77,77,0.3)'; }}
          onMouseLeave={e => { if (canGenerate) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(255,77,77,0.12)'; }}
        >
          {generateLore.isPending ? (
            <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(255,77,77,0.3)', borderTopColor: '#FF4D4D', animation: 'spin 0.8s linear infinite' }} /> IGNITING...</>
          ) : generateLore.error ? (
            '⚠ ' + (generateLore.error.message?.slice(0, 40) ?? 'Error')
          ) : 'IGNITE THE LORE ENGINE →'}
        </button>
        {needed === 0 && (
          <p className="text-center font-mono text-[7.5px] uppercase tracking-[0.3em] mt-3"
             style={{ color: 'rgba(245,240,232,0.15)' }}>
            {photoCount} FRAGMENTS READY
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes scan-sweep {
          from { top: -2px; opacity: 1; }
          to   { top: 100%; opacity: 0.4; }
        }
        @keyframes fragment-in {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
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
