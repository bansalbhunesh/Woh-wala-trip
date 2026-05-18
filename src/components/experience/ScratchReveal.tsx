'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchRevealProps {
  width: number;
  height: number;
  brushSize?: number;
  threshold?: number; // 0–1 fraction of pixels cleared to auto-complete
  onReveal?: () => void;
  children: React.ReactNode;
  label?: string; // text shown on the overlay (e.g. "CLASSIFIED")
}

export function ScratchReveal({
  width,
  height,
  brushSize = 38,
  threshold = 0.3, // 30% of pixels cleared is the sweet spot for satisfying scratching
  onReveal,
  children,
  label = 'CLASSIFIED',
}: ScratchRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const revealed = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const checkThrottle = useRef(0);
  const lastSoundTime = useRef(0);

  // Dynamic particle sparks emitter system
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      maxLife: number;
      life: number;
      color: string;
    }>
  >([]);

  // Main 60fps high-performance render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create the offscreen mask canvas if not yet present
    if (!offscreenCanvasRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      offscreenCanvasRef.current = offscreen;
    }

    let animationFrameId: number;
    let scannerY = 0;
    let scannerDir = 1;

    // Generate static visual film grain coordinates to prevent epilepsy while staying organic
    const noisePoints: Array<{ x: number; y: number; r: number; alpha: number }> = [];
    for (let i = 0; i < 350; i++) {
      noisePoints.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 0.8,
        alpha: 0.04 + Math.random() * 0.12,
      });
    }

    // Hexadecimal matrix scrolling data streams
    const hexStreams: Array<{
      x: number;
      y: number;
      chars: string[];
      speed: number;
      opacity: number;
    }> = [];
    const streamCount = Math.floor(width / 36);
    for (let i = 0; i < streamCount; i++) {
      const chars: string[] = [];
      const len = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < len; j++) {
        chars.push(
          Math.floor(Math.random() * 256)
            .toString(16)
            .toUpperCase()
            .padStart(2, '0')
        );
      }
      hexStreams.push({
        x: i * 36 + 18,
        y: Math.random() * height,
        chars,
        speed: 0.4 + Math.random() * 0.5,
        opacity: 0.02 + Math.random() * 0.05,
      });
    }

    const render = () => {
      if (revealed.current && done) return;

      // 1. Clear visible surface
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      // --- 2. Draw Premium Brushed Cybernetic Design ---
      ctx.fillStyle = '#0c0c0a';
      ctx.fillRect(0, 0, width, height);

      // Micro cybernetic dotted grid mesh
      ctx.fillStyle = 'rgba(255, 77, 77, 0.02)';
      const dotSpacing = 12;
      for (let x = 6; x < width; x += dotSpacing) {
        for (let y = 6; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Flickering matrix decryption codes
      ctx.font = '7px monospace';
      hexStreams.forEach(stream => {
        stream.y += stream.speed;
        if (stream.y - stream.chars.length * 8 > height) {
          stream.y = -10;
        }

        stream.chars.forEach((char, idx) => {
          if (Math.random() > 0.985) {
            stream.chars[idx] = Math.floor(Math.random() * 256)
              .toString(16)
              .toUpperCase()
              .padStart(2, '0');
          }
          const charY = stream.y - idx * 9;
          if (charY >= 0 && charY <= height) {
            ctx.fillStyle = `rgba(255, 77, 77, ${stream.opacity * (1 - idx / stream.chars.length)})`;
            ctx.fillText(char, stream.x, charY);
          }
        });
      });

      // Analog cathode-ray scan-line stripes
      for (let y = 0; y < height; y += 3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, y, width, 1);
      }

      // Natural cinematic film grain noise
      noisePoints.forEach(p => {
        const flicker = Math.random() * 0.04 - 0.02;
        ctx.fillStyle = `rgba(255, 77, 77, ${Math.max(0.01, p.alpha + flicker)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Deep radial vignette shadow
      const vg = ctx.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.05,
        width / 2,
        height / 2,
        width * 0.75
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);

      // Core CLASSIFIED / REDACTED visual label
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.font = `bold ${Math.round(width * 0.12)}px monospace`;
      ctx.fillStyle = '#FF4D4D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, height / 2);
      ctx.restore();

      // Dynamic guide text hint (sinusoidal pulse)
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 250) * 0.1;
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(255, 77, 77, 0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('SCRATCH TO DECRYPT ARCHIVE', width / 2, height - 12);
      ctx.restore();

      // Animated high-tech laser scanline sweep
      scannerY += scannerDir * 1.2;
      if (scannerY >= height - 4 || scannerY <= 4) {
        scannerDir *= -1;
      }

      const scanGrad = ctx.createLinearGradient(0, scannerY - 12 * scannerDir, 0, scannerY);
      scanGrad.addColorStop(0, 'rgba(255, 77, 77, 0)');
      scanGrad.addColorStop(0.5, 'rgba(255, 77, 77, 0.06)');
      scanGrad.addColorStop(1, 'rgba(255, 77, 77, 0.28)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scannerY - 12 * scannerDir, width, 12 * scannerDir);

      ctx.fillStyle = 'rgba(255, 110, 110, 0.65)';
      ctx.fillRect(0, scannerY, width, 1);

      // --- 3. Composite and Subtracted Scratched Areas ---
      ctx.globalCompositeOperation = 'destination-out';
      if (offscreenCanvasRef.current) {
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);
      }

      // --- 4. Draw Static HUD Outlines & Interactive Shard Particles ---
      ctx.globalCompositeOperation = 'source-over';

      // Cybernetic corner brackets
      const b = 15;
      ctx.strokeStyle = 'rgba(255, 77, 77, 0.4)';
      ctx.lineWidth = 1.5;
      [
        [8, 8],
        [width - 8, 8],
        [8, height - 8],
        [width - 8, height - 8],
      ].forEach(([cx, cy]) => {
        const sx = cx === 8 ? 1 : -1;
        const sy = cy === 8 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(cx + sx * b, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * b);
        ctx.stroke();
      });

      // Emitted particle embers update & rendering
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height, label, done]);

  const getXY = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const erase = useCallback(
    (x: number, y: number) => {
      const offscreen = offscreenCanvasRef.current;
      if (!offscreen) return;
      const oCtx = offscreen.getContext('2d');
      if (!oCtx || revealed.current) return;

      // Play cinematic magical crystal audio synths during physical scratching
      const now = Date.now();
      if (now - lastSoundTime.current > 120) {
        lastSoundTime.current = now;
        if (typeof window !== 'undefined' && (window as any).playCinematicChime) {
          (window as any).playCinematicChime(1.1 + Math.random() * 0.45);
        }
      }

      oCtx.globalCompositeOperation = 'source-over';
      oCtx.fillStyle = '#ffffff';
      oCtx.strokeStyle = '#ffffff';
      oCtx.lineWidth = brushSize * 2.3;
      oCtx.lineCap = 'round';
      oCtx.lineJoin = 'round';

      if (lastPos.current) {
        oCtx.beginPath();
        oCtx.moveTo(lastPos.current.x, lastPos.current.y);
        oCtx.lineTo(x, y);
        oCtx.stroke();
      } else {
        oCtx.beginPath();
        oCtx.arc(x, y, brushSize, 0, Math.PI * 2);
        oCtx.fill();
      }

      // Emit beautiful cybermatic red and orange plasma sparks
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.8;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          size: 1.8 + Math.random() * 3.2,
          alpha: 1.0,
          maxLife: 20 + Math.floor(Math.random() * 15),
          life: 0,
          color: Math.random() > 0.4 ? '#FF4D4D' : '#FFAA33',
        });
      }

      lastPos.current = { x, y };
    },
    [brushSize]
  );

  const checkReveal = useCallback(() => {
    if (revealed.current) return;
    const now = Date.now();
    if (now - checkThrottle.current < 120) return;
    checkThrottle.current = now;

    const offscreen = offscreenCanvasRef.current;
    if (!offscreen) return;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return;

    const data = oCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] > 200) cleared++;
    }
    const sampled = Math.floor(data.length / 64);
    if (cleared / sampled >= threshold) {
      triggerReveal();
    }
  }, [threshold]);

  const triggerReveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    if ('vibrate' in navigator) navigator.vibrate([8, 40, 12]);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1)';
      canvas.style.opacity = '0';
    }
    setTimeout(() => {
      setDone(true);
      onReveal?.();
    }, 700);
  }, [onReveal]);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    drawing.current = true;
    if ('vibrate' in navigator) navigator.vibrate(3);
    const pos = getXY(e.clientX, e.clientY, e.currentTarget);
    erase(pos.x, pos.y);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!drawing.current) return;
    const pos = getXY(e.clientX, e.clientY, e.currentTarget);
    erase(pos.x, pos.y);
    checkReveal();
  };
  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    drawing.current = false;
    lastPos.current = null;
    checkReveal();
  };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    drawing.current = true;
    if ('vibrate' in navigator) navigator.vibrate(3);
    const t = e.touches[0];
    const pos = getXY(t.clientX, t.clientY, e.currentTarget);
    erase(pos.x, pos.y);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!drawing.current) return;
    const t = e.touches[0];
    const pos = getXY(t.clientX, t.clientY, e.currentTarget);
    erase(pos.x, pos.y);
    checkReveal();
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    drawing.current = false;
    lastPos.current = null;
    checkReveal();
  };

  return (
    <div className="relative select-none" style={{ width, height }}>
      {/* Content to reveal — always rendered beneath */}
      <div className="absolute inset-0">{children}</div>

      {/* Scratch canvas overlay */}
      {!done && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 rounded-2xl"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      )}
    </div>
  );
}
