/**
 * Structured logger for Yaarlore server-side code.
 *
 * Uses pino for JSON-serialised log output that is machine-parseable by
 * Render log drains, Vercel log integrations, and Langfuse events.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error({ procedure: 'trips.create', userId, tripId }, 'trip create failed');
 *   logger.info({ procedure: 'photos.confirmUpload', userId }, 'photo confirmed');
 *
 * OBS-01: replaces ad-hoc console.log/error calls in tRPC routers.
 */
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'yaarlore-api' },
});
