/**
 * Supabase generated types — manuel hazırlandı (DB erişimi sağlanınca
 * `npm run db:types` ile yeniden üretilebilir).
 */
export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cases: {
        Row: {
          id: string;
          title: string;
          presenting: string;
          diagnosis_hint: string | null;
          background: string;
          personality: string;
          speech_style: string;
          goals_hidden: string;
          difficulty: 'easy' | 'medium' | 'hard';
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          presenting: string;
          diagnosis_hint?: string | null;
          background: string;
          personality: string;
          speech_style: string;
          goals_hidden: string;
          difficulty: 'easy' | 'medium' | 'hard';
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cases']['Insert']>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          case_id: string;
          status: 'in_progress' | 'completed' | 'abandoned';
          started_at: string;
          ended_at: string | null;
          message_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          case_id: string;
          status?: 'in_progress' | 'completed' | 'abandoned';
          started_at?: string;
          ended_at?: string | null;
          message_count?: number;
        };
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'student' | 'client';
          content: string;
          created_at: string;
          token_count: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'student' | 'client';
          content: string;
          created_at?: string;
          token_count?: number | null;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          session_id: string;
          summary: string;
          strengths: Json;
          improvements: Json;
          missed_signals: Json;
          next_steps: string;
          generated_at: string;
          model_version: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          summary: string;
          strengths?: Json;
          improvements?: Json;
          missed_signals?: Json;
          next_steps: string;
          generated_at?: string;
          model_version: string;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
      usage_daily: {
        Row: {
          user_id: string;
          day: string;
          session_count: number;
          token_count: number;
        };
        Insert: {
          user_id: string;
          day?: string;
          session_count?: number;
          token_count?: number;
        };
        Update: Partial<Database['public']['Tables']['usage_daily']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
