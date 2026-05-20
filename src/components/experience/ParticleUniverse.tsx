'use client';

import { useEffect, useRef } from 'react';

interface Props {
  phase: number;
  mouseX: number;
  mouseY: number;
}

/* ─────────────────────────────────────────────────────────────
   AI Memory Observatory — Living Friendship Constellation
   
   Design philosophy:
   "Premium products do not animate elements.
    They animate atmosphere, depth, focus, light, and narrative."
   
   Reference: Interstellar interfaces, HER movie UI,
   Apple Weather volumetrics, Linear's restraint.
   
   Architecture:
   Layer 1 — Deep black void
   Layer 2 — 3 atmospheric nebula fog patches (barely visible)
   Layer 3 — 180 deep-field stars (near-static, twinkling)
   Layer 4 — 18 memory constellation nodes (deliberate grouping)
   Layer 5 — 20 constellation threads (friendship connections)
   Layer 6 — Traveling scan pulses along threads
   Layer 7 — Cinematic vignette
   
   Everything moves as a UNIFIED system.
   Global rotation: ~0.08°/s.
   Mouse parallax at depth-correct rates.
   No independent chaos. No jitter. No bouncing.
   ────────────────────────────────────────────────────────── */

// Memory constellation — hand-placed for visual storytelling
// Positions as viewport ratios. Groups represent friend clusters.
const NODES = [
  // ── Core cluster (5) — the tight friend group ──
  { x: 0.47, y: 0.37, r: 7.5, warmth: 0.92, phase: 0.0 },
  { x: 0.54, y: 0.33, r: 5.5, warmth: 0.8, phase: 1.1 },
  { x: 0.42, y: 0.44, r: 6.5, warmth: 0.88, phase: 2.3 },
  { x: 0.57, y: 0.43, r: 5.0, warmth: 0.75, phase: 3.5 },
  { x: 0.49, y: 0.49, r: 6.0, warmth: 0.95, phase: 4.7 },

  // ── Upper-right cluster (3) — the chaos agents ──
  { x: 0.7, y: 0.2, r: 6.5, warmth: 0.7, phase: 0.5 },
  { x: 0.64, y: 0.14, r: 4.5, warmth: 0.6, phase: 1.7 },
  { x: 0.76, y: 0.26, r: 3.8, warmth: 0.65, phase: 2.9 },

  // ── Left cluster (3) — the planners ──
  { x: 0.26, y: 0.28, r: 5.5, warmth: 0.82, phase: 0.8 },
  { x: 0.2, y: 0.36, r: 4.5, warmth: 0.68, phase: 2.0 },
  { x: 0.31, y: 0.22, r: 3.8, warmth: 0.72, phase: 3.2 },

  // ── Lower scatter (3) — the connectors ──
  { x: 0.56, y: 0.64, r: 4.5, warmth: 0.78, phase: 1.3 },
  { x: 0.64, y: 0.7, r: 3.8, warmth: 0.58, phase: 2.5 },
  { x: 0.38, y: 0.67, r: 4.0, warmth: 0.62, phase: 3.7 },

  // ── Periphery (4) — the quiet observers ──
  { x: 0.13, y: 0.56, r: 2.8, warmth: 0.48, phase: 0.2 },
  { x: 0.84, y: 0.5, r: 2.8, warmth: 0.52, phase: 4.1 },
  { x: 0.33, y: 0.78, r: 3.0, warmth: 0.55, phase: 5.3 },
  { x: 0.74, y: 0.1, r: 2.5, warmth: 0.42, phase: 1.6 },
];

