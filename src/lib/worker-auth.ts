/**
 * HMAC-SHA256 signing for AI worker requests.
 * Uses Web Crypto API — compatible with Next.js Edge Runtime and Node.js.
 *
 * Signing payload: "METHOD\nPATH\nTIMESTAMP\nBODY_SHA256"
 * Headers added:   X-Timestamp, X-Signature
 * Env var:         AI_WORKER_HMAC_SECRET (required; separate from AI_WORKER_SECRET)
 */
export async function signWorkerRequest(
  method: string,
  path: string,
  body: string
): Promise<{ signature: string; timestamp: string }> {
  const secret = process.env.AI_WORKER_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      '[worker-auth] AI_WORKER_HMAC_SECRET is not set. ' +
        'This env var is required for HMAC request signing.'
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // SHA-256 of the raw request body
  const bodyBytes = new TextEncoder().encode(body);
  const bodyHashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
  const bodyHash = Array.from(new Uint8Array(bodyHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Signing string
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  const payloadBytes = new TextEncoder().encode(payload);

  // Import HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, payloadBytes);
  const signature = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { signature, timestamp };
}
