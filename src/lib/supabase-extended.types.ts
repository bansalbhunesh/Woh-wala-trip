/**
 * supabase-extended.types.ts
 *
 * Centralised type overrides for Supabase tables and RPCs whose TypeScript
 * signatures are not correctly inferred by the generated database.types.ts —
 * either because the column was added after the last codegen run, or because
 * the Supabase JS client's chained-query generics do not narrow the type
 * correctly for the specific query shape used.
 *
 * TODO: Remove this file (or reduce it to zero exports) once TYPE-01 is
 * resolved — i.e. `supabase gen types typescript` is re-run against the live
 * project and `src/lib/database.types.ts` is updated.
 *
 * How to use:
 *   import type { BackgroundJobInsert, SupabaseRpcClient, ... } from '@/lib/supabase-extended.types';
 *   const result = await (client as unknown as SupabaseRpcClient).rpc('my_rpc', args);
 *
 * Design rationale:
 *   The helpers in this file are deliberately "thin wrappers" — they do not add
 *   runtime behaviour, only TypeScript-level guarantees. Each exported type or
 *   interface carries a JSDoc comment that names the Supabase table / column /
 *   function it covers so it is easy to audit which overrides remain after a
 *   codegen re-run.
 */

// ---------------------------------------------------------------------------
// Section 1 — Insert shapes for tables that are present in the DB schema but
//              whose Insert type is missing or incomplete in database.types.ts.
// ---------------------------------------------------------------------------

/**
 * Insert shape for the `background_jobs` table.
 *
 * Table: background_jobs
 * Missing columns in generated Insert type: none — but the generated type
 * uses `Json | null` for `payload` whereas routers use `Record<string, unknown>`.
 * This alias narrows payload to a concrete object type for type safety at call sites.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type BackgroundJobInsert = {
  /** FK → trips.id (NOT NULL in schema). */
  trip_id: string;
  /** Discriminator used by the worker's poll loop (e.g. 'embed_photo', 'missing_person_card', 'judge_battle'). */
  job_type: string;
  /** Initial lifecycle state — typically 'pending'. */
  status: string;
  /** Arbitrary JSON payload forwarded to the worker handler. */
  payload?: Record<string, unknown>;
};

/**
 * Minimal insert shape for the `generation_jobs` table.
 *
 * Table: generation_jobs
 * Used by the generateLore fallback path to queue lore generation when the
 * HTTP trigger to the AI worker fails.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type GenerationJobUpsert = {
  /** FK → trips.id (unique constraint enforces one row per trip). */
  trip_id: string;
  /** Lifecycle state — 'pending' on creation, updated by the worker. */
  status: string;
};

// ---------------------------------------------------------------------------
// Section 2 — Update shapes for tables whose Update type is incomplete.
// ---------------------------------------------------------------------------

/**
 * Partial update shape for post-codegen columns on the `trips` table.
 *
 * Table: trips
 * Columns: lore_status, processing_started_at, lore_status_override
 *
 * Note: `lore_status` and `processing_started_at` are present in the generated
 * Row type but the chained `.update(...).eq(...).neq(...).select(...)` generic
 * does not infer them correctly without an explicit cast.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type TripStatusUpdate = {
  /** Lifecycle state of lore generation. Valid values: 'pending' | 'processing' | 'ready' | 'failed'. */
  lore_status?: string;
  /** ISO timestamp set when a worker starts processing. Cleared on completion or reset. */
  processing_started_at?: string | null;
  /** Admin-only override (reserved for future use). */
  lore_status_override?: string;
};

/**
 * Partial update shape for the `trips` table covering payment / tier columns.
 *
 * Table: trips
 * Columns: tier, payment_id, expires_at
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type TripPaymentUpdate = {
  /** Subscription tier: 'free' | 'digital' | 'print'. */
  tier: string;
  /** Razorpay payment ID stored for audit trail. */
  payment_id: string;
  /** Expiry timestamp — null means no expiry. */
  expires_at: null;
};

/**
 * Partial update shape for the `trips` table covering story visibility.
 *
 * Table: trips
 * Columns: story_visible
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type StoryVisibilityUpdate = {
  /** Whether the public /t/[code]/story page is accessible. */
  story_visible: boolean;
};

/**
 * Partial update shape for referral columns on the `profiles` table.
 *
 * Table: profiles
 * Columns: referral_counted, referral_count, referral_bonus_unlocked, invited_by_user_id
 *
 * These columns exist in the generated Row type but not all are inferred
 * correctly in chained update generics for every call shape.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type ProfileReferralUpdate = {
  /** Set to true once the referrer has been credited for this user (prevents double-counting). */
  referral_counted?: boolean;
  /** Running total of successful referrals credited to this user. */
  referral_count?: number;
  /** Becomes true when referral_count reaches 3 — unlocks a free generation. */
  referral_bonus_unlocked?: boolean;
  /** UUID of the user who invited this profile to the platform. */
  invited_by_user_id?: string;
};

