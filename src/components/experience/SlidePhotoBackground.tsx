'use client';
import { useState, useEffect } from 'react';

interface Photo {
  url?: string | null;
  thumbnailUrl?: string | null;
}

interface Props {
  photos: Photo[];
  slideIdx: number;
  visible?: boolean;
}

export function SlidePhotoBackground({ photos, slideIdx, visible = true }: Props) {
  const [loaded, setLoaded] = useState(false);
  const photo = photos[slideIdx % Math.max(photos.length, 1)];
  const url = photo?.thumbnailUrl || photo?.url;

  useEffect(() => {
    setLoaded(false);
  }, [slideIdx]);

  if (!url || !visible) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Actual photo — heavily blurred + dimmed */}
      <img
        src={url}
        alt=""
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{
          opacity: loaded ? 0.07 : 0,
          filter: 'blur(32px) saturate(0.4)',
          transform: 'scale(1.15)',
        }}
      />
      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, #060604 80%)' }}
      />
    </div>
  );
}
