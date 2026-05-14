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
  // Mildly Simmering (0-25) - Soft, chill, green/teal
  chill: {
    bg: '#F4FBF9',
    ink: '#1A2F2B',
    inkSoft: '#4D6661',
    inkMuted: '#99B2AD',
    accent: '#2D9E8B',
    border: '#D1E6E1',
    watermark: '#99B2AD',
  },
  // Emotionally Unstable (26-50) - Warm, slightly tense, amber
  unstable: {
    bg: '#FFFBF2',
    ink: '#2F271A',
    inkSoft: '#665B4D',
    inkMuted: '#B2A599',
    accent: '#D49E2D',
    border: '#E6DCC1',
    watermark: '#B2A599',
  },
  // Peak Delusion (51-75) - Intense, vibrant, orange/red
  delusional: {
    bg: '#FFF5F2',
    ink: '#2F1A1A',
    inkSoft: '#664D4D',
    inkMuted: '#B29999',
    accent: '#D45D2D',
    border: '#E6C1C1',
    watermark: '#B29999',
  },
  // Historically Cooked (76-100) - Dark, dramatic, deep red/black
  cooked: {
    bg: '#1A0D0D',
    ink: '#FFFFFF',
    inkSoft: '#B29999',
    inkMuted: '#664D4D',
    accent: '#FF4D4D',
    border: '#4D1A1A',
    watermark: '#664D4D',
  },
  // Chaos (Legacy/Alert) - High alert red
  chaos: {
    bg: '#FFFFFF',
    ink: '#000000',
    inkSoft: '#444444',
    inkMuted: '#888888',
    accent: '#FF0000',
    border: '#FF0000',
    watermark: '#888888',
  },
  // Inferno - High stakes black/orange
  inferno: {
    bg: '#000000',
    ink: '#FFFFFF',
    inkSoft: '#FFA500',
    inkMuted: '#666666',
    accent: '#FF4500',
    border: '#FF4500',
    watermark: '#444444',
  },
};

export function paletteFor(cookedLevel: number): CardPalette {
  if (cookedLevel >= 76) return PALETTES.cooked;
  if (cookedLevel >= 51) return PALETTES.delusional;
  if (cookedLevel >= 26) return PALETTES.unstable;
  return PALETTES.chill;
}
