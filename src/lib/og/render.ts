import React from 'react';
import { ImageResponse } from 'next/og';
import type { Font } from './fonts';

export type RenderOptions = {
  width?: number;
  height?: number;
  fonts: Font[];
  cacheSeconds?: number;
  immutable?: boolean;
  filename?: string; // triggers Content-Disposition: attachment
};

export async function renderCard(
  element: React.ReactElement,
  options: RenderOptions
): Promise<Response> {
  const {
    width = 1080,
    height = 1920,
    fonts,
    cacheSeconds = 3600,
    immutable = false,
    filename,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
  };

  if (filename) {
    // Force download with correct filename
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  } else {
    // Inline display (for OG previews)
    headers['Content-Disposition'] = 'inline';
  }

  if (immutable) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['Cache-Control'] = `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`;
  }

  const img = new ImageResponse(element, {
    width,
    height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  // ImageResponse headers are immutable — pipe body through a new Response so
  // Cache-Control, Content-Disposition, etc. actually land on the wire.
  return new Response(img.body, { status: 200, headers });
}

export function errorImage(message: string, status = 404): Response {
  const svg = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1920" fill="#060604"/><text x="540" y="940" font-family="monospace" font-size="28" fill="rgba(255,77,77,0.8)" text-anchor="middle">${message}</text><text x="540" y="990" font-family="monospace" font-size="20" fill="rgba(245,240,232,0.3)" text-anchor="middle">Yaarlore</text></svg>`;
  return new Response(svg, { status, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } });
}
