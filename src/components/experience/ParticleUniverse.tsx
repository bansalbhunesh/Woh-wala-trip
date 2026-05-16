'use client';
import { useEffect, useRef } from 'react';

interface Props {
  phase: number; // 0=void 1=signal 2=awaken 3=reveal 4=portal
  mouseX: number;
  mouseY: number;
}

export default function ParticleUniverse({ phase, mouseX, mouseY }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase,
    mouseX,
    mouseY,
    animId: 0,
  });

  useEffect(() => {
    stateRef.current.phase = phase;
    stateRef.current.mouseX = mouseX;
    stateRef.current.mouseY = mouseY;
  }, [phase, mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W; canvas.height = H;
        initParticles();
      }, 200);
    };
    window.addEventListener('resize', onResize);

    interface Particle {
      x: number; y: number; z: number;
      vx: number; vy: number; vz: number;
      size: number;
      hue: number; // 0-60 warm, 180-200 cool
      life: number; // 0-1
      maxLife: number;
      type: 'dust' | 'fragment' | 'star';
    }

    let particles: Particle[] = [];

    function initParticles() {
      particles = [];
      // Dust layer — reduced from 600 for 60fps on mobile
      for (let i = 0; i < 300; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random(),
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          vz: (Math.random() - 0.5) * 0.002,
          size: Math.random() * 1.5 + 0.3,
          hue: Math.random() * 40 + 20, // warm orange/amber
          life: Math.random(),
          maxLife: 0.6 + Math.random() * 0.4,
          type: 'dust',
        });
      }
      // Fragment layer — reduced from 80
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random() * 0.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          vz: 0,
          size: Math.random() * 3 + 1.5,
          hue: Math.random() > 0.5 ? 30 : 195, // warm or teal
          life: Math.random(),
          maxLife: 0.5 + Math.random() * 0.5,
          type: 'fragment',
        });
      }
      // Stars — reduced from 200
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random() * 0.3,
          vx: 0,
          vy: (Math.random() - 0.5) * 0.05,
          vz: 0,
          size: Math.random() * 0.8 + 0.2,
          hue: 0,
          life: Math.random(),
          maxLife: 1,
          type: 'star',
        });
      }
    }

    initParticles();

    let t = 0;

    function draw() {
      stateRef.current.animId = requestAnimationFrame(draw);
      t += 0.005;

      const { phase: p, mouseX: mx, mouseY: my } = stateRef.current;

      // Phase-based opacity for the canvas background fill
      const bgAlpha = p >= 2 ? 0.85 : 0.92;
      ctx.fillStyle = `rgba(6,6,4,${bgAlpha})`;
      ctx.fillRect(0, 0, W, H);

      // Central vortex origin (follows mouse slightly)
      const cx = W / 2 + (mx - 0.5) * W * 0.05;
      const cy = H / 2 + (my - 0.5) * H * 0.05;

      // Phase-driven intensity multiplier
      const intensity = [0.15, 0.4, 0.85, 1.0, 1.2][Math.min(p, 4)];

      particles.forEach((par) => {
        // Update life
        par.life += 0.003;
        if (par.life > par.maxLife) par.life = 0;
        const lifeAlpha = Math.sin((par.life / par.maxLife) * Math.PI);

        // Mouse magnetic repulsion
        const dx = par.x - cx;
        const dy = par.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repel = Math.max(0, 1 - dist / 200);
        par.vx += (dx / (dist + 1)) * repel * 0.08;
        par.vy += (dy / (dist + 1)) * repel * 0.08;

        // In phase 4 (portal) — pull toward center
        if (p === 4) {
          par.vx += (cx - par.x) * 0.0008;
          par.vy += (cy - par.y) * 0.0008;
        }

        // Vortex rotation (gentle spiral)
        const angle = Math.atan2(dy, dx);
        const vortexStrength = p >= 2 ? 0.0003 * intensity : 0;
        par.vx += Math.cos(angle + Math.PI / 2) * vortexStrength;
        par.vy += Math.sin(angle + Math.PI / 2) * vortexStrength;

        // Damping
        par.vx *= 0.985;
        par.vy *= 0.985;

        par.x += par.vx;
        par.y += par.vy;

        // Wrap edges
        if (par.x < -10) par.x = W + 10;
        if (par.x > W + 10) par.x = -10;
        if (par.y < -10) par.y = H + 10;
        if (par.y > H + 10) par.y = -10;

        // Perspective scale from z
        const scale = 0.5 + par.z * 0.5;
        const pSize = par.size * scale;
        const alpha = lifeAlpha * intensity * scale;

        if (alpha < 0.01) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (par.type === 'star') {
          ctx.fillStyle = `rgba(245,240,232,${alpha})`;
          ctx.beginPath();
          ctx.arc(par.x, par.y, pSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (par.type === 'fragment') {
          // Glowing fragment with halo
          const grd = ctx.createRadialGradient(par.x, par.y, 0, par.x, par.y, pSize * 4);
          if (par.hue < 60) {
            grd.addColorStop(0, `rgba(255,100,50,${alpha * 0.9})`);
            grd.addColorStop(0.4, `rgba(255,60,20,${alpha * 0.3})`);
            grd.addColorStop(1, 'rgba(255,60,20,0)');
          } else {
            grd.addColorStop(0, `rgba(45,158,139,${alpha * 0.9})`);
            grd.addColorStop(0.4, `rgba(45,158,139,${alpha * 0.3})`);
            grd.addColorStop(1, 'rgba(45,158,139,0)');
          }
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(par.x, par.y, pSize * 4, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.fillStyle = par.hue < 60 ? `rgba(255,160,80,${alpha})` : `rgba(80,220,200,${alpha})`;
          ctx.beginPath();
          ctx.arc(par.x, par.y, pSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Dust
          ctx.fillStyle = `hsla(${par.hue},60%,70%,${alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(par.x, par.y, pSize, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Pulse ring from center (phase 1+)
      if (p >= 1) {
        const pulseR = ((t * 120) % 400);
        const pulseA = Math.max(0, 0.06 - pulseR / 6000) * intensity;
        if (pulseA > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(255,77,77,${pulseA})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Film grain overlay
      if (p <= 2) {
        ctx.save();
        ctx.globalAlpha = 0.025;
        for (let i = 0; i < 300; i++) {
          const gx = Math.random() * W;
          const gy = Math.random() * H;
          const gs = Math.random() * 2;
          ctx.fillStyle = `rgba(245,240,232,${Math.random() * 0.8})`;
          ctx.fillRect(gx, gy, gs, gs);
        }
        ctx.restore();
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
