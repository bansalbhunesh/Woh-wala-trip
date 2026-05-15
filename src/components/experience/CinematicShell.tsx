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

    const particles = Array.from({ length: 300 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
      size: Math.random() * 1.4 + 0.2,
      hue: [10, 185, 280][Math.floor(Math.random() * 3)] as number,
      life: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.006;
      ctx.fillStyle = 'rgba(6,6,4,0.92)';
      ctx.fillRect(0, 0, W, H);

      particles.forEach(p => {
        p.life += 0.018;
        const alpha = ((Math.sin(p.life) + 1) / 2) * intensity;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        if (alpha < 0.01) return;

        const colors: Record<number, string> = {
          10: `rgba(255,77,77,${alpha})`,
          185: `rgba(45,158,139,${alpha})`,
          280: `rgba(124,106,255,${alpha})`,
        };
        if (p.size > 1.1) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          g.addColorStop(0, colors[p.hue]); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = colors[p.hue];
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
