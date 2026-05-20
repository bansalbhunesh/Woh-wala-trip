'use client';

import { useEffect, useRef } from 'react';

interface Props {
  phase: number;
  mouseX: number;
  mouseY: number;
}

/* ─────────────────────────────────────────────────────────────
   AI Memory Observatory — Living Friendship Constellation
   ────────────────────────────────────────────────────────── */

interface Fragment {
  type: 1 | 2 | 3; // 1 = Primary, 2 = Secondary, 3 = Micro
  src?: string;
  text?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  phase: number;
  depth: number;
  rot: number;
}

const FRAGMENTS: Fragment[] = [
  // ── Primary (4) - visible, emotional anchors, softly moving ──
  {
    type: 1,
    src: '/memories/mem1.png',
    x: 0.45,
    y: 0.35,
    w: 260,
    h: 180,
    phase: 0.0,
    depth: 1.1,
    rot: -0.04,
  },
  {
    type: 1,
    src: '/memories/mem2.png',
    x: 0.55,
    y: 0.45,
    w: 240,
    h: 160,
    phase: 1.1,
    depth: 1.05,
    rot: 0.06,
  },
  {
    type: 1,
    src: '/memories/mem3.png',
    x: 0.38,
    y: 0.55,
    w: 280,
    h: 190,
    phase: 2.3,
    depth: 1.15,
    rot: -0.02,
  },
  {
    type: 1,
    src: '/memories/mem4.png',
    x: 0.65,
    y: 0.25,
    w: 220,
    h: 150,
    phase: 3.5,
    depth: 1.0,
    rot: 0.1,
  },

  // ── Secondary (6) - smaller, blurred, layered deeper ──
  {
    type: 2,
    src: '/memories/mem5.png',
    x: 0.3,
    y: 0.25,
    w: 140,
    h: 100,
    phase: 0.5,
    depth: 0.7,
    rot: -0.1,
  },
  {
    type: 2,
    src: '/memories/mem6.png',
    x: 0.7,
    y: 0.65,
    w: 160,
    h: 110,
    phase: 1.7,
    depth: 0.8,
    rot: 0.15,
  },
  {
    type: 2,
    src: '/memories/mem7.png',
    x: 0.22,
    y: 0.5,
    w: 120,
    h: 85,
    phase: 2.9,
    depth: 0.6,
    rot: -0.08,
  },
  {
    type: 2,
    src: '/memories/mem8.png',
    x: 0.75,
    y: 0.4,
    w: 150,
    h: 100,
    phase: 0.8,
    depth: 0.75,
    rot: 0.05,
  },
  {
    type: 2,
    src: '/memories/mem9.png',
    x: 0.48,
    y: 0.2,
    w: 130,
    h: 90,
    phase: 2.0,
    depth: 0.85,
    rot: -0.12,
  },
  {
    type: 2,
    src: '/memories/mem10.png',
    x: 0.42,
    y: 0.75,
    w: 140,
    h: 95,
    phase: 3.2,
    depth: 0.65,
    rot: 0.08,
  },

  // ── Micro details (4) - atmospheric text fragments ──
  { type: 3, text: 'IMG_4829', x: 0.58, y: 0.55, phase: 1.3, depth: 1.25, rot: 0 },
  { type: 3, text: '23:45', x: 0.35, y: 0.3, phase: 2.5, depth: 1.3, rot: 0 },
  { type: 3, text: '12.9716° N, 77.5946° E', x: 0.75, y: 0.15, phase: 3.7, depth: 0.9, rot: -0.05 },
  { type: 3, text: 'Voice Note: 1:12', x: 0.25, y: 0.65, phase: 0.9, depth: 0.8, rot: 0.04 },
];

