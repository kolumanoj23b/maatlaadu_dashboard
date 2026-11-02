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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      learning_topics: {
        Row: {
          created_at: string | null
          description_english: string
          description_telugu: string
          id: string
          is_coming_soon: boolean
          sort_order: number
          title_english: string
          title_telugu: string
          word_count: number
        }
        Insert: {
          created_at?: string | null
          description_english: string
          description_telugu: string
          id: string
          is_coming_soon?: boolean
          sort_order?: number
          title_english: string
          title_telugu: string
          word_count?: number
        }
        Update: {
          created_at?: string | null
          description_english?: string
          description_telugu?: string
          id?: string
          is_coming_soon?: boolean
          sort_order?: number
          title_english?: string
          title_telugu?: string
          word_count?: number
        }
        Relationships: []
      }
      practice_history: {
        Row: {
          attempted_at: string
          correct: boolean
          id: string
          practice_item_id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          correct: boolean
          id?: string
          practice_item_id: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          correct?: boolean
          id?: string
          practice_item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_items: {
        Row: {
          content_type: string
          created_at: string
          difficulty: string
          english_text: string
          explanation: string | null
          id: string
          level: string
          sort_order: number | null
          telugu_text: string
        }
        Insert: {
          content_type: string
          created_at?: string
          difficulty: string
          english_text: string
          explanation?: string | null
          id: string
          level: string
          sort_order?: number | null
          telugu_text: string
        }
        Update: {
          content_type?: string
          created_at?: string
          difficulty?: string
          english_text?: string
          explanation?: string | null
          id?: string
          level?: string
          sort_order?: number | null
          telugu_text?: string
        }
        Relationships: []
      }
      practice_progress: {
        Row: {
          attempts: number
          completed: boolean
          correct: boolean
          last_attempted_at: string
          practice_item_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed?: boolean
          correct?: boolean
          last_attempted_at?: string
          practice_item_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed?: boolean
          correct?: boolean
          last_attempted_at?: string
          practice_item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_level: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          last_active_at: string | null
          learning_streak: number
          level: string
          name: string | null
          total_correct_answers: number
          total_practice_count: number
          total_questions: number
          total_xp: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id: string
          last_active_at?: string | null
          learning_streak?: number
          level?: string
          name?: string | null
          total_correct_answers?: number
          total_practice_count?: number
          total_questions?: number
          total_xp?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_active_at?: string | null
          learning_streak?: number
          level?: string
          name?: string | null
          total_correct_answers?: number
          total_practice_count?: number
          total_questions?: number
          total_xp?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed_sentences: number
          completed_words: number
          created_at: string
          current_lesson: number
          id: string
          level: number
          progress_percentage: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          completed_sentences?: number
          completed_words?: number
          created_at?: string
          current_lesson?: number
          id?: string
          level?: number
          progress_percentage?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          completed_sentences?: number
          completed_words?: number
          created_at?: string
          current_lesson?: number
          id?: string
          level?: number
          progress_percentage?: number
          updated_at?: string
          user_id?: string
          xp?: number
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
      user_translations: {
        Row: {
          created_at: string
          english_text: string
          id: string
          telugu_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          english_text: string
          id?: string
          telugu_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          english_text?: string
          id?: string
          telugu_text?: string
          user_id?: string
        }
        Relationships: []
      }
      vocabulary_words: {
        Row: {
          created_at: string | null
          english_word: string
          example_sentence_english: string | null
          example_sentence_telugu: string | null
          id: string
          is_word_of_the_day: boolean | null
          part_of_speech: string | null
          pronunciation_guide: string | null
          telugu_word: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string | null
          english_word: string
          example_sentence_english?: string | null
          example_sentence_telugu?: string | null
          id: string
          is_word_of_the_day?: boolean | null
          part_of_speech?: string | null
          pronunciation_guide?: string | null
          telugu_word: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string | null
          english_word?: string
          example_sentence_english?: string | null
          example_sentence_telugu?: string | null
          id?: string
          is_word_of_the_day?: boolean | null
          part_of_speech?: string | null
          pronunciation_guide?: string | null
          telugu_word?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_words_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "learning_topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_user_streak: {
        Args: { p_timezone?: string; p_user_id: string }
        Returns: {
          current_streak: number
          has_practiced_today: boolean
          longest_streak: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_user_xp: {
        Args: {
          p_correct: number
          p_questions: number
          p_user_id: string
          p_xp: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
