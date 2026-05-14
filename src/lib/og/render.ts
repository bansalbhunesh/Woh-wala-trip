import React from 'react';
import { ImageResponse } from 'next/og';
import type { Font } from './fonts';

export type RenderOptions = {
  width?: number;
  height?: number;
  fonts: Font[];
  cacheSeconds?: number;
  immutable?: boolean;
};

export function renderCard(
  element: React.ReactElement,
  options: RenderOptions
): Promise<Response> {
  const {
    width = 1080,
    height = 1920,
    fonts,
    cacheSeconds = 3600,
    immutable = false,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
  };

  if (immutable) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['Cache-Control'] = `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`;
  }

  return Promise.resolve(
    new ImageResponse(element, {
      width,
      height,
      fonts: fonts.map((f) => ({
        name: f.name,
        data: f.data,
        weight: f.weight,
        style: f.style,
      })),
      headers,
    })
  );
}

export function errorImage(message: string, status = 404): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}
