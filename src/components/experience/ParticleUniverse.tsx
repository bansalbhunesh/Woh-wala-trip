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
        initParticles();
      }, 200);
    };
    window.addEventListener('resize', onResize);

    // Interactive Shockwave Mesh
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

    interface Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;
      hue: number;
      life: number;
      maxLife: number;
      type: 'dust' | 'fragment' | 'star';
      angle: number;
      orbitRadius: number;
    }

    let particles: Particle[] = [];

    function initParticles() {
      particles = [];
      const cx = W / 2;
      const cy = H / 2;

      // Dust layer (highly detailed, batched dynamically)
      for (let i = 0; i < 400; i++) {
        const px = Math.random() * W;
        const py = Math.random() * H;
        const dx = px - cx;
        const dy = py - cy;
        particles.push({
          x: px,
          y: py,
          z: Math.random(),
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          vz: (Math.random() - 0.5) * 0.002,
          size: Math.random() * 1.6 + 0.3,
          hue: Math.random() * 45 + 15, // warm firefly amber
          life: Math.random(),
          maxLife: 0.6 + Math.random() * 0.4,
          type: 'dust',
          angle: Math.atan2(dy, dx),
          orbitRadius: Math.sqrt(dx * dx + dy * dy),
        });
      }

      // Fragments (large high-fidelity spatial bodies)
      for (let i = 0; i < 45; i++) {
        const px = Math.random() * W;
        const py = Math.random() * H;
        const dx = px - cx;
        const dy = py - cy;
        particles.push({
          x: px,
          y: py,
          z: Math.random() * 0.4 + 0.6,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: 0,
          size: Math.random() * 3.2 + 1.8,
          hue: Math.random() > 0.55 ? 28 : 190, // Cyberpunk Amber vs Hyper-teal
          life: Math.random(),
          maxLife: 0.5 + Math.random() * 0.5,
          type: 'fragment',
          angle: Math.atan2(dy, dx),
          orbitRadius: Math.sqrt(dx * dx + dy * dy),
        });
      }

      // Stars (deep background grid)
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random() * 0.35,
          vx: 0,
          vy: (Math.random() - 0.5) * 0.04,
          vz: 0,
          size: Math.random() * 0.8 + 0.2,
          hue: 0,
          life: Math.random(),
          maxLife: 1.0,
          type: 'star',
          angle: 0,
          orbitRadius: 0,
        });
      }
    }

    initParticles();

    let t = 0;

    function draw() {
      stateRef.current.animId = requestAnimationFrame(draw);
      t += 0.005;

      const { phase: p, mouseX: mx, mouseY: my } = stateRef.current;

      // Premium motion-blur accumulation buffer (creates light-trails elegantly)
      const fadeAlpha = p >= 3 ? 0.15 : 0.08;
      ctx.fillStyle = `rgba(6, 6, 4, ${fadeAlpha})`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2 + (mx - 0.5) * W * 0.06;
      const cy = H / 2 + (my - 0.5) * H * 0.06;

      const intensity = [0.15, 0.45, 0.85, 1.1, 1.45][Math.min(p, 4)];

      // Advance shockwave propagation
      if (shockwaveActive) {
        shockwaveR += 14;
        if (shockwaveR > Math.max(W, H) * 1.2) {
          shockwaveActive = false;
        }
      }

      // Particle update loop (Vector force manipulation)
      particles.forEach(par => {
        par.life += 0.0025;
        if (par.life > par.maxLife) par.life = 0;

        // Apply physical fluid dragging
        par.x += par.vx;
        par.y += par.vy;
        par.vx *= 0.982;
        par.vy *= 0.982;

        const dx = par.x - cx;
        const dy = par.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Interactive shockwave front collision
        if (shockwaveActive) {
          const sDx = par.x - shockwaveX;
          const sDy = par.y - shockwaveY;
          const sDist = Math.sqrt(sDx * sDx + sDy * sDy) || 1;
          const diff = Math.abs(sDist - shockwaveR);
          if (diff < 50) {
            const push = (1 - diff / 50) * 6.5;
            const angle = Math.atan2(sDy, sDx);
            par.vx += Math.cos(angle) * push;
            par.vy += Math.sin(angle) * push;
          }
        }

        // Magnetic hover repulsion
        const repel = Math.max(0, 1 - dist / 220);
        par.vx += (dx / dist) * repel * 0.07;
        par.vy += (dy / dist) * repel * 0.07;

        // Cinematic vortex physics (Orbital Gravity models)
        if (p >= 2) {
          // Keplerian Centripetal acceleration: speed increases dynamically as distance decreases
          let speed = 0.002 + 0.001 * par.z;
          if (p === 3) {
            speed = 0.005 + 1.8 / (par.orbitRadius + 40);
          } else if (p === 4) {
            speed = 0.012 + 8.5 / (par.orbitRadius + 22);
          }
          par.angle += speed * intensity;

          // Spiral aggressively inwards based on phase depth
          let spiralStrength = 0.999; // Phase 2: very gentle drift
          if (p === 3) {
            spiralStrength = 0.995; // Phase 3: moderate drift forming spiral galaxy
          } else if (p === 4) {
            spiralStrength = 0.988; // Phase 4: aggressive black hole pull
          }
          par.orbitRadius *= spiralStrength;

          // Phase 4 Event Horizon recycling portal
          if (p === 4 && par.orbitRadius < 14) {
            const spawnAngle = Math.random() * Math.PI * 2;
            par.orbitRadius = Math.max(W, H) * (0.6 + Math.random() * 0.4);
            par.angle = spawnAngle;
            par.x = cx + Math.cos(spawnAngle) * par.orbitRadius;
            par.y = cy + Math.sin(spawnAngle) * par.orbitRadius;
            par.vx = 0;
            par.vy = 0;
          } else if (par.orbitRadius < 4) {
            par.orbitRadius = Math.max(W, H) * (0.3 + Math.random() * 0.6);
          }

          const targetX = cx + Math.cos(par.angle) * par.orbitRadius;
          const targetY = cy + Math.sin(par.angle) * par.orbitRadius;
          par.vx += (targetX - par.x) * 0.035;
          par.vy += (targetY - par.y) * 0.035;
        }

        // Warp screen margins
        if (par.x < -20) par.x = W + 20;
        if (par.x > W + 20) par.x = -20;
        if (par.y < -20) par.y = H + 20;
        if (par.y > H + 20) par.y = -20;
      });

      // --- Batch drawing optimization: Stars ---
      ctx.fillStyle = `rgba(245, 240, 232, ${0.4 * intensity})`;
      ctx.beginPath();
      particles.forEach(par => {
        if (par.type !== 'star') return;
        const scale = 0.5 + par.z * 0.5;
        const pSize = par.size * scale;
        ctx.moveTo(par.x + pSize, par.y);
        ctx.arc(par.x, par.y, pSize, 0, Math.PI * 2);
      });
      ctx.fill();

      // --- Batch drawing optimization: Dust (Amber glow) ---
      ctx.fillStyle = `rgba(255, 120, 60, ${0.45 * intensity})`;
      ctx.beginPath();
      particles.forEach(par => {
        if (par.type !== 'dust') return;
        const scale = 0.5 + par.z * 0.5;
        let pSize = par.size * scale;

        // Modulate dust sizes slightly to define spiral arms in galaxy phases
        if (p === 3 || p === 4) {
          const armOffset = 2.0 * par.angle - 3.0 * Math.log(par.orbitRadius + 10);
          const wave = Math.cos(armOffset);
          if (wave > 0.35) {
            pSize *= 1.2;
          }
        }

        ctx.moveTo(par.x + pSize, par.y);
        ctx.arc(par.x, par.y, pSize, 0, Math.PI * 2);
      });
      ctx.fill();

      // --- Draw High-Fidelity Interactive Fragments ---
      particles.forEach(par => {
        if (par.type !== 'fragment') return;

        const scale = 0.5 + par.z * 0.5;
        let pSize = par.size * scale;
        const lifeAlpha = Math.sin((par.life / par.maxLife) * Math.PI);
        let alpha = lifeAlpha * intensity * scale;

        // Density wave spiral arm brightness modulation
        if (p === 3 || p === 4) {
          const armOffset = 2.0 * par.angle - 3.0 * Math.log(par.orbitRadius + 10);
          const wave = Math.cos(armOffset);
          if (wave > 0.35) {
            alpha *= 1.45;
            pSize *= 1.25;
          }
        }

        if (alpha < 0.02) return;

        ctx.save();
        ctx.globalAlpha = Math.min(1.0, alpha);

        // Glowing orbital aura
        const grd = ctx.createRadialGradient(par.x, par.y, 0, par.x, par.y, pSize * 4.5);
        if (par.hue < 60) {
          grd.addColorStop(0, `rgba(255, 90, 40, ${alpha * 0.85})`);
          grd.addColorStop(0.4, `rgba(255, 50, 15, ${alpha * 0.28})`);
          grd.addColorStop(1, 'rgba(255, 50, 15, 0)');
        } else {
          grd.addColorStop(0, `rgba(40, 180, 160, ${alpha * 0.85})`);
          grd.addColorStop(0.4, `rgba(30, 140, 130, ${alpha * 0.28})`);
          grd.addColorStop(1, 'rgba(30, 140, 130, 0)');
        }
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(par.x, par.y, pSize * 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Spatial solid core
        ctx.fillStyle =
          par.hue < 60 ? `rgba(255, 175, 90, ${alpha})` : `rgba(100, 240, 220, ${alpha})`;
        ctx.beginPath();
        ctx.arc(par.x, par.y, pSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Constellation proximity mesh between fragments (Highly Optimized O(N) connections)
      ctx.save();
      ctx.lineWidth = 0.5;
      const fragments = particles.filter(p => p.type === 'fragment');
      for (let i = 0; i < fragments.length; i++) {
        for (let j = i + 1; j < fragments.length; j++) {
          const f1 = fragments[i];
          const f2 = fragments[j];
          const fDx = f1.x - f2.x;
          const fDy = f1.y - f2.y;
          const fDist = Math.sqrt(fDx * fDx + fDy * fDy);

          if (fDist < 95) {
            const meshAlpha = (1 - fDist / 95) * 0.065 * intensity;
            ctx.strokeStyle =
              f1.hue < 60 ? `rgba(255, 100, 50, ${meshAlpha})` : `rgba(50, 220, 190, ${meshAlpha})`;
            ctx.beginPath();
            ctx.moveTo(f1.x, f1.y);
            ctx.lineTo(f2.x, f2.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Phase 4 Singular Black Hole core & Accretion Disk visualization
      if (p === 4) {
        // Accretion disk radial gradient glow
        ctx.save();
        const accGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
        accGrd.addColorStop(0, 'rgba(255, 110, 50, 0.45)');
        accGrd.addColorStop(0.3, 'rgba(255, 60, 20, 0.22)');
        accGrd.addColorStop(1, 'rgba(6, 6, 4, 0)');
        ctx.fillStyle = accGrd;
        ctx.beginPath();
        ctx.arc(cx, cy, 55, 0, Math.PI * 2);
        ctx.fill();

        // Accretion belt outer orbit outline
        ctx.strokeStyle = 'rgba(255, 140, 60, 0.35)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Event Horizon: physical pitch-black singular core that swallows particles
        ctx.fillStyle = '#020202';
        ctx.shadowColor = 'rgba(255, 77, 77, 0.9)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Pulsing electromagnetic scanning rings (Phase 1+)
      if (p >= 1) {
        const pulseR = (t * 135) % 450;
        const pulseA = Math.max(0, 0.075 - pulseR / 6000) * intensity;
        if (pulseA > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 77, 77, ${pulseA})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Interactive shockwave ring visualization
      if (shockwaveActive) {
        const swA = Math.max(0, 0.18 - shockwaveR / 3000) * intensity;
        if (swA > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 90, 90, ${swA})`;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(shockwaveX, shockwaveY, shockwaveR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Analog cathode screen-grain noise (Phase 0–2)
      if (p <= 2) {
        ctx.save();
        ctx.globalAlpha = 0.02;
        for (let i = 0; i < 200; i++) {
          const gx = Math.random() * W;
          const gy = Math.random() * H;
          const gs = Math.random() * 2.2;
          ctx.fillStyle = `rgba(245, 240, 232, ${Math.random() * 0.75})`;
          ctx.fillRect(gx, gy, gs, gs);
        }
        ctx.restore();
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('click', onWindowClick);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}
