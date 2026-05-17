/**
 * Langfuse observability client for AI call tracing.
 *
 * Usage:
 *   import { trace } from '@/lib/langfuse';
 *   const span = trace.span({ name: 'lore-generation', input: signals });
 *   // ... run AI call ...
 *   span.end({ output: lore, usage: { promptTokens, completionTokens } });
 *
 * Set LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY + LANGFUSE_HOST in .env.local
 * to enable. If keys are missing, all calls are no-ops.
 */

type SpanOptions = {
  name: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
};

type Span = {
  end: (opts?: {
    output?: unknown;
    usage?: { promptTokens?: number; completionTokens?: number };
  }) => void;
  setMetadata: (meta: Record<string, unknown>) => void;
};

type TraceClient = {
  span: (opts: SpanOptions) => Span;
  event: (name: string, metadata?: Record<string, unknown>, traceId?: string) => void;
  flush: () => Promise<void>;
};

function noopSpan(): Span {
  return {
    end: () => undefined,
    setMetadata: () => undefined,
  };
}

function createLangfuseClient(): TraceClient {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com';

  if (!publicKey || !secretKey) {
    // Return no-op client when Langfuse is not configured
    return {
      span: () => noopSpan(),
      event: () => undefined,
      flush: async () => undefined,
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

  async function sendToLangfuse(body: unknown) {
    try {
      await fetch(`${host}/api/public/ingestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
      });
    } catch {
      // Never throw on observability failures
    }
  }

  return {
    span(opts: SpanOptions): Span {
      const spanId = crypto.randomUUID();
      const traceId = crypto.randomUUID();
      const startTime = new Date().toISOString();
      let meta: Record<string, unknown> = {};

      sendToLangfuse({
        batch: [
          {
            id: crypto.randomUUID(),
            type: 'span-create',
            body: {
              id: spanId,
              traceId,
              name: opts.name,
              input: opts.input,
              startTime,
              metadata: opts.metadata,
            },
          },
        ],
      });

      return {
        end(endOpts) {
          sendToLangfuse({
            batch: [
              {
                id: crypto.randomUUID(),
                type: 'span-update',
                body: {
                  id: spanId,
                  traceId,
                  endTime: new Date().toISOString(),
                  output: endOpts?.output,
                  usage: endOpts?.usage,
                  metadata: { ...meta, ...opts.metadata },
                },
              },
            ],
          });
        },
        setMetadata(m) {
          meta = { ...meta, ...m };
        },
      };
    },

    event(name: string, metadata?: Record<string, unknown>, traceId?: string) {
      sendToLangfuse({
        batch: [
          {
            id: crypto.randomUUID(),
            type: 'event-create',
            body: {
              id: crypto.randomUUID(),
              traceId: traceId ?? crypto.randomUUID(),
              name,
              metadata,
              startTime: new Date().toISOString(),
            },
          },
        ],
      });
    },

    async flush() {
      // Langfuse SDK batches internally; this is a no-op for the HTTP-direct client
    },
  };
}

// Singleton — safe in serverless since each invocation is fresh
export const langfuse = createLangfuseClient();

/**
 * Trace a suspicious/blocked auth event to Langfuse.
 * Used for fraud analytics — these events are searchable in the Langfuse dashboard.
 */
export function traceSecurityEvent(
  eventType: 'disposable_email' | 'rate_limited' | 'api_fraud_score' | 'bot_detected',
  metadata: Record<string, unknown>,
  sessionId?: string
): void {
  langfuse.event(
    `security:${eventType}`,
    {
      ...metadata,
      service: 'yaarlore-auth',
      severity: 'warn',
    },
    sessionId
  );
}
