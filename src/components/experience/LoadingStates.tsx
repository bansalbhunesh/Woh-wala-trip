'use client';

import Link from 'next/link';

interface SkeletonProps {
  w?: string | number;
  h?: number;
  radius?: number;
}

export function SkeletonBlock({ w = '100%', h = 24, radius = 6 }: SkeletonProps) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: 'rgba(245,240,232,0.04)',
        animation: 'sk-pulse 1.6s ease-in-out infinite',
      }}
    />
  );
}

export function LoadingState() {
  return (
    <div className="min-h-screen bg-[#060604] overflow-hidden">
      {/* Navbar skeleton */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(245,240,232,0.04)' }}
      >
        <SkeletonBlock w={120} h={14} radius={4} />
        <SkeletonBlock w={72} h={14} radius={4} />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 pt-12 pb-8">
        {/* Hero skeleton */}
        <div className="space-y-4 mb-10">
          <SkeletonBlock w={80} h={10} radius={3} />
          <SkeletonBlock w="70%" h={56} radius={8} />
          <SkeletonBlock w="45%" h={14} radius={4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left column skeleton */}
          <div className="space-y-6">
            <SkeletonBlock h={280} radius={16} />
            <SkeletonBlock h={160} radius={16} />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <SkeletonBlock key={i} h={120} radius={12} />
              ))}
            </div>
            <SkeletonBlock h={200} radius={16} />
          </div>
          {/* Right sidebar skeleton */}
          <div className="space-y-4">
            <SkeletonBlock h={180} radius={16} />
            <SkeletonBlock h={120} radius={16} />
            <SkeletonBlock h={100} radius={16} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes sk-pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function NotFoundState() {
  return (
    <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-6">
      <p className="text-white/20 font-cinematic italic text-xl">Archive not found.</p>
      <Link
        href="/trips"
        className="text-[10px] uppercase tracking-widest font-vibe font-black text-white/30 hover:text-white transition-colors"
      >
        ← Return to Dossier
      </Link>
    </div>
  );
}
