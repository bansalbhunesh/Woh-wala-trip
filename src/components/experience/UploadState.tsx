'use client';

import { useState, useRef, useEffect, useCallback, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ConfessionInput } from '@/components/experience/ConfessionInput';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

type UploadPhase = 'idle' | 'scanning' | 'uploading' | 'absorbing' | 'error';

interface ActiveUpload {
  file: File;
  preview: string;
  phase: UploadPhase;
  progress: number;
}

interface Props {
  trip: any;
  tripId: string;
  onPhotosChanged: () => void;
}

export function UploadState({ trip, tripId, onPhotosChanged }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const [active, setActive] = useState<ActiveUpload | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    data: photoData,
    refetch: refetchPhotos,
    isLoading: photosLoading,
  } = trpc.photos.list.useQuery({ tripId });

  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => {
      utils.trips.getFull.setData({ tripId }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          trip: {
            ...old.trip,
            lore_status: 'processing',
          },
        };
      });
      router.push(`/trips/${tripId}/generating`);
    },
  });

  const canUpload =
    !generateLore.isPending &&
    (!trip || (trip.lore_status !== 'processing' && trip.lore_status !== 'ready'));
  const [errorMsg, setErrorMsg] = useState('');
  const [optimisticCount, setOptimisticCount] = useState(0); // immediate count update
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const getUploadUrl = trpc.photos.getUploadUrl.useMutation();
  const confirmUpload = trpc.photos.confirmUpload.useMutation();
  const warmupWorker = trpc.trips.warmupWorker.useMutation();
  const warmupFiredRef = useRef(false);

  // Process one file: scanning → uploading → absorbing
  const processFile = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setErrorMsg('');

      // Phase 1: scanning (show preview + scan animation)
      setActive({ file, preview, phase: 'scanning', progress: 0 });
      await new Promise(r => setTimeout(r, 900));

      // Phase 2: uploading
      setActive(prev => (prev ? { ...prev, phase: 'uploading', progress: 0 } : prev));
      try {
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          tripId,
          fileName: file.name,
          contentType: file.type as any,
        });

        // Simulate progress during upload
        const progressInterval = setInterval(() => {
          setActive(prev =>
            prev ? { ...prev, progress: Math.min(prev.progress + 12, 88) } : prev
          );
        }, 180);

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        clearInterval(progressInterval);
        setActive(prev => (prev ? { ...prev, progress: 100 } : prev));

        await confirmUpload.mutateAsync({
          tripId,
          storagePath,
          fileSize: file.size,
          mimeType: file.type,
        });
        setOptimisticCount(c => c + 1); // enable Generate button immediately on 5th photo
        setBatchDone(d => d + 1);
        await refetchPhotos();
        onPhotosChanged();

        // Phase 3: absorbing — image flies into lore engine
        setActive(prev => (prev ? { ...prev, phase: 'absorbing' } : prev));
        await new Promise(r => setTimeout(r, 900));
      } catch {
        setActive(prev => (prev ? { ...prev, phase: 'error' } : prev));
        setErrorMsg('Upload failed. Tap to retry.');
        URL.revokeObjectURL(preview);
        await new Promise(r => setTimeout(r, 1800));
      }

      URL.revokeObjectURL(preview);
      setActive(null);
    },
    [tripId, getUploadUrl, confirmUpload, refetchPhotos, onPhotosChanged]
  );

  // Drain the queue
  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    processFile(next);
  }, [active, queue, processFile]);

  const handleFiles = (files: FileList) => {
    const arr = Array.from(files);
    if (!active && queue.length === 0) {
      setBatchTotal(arr.length);
      setBatchDone(0);
      const [first, ...rest] = arr;
      setQueue(rest);
      processFile(first);
    } else {
      setBatchTotal(t => t + arr.length);
      setQueue(q => [...q, ...arr]);
    }
  };

  // Use whichever is higher — optimistic (immediate) or confirmed (from DB)
  const photos = photoData?.photos;
  const photoCount = Math.max(photos?.length || 0, optimisticCount);
  // Block generate while uploads are still in-flight (batchDone < batchTotal).
  // This fixes the race where the 6th photo shows "5/6" and clicking Generate
  // routes back to the upload screen because the server count is still 5.
  const uploadsInFlight = batchTotal > 0 && batchDone < batchTotal;
  const canGenerate = photoCount >= 5 && !uploadsInFlight;
  const needed = Math.max(0, 5 - photoCount);
  const isActive = !!active;

  // Warm up the AI worker as soon as the user reaches 5 photos — gives Render free tier
  // 30-60s to exit cold start before they click "Ignite the Lore Engine".
  useEffect(() => {
    if (canGenerate && !warmupFiredRef.current) {
      warmupFiredRef.current = true;
      warmupWorker.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate]);

  // Toast when a batch finishes uploading
  const prevUploadsInFlight = useRef(false);
  useEffect(() => {
    if (prevUploadsInFlight.current && !uploadsInFlight && batchDone > 0) {
      toast(
        batchDone === 1
          ? '1 fragment absorbed into the archive'
          : `${batchDone} fragments absorbed into the archive`
      );
    }
    prevUploadsInFlight.current = uploadsInFlight;
  }, [uploadsInFlight, batchDone, toast]);

  // SVG ring circumference for progress
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = active ? C * (active.progress / 100) : 0;

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (canUpload) setIsDragOver(true);
    },
    [canUpload]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (!canUpload) return;
      const files = e.dataTransfer.files;
      if (files?.length) handleFiles(files);
    },
    [canUpload, handleFiles]
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-16 px-6 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Live region for upload status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {active?.phase === 'scanning' && 'Scanning photo…'}
        {active?.phase === 'uploading' && `Uploading photo: ${active.progress}% complete`}
        {active?.phase === 'absorbing' && 'Photo archived successfully'}
        {active?.phase === 'error' && 'Upload failed. Tap to retry.'}
        {!active &&
          batchTotal > 0 &&
          batchDone === batchTotal &&
          `${batchTotal} photo${batchTotal !== 1 ? 's' : ''} uploaded successfully`}
      </div>
      {/* Drag-over overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          style={{
            background: 'rgba(255,77,77,0.06)',
            border: '2px dashed rgba(255,77,77,0.4)',
            borderRadius: 24,
          }}
        >
          <p
            className="font-mono text-[11px] uppercase tracking-[0.5em]"
            style={{ color: 'rgba(255,77,77,0.8)' }}
          >
            ● DROP TO ARCHIVE
          </p>
        </div>
      )}

      {/* Atmospheric background glow that pulses during upload or drag */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isActive || isDragOver ? 1 : 0 }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,77,77,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header */}
      <div className="text-center space-y-3 mb-12 relative z-10 w-full">
        <p
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.4em]"
          style={{ color: 'rgba(255,77,77,0.6)' }}
        >
          ● FEEDING THE LORE ENGINE
        </p>
        <h2
          className="font-display font-black tracking-tighter uppercase leading-none"
          style={{ fontSize: 'clamp(32px, 6vw, 64px)', color: 'rgba(245,240,232,0.92)' }}
        >
          {trip.name}
        </h2>
        <p
          className="font-display italic text-base opacity-40 mt-2"
          style={{ color: 'rgba(245,240,232,0.7)' }}
        >
          &ldquo;Upload your recovered memories. The archive is hungry.&rdquo;
        </p>
      </div>

      {/* Grid Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start relative z-10">
        {/* LEFT COLUMN: Upload Portal, Confession, and CTA */}
        <div
          className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl border space-y-8"
          style={{
            background: 'rgba(245,240,232,0.015)',
            borderColor: 'rgba(245,240,232,0.05)',
          }}
        >
          <div className="text-center space-y-1">
            <h3
              className="font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: 'rgba(245,240,232,0.4)' }}
            >
              UPLOAD TERMINAL
            </h3>
            <p className="font-display italic text-xs" style={{ color: 'rgba(245,240,232,0.55)' }}>
              Drag & drop or tap the portal to select files
            </p>
          </div>

          {/* Portal (increased size to 210x210) */}
          <div className="relative" style={{ width: 210, height: 210 }}>
            {/* Progress ring SVG */}
            {isActive && (
              <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ zIndex: 3 }}>
                <circle
                  cx="105"
                  cy="105"
                  r={82}
                  fill="none"
                  stroke="rgba(255,77,77,0.12)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="105"
                  cy="105"
                  r={82}
                  fill="none"
                  stroke={active?.phase === 'absorbing' ? '#2D9E8B' : '#FF4D4D'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${active ? 2 * Math.PI * 82 * (active.progress / 100) : 0} ${2 * Math.PI * 82}`}
                  style={{
                    transition: 'stroke-dasharray 0.2s ease, stroke 0.4s ease',
                    filter: 'drop-shadow(0 0 6px rgba(255,77,77,0.5))',
                  }}
                />
              </svg>
            )}

            {/* The slot itself */}
            <label
              aria-label={
                canUpload
                  ? 'Upload trip photos — click or drop files here'
                  : 'Upload disabled — lore already generated'
              }
              className={`absolute inset-4 rounded-3xl overflow-hidden flex flex-col items-center justify-center group ${
                canUpload ? 'cursor-pointer' : 'pointer-events-none opacity-40 cursor-not-allowed'
              }`}
              style={{
                background: isActive ? 'transparent' : 'rgba(245,240,232,0.03)',
                border: isActive ? 'none' : '1.5px dashed rgba(245,240,232,0.12)',
                transition: 'all 0.4s ease',
              }}
            >
              {/* Active upload — image preview */}
              {active && active.preview && (
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: active.phase === 'absorbing' ? 0 : 1,
                    transform: active.phase === 'absorbing' ? 'scale(0.1)' : 'scale(1)',
                    transition:
                      'opacity 0.7s cubic-bezier(0.4,0,1,1), transform 0.7s cubic-bezier(0.4,0,1,1)',
                  }}
                >
                  <img
                    src={active.preview}
                    alt={`Uploading: ${active.file?.name ?? 'photo'}`}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                      background: 'rgba(6,6,4,0.45)',
                      opacity: active.phase === 'uploading' ? 1 : 0,
                    }}
                  />
                  {active.phase === 'scanning' && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div
                        className="absolute left-0 right-0 h-0.5"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent, rgba(255,77,77,0.8), transparent)',
                          boxShadow: '0 0 8px rgba(255,77,77,0.6)',
                          animation: 'scan-sweep 0.9s ease-in-out forwards',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Idle — "+" plus */}
              {!active && (
                <>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-all group-hover:scale-110"
                    style={{
                      border: '1px solid rgba(245,240,232,0.12)',
                      background: 'rgba(245,240,232,0.04)',
                    }}
                    aria-hidden="true"
                  >
                    <Plus size={18} style={{ color: 'rgba(245,240,232,0.6)' }} />
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.35em]"
                    style={{ color: 'rgba(245,240,232,0.6)' }}
                  >
                    Upload Photos
                  </span>
                </>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                disabled={!canUpload}
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />
            </label>

            {/* Phase label */}
            {active && (
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.4em]"
                  key={active.phase}
                  style={{
                    color:
                      active.phase === 'absorbing'
                        ? 'rgba(45,158,139,0.8)'
                        : active.phase === 'error'
                          ? 'rgba(255,77,77,0.8)'
                          : 'rgba(255,77,77,0.65)',
                    animation: 'fade-in 0.3s ease',
                  }}
                >
                  {active.phase === 'scanning' && '● SCANNING'}
                  {active.phase === 'uploading' && `● ${active.progress}% ARCHIVED`}
                  {active.phase === 'absorbing' && '● FRAGMENT ABSORBED'}
                  {active.phase === 'error' && '● SIGNAL LOST'}
                </span>
              </div>
            )}
          </div>

          {/* Batch progress */}
          {batchTotal > 1 && (
            <div className="w-full max-w-[200px] pt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.3em]"
                  style={{ color: 'rgba(245,240,232,0.3)' }}
                >
                  ARCHIVING
                </span>
                <span className="font-mono text-[9px]" style={{ color: 'rgba(245,240,232,0.45)' }}>
                  {batchDone} / {batchTotal}
                </span>
              </div>
              <div
                className="w-full h-px rounded-full overflow-hidden"
                style={{ background: 'rgba(245,240,232,0.07)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: '#FF4D4D',
                    boxShadow: '0 0 4px rgba(255,77,77,0.5)',
                    originX: 0,
                  }}
                  animate={{
                    width: `${batchTotal > 0 ? Math.round((batchDone / batchTotal) * 100) : 0}%`,
                  }}
                  transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Queue & Error Indicators */}
          {queue.length > 0 && batchTotal <= 1 && (
            <p
              className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-40 pt-2"
              style={{ color: 'rgba(245,240,232,0.5)' }}
            >
              {queue.length} FRAGMENT{queue.length !== 1 ? 'S' : ''} QUEUED
            </p>
          )}

          {errorMsg && (
            <p
              role="alert"
              aria-live="assertive"
              className="font-mono text-[10px] uppercase tracking-[0.25em] cursor-pointer hover:opacity-85 text-center px-4"
              onClick={() => {
                setActive(null);
                setErrorMsg('');
              }}
              style={{ color: 'rgba(255,77,77,0.8)', marginTop: 8 }}
            >
              {errorMsg}
            </p>
          )}

          {/* Confessional */}
          {photoCount >= 1 && (
            <div className="w-full pt-4">
              <ConfessionInput tripId={tripId} disabled={!canUpload} />
            </div>
          )}

          {/* CTA controls — pb-[env(safe-area-inset-bottom)] ensures button clears iOS home bar in PWA */}
          <div className="w-full flex flex-col items-center pt-4 pb-[env(safe-area-inset-bottom,0px)]">
            {canGenerate && photoCount < 8 && (
              <div className="text-[10px] text-amber-400/80 mb-3.5 font-mono uppercase tracking-wider text-center animate-pulse">
                ⚠ Add {8 - photoCount} more photos for richer lore
              </div>
            )}

            <button
              onClick={() => generateLore.mutate({ tripId })}
              disabled={!canGenerate || generateLore.isPending || isActive}
              className="btn-lore-engine w-full py-[18px] rounded-full font-ui font-black text-[11px] uppercase tracking-[0.35em] transition-all duration-500 disabled:opacity-25 flex items-center justify-center gap-3"
              style={{
                background: canGenerate ? 'rgba(255,77,77,0.12)' : 'rgba(245,240,232,0.04)',
                border: `1px solid ${canGenerate ? 'rgba(255,77,77,0.4)' : 'rgba(245,240,232,0.08)'}`,
                color: canGenerate ? 'rgba(255,77,77,0.95)' : 'rgba(245,240,232,0.2)',
                boxShadow: canGenerate ? '0 0 30px rgba(255,77,77,0.12)' : 'none',
                transition:
                  'box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), background 0.5s, border-color 0.5s, color 0.5s, opacity 0.5s',
              }}
            >
              {generateLore.isPending ? (
                <>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,77,77,0.3)',
                      borderTopColor: '#FF4D4D',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />{' '}
                  IGNITING...
                </>
              ) : generateLore.error ? (
                <span role="alert">
                  {'⚠ ' + (generateLore.error.message?.slice(0, 80) ?? 'Error')}
                </span>
              ) : (
                'IGNITE THE LORE ENGINE →'
              )}
            </button>

            {needed === 0 && (
              <p
                className="text-center font-mono text-[9px] uppercase tracking-[0.3em] mt-3.5"
                style={{ color: 'rgba(245,240,232,0.50)' }}
              >
                {photoCount} FRAGMENTS READY
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Instructions, Tips, and Gallery Grid */}
        <div className="lg:col-span-7 space-y-8 flex flex-col justify-start">
          {/* ONBOARDING section */}
          {photoCount === 0 && (
            <div className="space-y-6 w-full">
              {/* Minimum requirement callout */}
              <div
                className="px-5 py-4 rounded-2xl text-center"
                style={{
                  background: 'rgba(255,77,77,0.04)',
                  border: '1px solid rgba(255,77,77,0.15)',
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.4em] mb-2"
                  style={{ color: 'rgba(255,77,77,0.8)' }}
                >
                  ● MINIMUM REQUIREMENT
                </p>
                <p
                  className="font-display italic text-sm leading-relaxed"
                  style={{ color: 'rgba(245,240,232,0.6)' }}
                >
                  Add at least{' '}
                  <span style={{ color: '#F5F0E8', fontStyle: 'normal', fontWeight: 700 }}>
                    5 photos
                  </span>{' '}
                  to unlock lore generation. More photos = richer story.
                </p>
              </div>

              {/* Tips & Teaser Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Best-photo tips */}
                <div
                  className="px-5 py-4 rounded-2xl space-y-3"
                  style={{
                    background: 'rgba(245,240,232,0.02)',
                    border: '1px solid rgba(245,240,232,0.07)',
                  }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.45em]"
                    style={{ color: 'rgba(245,240,232,0.45)' }}
                  >
                    BEST PHOTOS TO UPLOAD
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: '👥', tip: 'Group shots' },
                      { icon: '😂', tip: 'Candid moments' },
                      { icon: '🌅', tip: 'Scenic spots' },
                      { icon: '🍜', tip: 'Food & drinks' },
                      { icon: '🎉', tip: 'Activities' },
                      { icon: '🌙', tip: 'Night moments' },
                    ].map(({ icon, tip }) => (
                      <div key={tip} className="flex items-center gap-2">
                        <span className="text-sm">{icon}</span>
                        <span
                          className="font-mono text-[10px] uppercase tracking-wider"
                          style={{ color: 'rgba(245,240,232,0.55)' }}
                        >
                          {tip}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teaser */}
                <div
                  className="px-5 py-4 rounded-2xl"
                  style={{
                    background: 'rgba(45,158,139,0.03)',
                    border: '1px solid rgba(45,158,139,0.12)',
                  }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.45em] mb-3"
                    style={{ color: 'rgba(45,158,139,0.75)' }}
                  >
                    ✦ WHAT YOU&apos;LL UNLOCK
                  </p>
                  <div className="space-y-1.5">
                    {[
                      'AI-written trip documentary',
                      'Character roles for each member',
                      'Chaos score & percentile ranking',
                      'Shareable story slides',
                    ].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(45,158,139,0.5)' }}
                        />
                        <p
                          className="font-display italic text-[12px]"
                          style={{ color: 'rgba(245,240,232,0.55)' }}
                        >
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Archive progress bar for mid-uploads */}
          {needed > 0 && photoCount > 0 && (
            <div className="w-full space-y-2.5 px-4 lg:px-0">
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.4em]"
                  style={{ color: 'rgba(245,240,232,0.45)' }}
                >
                  ARCHIVE PROGRESS
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'rgba(245,240,232,0.6)' }}>
                  {photoCount} / 5
                </span>
              </div>
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full transition-all duration-500"
                    style={{
                      background: i < photoCount ? '#FF4D4D' : 'rgba(245,240,232,0.1)',
                      boxShadow: i < photoCount ? '0 0 5px rgba(255,77,77,0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.3em] text-center lg:text-left opacity-60"
                style={{ color: 'rgba(245,240,232,0.6)' }}
              >
                {needed} more photo{needed !== 1 ? 's' : ''} to unlock lore generation
              </p>
            </div>
          )}

          {/* Archived fragments gallery grid — skeleton while initial query loads */}
          {photosLoading && photoCount === 0 && (
            <div className="w-full space-y-4 px-4 lg:px-0">
              <div
                className="h-3 rounded-full w-36"
                style={{
                  background: 'rgba(245,240,232,0.06)',
                  animation: 'sk-pulse 1.6s ease-in-out infinite',
                }}
              />
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 justify-items-center lg:justify-items-start">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl"
                    style={{
                      width: 80,
                      height: 80,
                      background: 'rgba(245,240,232,0.05)',
                      border: '1.5px solid rgba(245,240,232,0.06)',
                      animation: `sk-pulse 1.6s ease-in-out ${i * 0.08}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived fragments gallery grid (increased thumbnail size to 80x80) */}
          {photoCount > 0 && (
            <div className="w-full space-y-4 px-4 lg:px-0">
              <p
                className="font-mono text-[10px] uppercase tracking-[0.5em] text-center lg:text-left"
                style={{ color: 'rgba(245,240,232,0.3)' }}
              >
                {photoCount} FRAGMENT{photoCount !== 1 ? 'S' : ''} IN ARCHIVE
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 justify-items-center lg:justify-items-start">
                {(photos ?? []).map(photo => (
                  <div
                    key={photo.id}
                    className="rounded-2xl overflow-hidden relative shadow-lg group hover:scale-[1.03] transition-transform duration-300"
                    style={{
                      width: 80,
                      height: 80,
                      border: '1.5px solid rgba(245,240,232,0.08)',
                      background: 'rgba(245,240,232,0.04)',
                      animation: 'fragment-in 0.5s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {photo.thumbnailUrl || photo.url ? (
                      <img
                        src={photo.thumbnailUrl || photo.url || undefined}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: 'rgba(255,77,77,0.06)' }}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            background: 'rgba(255,77,77,0.3)',
                            animation: 'pulse-soft 1.5s ease-in-out infinite',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* scan-sweep, fragment-in, spin, fade-in — all available in globals.css */}
    </div>
  );
}
