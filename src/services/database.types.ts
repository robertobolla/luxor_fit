// Tipos de base de datos generados por Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          age: number
          height: number
          weight: number
          fitness_level: string
          goals: string[]
          available_days: number
          equipment: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          age: number
          height: number
          weight: number
          fitness_level: string
          goals: string[]
          available_days: number
          equipment: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          age?: number
          height?: number
          weight?: number
          fitness_level?: string
          goals?: string[]
          available_days?: number
          equipment?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          activity_name: string
          date: string
          duration_minutes: number
          distance_km: number | null
          calories: number | null
          notes: string | null
          average_speed_kmh: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          activity_name: string
          date: string
          duration_minutes: number
          distance_km?: number | null
          calories?: number | null
          notes?: string | null
          average_speed_kmh?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          activity_name?: string
          date?: string
          duration_minutes?: number
          distance_km?: number | null
          calories?: number | null
          notes?: string | null
          average_speed_kmh?: number | null
          created_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          duration_minutes: number
          difficulty: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description: string
          duration_minutes: number
          difficulty: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          duration_minutes?: number
          difficulty?: number
          created_at?: string
          updated_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          sets: number
          reps: string
          weight: number | null
          rest_seconds: number
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          sets: number
          reps: string
          weight?: number | null
          rest_seconds: number
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_id?: string
          sets?: number
          reps?: string
          weight?: number | null
          rest_seconds?: number
          order?: number
          created_at?: string
        }
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          workout_id: string
          started_at: string
          completed_at: string | null
          total_duration_minutes: number | null
          notes: string | null
          rpe: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workout_id: string
          started_at: string
          completed_at?: string | null
          total_duration_minutes?: number | null
          notes?: string | null
          rpe?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workout_id?: string
          started_at?: string
          completed_at?: string | null
          total_duration_minutes?: number | null
          notes?: string | null
          rpe?: number | null
          created_at?: string
        }
      }
      exercise_sessions: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      set_sessions: {
        Row: {
          id: string
          exercise_session_id: string
          reps_completed: number
          weight_used: number | null
          duration_seconds: number | null
          rpe: number | null
          rest_taken_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          exercise_session_id: string
          reps_completed: number
          weight_used?: number | null
          duration_seconds?: number | null
          rpe?: number | null
          rest_taken_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          exercise_session_id?: string
          reps_completed?: number
          weight_used?: number | null
          duration_seconds?: number | null
          rpe?: number | null
          rest_taken_seconds?: number | null
          created_at?: string
        }
      }
      progress_data: {
        Row: {
          id: string
          user_id: string
          date: string
          weight: number | null
          body_fat_percentage: number | null
          measurements: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight?: number | null
          body_fat_percentage?: number | null
          measurements?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight?: number | null
          body_fat_percentage?: number | null
          measurements?: Json | null
          notes?: string | null
          created_at?: string
        }
      }
      ai_recommendations: {
        Row: {
          id: string
          user_id: string
          type: string
          exercise_id: string | null
          workout_id: string | null
          current_value: number
          recommended_value: number
          reason: string
          confidence: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          exercise_id?: string | null
          workout_id?: string | null
          current_value: number
          recommended_value: number
          reason: string
          confidence: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          exercise_id?: string | null
          workout_id?: string | null
          current_value?: number
          recommended_value?: number
          reason?: string
          confidence?: number
          created_at?: string
        }
      }
      workout_plans: {
        Row: {
          id: string
          user_id: string
          plan_name: string
          description: string
          duration_weeks: number
          plan_data: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_name: string
          description: string
          duration_weeks: number
          plan_data: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_name?: string
          description?: string
          duration_weeks?: number
          plan_data?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      workout_completions: {
        Row: {
          id: string
          user_id: string
          workout_plan_id: string
          day_name: string
          completed_at: string
          exercises_completed: Json
          duration_minutes: number | null
          difficulty_rating: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workout_plan_id: string
          day_name: string
          completed_at: string
          exercises_completed: Json
          duration_minutes?: number | null
          difficulty_rating: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workout_plan_id?: string
          day_name?: string
          completed_at?: string
          exercises_completed?: Json
          duration_minutes?: number | null
          difficulty_rating?: number
          notes?: string | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string | null
          name: string | null
          age: number | null
          gender: string | null
          height: number | null
          weight: number | null
          body_fat_percentage: number | null
          muscle_percentage: number | null
          fitness_level: string | null
          goals: string[] | null
          activity_types: string[] | null
          available_days: number | null
          session_duration: number | null
          equipment: string[] | null
          birthdate: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          name?: string | null
          age?: number | null
          gender?: string | null
          height?: number | null
          weight?: number | null
          body_fat_percentage?: number | null
          muscle_percentage?: number | null
          fitness_level?: string | null
          goals?: string[] | null
          activity_types?: string[] | null
          available_days?: number | null
          session_duration?: number | null
          equipment?: string[] | null
          birthdate?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          name?: string | null
          age?: number | null
          gender?: string | null
          height?: number | null
          weight?: number | null
          body_fat_percentage?: number | null
          muscle_percentage?: number | null
          fitness_level?: string | null
          goals?: string[] | null
          activity_types?: string[] | null
          available_days?: number | null
          session_duration?: number | null
          equipment?: string[] | null
          birthdate?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      nutrition_profiles: {
        Row: {
          id: string
          user_id: string
          meals_per_day: number
          fasting_window: string | null
          custom_prompts: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          meals_per_day?: number
          fasting_window?: string | null
          custom_prompts?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          meals_per_day?: number
          fasting_window?: string | null
          custom_prompts?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      nutrition_targets: {
        Row: {
          id: string
          user_id: string
          date: string
          calories: number
          protein_g: number
          carbs_g: number
          fats_g: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          calories: number
          protein_g: number
          carbs_g: number
          fats_g: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fats_g?: number
          created_at?: string
          updated_at?: string
        }
      }
      meal_plans: {
        Row: {
          id: string
          user_id: string
          week_start: string
          plan_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          plan_json: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          plan_json?: Json
          created_at?: string
          updated_at?: string
        }
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          datetime: string
          meal_type: string
          item_json: Json
          calories: number
          protein_g: number
          carbs_g: number
          fats_g: number
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          datetime: string
          meal_type: string
          item_json: Json
          calories: number
          protein_g: number
          carbs_g: number
          fats_g: number
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          datetime?: string
          meal_type?: string
          item_json?: Json
          calories?: number
          protein_g?: number
          carbs_g?: number
          fats_g?: number
          photo_url?: string | null
          created_at?: string
        }
      }
      hydration_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          water_ml: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          water_ml: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          water_ml?: number
          created_at?: string
          updated_at?: string
        }
      }
      body_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number
          body_fat_percentage: number | null
          muscle_percentage: number | null
          waist_cm: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight_kg: number
          body_fat_percentage?: number | null
          muscle_percentage?: number | null
          waist_cm?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight_kg?: number
          body_fat_percentage?: number | null
          muscle_percentage?: number | null
          waist_cm?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      progress_photos: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          photo_date: string
          photo_type: string
          weight_kg: number | null
          notes: string | null
          ai_analysis: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          photo_date: string
          photo_type: string
          weight_kg?: number | null
          notes?: string | null
          ai_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_url?: string
          photo_date?: string
          photo_type?: string
          weight_kg?: number | null
          notes?: string | null
          ai_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      nutrition_lessons: {
        Row: {
          id: number
          title: string
          content: string
          lesson_type: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          content: string
          lesson_type: string
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          content?: string
          lesson_type?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      lesson_completions: {
        Row: {
          id: string
          user_id: string
          lesson_id: number
          completed_at: string
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: number
          completed_at: string
          score: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: number
          completed_at?: string
          score?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
