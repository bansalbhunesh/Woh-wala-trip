export interface LoreJson {
  trip_title: string;
  tagline: string;
  cooked_verdict: string;
  chaos_score: number;
  screenshot_moment_line?: string;
  whatsapp_caption?: string;
  closing_line: string;
  trip_eras?: Array<{
    era_name: string;
    timeframe: string;
    description: string;
  }>;
  superlatives?: Array<{
    question: string;
    winner_name: string;
    archetype?: string;
  }>;
}

export interface MemberRole {
  role_title: string;
  role_description: string;
  chaos_rating: number;
}