const THREADS: [number, number, number][] = [
  // Primary connections
  [0, 1, 0.7],
  [1, 2, 0.6],
  [2, 3, 0.5],
  [0, 3, 0.4],
  // Primary to secondary
  [0, 4, 0.4],
  [1, 5, 0.35],
  [2, 6, 0.3],
  [3, 7, 0.4],
  [0, 8, 0.2],
  [1, 9, 0.25],
  // Micro anchoring
  [10, 1, 0.2],
  [11, 4, 0.15],
  [12, 3, 0.1],
  [13, 6, 0.15],
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
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

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

    // Preload images
    FRAGMENTS.forEach(frag => {
      if (frag.src && !imagesRef.current[frag.src]) {
        const img = new Image();
        img.src = frag.src;
        img.onload = () => {
          imagesRef.current[frag.src!] = img;
        };
      }
    });

    // ─── Star field ─────────────────────────────────────
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
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
      if (pulses.length < 3) {
        pulses.push({
          threadIdx: Math.floor(Math.random() * THREADS.length),
          progress: 0,
          speed: 0.06 + Math.random() * 0.05,
        });
      }
    }
    setTimeout(() => spawnPulse(), 3000);
    setTimeout(() => spawnPulse(), 6000);

    let t = 0;
    let lastTs = 0;
    const mountTime = performance.now();

    function draw(timestamp: number) {
      stateRef.current.animId = requestAnimationFrame(draw);
      const dt = lastTs > 0 ? Math.min((timestamp - lastTs) / 1000, 0.05) : 1 / 60;
      lastTs = timestamp;
      t += dt;

      const elapsed = (timestamp - mountTime) / 1000;
      const { mouseX: mx, mouseY: my } = stateRef.current;

      // ─── CLEAR ────────────────────────────────────────
      ctx.fillStyle = '#060604';
      ctx.fillRect(0, 0, W, H);

      const globalAngle = t * 0.0012; // ~0.07°/s

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

      // ─── Compute projected fragment positions ─────────
      const conCx = 0.5 * W;
      const conCy = 0.45 * H;

      const projected = FRAGMENTS.map((frag, i) => {
        const rawX = frag.x * W - conCx;
        const rawY = frag.y * H - conCy;

        const cosA = Math.cos(globalAngle);
        const sinA = Math.sin(globalAngle);
        const rx = rawX * cosA - rawY * sinA;
        const ry = rawX * sinA + rawY * cosA;

        const depth = frag.depth;
        const px = conCx + rx + (mx - 0.5) * -30 * depth;
        const py = conCy + ry + (my - 0.5) * -24 * depth;

        const fadeIn = Math.min(1, Math.max(0, (elapsed - i * 0.15) / 1.5));

        return { px, py, fadeIn, frag };
      });

      // ─── LAYER 4: Constellation threads ───────────────
      THREADS.forEach((thread, ti) => {
        const [fi, ti2, strength] = thread;
        const p1 = projected[fi];
        const p2 = projected[ti2];
        if (!p1 || !p2) return;

        const threadFade = Math.min(1, Math.max(0, (elapsed - 2.5 - ti * 0.08) / 1.5));
        const alpha = strength * 0.12 * threadFade * Math.min(p1.fadeIn, p2.fadeIn);
        if (alpha < 0.003) return;

        ctx.strokeStyle = `rgba(255, 210, 150, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      });

      // ─── LAYER 5: Scan pulses ─────────────────────────
      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const pulse = pulses[pi];
        pulse.progress += pulse.speed * dt;

        if (pulse.progress > 1) {
          pulses.splice(pi, 1);
          setTimeout(() => spawnPulse(), 2000 + Math.random() * 3000);
          continue;
        }

        const thread = THREADS[pulse.threadIdx];
        if (!thread) continue;
        const p1 = projected[thread[0]];
        const p2 = projected[thread[1]];
        if (!p1 || !p2) continue;

        const prog = pulse.progress;
        const gpx = p1.px + (p2.px - p1.px) * prog;
        const gpy = p1.py + (p2.py - p1.py) * prog;

        const pulseAlpha = Math.sin(prog * Math.PI) * 0.4;

        const glowGrad = ctx.createRadialGradient(gpx, gpy, 0, gpx, gpy, 20);
        glowGrad.addColorStop(0, `rgba(255, 210, 160, ${pulseAlpha * 0.5})`);
        glowGrad.addColorStop(1, 'rgba(255, 210, 160, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(gpx, gpy, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 235, 200, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(gpx, gpy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── LAYER 6: Memory fragments ────────────────────
      // Sort by depth so closer things render on top
      const sortedProj = [...projected].sort((a, b) => a.frag.depth - b.frag.depth);

      sortedProj.forEach(({ px, py, fadeIn, frag }) => {
        if (fadeIn < 0.01) return;

        let baseAlpha = 0;
        if (frag.type === 1) {
          baseAlpha = 0.55 + Math.sin(t * 0.15 + frag.phase) * 0.35; // 0.2 to 0.9
        } else if (frag.type === 2) {
          baseAlpha = 0.25 + Math.sin(t * 0.12 + frag.phase) * 0.15; // 0.1 to 0.4
        } else {
          baseAlpha = 0.4 + Math.sin(t * 0.2 + frag.phase) * 0.2; // 0.2 to 0.6
        }

        const finalAlpha = fadeIn * baseAlpha;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(frag.rot + Math.sin(t * 0.08 + frag.phase) * 0.015);
        ctx.globalAlpha = finalAlpha;

        if (frag.type === 1 || frag.type === 2) {
          const img = frag.src ? imagesRef.current[frag.src] : null;
          if (img) {
            // Depth of field blur: focal plane is around depth 1.1
            const blurAmount = Math.abs(1.1 - frag.depth) * 12;
            if (blurAmount > 0.5) {
              ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
            }

            // Draw shadow/glow behind image
            ctx.shadowColor = frag.type === 1 ? 'rgba(255, 200, 140, 0.2)' : 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 10;

            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-frag.w! / 2, -frag.h! / 2, frag.w!, frag.h!, 12);
              ctx.clip();
            } else {
              ctx.rect(-frag.w! / 2, -frag.h! / 2, frag.w!, frag.h!);
              ctx.clip();
            }

            ctx.drawImage(img, -frag.w! / 2, -frag.h! / 2, frag.w!, frag.h!);

            // Add a subtle dark overlay to blend with the cinematic environment
            ctx.fillStyle = `rgba(10, 8, 6, ${frag.type === 1 ? 0.15 : 0.4})`;
            ctx.fill();
          }
        } else if (frag.type === 3) {
          ctx.font = '500 9px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = 'rgba(255, 210, 160, 0.85)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.letterSpacing = '1px';
          ctx.fillText(frag.text!, 0, 0);

          // Tiny anchor dot
          ctx.fillStyle = 'rgba(255, 210, 160, 0.4)';
          ctx.beginPath();
          ctx.arc(-ctx.measureText(frag.text!).width / 2 - 8, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // ─── LAYER 7: Cinematic vignette ──────────────────
      const vigR = Math.max(W, H) * 0.8;
      const vigGrad = ctx.createRadialGradient(W / 2, H / 2, vigR * 0.35, W / 2, H / 2, vigR);
      vigGrad.addColorStop(0, 'rgba(6, 6, 4, 0)');
      vigGrad.addColorStop(0.5, 'rgba(6, 6, 4, 0)');
      vigGrad.addColorStop(1, 'rgba(6, 6, 4, 0.7)');
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