/**
 * Insert shape for the `photos` table covering columns added after codegen.
 *
 * Table: photos
 * Columns: trip_id, user_id, storage_path, file_size
 *
 * The generated Insert type marks user_id as optional (nullable FK) but the
 * routers always supply it — this type makes that intent explicit.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type PhotoInsertRow = {
  /** FK → trips.id. */
  trip_id: string;
  /** FK → profiles.id. Always set by server — never optional in our app. */
  user_id: string;
  /** Storage key inside the 'trip-photos' bucket. */
  storage_path: string;
  /** Authoritative file size in bytes from storage.objects — null if lookup failed. */
  file_size?: number | null;
};

/**
 * Partial update shape for privacy columns on the `photos` table.
 *
 * Table: photos
 * Columns: is_private
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type PhotoPrivacyUpdate = {
  /** When true, the photo is hidden from other members, lore AI, and story player. */
  is_private: boolean;
};

/**
 * Insert shape for the `photo_views` table.
 *
 * Table: photo_views
 * The generated Insert type exists but chained client calls do not infer it
 * correctly without an explicit wrapper.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type PhotoViewInsert = {
  /** FK → photos.id. */
  photo_id: string;
  /** FK → trips.id (denormalised for efficient per-trip queries). */
  trip_id: string;
  /** FK → profiles.id. */
  user_id: string;
  /** How long the user watched this photo in milliseconds. */
  view_duration_ms: number;
};

/**
 * Update shape for `trip_members` covering the absent member flow.
 *
 * Table: trip_members
 * Columns: status, absence_reason
 *
 * absence_reason is present in the generated Row type but not always inferred
 * correctly in update generics.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type TripMemberAbsenceUpdate = {
  /** New lifecycle status — 'absent' in the markAbsent flow. */
  status: string;
  /** Free-text reason recorded by the creator (max 200 chars). */
  absence_reason?: string;
};

/**
 * Upsert shape for the `yearly_wraps` table.
 *
 * Table: yearly_wraps
 * The generated Insert type is missing `trip_ids` (a text[] column added after
 * the last codegen run).
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type YearlyWrapUpsert = {
  /** FK → profiles.id. Part of the unique key (user_id, year). */
  user_id: string;
  /** Calendar year of the wrap (e.g. 2024). Part of the unique key (user_id, year). */
  year: number;
  /** Array of trip IDs included in this wrap. */
  trip_ids: string[];
  /** Lifecycle state: 'processing' | 'ready' | 'failed'. */
  status: string;
};

/**
 * Row shape returned when selecting from `yearly_wraps`.
 *
 * Table: yearly_wraps
 * Extends the generated Row with the `trip_ids` column that is missing from codegen.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type YearlyWrapRow = {
  user_id: string;
  year: number;
  trip_ids: string[];
  wrap_json: unknown;
  status: string;
  created_at?: string | null;
};

// ---------------------------------------------------------------------------
// Section 3 — RPC client wrappers.
//
// The Supabase JS client's `.rpc()` method is typed against the generated
// Functions map. When a function is missing from that map, or when the call
// site uses a generic `Record<string, unknown>` arg shape that doesn't match
// the exact generated overload, we use these typed wrappers.
// ---------------------------------------------------------------------------

/**
 * Typed RPC client for RPCs that are missing from the generated Functions map
 * or whose argument/return types are too narrow to accept a generic call site.
 *
 * Covers: get_trip_full, join_trip_by_code, submit_confession,
 *         get_nostalgia_moments, find_similar_photos, cast_vs_vote
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type SupabaseRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Typed argument shape for the `list_user_trips` RPC.
 *
 * RPC: list_user_trips(p_user_id uuid, p_cursor timestamptz, p_limit int) → setof Json
 * Added in migration 2026051906_list_trips_paginated.sql to replace the app-side
 * sort + slice pattern that read up to 200 trip_member rows per user.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type ListUserTripsArgs = {
  /** The authenticated user's UUID. */
  p_user_id: string;
  /** ISO timestamp cursor — fetch trips created strictly before this timestamp. */
  p_cursor?: string;
  /** Maximum number of trips to return (capped at 50 by the function). */
  p_limit: number;
};

