export type Font = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: 'normal' | 'italic';
};

const FONT_CACHE = new Map<string, ArrayBuffer>();

async function fetchFont(url: string): Promise<ArrayBuffer> {
  if (FONT_CACHE.has(url)) return FONT_CACHE.get(url)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  FONT_CACHE.set(url, buf);
  return buf;
}

// Fonts served from the same origin — no external CDN dependency, works in Edge runtime.
// Files live in /public/fonts/ and are committed to the repo.
function fontUrl(origin: string | null | undefined, filename: string): string {
  const base = origin?.startsWith('http') ? origin : 'http://localhost:3000';
  return `${base}/fonts/${filename}`;
}

export async function loadCardFonts(origin?: string | null): Promise<Font[]> {
  const results = await Promise.allSettled([
    fetchFont(fontUrl(origin, 'Inter-Medium.ttf')),
    fetchFont(fontUrl(origin, 'Inter-Regular.ttf')),
    fetchFont(fontUrl(origin, 'Lora-Italic.ttf')),
  ]);

  const fonts: Font[] = [];
  if (results[0].status === 'fulfilled')
    fonts.push({ name: 'Inter', data: results[0].value, weight: 500, style: 'normal' });
  if (results[1].status === 'fulfilled')
    fonts.push({ name: 'Inter', data: results[1].value, weight: 400, style: 'normal' });
  if (results[2].status === 'fulfilled')
    fonts.push({ name: 'Lora', data: results[2].value, weight: 400, style: 'italic' });

  // Space Grotesk maps to Inter for the card (satori limitation)
  if (results[0].status === 'fulfilled')
    fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 500, style: 'normal' });
  if (results[0].status === 'fulfilled')
    fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 600, style: 'normal' });
  if (results[0].status === 'fulfilled')
    fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 700, style: 'normal' });

  if (fonts.length === 0) throw new Error('All fonts failed to load');
  return fonts;
}
