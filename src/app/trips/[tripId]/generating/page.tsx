'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

const STAGES = [
  { id: 0, label: 'SCANNING MEMORIES',      sub: 'Reading your photo dump for emotional evidence' },
  { id: 1, label: 'IDENTIFYING ARCHETYPES', sub: 'Detecting who started it this time' },
  { id: 2, label: 'CROSS-REFERENCING',      sub: 'Connecting incidents to archetypes' },
  { id: 3, label: 'WRITING THE LORE',       sub: 'Constructing your friendship mythology' },
  { id: 4, label: 'SCORING THE CHAOS',      sub: 'Calculating historically cooked potential' },
  { id: 5, label: 'SEALING THE UNIVERSE',   sub: 'Finalizing the memory archive' },
];

export default function GeneratingPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId }, { refetchInterval: 4000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;
  const loreStatus = trip?.lore_status;

  useEffect(() => {
    if (loreStatus === 'ready') router.push(`/trips/${tripId}/story`);
    else if (loreStatus === 'failed') router.push(`/trips/${tripId}`);
    // Guard: if data loaded and status is not processing, go back (prevents infinite spinner)
    else if (tripData && loreStatus !== 'processing' && loreStatus !== undefined) {
      router.push(`/trips/${tripId}`);
    }
  }, [loreStatus, router, tripId, tripData]);

  // Progress simulation
  useEffect(() => {
    const id = setInterval(() => {
      setProgress(p => {
        const inc = p < 70 ? Math.random() * 2.5 : p < 90 ? Math.random() * 0.8 : Math.random() * 0.2;
        const next = Math.min(p + inc, 95);
        setStage(Math.min(Math.floor((next / 95) * STAGES.length), STAGES.length - 1));
        return next;
      });
    }, 150);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Particle universe canvas — intensifies with stage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener('resize', onResize);

    // Adaptive particle count — fewer on mobile for 60fps
    const particleCount = Math.min(400, Math.max(150, Math.floor(W / 4)));
    const particles = Array.from({ length: particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.max(W, H);
      return {
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.3,
        hue: [10, 185, 280][Math.floor(Math.random() * 3)] as number,
        life: Math.random() * Math.PI * 2,
      };
    });

    // Easing helper for organic ring expansion
    const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4);

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.008;

      ctx.fillStyle = 'rgba(6,6,4,0.88)';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const stageIntensity = 0.15 + (stage / STAGES.length) * 0.85;

      particles.forEach(p => {
        p.life += 0.015;
        const alpha = ((Math.sin(p.life) + 1) / 2) * stageIntensity;
        // Pull toward center as stages advance
        const dx = cx - p.x, dy = cy - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        const pull = 0.0005 + (stage / STAGES.length) * 0.003;
        p.vx += (dx / (dist + 1)) * pull;
        p.vy += (dy / (dist + 1)) * pull;
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        if (alpha < 0.01) return;
        const colors: Record<number, string> = {
          10: `rgba(255,77,77,${alpha})`, 185: `rgba(45,158,139,${alpha})`, 280: `rgba(124,106,255,${alpha})`,
        };
        if (p.size > 1.2) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
          g.addColorStop(0, colors[p.hue]); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = colors[p.hue]; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      // Central stage ring — expands with progress
      const ringR = 100 + easeOutQuart(stage / STAGES.length) * 80 + Math.sin(t * 2) * 6;
      const ringA = 0.15 + (stage / STAGES.length) * 0.3;
      ctx.save();
      ctx.strokeStyle = `rgba(255,77,77,${ringA})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(255,77,77,0.3)';
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(45,158,139,${ringA * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, ringR * 0.65, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const currentStage = STAGES[stage];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#060604' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
        {/* Brand */}
        <p className="absolute top-8 left-0 right-0 text-center font-mono text-[8px] uppercase tracking-[0.6em]"
           style={{ color: 'rgba(245,240,232,0.1)' }}>woh wala trip</p>

        {/* Stage display */}
        <div className="text-center space-y-8 max-w-md"
             style={{ opacity: revealed ? 1 : 0, transition: 'opacity 1s ease' }}>

          {/* Stage number */}
          <p className="font-mono text-[8px] uppercase tracking-[0.7em]"
             style={{ color: 'rgba(255,77,77,0.5)' }}>
            ● STAGE {stage + 1} OF {STAGES.length}
          </p>

          {/* Active stage label — transitions between stages */}
          <div key={stage} className="space-y-3">
            <h2 className="font-display font-black uppercase leading-tight"
                style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(245,240,232,0.92)', animation: 'slide-up 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
              {currentStage.label}
            </h2>
            <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.3)', animation: 'fade-in 0.8s ease 0.2s both' }}>
              "{currentStage.sub}"
            </p>
          </div>

          {/* Trip name reveal — fades in at 50%+ */}
          {trip?.name && progress >= 50 && (
            <div className="space-y-1" style={{ animation: 'fade-in 1s ease' }}>
              <p className="font-mono text-[7px] uppercase tracking-[0.5em]" style={{ color: 'rgba(245,240,232,0.2)' }}>SUBJECT</p>
              <p className="font-display font-black text-xl uppercase" style={{ color: 'rgba(245,240,232,0.6)' }}>
                {trip.name}
              </p>
            </div>
          )}

          {/* Stage progress dots */}
          <div className="flex items-center justify-center gap-2">
            {STAGES.map((s, i) => (
              <div key={i} className="transition-all duration-500"
                   style={{
                     width: i === stage ? 20 : 6,
                     height: 6,
                     borderRadius: 3,
                     background: i < stage ? '#2D9E8B' : i === stage ? '#FF4D4D' : 'rgba(245,240,232,0.1)',
                     boxShadow: i === stage ? '0 0 10px rgba(255,77,77,0.6)' : 'none',
                   }} />
            ))}
          </div>

          {/* Fine progress line */}
          <div className="w-48 mx-auto">
            <div className="h-px w-full relative overflow-hidden rounded-full"
                 style={{ background: 'rgba(245,240,232,0.06)' }}>
              <div className="absolute left-0 top-0 h-full transition-all duration-300"
                   style={{ width: `${progress}%`, background: 'linear-gradient(90deg, rgba(255,77,77,0.4), rgba(255,77,77,0.9))', boxShadow: '0 0 6px rgba(255,77,77,0.4)' }} />
            </div>
            <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-center mt-2" style={{ color: 'rgba(245,240,232,0.15)' }}>
              {Math.floor(progress)}% RECONSTRUCTED
            </p>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="absolute bottom-8 font-mono text-[7.5px] uppercase tracking-[0.5em]"
           style={{ color: 'rgba(245,240,232,0.1)' }}>
          USUALLY 2–5 MINUTES
        </p>
      </div>

      <style jsx>{`
        @keyframes slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
