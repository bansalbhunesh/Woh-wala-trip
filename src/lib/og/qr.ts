export interface QRColorOptions {
  dark?: string;
  light?: string;
}

// Returns the URL text — the CardFooter now shows it as a readable invite code
// instead of an image QR, which avoids the canvas API dependency on edge runtime
export async function qrDataUrl(text: string, _options?: QRColorOptions): Promise<string> {
  return text;
}
