/**
 * Shared TypeScript interfaces for trip, lore, and member data.
 *
 * These types represent the shapes returned by the Supabase database and consumed
 * by frontend components. They replace the `any` types that were previously used
 * throughout Documentary.tsx, ArchiveRoom.tsx, and other cinematic components.
 *
 * When the DB schema changes, update these types FIRST — the compiler will then
 * surface every component that needs updating.
 */

// ── Trip ───────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  trip_start_date: string | null;
  trip_end_date: string | null;
  member_count: number;
  total_photos: number;
  tier: 'free' | 'premium';
  storage_used_bytes: number;
  lore_status: 'idle' | 'processing' | 'ready' | 'failed';
  lore_json: LoreJson | null;
  lore_error: Record<string, unknown> | null;
  lore_pipeline_state: LorePipelineState | null;
  lore_eval_json: LoreEvalResult | null;
  lore_needs_review: boolean;
  lore_trace_id: string | null;
  generation_cost_tokens: number | null;
  generation_cost_by_step: Record<string, number> | null;
  processing_started_at: string | null;
  trip_signals: TripSignals | null;
  chaos_score?: number | null;
  /** Image generation status */
  image_gen_status: 'idle' | 'pending' | 'processing' | 'done' | 'failed' | null;
  cover_image_url: string | null;
  cover_photo?: string | null;
}

export interface TripSignals {
  cluster_count: number;
  contributor_diversity: number;
  dominant_uploader_ratio: number;
  unique_uploaders: number;
  night_photo_count: number;
  night_photo_ratio: number;
  high_dwell_photo_count: number;
  total_reactions: number;
  reaction_summary: Record<string, number>;
  scene_clusters: SceneCluster[];
}

export interface SceneCluster {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  photo_count: number;
  uploader_count: number;
  is_night_session: boolean;
}

// ── Lore ───────────────────────────────────────────────────────────────────

export interface LoreJson {
  trip_title: string;
  tagline: string;
  cooked_level: number;
  cooked_verdict: string;
  cooked_explanation?: string | null;
  closing_line?: string | null;
  friendship_dynamics?: {
    chaos_source?: string;
    collective_energy?: string;
    emotional_center?: string;
  } | null;
  what_this_trip_was_really_about?: string | null;
  trip_personality_type: string;
  trip_personality_tagline: string;
  season_recap: SeasonRecap;
  trip_eras: TripEra[];
  trip_lore_awards: LoreAwards;
  receipt_stats: ReceiptStat[];
  receipt_rating: string;
  receipt_review: string;
  superlatives: Superlative[];
  top_moments: TopMoment[];
}

export interface SeasonRecap {
  full_narrative: string;
  opening_hook: string;
  emotional_peak: string;
  closing_summary: string;
  act_2?: string;
}

export interface TripEra {
  era_name: string;
  era_subtitle: string;
  era_summary: string;
  era_vibe: string;
  key_moment: string;
  timeframe?: string;
  description?: string;
  defining_moment?: string;
}

export interface LoreAwards {
  core_memory: string;
  plot_twist: string;
  golden_moment: string;
  emotional_peak: string;
  [key: string]: string;
}

export interface ReceiptStat {
  id?: string;
  label: string;
  value: string;
  emoji: string;
  unit?: string;
}

export interface Superlative {
  title: string;
  winner: string;
  reason: string;
}

export interface TopMoment {
  title: string;
  description: string;
  timestamp?: string;
}

export interface LorePipelineState {
  step: string;
  status: string;
  trace_id?: string;
  updated_at?: string;
}

export interface LoreEvalResult {
  scores: {
    specificity: number;
    coherence: number;
    tone: number;
    differentiation: number;
    schema_completeness: number;
  };
  overall: number;
  weakest_dimension: string;
  feedback: string;
}

// ── Members ────────────────────────────────────────────────────────────────

export interface CharacterRole {
  archetype: string;
  title: string;
  description: string;
  traits: string[];
  catchphrase: string;
  portrait_url: string | null;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  confession_text: string | null;
  character_role: CharacterRole | null;
  display_name?: string;
  role_title?: string;
  role_chaos_rating?: number;
  role_description?: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// ── Photos ─────────────────────────────────────────────────────────────────

export interface Photo {
  id: string;
  trip_id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string | null;
  file_size: number | null;
  signed_url: string | null;
  thumb_signed_url: string | null;
  url_expires_at: string | null;
  embedding_status: 'pending' | 'processing' | 'done' | 'failed' | null;
}

// ── Composite types for common component patterns ──────────────────────────

/** Trip with its full lore data — used by Documentary, ArchiveRoom, LoreWrapped */
export type TripWithLore = Trip & {
  lore_json: LoreJson;
  members?: TripMember[];
  stats?: ReceiptStat[];
};

/** Trip with members and lore — used by the full dossier view */
export interface TripDossier {
  trip: TripWithLore;
  members: TripMember[];
  photos: Photo[];
}
