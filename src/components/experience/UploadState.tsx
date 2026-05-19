'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ConfessionInput } from '@/components/experience/ConfessionInput';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [active, setActive] = useState<ActiveUpload | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [optimisticCount, setOptimisticCount] = useState(0); // immediate count update
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: photoData, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });
  const getUploadUrl = trpc.photos.getUploadUrl.useMutation();
  const confirmUpload = trpc.photos.confirmUpload.useMutation();
  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => router.push(`/trips/${tripId}/generating`),
  });
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

  // SVG ring circumference for progress
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = active ? C * (active.progress / 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 px-6 relative overflow-hidden">
      {/* Atmospheric background glow that pulses during upload */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isActive ? 1 : 0 }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,77,77,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Header */}
      <div className="text-center space-y-3 mb-12 relative z-10">
        <p
          className="font-mono text-[8px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(255,77,77,0.5)' }}
        >
          ● FEEDING THE LORE ENGINE
        </p>
        <h2
          className="font-display font-black tracking-tighter uppercase leading-none"
          style={{ fontSize: 'clamp(32px, 6vw, 64px)', color: 'rgba(245,240,232,0.92)' }}
        >
          {trip.name}
        </h2>
        <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.3)' }}>
          &ldquo;Upload your recovered memories. The archive is hungry.&rdquo;
        </p>
      </div>

      {/* ONBOARDING: Photo requirement guidance shown from the very start */}
      {photoCount === 0 && (
        <div className="w-full max-w-md mb-10 z-10 px-4 space-y-6">
          {/* Minimum requirement callout */}
          <div
            className="px-5 py-4 rounded-2xl text-center"
            style={{
              background: 'rgba(255,77,77,0.05)',
              border: '1px solid rgba(255,77,77,0.15)',
            }}
          >
            <p
              className="font-mono text-[9px] uppercase tracking-[0.4em] mb-2"
              style={{ color: 'rgba(255,77,77,0.7)' }}
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

          {/* Progress bar from zero */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-[7.5px] uppercase tracking-[0.4em]"
                style={{ color: 'rgba(245,240,232,0.3)' }}
              >
                ARCHIVE PROGRESS
              </span>
              <span className="font-mono text-[7.5px]" style={{ color: 'rgba(245,240,232,0.3)' }}>
                0 / 5
              </span>
            </div>
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{ background: 'rgba(245,240,232,0.08)' }}
                />
              ))}
            </div>
          </div>

          {/* Best-photo tips */}
          <div
            className="px-5 py-4 rounded-2xl space-y-3"
            style={{
              background: 'rgba(245,240,232,0.02)',
              border: '1px solid rgba(245,240,232,0.07)',
            }}
          >
            <p
              className="font-mono text-[8px] uppercase tracking-[0.45em]"
              style={{ color: 'rgba(245,240,232,0.35)' }}
            >
              BEST PHOTOS TO UPLOAD
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '👥', tip: 'Group shots' },
                { icon: '😂', tip: 'Candid moments' },
                { icon: '🌅', tip: 'Scenic locations' },
                { icon: '🍜', tip: 'Food & drinks' },
                { icon: '🎉', tip: 'Activities' },
                { icon: '🌙', tip: 'Night moments' },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span
                    className="font-mono text-[8px] uppercase tracking-wider"
                    style={{ color: 'rgba(245,240,232,0.45)' }}
                  >
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Teaser: what they'll unlock */}
          <div
            className="px-5 py-4 rounded-2xl"
            style={{
              background: 'rgba(45,158,139,0.04)',
              border: '1px solid rgba(45,158,139,0.12)',
            }}
          >
            <p
              className="font-mono text-[8px] uppercase tracking-[0.45em] mb-3"
              style={{ color: 'rgba(45,158,139,0.6)' }}
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
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(45,158,139,0.5)' }}
                  />
                  <p
                    className="font-display italic text-[11px]"
                    style={{ color: 'rgba(245,240,232,0.4)' }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Central upload slot — this is the cinematic core */}
      <div className="relative flex flex-col items-center gap-8 mb-12 z-10">
        {/* The upload portal */}
        <div className="relative" style={{ width: 160, height: 160 }}>
          {/* Progress ring SVG */}
          {isActive && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ zIndex: 3 }}>
              {/* Track */}
              <circle
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke="rgba(255,77,77,0.12)"
                strokeWidth="2.5"
              />
              {/* Progress */}
              <circle
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={active?.phase === 'absorbing' ? '#2D9E8B' : '#FF4D4D'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                style={{
                  transition: 'stroke-dasharray 0.2s ease, stroke 0.4s ease',
                  filter: 'drop-shadow(0 0 4px rgba(255,77,77,0.5))',
                }}
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
              <div
                className="absolute inset-0"
                style={{
                  opacity: active.phase === 'absorbing' ? 0 : 1,
                  transform: active.phase === 'absorbing' ? 'scale(0.1)' : 'scale(1)',
                  transition:
                    'opacity 0.7s cubic-bezier(0.4,0,1,1), transform 0.7s cubic-bezier(0.4,0,1,1)',
                }}
              >
                {/* Photo */}
                <img src={active.preview} alt="" className="w-full h-full object-cover" />

                {/* Dark overlay during upload */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: 'rgba(6,6,4,0.45)',
                    opacity: active.phase === 'uploading' ? 1 : 0,
                  }}
                />

                {/* Scan line sweep */}
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
                  className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-all group-hover:scale-110"
                  style={{
                    border: '1px solid rgba(245,240,232,0.1)',
                    background: 'rgba(245,240,232,0.04)',
                  }}
                >
                  <Plus size={16} style={{ color: 'rgba(245,240,232,0.25)' }} />
                </div>
                <span
                  className="font-mono text-[7px] uppercase tracking-[0.35em]"
                  style={{ color: 'rgba(245,240,232,0.55)' }}
                >
                  Upload
                </span>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
          </label>

          {/* Phase label below ring */}
          {active && (
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <span
                className="font-mono text-[7.5px] uppercase tracking-[0.4em]"
                key={active.phase}
                style={{
                  color:
                    active.phase === 'absorbing'
                      ? 'rgba(45,158,139,0.7)'
                      : active.phase === 'error'
                        ? 'rgba(255,77,77,0.7)'
                        : 'rgba(255,77,77,0.5)',
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

        {/* Batch progress bar — shown when uploading multiple files */}
        {batchTotal > 1 && (
          <div className="w-full max-w-[200px] mt-5">
            <div className="flex justify-between items-center mb-1.5">
              <span
                className="font-mono text-[7px] uppercase tracking-[0.3em]"
                style={{ color: 'rgba(245,240,232,0.22)' }}
              >
                ARCHIVING
              </span>
              <span className="font-mono text-[7px]" style={{ color: 'rgba(245,240,232,0.32)' }}>
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

        {/* Queue indicator */}
        {queue.length > 0 && batchTotal <= 1 && (
          <p
            className="font-mono text-[7.5px] uppercase tracking-[0.3em]"
            style={{ color: 'rgba(245,240,232,0.2)', marginTop: 16 }}
          >
            {queue.length} FRAGMENT{queue.length !== 1 ? 'S' : ''} QUEUED
          </p>
        )}

        {errorMsg && (
          <p
            className="font-mono text-[8px] uppercase tracking-[0.25em] cursor-pointer hover:opacity-80"
            onClick={() => {
              setActive(null);
              setErrorMsg('');
            }}
            style={{ color: 'rgba(255,77,77,0.7)', marginTop: 8 }}
          >
            {errorMsg}
          </p>
        )}
      </div>

      {/* Archived fragments grid — confirmed photos */}
      {photoCount > 0 && (
        <div className="w-full max-w-md px-4 mb-10 z-10">
          <p
            className="font-mono text-[7.5px] uppercase tracking-[0.5em] mb-4 text-center"
            style={{ color: 'rgba(245,240,232,0.2)' }}
          >
            {photoCount} FRAGMENT{photoCount !== 1 ? 'S' : ''} IN ARCHIVE
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(photos ?? []).map(photo => (
              <div
                key={photo.id}
                className="rounded-xl overflow-hidden relative"
                style={{
                  width: 48,
                  height: 48,
                  border: '1px solid rgba(245,240,232,0.08)',
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
                  // Placeholder — photo uploaded but thumbnail not generated yet
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'rgba(255,77,77,0.06)' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
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

      {/* Confessional booth — pre-generation */}
      {photoCount >= 1 && (
        <div className="w-full max-w-xs mb-10 z-10 px-4">
          <ConfessionInput tripId={tripId} />
        </div>
      )}

      {/* Progress toward lore generation — updated dot bar with count */}
      {needed > 0 && photoCount > 0 && (
        <div className="w-full max-w-md px-4 mb-8 z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[7.5px] uppercase tracking-[0.4em]"
              style={{ color: 'rgba(245,240,232,0.3)' }}
            >
              ARCHIVE PROGRESS
            </span>
            <span className="font-mono text-[7.5px]" style={{ color: 'rgba(245,240,232,0.45)' }}>
              {photoCount} / 5
            </span>
          </div>
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{
                  background: i < photoCount ? '#FF4D4D' : 'rgba(245,240,232,0.1)',
                  boxShadow: i < photoCount ? '0 0 4px rgba(255,77,77,0.4)' : 'none',
                }}
              />
            ))}
          </div>
          <p
            className="font-mono text-[7.5px] uppercase tracking-[0.3em] text-center"
            style={{ color: 'rgba(245,240,232,0.55)' }}
          >
            {needed} more photo{needed !== 1 ? 's' : ''} to unlock lore generation
          </p>
        </div>
      )}

      {/* Lore engine CTA */}
      <div className="z-10">
        {canGenerate && photoCount < 8 && (
          <div className="text-xs text-amber-400/80 mb-2 font-mono uppercase tracking-wider text-center">
            ⚠ Add {8 - photoCount} more photos for richer lore
          </div>
        )}
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
          onMouseEnter={e => {
            if (canGenerate)
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 50px rgba(255,77,77,0.3)';
          }}
          onMouseLeave={e => {
            if (canGenerate)
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 30px rgba(255,77,77,0.12)';
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
            '⚠ ' + (generateLore.error.message?.slice(0, 40) ?? 'Error')
          ) : (
            'IGNITE THE LORE ENGINE →'
          )}
        </button>
        {needed === 0 && (
          <p
            className="text-center font-mono text-[7.5px] uppercase tracking-[0.3em] mt-3"
            style={{ color: 'rgba(245,240,232,0.50)' }}
          >
            {photoCount} FRAGMENTS READY
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes scan-sweep {
          from {
            top: -2px;
            opacity: 1;
          }
          to {
            top: 100%;
            opacity: 0.4;
          }
        }
        @keyframes fragment-in {
          from {
            opacity: 0;
            transform: scale(0.6);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
