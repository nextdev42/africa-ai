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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_color: string
          created_at: string | null
          description: string
          icon: string
          id: string
          points_required: number
          title: string
        }
        Insert: {
          badge_color: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          points_required: number
          title: string
        }
        Update: {
          badge_color?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          points_required?: number
          title?: string
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: Database["public"]["Enums"]["skill_level"] | null
          id: string
          options: Json
          question_text: string
          skill_area: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["skill_level"] | null
          id?: string
          options: Json
          question_text: string
          skill_area: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["skill_level"] | null
          id?: string
          options?: Json
          question_text?: string
          skill_area?: string
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          category: string
          content: string
          created_at: string | null
          description: string
          difficulty: Database["public"]["Enums"]["skill_level"]
          estimated_duration: number
          id: string
          order_index: number
          points_reward: number | null
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          description: string
          difficulty: Database["public"]["Enums"]["skill_level"]
          estimated_duration: number
          id?: string
          order_index: number
          points_reward?: number | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["skill_level"]
          estimated_duration?: number
          id?: string
          order_index?: number
          points_reward?: number | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          last_active_date: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          streak_days: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          last_active_date?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          last_active_date?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string | null
          id: string
          module_id: string
          passing_score: number | null
          points_reward: number | null
          questions: Json
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id: string
          passing_score?: number | null
          points_reward?: number | null
          questions: Json
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string
          passing_score?: number | null
          points_reward?: number | null
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assessments: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          id?: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          user_id?: string
        }
        Relationships: []
      }
      user_module_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean | null
          module_id: string
          progress_percentage: number | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          module_id: string
          progress_percentage?: number | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          module_id?: string
          progress_percentage?: number | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string | null
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          attempted_at?: string | null
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string | null
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      skill_level: "beginner" | "intermediate" | "advanced"
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
      skill_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
