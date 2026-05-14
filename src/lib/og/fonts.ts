import { CardPalette } from './colors';

export type Font = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: 'normal' | 'italic';
};

export async function loadCardFonts(origin?: string | null): Promise<Font[]> {
  const baseUrl = origin || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

  const [interMedium, interRegular, loraItalic] = await Promise.all([
    fetch(new URL('/fonts/Inter-Medium.ttf', baseUrl)).then((res) => res.arrayBuffer()),
    fetch(new URL('/fonts/Inter-Regular.ttf', baseUrl)).then((res) => res.arrayBuffer()),
    fetch(new URL('/fonts/Lora-Italic.ttf', baseUrl)).then((res) => res.arrayBuffer()),
  ]);

  return [
    { name: 'Inter', data: interMedium, weight: 500, style: 'normal' },
    { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
    { name: 'Lora', data: loraItalic, weight: 400, style: 'italic' },
  ];
}
