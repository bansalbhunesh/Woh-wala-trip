export type Font = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: 'normal' | 'italic';
};

// Isolate-level cache — survives across requests in the same edge instance
const FONT_CACHE = new Map<string, ArrayBuffer>();

async function fetchFont(url: string): Promise<ArrayBuffer> {
  if (FONT_CACHE.has(url)) return FONT_CACHE.get(url)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  FONT_CACHE.set(url, buf);
  return buf;
}

export async function loadCardFonts(origin?: string | null): Promise<Font[]> {
  const base = origin
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Space Grotesk served from Google Fonts API — no file needed in /public
  // We fetch the TTF variant directly for edge runtime compatibility
  const SPACE_GROTESK_URL =
    'https://fonts.gstatic.com/s/spacegrotesk/v15/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozuPTPTqbD.woff';

  const results = await Promise.allSettled([
    fetchFont(`${base}/fonts/Inter-Medium.ttf`),
    fetchFont(`${base}/fonts/Inter-Regular.ttf`),
    fetchFont(`${base}/fonts/Lora-Italic.ttf`),
    fetchFont(SPACE_GROTESK_URL),
  ]);

  const fonts: Font[] = [];

  if (results[0].status === 'fulfilled') {
    fonts.push({ name: 'Inter', data: results[0].value, weight: 500, style: 'normal' });
  }
  if (results[1].status === 'fulfilled') {
    fonts.push({ name: 'Inter', data: results[1].value, weight: 400, style: 'normal' });
  }
  if (results[2].status === 'fulfilled') {
    fonts.push({ name: 'Lora', data: results[2].value, weight: 400, style: 'italic' });
  }
  if (results[3].status === 'fulfilled') {
    fonts.push({ name: 'Space Grotesk', data: results[3].value, weight: 500, style: 'normal' });
  } else {
    // Graceful degradation — fall back to Inter if Space Grotesk fails
    console.warn('Space Grotesk failed to load, falling back to Inter for vibe font');
    if (results[0].status === 'fulfilled') {
      fonts.push({ name: 'Space Grotesk', data: results[0].value, weight: 500, style: 'normal' });
    }
  }

  if (fonts.length === 0) {
    throw new Error('All fonts failed to load — cannot render card');
  }

  return fonts;
}
