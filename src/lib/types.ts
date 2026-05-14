export interface LoreJson {
  // Core identity
  trip_title: string;
  tagline: string;
  opening_line: string;
  closing_line: string;
  screenshot_moment_line?: string;
  whatsapp_caption?: string;
  what_this_trip_was_really_about?: string;

  // "How cooked?" — canonical field names
  cooked_level: number;          // 0-100
  cooked_verdict: string;        // "Historically Cooked" | "Peak Delusion" | "Emotionally Unstable" | "Mildly Simmering"
  cooked_explanation?: string;   // one witty sentence

  // Season recap
  season_recap?: {
    act_1: string;
    act_2: string;
    act_3: string;
    full_narrative: string;
  };

  // Friendship dynamics
  friendship_dynamics?: {
    group_structure?: string;
    emotional_center?: string;
    chaos_source?: string;
    collective_energy?: string;
  };

  // Lore awards
  trip_lore_awards?: {
    movie_genre?: string;
    trip_villain?: string;
    trip_mvp?: string;
    core_memory?: string;
  };

  // Trip eras
  trip_eras?: Array<{
    era_name: string;
    timeframe: string;
    description: string;
    defining_moment?: string;
  }>;

  // Superlatives (yearbook format)
  superlatives?: Array<{
    winner_user_id?: string;
    winner_name: string;
    question: string;
    reason?: string;
    archetype?: string;
    flavor_text?: string;
  }>;

  // Receipt stats
  receipt_stats?: Array<{
    label: string;
    value: string;
    unit?: string;
    note?: string;
  }>;
  receipt_rating?: string;
  receipt_review?: string;
}

export interface MemberRole {
  role_title: string;
  role_description: string;
  role_signature_move?: string;
  role_most_likely_said?: string;
  role_archetype_tag?: string;
  chaos_rating: number;
  archetype?: 'Black Cat' | 'Golden Retriever' | 'NPC' | 'Main Character' | 'Chaos Source';
}

export type CookedVerdict =
  | 'Mildly Simmering'
  | 'Emotionally Unstable'
  | 'Peak Delusion'
  | 'Historically Cooked';

export function getCookedVerdict(level: number): CookedVerdict {
  if (level <= 25) return 'Mildly Simmering';
  if (level <= 55) return 'Emotionally Unstable';
  if (level <= 80) return 'Peak Delusion';
  return 'Historically Cooked';
}
