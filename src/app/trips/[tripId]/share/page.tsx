'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function SharePage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const { data: tripData, isLoading } = trpc.trips.getFull.useQuery({ tripId });

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const trip = (tripData as any).trip;
  // getFull returns `members`, not `cast`
  const members: any[] = (tripData as any).members || [];
  const lore = trip?.lore_json;

  // Most chaotic member by chaos rating — null-safe
  const topChaos = members.length > 0
    ? [...members].sort((a, b) => (b.role_chaos_rating ?? 0) - (a.role_chaos_rating ?? 0))[0]
    : null;

  const tripName = trip?.name || 'Our Trip';
  const tagline = lore?.tagline || 'The reason this trip now has its own Wikipedia page in our heads.';
  const cookedLevel = lore?.cooked_level ?? trip?.chaos_score ?? 0;
  // Blame % derived from chaos rating (deterministic, not random)
  const blamePercent = topChaos?.role_chaos_rating ? Math.round((topChaos.role_chaos_rating / 10) * 45 + 15) : 37;

  const shareText = `According to AI, I'm the ${topChaos?.role_archetype_tag || topChaos?.role_title || 'Chaos Source'} (${topChaos?.role_chaos_rating ?? '??'}/10). Our trip scored ${cookedLevel}/100 chaos. ${topChaos?.display_name || 'Someone'} caused the most problems. No further comments. 🏛️ #WohWalaTrip #${tripName.replace(/\s+/g, '')}`;

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-vibe selection:bg-cooked-bg selection:text-white pb-20">
      {/* Share Header */}
      <header className="px-6 pt-12 pb-8">
        <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe mb-2">Export Identity</p>
        <h1 className="font-cinematic font-black text-4xl tracking-tighter leading-none">Pick a card.<br />Expose your group.</h1>
      </header>

      {/* Horizontal Card Scroll */}
      <div className="flex gap-4 overflow-x-auto px-6 pb-12 snap-x scrollbar-hide">
        {/* Card 1: Trip Card (Dark) */}
        <div className="flex-shrink-0 w-72 h-[480px] rounded-[32px] overflow-hidden border border-white/5 bg-gradient-to-br from-[#14181C] to-black snap-center p-8 flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-white/20">Season Archive</div>
            <div className="font-cinematic italic text-[10px] text-white/10 mt-1">woh wala trip</div>
          </div>
          <div>
            <h2 className="font-cinematic font-black text-4xl tracking-tighter leading-[0.85] text-[#F5F0E8] mb-4">
              {tripName}
            </h2>
            <p className="font-cinematic italic text-xs text-white/40 leading-relaxed">
              &ldquo;{tagline}&rdquo;
            </p>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-7xl font-vibe font-black text-cooked-accent leading-none">{cookedLevel}</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">Chaos</span>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-[8px] uppercase tracking-[0.2em] text-white/10">WWT © 2026</div>
              <div className="grid grid-cols-4 gap-0.5 p-1 bg-white/5 rounded-md">
                {[...Array(8)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-white/10 rounded-sm" />)}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Character Card (Warm) */}
        <div className="flex-shrink-0 w-72 h-[480px] rounded-[32px] overflow-hidden border border-white/5 bg-gradient-to-br from-[#1A1508] to-[#120C00] snap-center p-8 flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-white/20">
              Character · {topChaos?.role_archetype_tag || topChaos?.role_title || 'Source'}
            </div>
          </div>
          <div>
            <div className="font-cinematic italic text-sm text-amber-500/40 mb-2">⚡ chaos rating</div>
            <div className="text-7xl font-vibe font-black text-amber-500 leading-none">
              {topChaos?.role_chaos_rating ?? '??'}/10
            </div>
          </div>
          <div>
            <h2 className="font-cinematic font-black text-3xl tracking-tighter leading-[0.85] text-[#F5F0E8] mb-2">
              {topChaos?.display_name || 'Cast'}
            </h2>
            <p className="font-cinematic italic text-sm text-amber-500/40 mb-4">
              &ldquo;{topChaos?.role_title || 'The Menace'}&rdquo;
            </p>
            <p className="text-[10px] text-amber-500/20 leading-relaxed line-clamp-3">
              {topChaos?.role_description || 'The algorithm has no mercy for this level of chaos.'}
            </p>
          </div>
        </div>

        {/* Card 3: Receipt (Light) */}
        <div className="flex-shrink-0 w-72 h-[480px] rounded-[32px] overflow-hidden border border-white/5 bg-gradient-to-br from-[#FAF1E4] to-[#F2E8D8] snap-center p-8 flex flex-col justify-between group hover:scale-[1.02] transition-transform text-black">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-black/30 font-mono">WWT · CHAOS RECEIPT</div>
          </div>
          <div className="font-mono space-y-2">
            <div className="border-b border-black/10 pb-3 mb-3 text-[10px] text-black/40">
              {tripName.toUpperCase()} · ARCHIVE
            </div>
            <div className="flex justify-between text-[11px] text-black/50">
              <span>Photos analyzed</span>
              <span>{trip?.total_photos ?? 0}</span>
            </div>
            <div className="flex justify-between text-[11px] text-black/50">
              <span>Cast members</span>
              <span>{members.length}</span>
            </div>
            <div className="flex justify-between text-[11px] text-black/50">
              <span>% {topChaos?.display_name?.split(' ')[0] ?? 'Someone'}&apos;s fault</span>
              <span>{blamePercent}%</span>
            </div>
            <div className="flex justify-between pt-4 mt-4 border-t border-dashed border-black/10 text-xl font-vibe font-black text-[#C0290A]">
              <span>TOTAL CHAOS</span>
              <span>{cookedLevel}</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-black/20 uppercase tracking-widest">woh wala trip © 2026</div>
          </div>
        </div>
      </div>

      {/* WhatsApp Caption Block */}
      <section className="px-6 mb-10">
        <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/15">
          <div className="text-[8px] uppercase tracking-[0.3em] text-green-500/50 font-vibe mb-3">Pre-filled Caption</div>
          <p className="font-mono text-xs text-white/50 leading-relaxed">
            &ldquo;{shareText}&rdquo;
          </p>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="px-6 space-y-3">
        <ShareActionButton
          icon="📲"
          label="Share to Instagram"
          sub="Stories · 9:16 · Trip card"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: tripName, text: shareText, url: window.location.href });
            } else {
              navigator.clipboard.writeText(shareText).then(() => alert('Caption copied — paste into Instagram Stories!'));
            }
          }}
        />
        <ShareActionButton
          icon="💬"
          label="WhatsApp your group"
          sub="Caption pre-filled · Roast ready"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}
        />
        <ShareActionButton
          icon="🔗"
          label="Copy invite link"
          sub="Join the archive · See your role"
          onClick={() => {
            const url = `${window.location.origin}/trips/join?code=${trip?.invite_code || ''}`;
            navigator.clipboard.writeText(url).then(() => alert('Invite link copied!'));
          }}
        />
        <a
          href={`/api/card/${tripId}`}
          download={`${tripName.replace(/\s+/g, '-')}-card.png`}
          className="w-full flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
        >
          <div className="flex gap-4 items-center">
            <div className="text-2xl">⬇</div>
            <div className="text-left">
              <div className="font-vibe font-bold text-sm text-white/80 group-hover:text-white">Download all cards</div>
              <div className="text-[10px] text-white/25 mt-1 font-vibe">PNG · 1080×1920</div>
            </div>
          </div>
          <div className="text-white/20 group-hover:text-white/50 transition-colors">→</div>
        </a>
      </section>
    </div>
  );
}

function ShareActionButton({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] active:scale-[0.98] transition-all group"
    >
      <div className="flex gap-4 items-center">
        <div className="text-2xl">{icon}</div>
        <div className="text-left">
          <div className="font-vibe font-bold text-sm text-white/80 group-hover:text-white">{label}</div>
          <div className="text-[10px] text-white/25 mt-1 font-vibe">{sub}</div>
        </div>
      </div>
      <div className="text-white/20 group-hover:text-white/50 transition-colors">→</div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-12">
      <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Preparing Cards...</div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center space-y-6">
      <h1 className="font-cinematic font-black text-4xl">Archive Lost</h1>
      <p className="text-white/30 font-vibe">This lore does not exist or has been sealed permanently.</p>
      <Link href="/trips" className="px-8 py-4 bg-white text-black rounded-full text-[10px] font-vibe font-black uppercase tracking-widest">
        Back to Gallery
      </Link>
    </div>
  );
}
