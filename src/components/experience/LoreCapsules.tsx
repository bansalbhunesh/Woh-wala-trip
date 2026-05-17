'use client';

import { useState } from 'react';
import type { LoreJson } from '@/lib/types';

interface Capsule {
  id: string;
  label: string;
  icon: string;
  accent: string;
  title: string;
  sub?: string;
  stat?: string;
}

function buildCapsules(lore: LoreJson, members: any[]): Capsule[] {
  const caps: Capsule[] = [];

  // Villain capsule
  const villainName = lore.trip_lore_awards?.trip_villain;
  const villainMember = villainName
    ? members.find(
        (m: any) =>
          m.display_name?.toLowerCase().includes(villainName.toLowerCase()) ||
          m.role_title?.toLowerCase().includes('villain') ||
          m.role_title?.toLowerCase().includes('chaos')
      )
    : members
        .slice()
        .sort((a: any, b: any) => (b.role_chaos_rating ?? 0) - (a.role_chaos_rating ?? 0))[0];
  if (villainName || villainMember) {
    caps.push({
      id: 'villain',
      label: 'TRIP VILLAIN',
      icon: '🔴',
      accent: '#FF4D4D',
      title: villainName || villainMember?.display_name || villainMember?.role_title || 'Unknown',
      sub: villainMember?.role_title,
      stat:
        villainMember?.role_chaos_rating != null
          ? `Chaos ${villainMember.role_chaos_rating}/10`
          : undefined,
    });
  }

  // MVP capsule
  const mvpName = lore.trip_lore_awards?.trip_mvp;
  const mvpMember = mvpName
    ? members.find(
        (m: any) =>
          m.display_name?.toLowerCase().includes(mvpName.toLowerCase()) ||
          m.role_title?.toLowerCase().includes('mvp') ||
          m.role_title?.toLowerCase().includes('retriever')
      )
    : members.find((m: any) => m.role_chaos_rating != null && m.role_chaos_rating <= 4) ||
      members[0];
  if (mvpName || mvpMember) {
    caps.push({
      id: 'mvp',
      label: 'TRIP MVP',
      icon: '🟢',
      accent: '#2D9E8B',
      title: mvpName || mvpMember?.display_name || mvpMember?.role_title || 'Unknown',
      sub: mvpMember?.role_title,
      stat:
        mvpMember?.role_chaos_rating != null
          ? `Chaos ${mvpMember.role_chaos_rating}/10`
          : undefined,
    });
  }

  // Core memory capsule
  if (lore.trip_lore_awards?.core_memory) {
    caps.push({
      id: 'core_memory',
      label: 'CORE MEMORY',
      icon: '🟡',
      accent: '#D49E2D',
      title:
        lore.trip_lore_awards.core_memory.slice(0, 60) +
        (lore.trip_lore_awards.core_memory.length > 60 ? '…' : ''),
      sub: lore.trip_title,
    });
  }

  return caps;
}

function CapsuleCard({ capsule, tripId }: { capsule: Capsule; tripId: string }) {
  const [open, setOpen] = useState(false);
  const accent = capsule.accent;

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 select-none"
      style={{
        background: open
          ? `linear-gradient(135deg, ${accent}18, ${accent}06)`
          : 'rgba(14,14,12,0.85)',
        border: `1px solid ${open ? `${accent}35` : 'rgba(245,240,232,0.07)'}`,
        boxShadow: open ? `0 0 40px ${accent}18` : 'none',
        transform: open ? 'translateY(-2px)' : 'translateY(0)',
        minHeight: 120,
        flex: '1 1 0',
      }}
    >
      {/* Sealed state — lock icon + label */}
      {!open && (
        <div className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between">
            <p
              className="font-mono text-[8px] uppercase tracking-[0.45em]"
              style={{ color: `${accent}60` }}
            >
              {capsule.label}
            </p>
            {/* Lock indicator */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: `${accent}10`, border: `1px solid ${accent}22` }}
            >
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <rect x="1" y="5" width="8" height="7" rx="1.5" fill={`${accent}50`} />
                <path
                  d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5"
                  stroke={`${accent}70`}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 flex items-end">
            {/* Blurred preview */}
            <p
              className="font-cinematic font-black text-lg leading-tight text-white/80 uppercase tracking-tight"
              style={{ filter: 'blur(6px)', userSelect: 'none', opacity: 0.6 }}
            >
              {capsule.title}
            </p>
          </div>
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/18">
            tap to unlock
          </p>
        </div>
      )}

      {/* Opened state — revealed */}
      {open && (
        <div
          className="p-5 flex flex-col gap-3 h-full"
          style={{ animation: 'capsule-open 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <div className="flex items-center justify-between">
            <p
              className="font-mono text-[8px] uppercase tracking-[0.45em]"
              style={{ color: `${accent}80` }}
            >
              {capsule.label}
            </p>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: `${accent}18`, border: `1px solid ${accent}35` }}
            >
              <span style={{ fontSize: 10, lineHeight: 1 }}>✓</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <p
              className="font-cinematic font-black text-lg leading-tight uppercase tracking-tight"
              style={{ color: '#F5F0E8' }}
            >
              {capsule.title}
            </p>
            {capsule.sub && (
              <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider">
                {capsule.sub}
              </p>
            )}
          </div>
          {capsule.stat && (
            <div
              className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: `${accent}12`, border: `1px solid ${accent}22` }}
            >
              <span
                className="font-mono text-[8px] font-bold uppercase tracking-[0.25em]"
                style={{ color: `${accent}85` }}
              >
                {capsule.stat}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Glitch scan line on open */}
      {open && (
        <div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
            animation: 'scan-line 0.6s ease both',
          }}
        />
      )}

      <style jsx>{`
        @keyframes capsule-open {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(4px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }
        @keyframes scan-line {
          from {
            top: 0;
            opacity: 0.8;
          }
          to {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export function LoreCapsules({
  lore,
  members,
  tripId,
}: {
  lore: LoreJson;
  members: any[];
  tripId: string;
}) {
  const capsules = buildCapsules(lore, members);
  if (capsules.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-6 h-px rounded-full" style={{ background: 'rgba(255,77,77,0.5)' }} />
        <p className="font-mono text-[8px] uppercase tracking-[0.55em] text-white/25">
          ● LORE CAPSULES UNLOCKED
        </p>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {capsules.map(cap => (
          <CapsuleCard key={cap.id} capsule={cap} tripId={tripId} />
        ))}
      </div>
    </section>
  );
}
