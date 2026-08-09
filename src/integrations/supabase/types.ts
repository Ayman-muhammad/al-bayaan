export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description: string | null
          id: string
          metadata: Json
          title: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          metadata?: Json
          title: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          metadata?: Json
          title?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      answers: {
        Row: {
          answer_text: string
          created_at: string
          helpful_count: number
          id: string
          languages: Json
          question_id: string
          scholar_avatar: string | null
          scholar_id: string | null
          scholar_name: string
          source_book: string | null
          source_page: string | null
          source_publisher: string | null
          source_url: string | null
          source_volume: string | null
          source_year: string | null
        }
        Insert: {
          answer_text: string
          created_at?: string
          helpful_count?: number
          id?: string
          languages?: Json
          question_id: string
          scholar_avatar?: string | null
          scholar_id?: string | null
          scholar_name: string
          source_book?: string | null
          source_page?: string | null
          source_publisher?: string | null
          source_url?: string | null
          source_volume?: string | null
          source_year?: string | null
        }
        Update: {
          answer_text?: string
          created_at?: string
          helpful_count?: number
          id?: string
          languages?: Json
          question_id?: string
          scholar_avatar?: string | null
          scholar_id?: string | null
          scholar_name?: string
          source_book?: string | null
          source_page?: string | null
          source_publisher?: string | null
          source_url?: string | null
          source_volume?: string | null
          source_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_scholar_id_fkey"
            columns: ["scholar_id"]
            isOneToOne: false
            referencedRelation: "scholars"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          content: Json
          created_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      circle_activity: {
        Row: {
          action: string
          circle_id: string
          created_at: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          circle_id: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          circle_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_activity_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_progress: {
        Row: {
          circle_id: string
          goal_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
          verse_number: number
        }
        Insert: {
          circle_id: string
          goal_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          verse_number: number
        }
        Update: {
          circle_id?: string
          goal_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "circle_progress_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          max_members: number
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string | null
          max_members?: number
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          max_members?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cycle_activities: {
        Row: {
          activity_type: string
          assigned_members: string[]
          created_at: string
          cycle_id: string
          description: string | null
          dhikr_target: number | null
          end_ayah: number | null
          id: string
          start_ayah: number | null
          surah_number: number | null
          time_slot: string
          title: string
        }
        Insert: {
          activity_type: string
          assigned_members?: string[]
          created_at?: string
          cycle_id: string
          description?: string | null
          dhikr_target?: number | null
          end_ayah?: number | null
          id?: string
          start_ayah?: number | null
          surah_number?: number | null
          time_slot: string
          title: string
        }
        Update: {
          activity_type?: string
          assigned_members?: string[]
          created_at?: string
          cycle_id?: string
          description?: string | null
          dhikr_target?: number | null
          end_ayah?: number | null
          id?: string
          start_ayah?: number | null
          surah_number?: number | null
          time_slot?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_activities_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "family_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_checkins: {
        Row: {
          checkin_date: string
          cycle_id: string
          evening_complete: boolean
          id: string
          morning_complete: boolean
          streak_count: number
        }
        Insert: {
          checkin_date: string
          cycle_id: string
          evening_complete?: boolean
          id?: string
          morning_complete?: boolean
          streak_count?: number
        }
        Update: {
          checkin_date?: string
          cycle_id?: string
          evening_complete?: boolean
          id?: string
          morning_complete?: boolean
          streak_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cycle_checkins_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "family_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_completions: {
        Row: {
          activity_id: string
          completed_at: string
          completed_by: string | null
          completion_date: string
          id: string
          member_id: string | null
        }
        Insert: {
          activity_id: string
          completed_at?: string
          completed_by?: string | null
          completion_date?: string
          id?: string
          member_id?: string | null
        }
        Update: {
          activity_id?: string
          completed_at?: string
          completed_by?: string | null
          completion_date?: string
          id?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_completions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "cycle_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_cycles: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          intention: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_days?: number
          id?: string
          intention: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          intention?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_goal_contributions: {
        Row: {
          amount: number
          circle_id: string
          created_at: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          circle_id: string
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          circle_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_goal_contributions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "family_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      family_goals: {
        Row: {
          circle_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          deadline: string
          goal_type: string
          id: string
          target_amount: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          circle_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deadline: string
          goal_type: string
          id?: string
          target_amount: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          circle_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deadline?: string
          goal_type?: string
          id?: string
          target_amount?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_goals_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar_emoji: string
          color: string
          created_at: string
          cycle_id: string
          id: string
          name: string
          role: string
          sort_order: number
        }
        Insert: {
          avatar_emoji?: string
          color?: string
          created_at?: string
          cycle_id: string
          id?: string
          name: string
          role: string
          sort_order?: number
        }
        Update: {
          avatar_emoji?: string
          color?: string
          created_at?: string
          cycle_id?: string
          id?: string
          name?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_members_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "family_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_reminders: {
        Row: {
          days: string
          evening_enabled: boolean
          evening_offset_minutes: number
          id: string
          morning_enabled: boolean
          morning_offset_minutes: number
          sound: string
          updated_at: string
          user_id: string
        }
        Insert: {
          days?: string
          evening_enabled?: boolean
          evening_offset_minutes?: number
          id?: string
          morning_enabled?: boolean
          morning_offset_minutes?: number
          sound?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          days?: string
          evening_enabled?: boolean
          evening_offset_minutes?: number
          id?: string
          morning_enabled?: boolean
          morning_offset_minutes?: number
          sound?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          circle_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          deadline: string
          end_verse: number
          id: string
          start_verse: number
          surah_number: number
        }
        Insert: {
          circle_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deadline: string
          end_verse: number
          id?: string
          start_verse: number
          surah_number: number
        }
        Update: {
          circle_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deadline?: string
          end_verse?: number
          id?: string
          start_verse?: number
          surah_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      hifz_progress: {
        Row: {
          ayah_number: number
          id: string
          review_due: string | null
          status: string
          streak: number
          surah_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ayah_number: number
          id?: string
          review_due?: string | null
          status?: string
          streak?: number
          surah_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ayah_number?: number
          id?: string
          review_due?: string | null
          status?: string
          streak?: number
          surah_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hifz_sessions: {
        Row: {
          ayahs_practiced: number
          created_at: string
          id: string
          score: number | null
          session_date: string
          surah_number: number
          user_id: string
        }
        Insert: {
          ayahs_practiced?: number
          created_at?: string
          id?: string
          score?: number | null
          session_date?: string
          surah_number: number
          user_id: string
        }
        Update: {
          ayahs_practiced?: number
          created_at?: string
          id?: string
          score?: number | null
          session_date?: string
          surah_number?: number
          user_id?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          active: boolean
          created_at: string
          desc_ar: string
          desc_en: string
          embed_params: string
          external_url: string | null
          id: string
          label_ar: string
          label_en: string
          slug: string
          sort_order: number
          updated_at: string
          youtube_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          desc_ar?: string
          desc_en?: string
          embed_params?: string
          external_url?: string | null
          id?: string
          label_ar?: string
          label_en: string
          slug: string
          sort_order?: number
          updated_at?: string
          youtube_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          desc_ar?: string
          desc_en?: string
          embed_params?: string
          external_url?: string | null
          id?: string
          label_ar?: string
          label_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          youtube_id?: string
        }
        Relationships: []
      }
      memorization_progress: {
        Row: {
          accuracy_score: number | null
          ayah_from: number
          ayah_to: number
          created_at: string
          id: string
          last_practiced: string | null
          mastered: boolean | null
          repetitions: number
          surah_id: number
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          ayah_from?: number
          ayah_to?: number
          created_at?: string
          id?: string
          last_practiced?: string | null
          mastered?: boolean | null
          repetitions?: number
          surah_id: number
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          ayah_from?: number
          ayah_to?: number
          created_at?: string
          id?: string
          last_practiced?: string | null
          mastered?: boolean | null
          repetitions?: number
          surah_id?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          preferred_language: string | null
          preferred_reciter: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          preferred_language?: string | null
          preferred_reciter?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferred_language?: string | null
          preferred_reciter?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          anonymous: boolean
          category: string
          created_at: string
          id: string
          question_text: string
          status: string
          user_id: string | null
        }
        Insert: {
          anonymous?: boolean
          category: string
          created_at?: string
          id?: string
          question_text: string
          status?: string
          user_id?: string | null
        }
        Update: {
          anonymous?: boolean
          category?: string
          created_at?: string
          id?: string
          question_text?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          completed: boolean | null
          id: string
          last_ayah: number
          surah_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          id?: string
          last_ayah?: number
          surah_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          id?: string
          last_ayah?: number
          surah_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scholars: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          credentials: string
          id: string
          is_active: boolean
          name: string
          specialization: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          credentials: string
          id?: string
          is_active?: boolean
          name: string
          specialization: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          credentials?: string
          id?: string
          is_active?: boolean
          name?: string
          specialization?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event: string
          id: string
          meta: Json
          ua: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          meta?: Json
          ua?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          meta?: Json
          ua?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_quran_prefs: {
        Row: {
          font_family: string
          font_size_level: number
          id: string
          line_spacing: string
          page_theme: string
          reciter_name: string
          show_tafsir: boolean
          show_translation: boolean
          updated_at: string
          user_id: string
          word_spacing: string
        }
        Insert: {
          font_family?: string
          font_size_level?: number
          id?: string
          line_spacing?: string
          page_theme?: string
          reciter_name?: string
          show_tafsir?: boolean
          show_translation?: boolean
          updated_at?: string
          user_id: string
          word_spacing?: string
        }
        Update: {
          font_family?: string
          font_size_level?: number
          id?: string
          line_spacing?: string
          page_theme?: string
          reciter_name?: string
          show_tafsir?: boolean
          show_translation?: boolean
          updated_at?: string
          user_id?: string
          word_spacing?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          ayahs_read: number
          created_at: string
          current_streak: number
          days_active: number
          family_goals_met: number
          id: string
          last_active_date: string | null
          longest_streak: number
          recitations_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ayahs_read?: number
          created_at?: string
          current_streak?: number
          days_active?: number
          family_goals_met?: number
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          recitations_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ayahs_read?: number
          created_at?: string
          current_streak?: number
          days_active?: number
          family_goals_met?: number
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          recitations_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_family_circle: {
        Args: { _max_members?: number; _name: string }
        Returns: {
          circle_id: string
          invite_code: string
        }[]
      }
      ensure_user_records: {
        Args: { _display_name?: string }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      get_circle_invite_code: { Args: { _circle_id: string }; Returns: string }
      get_family_leaderboard: {
        Args: { _circle_id: string }
        Returns: {
          avatar_url: string
          contributions: number
          display_name: string
          total_amount: number
          user_id: string
        }[]
      }
      get_my_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_circle_admin: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_circle_member: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      join_circle_by_code: { Args: { _code: string }; Returns: string }
      unlock_achievement: {
        Args: {
          _code: string
          _description?: string
          _metadata?: Json
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
