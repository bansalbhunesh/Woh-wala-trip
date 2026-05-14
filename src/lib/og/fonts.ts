import { CardPalette } from './colors';

export type Font = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: 'normal' | 'italic';
};

export async function loadCardFonts(origin?: string | null): Promise<Font[]> {
  const baseUrl = origin || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  try {
    const fontUrls = [
      { name: 'Inter', weight: 500, style: 'normal', path: '/fonts/Inter-Medium.ttf' },
      { name: 'Inter', weight: 400, style: 'normal', path: '/fonts/Inter-Regular.ttf' },
      { name: 'Lora', weight: 400, style: 'italic', path: '/fonts/Lora-Italic.ttf' },
    ];

    const fontData = await Promise.all(
      fontUrls.map(async (f) => {
        const res = await fetch(new URL(f.path, baseUrl));
        if (!res.ok) throw new Error(`Failed to load font: ${f.path}`);
        return res.arrayBuffer();
      })
    );

    return fontUrls.map((f, i) => ({
      name: f.name,
      data: fontData[i],
      weight: f.weight as any,
      style: f.style as any,
    }));
  } catch (err) {
    console.error('Font loading failed:', err);
    // Fallback to empty array or throw - route will handle it
    throw err;
  }
}
