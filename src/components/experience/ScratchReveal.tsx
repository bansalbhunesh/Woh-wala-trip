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
  threshold = 0.55,
  onReveal,
  children,
  label = 'CLASSIFIED',
}: ScratchRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const revealed = useRef(false);
  const [done, setDone] = useState(false);
  const checkThrottle = useRef(0);

  // Build the overlay on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Base fill — dark corrupted background
    ctx.fillStyle = '#0c0c0a';
    ctx.fillRect(0, 0, width, height);

    // Film grain noise
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 1.2;
      const alpha = Math.random() * 0.18;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,77,77,${alpha})`;
      ctx.fill();
    }

    // Horizontal scan-line texture
    for (let y = 0; y < height; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, y, width, 1);
    }

    // Vignette gradient
    const vg = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.1,
      width / 2,
      height / 2,
      width * 0.8
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    // Label text — CLASSIFIED / REDACTED
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.font = `bold ${Math.round(width * 0.13)}px monospace`;
    ctx.fillStyle = '#FF4D4D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, height / 2);
    ctx.restore();

    // "SCRATCH TO REVEAL" hint
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.font = `500 11px monospace`;
    ctx.fillStyle = 'rgba(245,240,232,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('SCRATCH TO REVEAL', width / 2, height - 12);
    ctx.restore();

    // Red corner brackets
    const b = 18,
      lw = 1.5;
    ctx.strokeStyle = 'rgba(255,77,77,0.4)';
    ctx.lineWidth = lw;
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
  }, [width, height, label]);

  const getXY = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const erase = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx || revealed.current) return;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    },
    [brushSize]
  );

  const checkReveal = useCallback(() => {
    if (revealed.current) return;
    const now = Date.now();
    if (now - checkThrottle.current < 120) return; // throttle to ~8fps
    checkThrottle.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    // Sample every 16th pixel (every 4th RGBA block) for speed
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] < 64) cleared++;
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
