'use client';

import { useEffect, useRef } from 'react';

interface Props {
  phase: number;
  mouseX: number;
  mouseY: number;
}

/* ─────────────────────────────────────────────────────────────
   AI Memory Observatory — Deep-Space Volumetric Fog Engine
   
   Design references: Interstellar UI, Apple Weather volumetrics,
   Spotify Wrapped reveals, Minority Report memory fields.
   
   No grids. No mesh. No chaotic particles.
   Just slow, breathing, luminous fog — like peering into
   a dark observatory where memories drift as light.
   ────────────────────────────────────────────────────────── */

interface Nebula {
  x: number; // Position as ratio of canvas (0–1)
  y: number;
  radius: number; // Base radius in px
  vx: number; // Drift velocity (very slow)
  vy: number;
  hue: number;
  sat: number;
  lum: number;
  alpha: number; // Max alpha
  phase: number; // Breathing phase offset
  breathRate: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface LightThread {
  points: { x: number; y: number }[]; // Control points (ratio 0–1)
  speed: number;
  phase: number;
  hue: number;
  alpha: number;
  width: number;
}

export default function ParticleUniverse({ phase, mouseX, mouseY }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ phase, mouseX, mouseY, animId: 0 });

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
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
      }, 200);
    };
    window.addEventListener('resize', onResize);

    // ─── NEBULA FOG CLOUDS ─────────────────────────────────
    // Large, soft radial gradients that drift extremely slowly.
    // These ARE the atmosphere. Colors: deep crimson, warm amber,
    // faint teal — the YaarLore palette.
    const nebulae: Nebula[] = [
      // Primary warm crimson cloud — right side, anchoring the archetype cards
      {
        x: 0.72,
        y: 0.55,
        radius: 380,
        vx: 0.002,
        vy: -0.001,
        hue: 8,
        sat: 75,
        lum: 18,
        alpha: 0.09,
        phase: 0,
        breathRate: 0.15,
      },
      // Deep amber glow — bottom left, grounding the typography
      {
        x: 0.25,
        y: 0.78,
        radius: 320,
        vx: -0.0015,
        vy: 0.001,
        hue: 28,
        sat: 80,
        lum: 22,
        alpha: 0.07,
        phase: 1.2,
        breathRate: 0.12,
      },
      // Teal accent — top right, cool temperature balance
      {
        x: 0.82,
        y: 0.18,
        radius: 260,
        vx: -0.001,
        vy: 0.0008,
        hue: 175,
        sat: 55,
        lum: 20,
        alpha: 0.045,
        phase: 2.4,
        breathRate: 0.18,
      },
      // Center warmth — subtle, behind the title
      {
        x: 0.38,
        y: 0.42,
        radius: 450,
        vx: 0.001,
        vy: -0.0005,
        hue: 18,
        sat: 65,
        lum: 14,
        alpha: 0.055,
        phase: 3.6,
        breathRate: 0.1,
      },
      // Upper left cool — atmospheric depth
      {
        x: 0.12,
        y: 0.22,
        radius: 280,
        vx: 0.0008,
        vy: 0.0012,
        hue: 220,
        sat: 30,
        lum: 12,
        alpha: 0.035,
        phase: 0.8,
        breathRate: 0.14,
      },
      // Bottom right ember — warm accent near CTA
      {
        x: 0.65,
        y: 0.85,
        radius: 300,
        vx: -0.0012,
        vy: -0.0008,
        hue: 15,
        sat: 70,
        lum: 16,
        alpha: 0.06,
        phase: 4.2,
        breathRate: 0.16,
      },
      // Very large diffuse center fog — ties everything together
      {
        x: 0.5,
        y: 0.5,
        radius: 600,
        vx: 0.0005,
        vy: 0.0003,
        hue: 12,
        sat: 45,
        lum: 10,
        alpha: 0.03,
        phase: 5.0,
        breathRate: 0.08,
      },
      // Ghost teal — mid-left
      {
        x: 0.18,
        y: 0.55,
        radius: 220,
        vx: 0.001,
        vy: -0.0006,
        hue: 185,
        sat: 40,
        lum: 16,
        alpha: 0.03,
        phase: 1.8,
        breathRate: 0.2,
      },
    ];

    // ─── DEEP STAR FIELD ────────────────────────────────────
    // Hundreds of tiny near-static dots. Subtle twinkle.
    const stars: Star[] = [];
    for (let i = 0; i < 280; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.2 + 0.3,
        brightness: Math.random() * 0.4 + 0.1,
        twinkleSpeed: Math.random() * 0.3 + 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // ─── LIGHT THREADS ──────────────────────────────────────
    // Very faint curved aurora-like lines that undulate slowly.
    // They represent "AI threads connecting memories."
    const threads: LightThread[] = [
      {
        points: [
          { x: 0.08, y: 0.65 },
          { x: 0.3, y: 0.4 },
          { x: 0.55, y: 0.55 },
          { x: 0.78, y: 0.35 },
          { x: 0.95, y: 0.5 },
        ],
        speed: 0.12,
        phase: 0,
        hue: 15,
        alpha: 0.035,
        width: 1.5,
      },
      {
        points: [
          { x: 0.05, y: 0.3 },
          { x: 0.25, y: 0.6 },
          { x: 0.5, y: 0.35 },
          { x: 0.72, y: 0.65 },
          { x: 0.92, y: 0.4 },
        ],
        speed: 0.09,
        phase: 2.0,
        hue: 180,
        alpha: 0.025,
        width: 1.2,
      },
      {
        points: [
          { x: 0.1, y: 0.8 },
          { x: 0.35, y: 0.55 },
          { x: 0.6, y: 0.7 },
          { x: 0.85, y: 0.45 },
        ],
        speed: 0.15,
        phase: 4.0,
        hue: 28,
        alpha: 0.03,
        width: 1.0,
      },
    ];

    let t = 0;
    let lastTs = 0;

    function draw(timestamp: number) {
      stateRef.current.animId = requestAnimationFrame(draw);
      const dt = lastTs > 0 ? Math.min((timestamp - lastTs) / 1000, 0.05) : 1 / 60;
      lastTs = timestamp;
      t += dt;

      const { mouseX: mx, mouseY: my } = stateRef.current;

      // ─── CLEAR: Pure black, no trails ─────────────────────
      ctx.fillStyle = '#060604';
      ctx.fillRect(0, 0, W, H);

      // ─── RENDER NEBULA FOG CLOUDS ─────────────────────────
      // Each nebula is a large soft radial gradient drawn at very
      // low opacity. They drift slowly and "breathe" (pulse size).
      nebulae.forEach(n => {
        // Drift position (wraps softly at edges)
        n.x += n.vx * dt;
        n.y += n.vy * dt;

        // Soft bounce at boundaries (reverse direction gently)
        if (n.x < -0.15) n.vx = Math.abs(n.vx);
        if (n.x > 1.15) n.vx = -Math.abs(n.vx);
        if (n.y < -0.15) n.vy = Math.abs(n.vy);
        if (n.y > 1.15) n.vy = -Math.abs(n.vy);

        // Mouse parallax — nebulae shift subtly opposite to cursor
        const parallaxX = (mx - 0.5) * -30;
        const parallaxY = (my - 0.5) * -20;

        // Breathing pulse (slow sine modulation of radius)
        const breathScale = 1 + Math.sin(t * n.breathRate + n.phase) * 0.12;
        const r = n.radius * breathScale;

        const cx = n.x * W + parallaxX;
        const cy = n.y * H + parallaxY;

        // Draw soft radial gradient
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const color = `hsla(${n.hue}, ${n.sat}%, ${n.lum}%,`;
        grad.addColorStop(0, `${color} ${n.alpha})`);
        grad.addColorStop(0.4, `${color} ${n.alpha * 0.55})`);
        grad.addColorStop(0.7, `${color} ${n.alpha * 0.2})`);
        grad.addColorStop(1, `${color} 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── RENDER STAR FIELD ─────────────────────────────────
      // Near-static tiny dots with soft twinkling.
      ctx.save();
      stars.forEach(s => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha = s.brightness * twinkle;
        if (alpha < 0.02) return;

        // Subtle parallax
        const px = s.x * W + (mx - 0.5) * -8;
        const py = s.y * H + (my - 0.5) * -6;

        ctx.fillStyle = `rgba(245, 240, 232, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // ─── RENDER LIGHT THREADS ──────────────────────────────
      // Slow undulating curves — aurora / memory connections.
      threads.forEach(thread => {
        ctx.save();
        ctx.lineWidth = thread.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Animated control points — each point undulates vertically
        const animPoints = thread.points.map((p, i) => ({
          x: p.x * W + (mx - 0.5) * -15,
          y: p.y * H + Math.sin(t * thread.speed + thread.phase + i * 1.5) * 40 + (my - 0.5) * -10,
        }));

        // Pulse alpha along the thread (traveling glow)
        const pulsePos = (t * 0.08 + thread.phase) % 1.0;

        // Draw as smooth quadratic Bézier curve
        ctx.beginPath();
        ctx.moveTo(animPoints[0].x, animPoints[0].y);
        for (let i = 1; i < animPoints.length - 1; i++) {
          const cpx = (animPoints[i].x + animPoints[i + 1].x) / 2;
          const cpy = (animPoints[i].y + animPoints[i + 1].y) / 2;
          ctx.quadraticCurveTo(animPoints[i].x, animPoints[i].y, cpx, cpy);
        }
        const last = animPoints[animPoints.length - 1];
        ctx.lineTo(last.x, last.y);

        // Base stroke
        const h = thread.hue;
        ctx.strokeStyle = `hsla(${h}, 50%, 55%, ${thread.alpha})`;
        ctx.stroke();

        // Traveling glow dot along the path
        const glowIdx = Math.floor(pulsePos * (animPoints.length - 1));
        const glowFrac = pulsePos * (animPoints.length - 1) - glowIdx;
        const glowPt = {
          x:
            animPoints[glowIdx].x +
            (animPoints[Math.min(glowIdx + 1, animPoints.length - 1)].x - animPoints[glowIdx].x) *
              glowFrac,
          y:
            animPoints[glowIdx].y +
            (animPoints[Math.min(glowIdx + 1, animPoints.length - 1)].y - animPoints[glowIdx].y) *
              glowFrac,
        };

        const glowGrad = ctx.createRadialGradient(glowPt.x, glowPt.y, 0, glowPt.x, glowPt.y, 35);
        glowGrad.addColorStop(0, `hsla(${h}, 60%, 60%, 0.12)`);
        glowGrad.addColorStop(1, `hsla(${h}, 60%, 60%, 0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(glowPt.x, glowPt.y, 35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // ─── CINEMATIC VIGNETTE ────────────────────────────────
      // Dark edges, bright center — classic film framing.
      const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.85);
      vigGrad.addColorStop(0, 'rgba(6, 6, 4, 0)');
      vigGrad.addColorStop(0.6, 'rgba(6, 6, 4, 0)');
      vigGrad.addColorStop(1, 'rgba(6, 6, 4, 0.55)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);
    }

    draw(0);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
