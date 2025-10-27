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
          name: string
          description: string
          muscle_groups: string[]
          equipment_required: string[]
          instructions: string[]
          video_url: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          muscle_groups: string[]
          equipment_required: string[]
          instructions: string[]
          video_url?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          muscle_groups?: string[]
          equipment_required?: string[]
          instructions?: string[]
          video_url?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
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