// Threads — [fromIndex, toIndex, opacityWeight]
// Dense within clusters, sparse between. Tells a story.
const THREADS: [number, number, number][] = [
  // Core internal (dense — everyone knows everyone)
  [0, 1, 0.7],
  [0, 2, 0.65],
  [0, 3, 0.55],
  [0, 4, 0.7],
  [1, 3, 0.5],
  [2, 4, 0.55],
  [1, 4, 0.45],
  [2, 3, 0.35],

  // Upper-right internal
  [5, 6, 0.55],
  [5, 7, 0.5],
  [6, 7, 0.35],

  // Left internal
  [8, 9, 0.55],
  [8, 10, 0.5],

  // Lower internal
  [11, 12, 0.5],
  [11, 13, 0.4],

  // Cross-cluster bridges (fainter — social bridges)
  [1, 5, 0.18],
  [3, 11, 0.15],
  [2, 8, 0.18],
  [4, 13, 0.12],
  [7, 15, 0.08],
  [10, 8, 0.3],
];

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ScanPulse {
  threadIdx: number;
  progress: number;
  speed: number;
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

    // ─── Star field ─────────────────────────────────────
    const stars: Star[] = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.0 + 0.2,
        brightness: Math.random() * 0.25 + 0.04,
        twinkleSpeed: Math.random() * 0.25 + 0.08,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // ─── Scan pulses (AI analysis signals) ──────────────
    const pulses: ScanPulse[] = [];
    function spawnPulse() {
      if (pulses.length < 4) {
        pulses.push({
          threadIdx: Math.floor(Math.random() * THREADS.length),
          progress: 0,
          speed: 0.08 + Math.random() * 0.06,
        });
      }
    }
    // Spawn initial pulses staggered
    setTimeout(() => spawnPulse(), 4000);
    setTimeout(() => spawnPulse(), 6500);
    setTimeout(() => spawnPulse(), 9000);

    let t = 0;
    let lastTs = 0;
    const mountTime = performance.now();

    function draw(timestamp: number) {
      stateRef.current.animId = requestAnimationFrame(draw);
      const dt = lastTs > 0 ? Math.min((timestamp - lastTs) / 1000, 0.05) : 1 / 60;
      lastTs = timestamp;
      t += dt;

      const elapsed = (timestamp - mountTime) / 1000; // seconds since mount
      const { mouseX: mx, mouseY: my } = stateRef.current;

      // ─── CLEAR ────────────────────────────────────────
      ctx.fillStyle = '#060604';
      ctx.fillRect(0, 0, W, H);

      // Global constellation rotation (glacially slow — unified body)
      const globalAngle = t * 0.0014; // ~0.08°/s

      // ─── LAYER 2: Atmospheric fog ─────────────────────
      const fogPatches = [
        { x: 0.55, y: 0.45, r: 420, h: 15, s: 55, l: 12, a: 0.045 },
        { x: 0.25, y: 0.65, r: 300, h: 28, s: 50, l: 10, a: 0.035 },
        { x: 0.75, y: 0.25, r: 250, h: 185, s: 35, l: 12, a: 0.025 },
      ];

      fogPatches.forEach(f => {
        const px = f.x * W + (mx - 0.5) * -18;
        const py = f.y * H + (my - 0.5) * -12;
        const breathR = f.r * (1 + Math.sin(t * 0.1) * 0.08);

        const grad = ctx.createRadialGradient(px, py, 0, px, py, breathR);
        grad.addColorStop(0, `hsla(${f.h}, ${f.s}%, ${f.l}%, ${f.a})`);
        grad.addColorStop(0.5, `hsla(${f.h}, ${f.s}%, ${f.l}%, ${f.a * 0.4})`);
        grad.addColorStop(1, `hsla(${f.h}, ${f.s}%, ${f.l}%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, breathR, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── LAYER 3: Star field ──────────────────────────
      stars.forEach(s => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha = s.brightness * twinkle;
        if (alpha < 0.015) return;
        const sx = s.x * W + (mx - 0.5) * -4;
        const sy = s.y * H + (my - 0.5) * -3;
        ctx.fillStyle = `rgba(240, 235, 225, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── Compute projected node positions ─────────────
      // All nodes rotate as one unified body around constellation center.
      const conCx = 0.49 * W;
      const conCy = 0.42 * H;

      const nodePositions = NODES.map((n, i) => {
        // Offset from constellation center
        const rawX = n.x * W - conCx;
        const rawY = n.y * H - conCy;

        // Rotate as unified body
        const cosA = Math.cos(globalAngle);
        const sinA = Math.sin(globalAngle);
        const rx = rawX * cosA - rawY * sinA;
        const ry = rawX * sinA + rawY * cosA;

        // Mouse parallax (depth-proportional)
        const depth = 0.6 + n.r / 20; // bigger nodes feel closer
        const px = conCx + rx + (mx - 0.5) * -22 * depth;
        const py = conCy + ry + (my - 0.5) * -16 * depth;

        // Staggered fade-in: nodes appear over first 3 seconds
        const fadeIn = Math.min(1, Math.max(0, (elapsed - i * 0.12) / 1.2));

        // Breathing: very subtle scale pulse
        const breath = 1 + Math.sin(t * 0.2 + n.phase) * 0.06;

        return { px, py, fadeIn, breath, node: n };
      });

      // ─── LAYER 5: Constellation threads ───────────────
      THREADS.forEach((thread, ti) => {
        const [fi, ti2, strength] = thread;
        const p1 = nodePositions[fi];
        const p2 = nodePositions[ti2];
        if (!p1 || !p2) return;

        // Threads fade in after nodes (starting at ~2.5s)
        const threadFade = Math.min(1, Math.max(0, (elapsed - 2.5 - ti * 0.08) / 1.5));
        const alpha = strength * 0.08 * threadFade * Math.min(p1.fadeIn, p2.fadeIn);
        if (alpha < 0.003) return;

        ctx.strokeStyle = `rgba(255, 200, 140, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      });

      // ─── LAYER 6: Traveling scan pulses ───────────────
      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const pulse = pulses[pi];
        pulse.progress += pulse.speed * dt;

        if (pulse.progress > 1) {
          pulses.splice(pi, 1);
          // Respawn after delay
          setTimeout(() => spawnPulse(), 2000 + Math.random() * 4000);
          continue;
        }

        const thread = THREADS[pulse.threadIdx];
        if (!thread) continue;
        const p1 = nodePositions[thread[0]];
        const p2 = nodePositions[thread[1]];
        if (!p1 || !p2) continue;

        const prog = pulse.progress;
        const gpx = p1.px + (p2.px - p1.px) * prog;
        const gpy = p1.py + (p2.py - p1.py) * prog;

        // Pulse fades in/out at endpoints
        const pulseAlpha = Math.sin(prog * Math.PI) * 0.35;

        // Soft glow halo
        const glowGrad = ctx.createRadialGradient(gpx, gpy, 0, gpx, gpy, 28);
        glowGrad.addColorStop(0, `rgba(255, 210, 160, ${pulseAlpha * 0.5})`);
        glowGrad.addColorStop(1, 'rgba(255, 210, 160, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(gpx, gpy, 28, 0, Math.PI * 2);
        ctx.fill();

        // Bright core dot
        ctx.fillStyle = `rgba(255, 225, 180, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(gpx, gpy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── LAYER 4: Memory nodes ────────────────────────
      nodePositions.forEach(({ px, py, fadeIn, breath, node }) => {
        if (fadeIn < 0.01) return;

        const r = node.r * breath;
        const alpha = fadeIn;

        // Warm color based on node warmth
        const lum = 55 + node.warmth * 20;

        // Outer halo (atmosphere)
        const haloGrad = ctx.createRadialGradient(px, py, 0, px, py, r * 4.5);
        haloGrad.addColorStop(0, `hsla(32, 65%, ${lum}%, ${0.12 * alpha})`);
        haloGrad.addColorStop(0.4, `hsla(32, 65%, ${lum}%, ${0.04 * alpha})`);
        haloGrad.addColorStop(1, `hsla(32, 65%, ${lum}%, 0)`);
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(px, py, r * 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Warm core
        const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, r);
        coreGrad.addColorStop(0, `hsla(35, 70%, ${lum + 10}%, ${0.7 * alpha})`);
        coreGrad.addColorStop(0.6, `hsla(30, 60%, ${lum}%, ${0.35 * alpha})`);
        coreGrad.addColorStop(1, `hsla(28, 55%, ${lum - 10}%, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ─── LAYER 7: Cinematic vignette ──────────────────
      const vigR = Math.max(W, H) * 0.8;
      const vigGrad = ctx.createRadialGradient(W / 2, H / 2, vigR * 0.35, W / 2, H / 2, vigR);
      vigGrad.addColorStop(0, 'rgba(6, 6, 4, 0)');
      vigGrad.addColorStop(0.5, 'rgba(6, 6, 4, 0)');
      vigGrad.addColorStop(1, 'rgba(6, 6, 4, 0.6)');
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
