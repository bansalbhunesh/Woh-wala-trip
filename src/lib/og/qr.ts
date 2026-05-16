import QRCode from 'qrcode';

export interface QRColorOptions {
  dark?: string;
  light?: string;
}

// 1x1 transparent PNG — prevents broken <img> tags when QR fails
const FALLBACK_QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export async function qrDataUrl(text: string, options?: QRColorOptions): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 0,
      scale: 10,
      color: {
        dark: options?.dark || '#000000',
        light: options?.light || '#FFFFFF00',
      },
    });
  } catch (err) {
    console.error('QR Generation failed:', err);
    return FALLBACK_QR;
  }
}
