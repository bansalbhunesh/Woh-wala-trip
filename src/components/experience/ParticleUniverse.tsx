'use client';

import { useEffect, useRef } from 'react';

interface Props {
  phase: number; // 0=void 1=signal 2=awaken 3=reveal 4=portal
  mouseX: number;
  mouseY: number;
}

interface Point3D {
  x: number; // Current physical X (morphs toward target)
  y: number; // Current physical Y (morphs toward target)
  z: number; // Current physical Z (morphs toward target)
  baseI: number; // Grid index I (columns)
  baseJ: number; // Grid index J (rows)
}

interface DustMote {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
}

export default function ParticleUniverse({ phase, mouseX, mouseY }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Track parameters to avoid trigger re-mounts on reactive changes
  const stateRef = useRef({
    phase,
    mouseX,
    mouseY,
    animId: 0,
  });

  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0);

  useEffect(() => {
    stateRef.current.phase = phase;
    stateRef.current.mouseX = mouseX;
    stateRef.current.mouseY = mouseY;
  }, [phase, mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;

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

    // Interactive Shockwave parameters
    let shockwaveX = 0;
    let shockwaveY = 0;
    let shockwaveR = 0;
    let shockwaveActive = false;

    const onWindowClick = (e: MouseEvent) => {
      shockwaveX = e.clientX;
      shockwaveY = e.clientY;
      shockwaveR = 0;
      shockwaveActive = true;
    };
    window.addEventListener('click', onWindowClick);

    // Create 3D grid points (24 columns x 16 rows)
    const COLS = 24;
    const ROWS = 16;
    const gridPoints: Point3D[] = [];

    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        gridPoints.push({
          x: (i - (COLS - 1) / 2) * 55,
          y: 0,
          z: (j - (ROWS - 1) / 2) * 55,
          baseI: i,
          baseJ: j,
        });
      }
    }

    // Create drifting 3D atmospheric dust layer
    const dust: DustMote[] = [];
    for (let i = 0; i < 110; i++) {
      dust.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 1200,
        z: (Math.random() - 0.5) * 1200,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 4.5 + 1.5,
      });
    }

    let t = 0;
    let lastTs = 0;

    // 3D Camera Projection function (projects 3D coordinates onto 2D viewport)
    function project(x: number, y: number, z: number, yaw: number, pitch: number) {
      // Rotation around Y axis (Yaw)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;

      // Rotation around X axis (Pitch)
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      const ry = y * cosX - rz * sinX;
      const rzTransformed = y * sinX + rz * cosX;

      // Translate virtual camera (push back relative depth)
      const cameraZ = 850;
      const depth = rzTransformed + cameraZ;

      if (depth <= 40) return null; // Clipping plane guard

      const focalLength = 800;
      const scale = focalLength / depth;
      const sx = W / 2 + rx * scale;
      const sy = H / 2 + ry * scale;

      return { sx, sy, scale, depth };
    }

    function draw(timestamp: number) {
      stateRef.current.animId = requestAnimationFrame(draw);

      const dt = lastTs > 0 ? Math.min((timestamp - lastTs) / 1000, 0.05) : 1 / 60;
      lastTs = timestamp;
      t += dt * 0.35; // Global clock tick rate

      const { phase: p, mouseX: mx, mouseY: my } = stateRef.current;

      // Smooth camera yaw/pitch transitions with mouse hover parallax
      const targetYaw = (mx - 0.5) * 0.55 + Math.sin(t * 0.15) * 0.08;
      const targetPitch = (my - 0.5) * 0.35 + Math.cos(t * 0.2) * 0.06;

      cameraYawRef.current += (targetYaw - cameraYawRef.current) * 0.08;
      cameraPitchRef.current += (targetPitch - cameraPitchRef.current) * 0.08;

      const yaw = cameraYawRef.current;
      const pitch = cameraPitchRef.current;

      const intensity = [0.15, 0.45, 0.85, 1.1, 1.45][Math.min(p, 4)];

      // Shockwave propagation
      if (shockwaveActive) {
        shockwaveR += dt * 700;
        if (shockwaveR > Math.max(W, H) * 1.5) {
          shockwaveActive = false;
        }
      }

      // Draw background fade trails
      ctx.fillStyle = 'rgba(6, 6, 4, 0.12)';
      ctx.fillRect(0, 0, W, H);

      // 1. Particle & 3D Wave Grid target updating
      gridPoints.forEach(point => {
        let targetX = (point.baseI - (COLS - 1) / 2) * 55;
        let targetZ = (point.baseJ - (ROWS - 1) / 2) * 55;
        let targetY = 0;

        if (p === 0) {
          // Void state: calm undulating ripples
          targetY = Math.sin(targetX * 0.005 + t) * Math.cos(targetZ * 0.005 + t) * 20;
        } else if (p === 1) {
          // Signal state: vertical wave pulse passing through rows
          const pulse = Math.sin(point.baseI * 0.28 - t * 4.0);
          targetY = pulse * 45 * Math.cos(point.baseJ * 0.15);
        } else if (p === 2) {
          // Awaken: Double undulating sine-wave terrain
          let waveHeight =
            Math.sin(targetX * 0.005 + t * 1.5) * 75 + Math.cos(targetZ * 0.006 - t * 1.0) * 55;

          // Mouse gravity ripple
          const dx = targetX - (mx - 0.5) * 700;
          const dz = targetZ - (my - 0.5) * 700;
          const dist = Math.sqrt(dx * dx + dz * dz) || 1;
          const pull = Math.max(0, 1 - dist / 320);
          waveHeight += Math.sin(dist * 0.035 - t * 4.5) * 50 * pull;

          // Shockwave ripple
          if (shockwaveActive) {
            const swDx = targetX - (shockwaveX - W / 2);
            const swDz = targetZ - (shockwaveY - H / 2);
            const swDist = Math.sqrt(swDx * swDx + swDz * swDz) || 1;
            const diff = Math.abs(swDist - shockwaveR);
            if (diff < 80) {
              waveHeight += (1 - diff / 80) * 80 * Math.sin(diff * 0.1);
            }
          }

          targetY = waveHeight;
        } else if (p === 3) {
          // Reveal: Cylindrical Helix/Double-helix memory stream
          const radius = 210 + 40 * Math.sin(point.baseJ * 0.35 + t * 1.4);
          const theta = point.baseI * 0.26 + t * 0.45;
          targetX = radius * Math.cos(theta);
          targetY = (point.baseJ - (ROWS - 1) / 2) * 35;
          targetZ = radius * Math.sin(theta);
        } else if (p === 4) {
          // Portal: Gravity collapse (Accretion disk pulling into center)
          const decay = Math.max(0, 1 - ((t * 0.05) % 1.0));
          const radius = Math.max(12, point.baseJ * 18 * decay);
          const theta = point.baseI * 0.18 + t * 3.5;
          targetX = radius * Math.cos(theta);
          targetY = Math.sin(radius * 0.08 - t * 3.5) * 10;
          targetZ = radius * Math.sin(theta);
        }

        // Linear interpolation to morph the coordinates smoothly
        const morphSpeed = p === 4 ? 0.15 : 0.08;
        point.x += (targetX - point.x) * morphSpeed;
        point.y += (targetY - point.y) * morphSpeed;
        point.z += (targetZ - point.z) * morphSpeed;
      });

      // 2. Project 3D Grid points to 2D view-space
      const projected = gridPoints.map(pt => project(pt.x, pt.y, pt.z, yaw, pitch));

      // 3. Draw Grid lines (Constellation Network) with Depth fading
      ctx.save();
      ctx.lineWidth = 0.8;

      const activeCol = Math.floor(t * 3.5) % COLS; // Energy signal pulse location

      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
          const idx = i * ROWS + j;
          const p1 = projected[idx];
          if (!p1) continue;

          // Connect horizontally
          if (i < COLS - 1) {
            const idxH = (i + 1) * ROWS + j;
            const p2 = projected[idxH];
            if (p2) {
              const alpha = Math.min(1.0, ((p1.scale + p2.scale) / 2) * 0.1 * intensity);
              if (alpha > 0.01) {
                const isPulse = i === activeCol || i + 1 === activeCol;
                ctx.strokeStyle = isPulse
                  ? `rgba(45, 205, 185, ${alpha * 2.2})`
                  : `rgba(255, 95, 45, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(p1.sx, p1.sy);
                ctx.lineTo(p2.sx, p2.sy);
                ctx.stroke();
              }
            }
          }

          // Connect vertically
          if (j < ROWS - 1) {
            const idxV = idx + 1;
            const p2 = projected[idxV];
            if (p2) {
              const alpha = Math.min(1.0, ((p1.scale + p2.scale) / 2) * 0.1 * intensity);
              if (alpha > 0.01) {
                const isPulse = i === activeCol;
                ctx.strokeStyle = isPulse
                  ? `rgba(45, 205, 185, ${alpha * 2.2})`
                  : `rgba(255, 95, 45, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(p1.sx, p1.sy);
                ctx.lineTo(p2.sx, p2.sy);
                ctx.stroke();
              }
            }
          }
        }
      }
      ctx.restore();

      // 4. Draw Grid Nodes (Glow spheres)
      gridPoints.forEach((point, idx) => {
        const proj = projected[idx];
        if (!proj) return;

        const isPulse = point.baseI === activeCol;
        const alpha = Math.min(1.0, proj.scale * (isPulse ? 0.75 : 0.45) * intensity);
        if (alpha < 0.01) return;

        const size = (isPulse ? 3.5 : 1.8) * proj.scale;

        ctx.fillStyle = isPulse ? `rgba(80, 245, 220, ${alpha})` : `rgba(255, 150, 95, ${alpha})`;

        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Drifting 3D Atmospheric Dust Layer
      dust.forEach(mote => {
        mote.x += mote.vx * dt * 60;
        mote.y += mote.vy * dt * 60;
        mote.z += mote.vz * dt * 60;

        // Wrap edges inside 3D bounds
        if (mote.x < -1000) mote.x = 1000;
        if (mote.x > 1000) mote.x = -1000;
        if (mote.y < -600) mote.y = 600;
        if (mote.y > 600) mote.y = -600;
        if (mote.z < -600) mote.z = 600;
        if (mote.z > 600) mote.z = -600;

        const proj = project(mote.x, mote.y, mote.z, yaw, pitch);
        if (!proj) return;

        const alpha = Math.min(1.0, proj.scale * 0.15 * intensity);
        if (alpha < 0.01) return;

        const size = mote.size * proj.scale;

        ctx.fillStyle = `rgba(255, 140, 75, ${alpha})`;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    draw(0);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('click', onWindowClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none filter blur-[3px]"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
