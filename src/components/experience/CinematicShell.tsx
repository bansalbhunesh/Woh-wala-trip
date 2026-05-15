'use client';
import { useEffect, useRef } from 'react';

export function CinematicShell({ children, intensity = 0.3 }: { children: React.ReactNode; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener('resize', onResize);

    // Particles — slow sine oscillation, minimal glow spread
    const particles = Array.from({ length: 220 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.08,  // very slow drift
      vy: (Math.random() - 0.5) * 0.08,
      size: Math.random() * 1.3 + 0.2,
      hue: [10, 185, 280][Math.floor(Math.random() * 3)] as number,
      // Offset phase so not all particles pulse together
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.004; // slow global tick

      // Near-opaque background — particles fade in slowly, no harsh cuts
      // clearRect first to prevent semi-transparent edge artifacts / border glitch
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060604';
      ctx.fillRect(0, 0, W, H);

      particles.forEach(p => {
        // Very slow individual oscillation — no visible flicker
        p.phase += 0.005;
        const alpha = ((Math.sin(p.phase) + 1) / 2) * intensity * 0.7;

        p.x += p.vx; p.y += p.vy;
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4;
        if (p.y > H + 4) p.y = -4;

        if (alpha < 0.012) return;

        const cols: Record<number, [number,number,number]> = {
          10:  [255, 77, 77],
          185: [45, 158, 139],
          280: [124, 106, 255],
        };
        const [r, g, b] = cols[p.hue] ?? [245, 240, 232];

        // Only larger particles get a halo — smaller radius to avoid border bleed
        if (p.size > 1.3) {
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grd.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.6})`);
          grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
    };

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize); };
  }, [intensity]);

  return (
    <div className="relative min-h-screen" style={{ background: '#060604', color: '#F5F0E8' }}>
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
