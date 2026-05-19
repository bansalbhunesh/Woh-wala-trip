export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      background_jobs: {
        Row: {
          claimed_at: string | null;
          completed_at: string | null;
          created_at: string;
          error: string | null;
          id: string;
          job_type: string;
          payload: Json | null;
          status: string;
          trace_id: string | null;
          trip_id: string;
        };
        Insert: {
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          error?: string | null;
          id?: string;
          job_type: string;
          payload?: Json | null;
          status?: string;
          trace_id?: string | null;
          trip_id: string;
        };
        Update: {
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          error?: string | null;
          id?: string;
          job_type?: string;
          payload?: Json | null;
          status?: string;
          trace_id?: string | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'background_jobs_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'background_jobs_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      fal_budget: {
        Row: {
          calls_count: number;
          date: string;
        };
        Insert: {
          calls_count?: number;
          date?: string;
        };
        Update: {
          calls_count?: number;
          date?: string;
        };
        Relationships: [];
      };
      generation_jobs: {
        Row: {
          claimed_at: string | null;
          completed_at: string | null;
          created_at: string;
          error: string | null;
          id: string;
          status: string;
          trip_id: string;
        };
        Insert: {
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          error?: string | null;
          id?: string;
          status?: string;
          trip_id: string;
        };
        Update: {
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          error?: string | null;
          id?: string;
          status?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'generation_jobs_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: true;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'generation_jobs_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: true;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      lore_reactions: {
        Row: {
          created_at: string | null;
          emoji: string;
          id: string;
          slide_idx: number | null;
          slide_type: string;
          trip_id: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          emoji: string;
          id?: string;
          slide_idx?: number | null;
          slide_type: string;
          trip_id: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          emoji?: string;
          id?: string;
          slide_idx?: number | null;
          slide_type?: string;
          trip_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lore_reactions_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'lore_reactions_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lore_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lore_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      otp_codes: {
        Row: {
          code: string;
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          used: boolean | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          used?: boolean | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          used?: boolean | null;
        };
        Relationships: [];
      };
      photo_views: {
        Row: {
          created_at: string;
          id: string;
          photo_id: string;
          trip_id: string;
          user_id: string | null;
          view_duration_ms: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          photo_id: string;
          trip_id: string;
          user_id?: string | null;
          view_duration_ms?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          photo_id?: string;
          trip_id?: string;
          user_id?: string | null;
          view_duration_ms?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_views_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_views_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'photo_views_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      photos: {
        Row: {
          analysis_results: Json | null;
          clip_embedding: string | null;
          created_at: string | null;
          embedding_status: string | null;
          file_size: number | null;
          id: string;
          is_analyzed: boolean | null;
          is_private: boolean;
          signed_url: string | null;
          storage_path: string;
          thumb_signed_url: string | null;
          thumbnail_path: string | null;
          trip_id: string | null;
          url_expires_at: string | null;
          user_id: string | null;
        };
        Insert: {
          analysis_results?: Json | null;
          clip_embedding?: string | null;
          created_at?: string | null;
          embedding_status?: string | null;
          file_size?: number | null;
          id?: string;
          is_analyzed?: boolean | null;
          is_private?: boolean;
          signed_url?: string | null;
          storage_path: string;
          thumb_signed_url?: string | null;
          thumbnail_path?: string | null;
          trip_id?: string | null;
          url_expires_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          analysis_results?: Json | null;
          clip_embedding?: string | null;
          created_at?: string | null;
          embedding_status?: string | null;
          file_size?: number | null;
          id?: string;
          is_analyzed?: boolean | null;
          is_private?: boolean;
          signed_url?: string | null;
          storage_path?: string;
          thumb_signed_url?: string | null;
          thumbnail_path?: string | null;
          trip_id?: string | null;
          url_expires_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photos_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'photos_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      print_waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          trip_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name?: string | null;
          trip_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          trip_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'print_waitlist_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'print_waitlist_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string | null;
          generation_tokens_month: string | null;
          generation_tokens_used_this_month: number;
          id: string;
          invited_by_user_id: string | null;
          referral_bonus_unlocked: boolean;
          referral_count: number;
          referral_counted: boolean;
          username: string | null;
          worker_warmed_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          generation_tokens_month?: string | null;
          generation_tokens_used_this_month?: number;
          id: string;
          invited_by_user_id?: string | null;
          referral_bonus_unlocked?: boolean;
          referral_count?: number;
          referral_counted?: boolean;
          username?: string | null;
          worker_warmed_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          generation_tokens_month?: string | null;
          generation_tokens_used_this_month?: number;
          id?: string;
          invited_by_user_id?: string | null;
          referral_bonus_unlocked?: boolean;
          referral_count?: number;
          referral_counted?: boolean;
          username?: string | null;
          worker_warmed_at?: string | null;
        };
        Relationships: [];
      };
      scheduled_emails: {
        Row: {
          created_at: string | null;
          email_type: string;
          id: string;
          send_at: string;
          sent_at: string | null;
          trip_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email_type: string;
          id?: string;
          send_at: string;
          sent_at?: string | null;
          trip_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email_type?: string;
          id?: string;
          send_at?: string;
          sent_at?: string | null;
          trip_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scheduled_emails_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'scheduled_emails_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_emails_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_emails_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_eras: {
        Row: {
          description: string | null;
          display_order: number | null;
          era_name: string;
          id: string;
          thumbnail_url: string | null;
          timeframe: string | null;
          trip_id: string | null;
        };
        Insert: {
          description?: string | null;
          display_order?: number | null;
          era_name: string;
          id?: string;
          thumbnail_url?: string | null;
          timeframe?: string | null;
          trip_id?: string | null;
        };
        Update: {
          description?: string | null;
          display_order?: number | null;
          era_name?: string;
          id?: string;
          thumbnail_url?: string | null;
          timeframe?: string | null;
          trip_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_eras_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'trip_eras_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_members: {
        Row: {
          absence_reason: string | null;
          created_at: string | null;
          id: string;
          portrait_url: string | null;
          role_chaos_rating: number | null;
          role_description: string | null;
          role_title: string | null;
          status: string | null;
          trip_id: string | null;
          user_id: string | null;
        };
        Insert: {
          absence_reason?: string | null;
          created_at?: string | null;
          id?: string;
          portrait_url?: string | null;
          role_chaos_rating?: number | null;
          role_description?: string | null;
          role_title?: string | null;
          status?: string | null;
          trip_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          absence_reason?: string | null;
          created_at?: string | null;
          id?: string;
          portrait_url?: string | null;
          role_chaos_rating?: number | null;
          role_description?: string | null;
          role_title?: string | null;
          status?: string | null;
          trip_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_members_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'trip_members_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_stats: {
        Row: {
          display_order: number | null;
          id: string;
          label: string;
          trip_id: string | null;
          unit: string | null;
          value: string;
        };
        Insert: {
          display_order?: number | null;
          id?: string;
          label: string;
          trip_id?: string | null;
          unit?: string | null;
          value: string;
        };
        Update: {
          display_order?: number | null;
          id?: string;
          label?: string;
          trip_id?: string | null;
          unit?: string | null;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_stats_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'trip_stats_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_vs_trip: {
        Row: {
          ai_verdict_json: Json | null;
          ai_winner: string | null;
          created_at: string;
          id: string;
          status: string;
          trip_a_id: string;
          trip_b_id: string;
          voting_ends_at: string;
        };
        Insert: {
          ai_verdict_json?: Json | null;
          ai_winner?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          trip_a_id: string;
          trip_b_id: string;
          voting_ends_at: string;
        };
        Update: {
          ai_verdict_json?: Json | null;
          ai_winner?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          trip_a_id?: string;
          trip_b_id?: string;
          voting_ends_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_vs_trip_ai_winner_fkey';
            columns: ['ai_winner'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'trip_vs_trip_ai_winner_fkey';
            columns: ['ai_winner'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_vs_trip_trip_a_id_fkey';
            columns: ['trip_a_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'trip_vs_trip_trip_a_id_fkey';
            columns: ['trip_a_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trip_vs_trip_trip_b_id_fkey';
            columns: ['trip_b_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'trip_vs_trip_trip_b_id_fkey';
            columns: ['trip_b_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trips: {
        Row: {
          chaos_score: number | null;
          cover_image_url: string | null;
          created_at: string | null;
          creator_id: string;
          destination: string | null;
          expires_at: string | null;
          generation_cost_by_step: Json | null;
          generation_cost_tokens: number | null;
          id: string;
          invite_code: string | null;
          is_public: boolean | null;
          lore_error: Json | null;
          lore_eval_json: Json | null;
          lore_json: Json | null;
          lore_needs_review: boolean | null;
          lore_pipeline_state: Json | null;
          lore_prompt_version: string | null;
          lore_quality_retried: boolean | null;
          lore_quality_retry_score_after: number | null;
          lore_quality_retry_score_before: number | null;
          lore_status: string | null;
          lore_trace_id: string | null;
          member_count: number | null;
          name: string;
          payment_id: string | null;
          processing_started_at: string | null;
          storage_used_bytes: number;
          story_visible: boolean;
          tier: string | null;
          total_photos: number | null;
          trip_end_date: string;
          trip_signals: Json | null;
          trip_start_date: string;
        };
        Insert: {
          chaos_score?: number | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          creator_id: string;
          destination?: string | null;
          expires_at?: string | null;
          generation_cost_by_step?: Json | null;
          generation_cost_tokens?: number | null;
          id?: string;
          invite_code?: string | null;
          is_public?: boolean | null;
          lore_error?: Json | null;
          lore_eval_json?: Json | null;
          lore_json?: Json | null;
          lore_needs_review?: boolean | null;
          lore_pipeline_state?: Json | null;
          lore_prompt_version?: string | null;
          lore_quality_retried?: boolean | null;
          lore_quality_retry_score_after?: number | null;
          lore_quality_retry_score_before?: number | null;
          lore_status?: string | null;
          lore_trace_id?: string | null;
          member_count?: number | null;
          name: string;
          payment_id?: string | null;
          processing_started_at?: string | null;
          storage_used_bytes?: number;
          story_visible?: boolean;
          tier?: string | null;
          total_photos?: number | null;
          trip_end_date: string;
          trip_signals?: Json | null;
          trip_start_date: string;
        };
        Update: {
          chaos_score?: number | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          creator_id?: string;
          destination?: string | null;
          expires_at?: string | null;
          generation_cost_by_step?: Json | null;
          generation_cost_tokens?: number | null;
          id?: string;
          invite_code?: string | null;
          is_public?: boolean | null;
          lore_error?: Json | null;
          lore_eval_json?: Json | null;
          lore_json?: Json | null;
          lore_needs_review?: boolean | null;
          lore_pipeline_state?: Json | null;
          lore_prompt_version?: string | null;
          lore_quality_retried?: boolean | null;
          lore_quality_retry_score_after?: number | null;
          lore_quality_retry_score_before?: number | null;
          lore_status?: string | null;
          lore_trace_id?: string | null;
          member_count?: number | null;
          name?: string;
          payment_id?: string | null;
          processing_started_at?: string | null;
          storage_used_bytes?: number;
          story_visible?: boolean;
          tier?: string | null;
          total_photos?: number | null;
          trip_end_date?: string;
          trip_signals?: Json | null;
          trip_start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trips_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_archetypes: {
        Row: {
          created_at: string | null;
          id: string;
          role_archetype_tag: string | null;
          role_chaos_rating: number | null;
          role_title: string | null;
          trip_destination: string | null;
          trip_id: string;
          trip_name: string | null;
          trip_year: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role_archetype_tag?: string | null;
          role_chaos_rating?: number | null;
          role_title?: string | null;
          trip_destination?: string | null;
          trip_id: string;
          trip_name?: string | null;
          trip_year?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role_archetype_tag?: string | null;
          role_chaos_rating?: number | null;
          role_title?: string | null;
          trip_destination?: string | null;
          trip_id?: string;
          trip_name?: string | null;
          trip_year?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_archetypes_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'user_archetypes_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      yearly_wraps: {
        Row: {
          created_at: string | null;
          id: string;
          user_id: string;
          wrap_json: Json;
          year: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          user_id: string;
          wrap_json?: Json;
          year: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          user_id?: string;
          wrap_json?: Json;
          year?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      chaos_distribution_cache: {
        Row: {
          chaos_score: number | null;
          trip_id: string | null;
        };
        Relationships: [];
      };
      lore_reaction_counts: {
        Row: {
          count: number | null;
          emoji: string | null;
          slide_idx: number | null;
          slide_type: string | null;
          trip_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lore_reactions_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'lore_reactions_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      photo_view_stats: {
        Row: {
          avg_duration_ms: number | null;
          long_view_count: number | null;
          max_duration_ms: number | null;
          photo_id: string | null;
          trip_id: string | null;
          view_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_views_photo_id_fkey';
            columns: ['photo_id'];
            isOneToOne: false;
            referencedRelation: 'photos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'photo_views_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'chaos_distribution_cache';
            referencedColumns: ['trip_id'];
          },
          {
            foreignKeyName: 'photo_views_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      public_profiles: {
        Row: {
          avg_chaos_rating: number | null;
          bio: string | null;
          display_name: string | null;
          id: string | null;
          peak_chaos_rating: number | null;
          public_trip_count: number | null;
          username: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_generation_job: { Args: never; Returns: string };
      claim_lore_generation: {
        Args: { p_trip_id: string; p_user_id: string };
        Returns: string;
      };
      cleanup_expired_otp_codes: { Args: never; Returns: undefined };
      find_similar_photos: {
        Args: { p_limit?: number; p_photo_id: string; p_user_id: string };
        Returns: {
          destination: string;
          photo_id: string;
          similarity: number;
          storage_path: string;
          thumbnail_path: string;
          trip_id: string;
          trip_name: string;
          trip_year: number;
        }[];
      };
      get_member_archetype_summary: {
        Args: { p_trip_id: string; p_user_id: string };
        Returns: Json;
      };
      get_nostalgia_moments: {
        Args: { p_limit?: number; p_user_id: string };
        Returns: {
          chaos_score: number;
          destination: string;
          lore_tagline: string;
          photo_id: string;
          storage_path: string;
          thumbnail_path: string;
          trip_id: string;
          trip_name: string;
          trip_year: number;
          years_ago: number;
        }[];
      };
      get_trip_full: { Args: { p_trip_id: string }; Returns: Json };
      get_user_archetype_history: {
        Args: { p_user_id: string };
        Returns: {
          created_at: string;
          role_archetype_tag: string;
          role_chaos_rating: number;
          role_title: string;
          trip_destination: string;
          trip_id: string;
          trip_name: string;
          trip_year: number;
        }[];
      };
      is_member_of_trip: { Args: { p_trip_id: string }; Returns: boolean };
      join_trip_by_code: { Args: { p_invite_code: string }; Returns: Json };
      list_user_trips: {
        Args: { p_cursor?: string; p_limit?: number; p_user_id: string };
        Returns: {
          chaos_score: number;
          created_at: string;
          destination: string;
          lore_status: string;
          member_count: number;
          name: string;
          tier: string;
          total_photos: number;
          trip_end_date: string;
          trip_id: string;
          trip_start_date: string;
        }[];
      };
      refresh_chaos_distribution: { Args: never; Returns: undefined };
      submit_confession: {
        Args: { p_confession: string; p_trip_id: string };
        Returns: Json;
      };
      upsert_user_archetype: {
        Args: {
          p_archetype_tag: string;
          p_chaos_rating: number;
          p_role_title: string;
          p_trip_destination: string;
          p_trip_id: string;
          p_trip_name: string;
          p_trip_year: number;
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