/**
 * Typed RPC client for `list_user_trips` — strongly typed args, generic result.
 *
 * RPC: list_user_trips → setof Json (rows shaped like TripSummary)
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export type ListUserTripsClient = {
  rpc: (
    fn: string,
    args: ListUserTripsArgs
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

// ---------------------------------------------------------------------------
// Section 4 — Return type shapes for RPCs that return Json blobs.
//
// These are NOT Supabase table types — they describe the shape of the Json
// value returned by a specific Postgres function. They live here so router
// files do not declare them inline inside functions.
// ---------------------------------------------------------------------------

/**
 * Shape of the JSON object returned by the `get_trip_full` RPC.
 *
 * RPC: get_trip_full(p_trip_id uuid) → Json
 * Returns the full trip document including members, stats, eras, and cover photo.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface GetTripFullResult {
  trip: Record<string, unknown>;
  members: unknown[];
  stats: unknown[];
  eras: unknown[];
  cover_photo: unknown | null;
  /** Present only on error — indicates why the trip could not be found. */
  error?: string;
}

/**
 * Shape of the JSON object returned by the `join_trip_by_code` RPC.
 *
 * RPC: join_trip_by_code(p_invite_code text) → Json
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface JoinTripResult {
  trip_id: string;
  /** Present on RPC-level errors (e.g. 'invalid_or_expired_code'). */
  error?: string;
}

/**
 * Shape of the JSON object returned by the `submit_confession` RPC.
 *
 * RPC: submit_confession(p_trip_id uuid, p_confession text) → Json
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface ConfessionResult {
  success?: boolean;
  /** Present on RPC-level errors. */
  error?: string;
}

/**
 * Shape of a single row returned by the `get_nostalgia_moments` RPC.
 *
 * RPC: get_nostalgia_moments(p_user_id uuid, p_limit int) → setof Json
 * Used in trips.getNostalgiaFeed and photos.nostalgiaFeed.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface NostalgiaRow {
  photo_id: string;
  trip_id: string;
  trip_name: string;
  trip_year: number;
  destination: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  chaos_score: number | null;
  years_ago: number;
  lore_tagline: string | null;
  /** Populated client-side after a signed-URL lookup — not in RPC output. */
  url?: string | null;
  /** Populated client-side after a signed-URL lookup — not in RPC output. */
  thumbnailUrl?: string | null;
  [key: string]: unknown;
}

/**
 * Shape of a single row returned by the `find_similar_photos` RPC.
 *
 * RPC: find_similar_photos(p_photo_id uuid, p_user_id uuid, p_limit int) → setof Json
 * Used in trips.getSimilarPublicTrips and photos.findSimilar.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface SimilarPhotoRow {
  photo_id: string;
  trip_id: string;
  trip_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  similarity: number;
  trip_year: number;
  destination: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Section 5 — Row query shapes for columns that are awkward to infer via the
//             generic select() narrowing when selecting a subset of columns.
// ---------------------------------------------------------------------------

/**
 * Minimal row shape when selecting creator_id from the `trips` table.
 *
 * Table: trips
 * Used whenever a router only needs to verify trip ownership.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface TripCreatorRow {
  creator_id: string;
}

/**
 * Row shape when selecting creator_id + tier from the `trips` table.
 *
 * Table: trips
 * Used in the upgradeTier mutation to verify ownership before processing payment.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface TripUpgradeRow {
  creator_id: string;
  tier: string;
}

/**
 * Summarised trip row as returned by the listMine nested select.
 *
 * Table: trips (subset of columns)
 * PostgREST returns the nested trips object as this shape when queried via
 * `trip_members.select('trips:trip_id(...)')`.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface TripSummary {
  id: string;
  name: string;
  destination?: string | null;
  trip_start_date?: string | null;
  trip_end_date?: string | null;
  lore_status?: string | null;
  lore_json?: unknown;
  chaos_score?: number | null;
  member_count?: number | null;
  total_photos?: number | null;
  tier?: string | null;
  created_at?: string | null;
}

/**
 * Row shape for the `chaos_distribution_cache` materialized view.
 *
 * View: chaos_distribution_cache (added post-codegen — not in database.types.ts)
 * Used in getChaosDistribution to avoid full trips table scans.
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface ChaosDistributionRow {
  chaos_score: number;
}

/**
 * Profile fields needed for the referral status query.
 *
 * Table: profiles
 * Columns: username, referral_count, referral_bonus_unlocked
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface ProfileReferralStatus {
  username: string | null;
  referral_count: number;
  referral_bonus_unlocked: boolean;
}

/**
 * Profile fields needed for the generateLore REFERRAL-03 check.
 *
 * Table: profiles
 * Columns: referral_bonus_unlocked, generation_tokens_used_this_month, generation_tokens_month
 *
 * TODO: Remove when TYPE-01 resolved (supabase gen types re-run)
 */
export interface ProfileTokenUsage {
  referral_bonus_unlocked: boolean;
  generation_tokens_used_this_month: number | null;
  generation_tokens_month: string | null;
}
