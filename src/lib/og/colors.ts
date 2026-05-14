export interface CardPalette {
  bg: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  accent: string;
  border: string;
  watermark: string;
}

export const PALETTES: Record<string, CardPalette> = {
  // Mildly Simmering (0-25) - Unfold "Quiet Luxury" Beige
  chill: {
    bg: '#FAF1E4',
    ink: '#1A1A1A',
    inkSoft: '#5F5E5A',
    inkMuted: '#888780',
    accent: '#2D9E8B',
    border: '#E8E4D8',
    watermark: '#888780',
  },
  // Emotionally Unstable (26-50) - Warm & Tense
  unstable: {
    bg: '#FFFBF2',
    ink: '#2F271A',
    inkSoft: '#665B4D',
    inkMuted: '#B2A599',
    accent: '#D49E2D',
    border: '#E6DCC1',
    watermark: '#B2A599',
  },
  // Peak Delusion (51-75) - Intense & Vibrant
  delusional: {
    bg: '#FFF5F2',
    ink: '#2F1A1A',
    inkSoft: '#664D4D',
    inkMuted: '#B29999',
    accent: '#D45D2D',
    border: '#E6C1C1',
    watermark: '#B29999',
  },
  // Historically Cooked (76-100) - Letterboxd Cinematic Dark
  cooked: {
    bg: '#14181C',
    ink: '#FFFFFF',
    inkSoft: '#99B2AD',
    inkMuted: '#5F5E5A',
    accent: '#FF4D4D',
    border: '#2F1A1A',
    watermark: '#5F5E5A',
  },
  // Chaos / Inferno - Legacy
  chaos: {
    bg: '#FFFFFF',
    ink: '#000000',
    inkSoft: '#444444',
    inkMuted: '#888888',
    accent: '#FF0000',
    border: '#FF0000',
    watermark: '#888888',
  },
};

export function paletteFor(cookedLevel: number): CardPalette {
  if (cookedLevel >= 76) return PALETTES.cooked;
  if (cookedLevel >= 51) return PALETTES.delusional;
  if (cookedLevel >= 26) return PALETTES.unstable;
  return PALETTES.chill;
}
