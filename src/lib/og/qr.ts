import QRCode from 'qrcode';

export interface QRColorOptions {
  dark?: string;
  light?: string;
}

export async function qrDataUrl(text: string, options?: QRColorOptions): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 0,
      scale: 10,
      color: {
        dark: options?.dark || '#000000',
        light: options?.light || '#FFFFFF00', // Transparent background default
      },
    });
  } catch (err) {
    console.error('QR Generation failed:', err);
    return '';
  }
}
