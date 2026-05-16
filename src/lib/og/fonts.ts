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

// Valid Google Fonts CDN TTF URLs — compatible with satori / @vercel/og
const INTER_500 = 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf';
const INTER_400 = 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf';
const LORA_ITALIC = 'https://fonts.gstatic.com/s/lora/v37/0QI8MX1D_JOuMw_hLdO6T2wV9KnW-MoFkqg.ttf';

export async function loadCardFonts(_origin?: string | null): Promise<Font[]> {
  const results = await Promise.allSettled([
    fetchFont(INTER_500),
    fetchFont(INTER_400),
    fetchFont(LORA_ITALIC),
  ]);

  const fonts: Font[] = [];
  if (results[0].status === 'fulfilled') fonts.push({ name: 'Inter', data: results[0].value, weight: 500, style: 'normal' });
  if (results[1].status === 'fulfilled') fonts.push({ name: 'Inter', data: results[1].value, weight: 400, style: 'normal' });
  if (results[2].status === 'fulfilled') fonts.push({ name: 'Lora', data: results[2].value, weight: 400, style: 'italic' });

  // Space Grotesk maps to Inter for the card (satori limitation)
  if (results[0].status === 'fulfilled') fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 500, style: 'normal' });
  if (results[0].status === 'fulfilled') fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 600, style: 'normal' });
  if (results[0].status === 'fulfilled') fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 700, style: 'normal' });

  if (fonts.length === 0) throw new Error('All fonts failed to load');
  return fonts;
}
