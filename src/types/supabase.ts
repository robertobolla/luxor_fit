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
      admin_roles: {
        Row: {
          annual_fee: number | null
          commission_per_subscription: number | null
          commission_type: string | null
          created_at: string | null
          created_by: string | null
          discount_code: string | null
          discount_description: string | null
          discount_percentage: number | null
          email: string | null
          free_access: boolean | null
          gym_address: string | null
          gym_contact_email: string | null
          gym_name: string | null
          gym_phone: string | null
          id: string
          is_active: boolean | null
          last_payment_date: string | null
          max_users: number | null
          monthly_fee: number | null
          name: string | null
          notes: string | null
          payment_notes: string | null
          permissions: Json | null
          referral_stats: Json | null
          role_type: string
          total_earnings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          annual_fee?: number | null
          commission_per_subscription?: number | null
          commission_type?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_code?: string | null
          discount_description?: string | null
          discount_percentage?: number | null
          email?: string | null
          free_access?: boolean | null
          gym_address?: string | null
          gym_contact_email?: string | null
          gym_name?: string | null
          gym_phone?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          max_users?: number | null
          monthly_fee?: number | null
          name?: string | null
          notes?: string | null
          payment_notes?: string | null
          permissions?: Json | null
          referral_stats?: Json | null
          role_type: string
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          annual_fee?: number | null
          commission_per_subscription?: number | null
          commission_type?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_code?: string | null
          discount_description?: string | null
          discount_percentage?: number | null
          email?: string | null
          free_access?: boolean | null
          gym_address?: string | null
          gym_contact_email?: string | null
          gym_name?: string | null
          gym_phone?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          max_users?: number | null
          monthly_fee?: number | null
          name?: string | null
          notes?: string | null
          payment_notes?: string | null
          permissions?: Json | null
          referral_stats?: Json | null
          role_type?: string
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          arms_cm: number | null
          body_fat_percentage: number | null
          chest_cm: number | null
          created_at: string | null
          hips_cm: number | null
          id: string
          measured_at: string
          muscle_percentage: number | null
          notes: string | null
          source: string | null
          thighs_cm: number | null
          updated_at: string | null
          user_id: string
          waist_cm: number | null
          weight_kg: number
        }
        Insert: {
          arms_cm?: number | null
          body_fat_percentage?: number | null
          chest_cm?: number | null
          created_at?: string | null
          hips_cm?: number | null
          id?: string
          measured_at?: string
          muscle_percentage?: number | null
          notes?: string | null
          source?: string | null
          thighs_cm?: number | null
          updated_at?: string | null
          user_id: string
          waist_cm?: number | null
          weight_kg: number
        }
        Update: {
          arms_cm?: number | null
          body_fat_percentage?: number | null
          chest_cm?: number | null
          created_at?: string | null
          hips_cm?: number | null
          id?: string
          measured_at?: string
          muscle_percentage?: number | null
          notes?: string | null
          source?: string | null
          thighs_cm?: number | null
          updated_at?: string | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      body_metrics: {
        Row: {
          body_fat_percentage: number | null
          created_at: string | null
          date: string
          hips_cm: number | null
          id: string
          muscle_percentage: number | null
          notes: string | null
          user_id: string
          waist_cm: number | null
          weight_kg: number
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string | null
          date: string
          hips_cm?: number | null
          id?: string
          muscle_percentage?: number | null
          notes?: string | null
          user_id: string
          waist_cm?: number | null
          weight_kg: number
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string | null
          date?: string
          hips_cm?: number | null
          id?: string
          muscle_percentage?: number | null
          notes?: string | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      discount_code_usage: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_code: string
          id: string
          is_free_access: boolean | null
          partner_id: string | null
          stripe_session_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_code: string
          id?: string
          is_free_access?: boolean | null
          partner_id?: string | null
          stripe_session_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_code?: string
          id?: string
          is_free_access?: boolean | null
          partner_id?: string | null
          stripe_session_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "empresario_stats"
            referencedColumns: ["empresario_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_active_users"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_payments_summary"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "v_user_subscription"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_discount_code_usage_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_discount_code_usage_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          created_at: string
          day_name: string | null
          duration_seconds: number | null
          exercise_id: string
          exercise_name: string | null
          id: string
          notes: string | null
          reps: number | null
          rir: number | null
          set_number: number
          user_id: string
          weight_kg: number | null
          workout_plan_id: string | null
          workout_session_id: string | null
        }
        Insert: {
          created_at?: string
          day_name?: string | null
          duration_seconds?: number | null
          exercise_id: string
          exercise_name?: string | null
          id?: string
          notes?: string | null
          reps?: number | null
          rir?: number | null
          set_number: number
          user_id: string
          weight_kg?: number | null
          workout_plan_id?: string | null
          workout_session_id?: string | null
        }
        Update: {
          created_at?: string
          day_name?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          exercise_name?: string | null
          id?: string
          notes?: string | null
          reps?: number | null
          rir?: number | null
          set_number?: number
          user_id?: string
          weight_kg?: number | null
          workout_plan_id?: string | null
          workout_session_id?: string | null
        }
        Relationships: []
      }
      exercise_videos: {
        Row: {
          activity_types: string[] | null
          canonical_name: string
          category: string | null
          created_at: string | null
          description: string | null
          equipment: string[] | null
          equipment_alternatives: string[] | null
          exercise_type: string | null
          goals: string[] | null
          id: string
          is_primary: boolean | null
          is_storage_video: boolean | null
          key_points: string[] | null
          language: string | null
          movement_type: string | null
          muscle_zones: string[] | null
          muscles: string[] | null
          name_variations: string[] | null
          priority: number | null
          storage_path: string | null
          thumbnail_url: string | null
          updated_at: string | null
          uses_time: boolean | null
          video_url: string | null
        }
        Insert: {
          activity_types?: string[] | null
          canonical_name: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          equipment_alternatives?: string[] | null
          exercise_type?: string | null
          goals?: string[] | null
          id?: string
          is_primary?: boolean | null
          is_storage_video?: boolean | null
          key_points?: string[] | null
          language?: string | null
          movement_type?: string | null
          muscle_zones?: string[] | null
          muscles?: string[] | null
          name_variations?: string[] | null
          priority?: number | null
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uses_time?: boolean | null
          video_url?: string | null
        }
        Update: {
          activity_types?: string[] | null
          canonical_name?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          equipment_alternatives?: string[] | null
          exercise_type?: string | null
          goals?: string[] | null
          id?: string
          is_primary?: boolean | null
          is_storage_video?: boolean | null
          key_points?: string[] | null
          language?: string | null
          movement_type?: string | null
          muscle_zones?: string[] | null
          muscles?: string[] | null
          name_variations?: string[] | null
          priority?: number | null
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uses_time?: boolean | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          activity_name: string
          activity_type: string
          average_speed_kmh: number | null
          calories: number | null
          created_at: string | null
          date: string
          distance_km: number | null
          duration_minutes: number
          has_gps: boolean
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_name: string
          activity_type: string
          average_speed_kmh?: number | null
          calories?: number | null
          created_at?: string | null
          date: string
          distance_km?: number | null
          duration_minutes: number
          has_gps?: boolean
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_name?: string
          activity_type?: string
          average_speed_kmh?: number | null
          calories?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number
          has_gps?: boolean
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gym_members: {
        Row: {
          created_at: string | null
          email: string | null
          empresario_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          left_at: string | null
          notes: string | null
          subscription_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          empresario_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          notes?: string | null
          subscription_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          empresario_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          notes?: string | null
          subscription_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "empresario_stats"
            referencedColumns: ["empresario_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "partner_active_users"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "partner_payments_summary"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["partner_user_id"]
          },
        ]
      }
      gym_messages: {
        Row: {
          created_at: string | null
          empresario_id: string
          id: string
          message_body: string
          message_title: string
          recipient_ids: string[] | null
          recipient_type: string
          sender_name: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresario_id: string
          id?: string
          message_body: string
          message_title: string
          recipient_ids?: string[] | null
          recipient_type: string
          sender_name: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresario_id?: string
          id?: string
          message_body?: string
          message_title?: string
          recipient_ids?: string[] | null
          recipient_type?: string
          sender_name?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      health_data_daily: {
        Row: {
          active_minutes: number | null
          calories: number | null
          created_at: string | null
          date: string
          distance_km: number | null
          id: string
          steps: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          calories?: number | null
          created_at?: string | null
          date: string
          distance_km?: number | null
          id?: string
          steps?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          calories?: number | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          id?: string
          steps?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          user_id: string
          water_ml: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          user_id: string
          water_ml: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          user_id?: string
          water_ml?: number
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          lesson_id: number
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          lesson_id: number
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          lesson_id?: number
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_md: string
          created_at: string | null
          id: number
          quiz_json: Json | null
          slug: string
          title: string
        }
        Insert: {
          content_md: string
          created_at?: string | null
          id?: number
          quiz_json?: Json | null
          slug: string
          title: string
        }
        Update: {
          content_md?: string
          created_at?: string | null
          id?: number
          quiz_json?: Json | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string | null
          datetime: string
          fats_g: number
          id: string
          item_json: Json
          meal_type: string
          photo_url: string | null
          protein_g: number
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g: number
          created_at?: string | null
          datetime: string
          fats_g: number
          id?: string
          item_json: Json
          meal_type: string
          photo_url?: string | null
          protein_g: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string | null
          datetime?: string
          fats_g?: number
          id?: string
          item_json?: Json
          meal_type?: string
          photo_url?: string | null
          protein_g?: number
          user_id?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string | null
          id: string
          plan_json: Json
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_json: Json
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_json?: Json
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean | null
          message_text: string
          message_type: string
          receiver_id: string
          sender_id: string
          workout_plan_id: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message_text: string
          message_type?: string
          receiver_id: string
          sender_id: string
          workout_plan_id?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message_text?: string
          message_type?: string
          receiver_id?: string
          sender_id?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_profiles: {
        Row: {
          activity_level: string | null
          current_weight_kg: number | null
          custom_prompts: string[] | null
          fasting_window: string | null
          meals_per_day: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          current_weight_kg?: number | null
          custom_prompts?: string[] | null
          fasting_window?: string | null
          meals_per_day?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          current_weight_kg?: number | null
          custom_prompts?: string[] | null
          fasting_window?: string | null
          meals_per_day?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string | null
          date: string
          fats_g: number
          id: string
          notes: string | null
          protein_g: number
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g: number
          created_at?: string | null
          date: string
          fats_g: number
          id?: string
          notes?: string | null
          protein_g: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string | null
          date?: string
          fats_g?: number
          id?: string
          notes?: string | null
          protein_g?: number
          user_id?: string
        }
        Relationships: []
      }
      partner_payments: {
        Row: {
          active_subscriptions_count: number
          amount: number
          commission_per_subscription: number
          commission_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          notes: string | null
          partner_email: string | null
          partner_id: string
          partner_name: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end_date: string
          period_start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active_subscriptions_count?: number
          amount: number
          commission_per_subscription: number
          commission_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          partner_email?: string | null
          partner_id: string
          partner_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end_date: string
          period_start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active_subscriptions_count?: number
          amount?: number
          commission_per_subscription?: number
          commission_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          partner_email?: string | null
          partner_id?: string
          partner_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end_date?: string
          period_start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "empresario_stats"
            referencedColumns: ["empresario_id"]
          },
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_active_users"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_payments_summary"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "partner_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["partner_user_id"]
          },
        ]
      }
      payment_history: {
        Row: {
          cancel_reason: string | null
          canceled_by: string | null
          canceled_date: string | null
          created_at: string | null
          currency: string | null
          id: string
          last_payment_date: string | null
          monthly_amount: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_data: Json | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          total_paid: number | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          cancel_reason?: string | null
          canceled_by?: string | null
          canceled_date?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          last_payment_date?: string | null
          monthly_amount: number
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_data?: Json | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          total_paid?: number | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          cancel_reason?: string | null
          canceled_by?: string | null
          canceled_date?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          last_payment_date?: string | null
          monthly_amount?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_data?: Json | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          total_paid?: number | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          created_at: string | null
          date: string
          day_name: string | null
          exercise_name: string
          id: string
          is_pr: boolean | null
          notes: string | null
          reps: number
          sets: number | null
          updated_at: string | null
          user_id: string
          weight_kg: number
          workout_plan_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          day_name?: string | null
          exercise_name: string
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          reps: number
          sets?: number | null
          updated_at?: string | null
          user_id: string
          weight_kg: number
          workout_plan_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          day_name?: string | null
          exercise_name?: string
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          reps?: number
          sets?: number | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number
          workout_plan_id?: string | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          id: string
          notes: string | null
          photo_date: string
          photo_type: string | null
          photo_url: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_date: string
          photo_type?: string | null
          photo_url: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_type?: string | null
          photo_url?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      shared_workouts: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
          workout_plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
          workout_plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_workouts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          monthly_amount: number | null
          platform: string | null
          product_identifier: string | null
          revenuecat_customer_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_amount?: number | null
          platform?: string | null
          product_identifier?: string | null
          revenuecat_customer_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_amount?: number | null
          platform?: string | null
          product_identifier?: string | null
          revenuecat_customer_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trainer_permissions: {
        Row: {
          can_edit_workouts: boolean | null
          can_view_body_metrics: boolean | null
          can_view_nutrition: boolean | null
          can_view_progress_photos: boolean | null
          can_view_steps: boolean | null
          can_view_workouts: boolean | null
          created_at: string
          id: string
          relationship_id: string
          updated_at: string
        }
        Insert: {
          can_edit_workouts?: boolean | null
          can_view_body_metrics?: boolean | null
          can_view_nutrition?: boolean | null
          can_view_progress_photos?: boolean | null
          can_view_steps?: boolean | null
          can_view_workouts?: boolean | null
          created_at?: string
          id?: string
          relationship_id: string
          updated_at?: string
        }
        Update: {
          can_edit_workouts?: boolean | null
          can_view_body_metrics?: boolean | null
          can_view_nutrition?: boolean | null
          can_view_progress_photos?: boolean | null
          can_view_steps?: boolean | null
          can_view_workouts?: boolean | null
          created_at?: string
          id?: string
          relationship_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_permissions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "trainer_student_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_permissions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "trainer_students_view"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_student_relationships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          status: string
          student_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          status?: string
          student_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          status?: string
          student_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          chat_id: string
          id: string
          is_typing: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          related_id: string | null
          sender_name: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          related_id?: string | null
          sender_name?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          related_id?: string | null
          sender_name?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_types: string[] | null
          age: number | null
          available_days: number | null
          body_fat_percentage: number | null
          created_at: string | null
          email: string | null
          equipment: string[] | null
          fitness_level: string | null
          gender: string | null
          goals: string[] | null
          height: number | null
          id: string
          muscle_percentage: number | null
          name: string | null
          profile_photo_url: string | null
          session_duration: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          weight: number | null
        }
        Insert: {
          activity_types?: string[] | null
          age?: number | null
          available_days?: number | null
          body_fat_percentage?: number | null
          created_at?: string | null
          email?: string | null
          equipment?: string[] | null
          fitness_level?: string | null
          gender?: string | null
          goals?: string[] | null
          height?: number | null
          id?: string
          muscle_percentage?: number | null
          name?: string | null
          profile_photo_url?: string | null
          session_duration?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          weight?: number | null
        }
        Update: {
          activity_types?: string[] | null
          age?: number | null
          available_days?: number | null
          body_fat_percentage?: number | null
          created_at?: string | null
          email?: string | null
          equipment?: string[] | null
          fitness_level?: string | null
          gender?: string | null
          goals?: string[] | null
          height?: number | null
          id?: string
          muscle_percentage?: number | null
          name?: string | null
          profile_photo_url?: string | null
          session_duration?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          push_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          push_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          push_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workout_completions: {
        Row: {
          completed_at: string
          created_at: string | null
          day_name: string
          difficulty_rating: number | null
          duration_minutes: number | null
          exercises_completed: Json | null
          id: string
          notes: string | null
          user_id: string
          workout_plan_id: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string | null
          day_name: string
          difficulty_rating?: number | null
          duration_minutes?: number | null
          exercises_completed?: Json | null
          id?: string
          notes?: string | null
          user_id: string
          workout_plan_id?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string | null
          day_name?: string
          difficulty_rating?: number | null
          duration_minutes?: number | null
          exercises_completed?: Json | null
          id?: string
          notes?: string | null
          user_id?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_workout_plan"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_completions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          activated_at: string | null
          adaptation_prompt: string | null
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          is_active: boolean | null
          last_week_monday: string | null
          parent_plan_id: string | null
          plan_data: Json
          plan_name: string
          times_repeated: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          adaptation_prompt?: string | null
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          last_week_monday?: string | null
          parent_plan_id?: string | null
          plan_data: Json
          plan_name: string
          times_repeated?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          adaptation_prompt?: string | null
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          last_week_monday?: string | null
          parent_plan_id?: string | null
          plan_data?: Json
          plan_name?: string
          times_repeated?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_parent_plan_id_fkey"
            columns: ["parent_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      empresario_stats: {
        Row: {
          active_members: number | null
          annual_fee: number | null
          empresario_email: string | null
          empresario_id: string | null
          empresario_name: string | null
          gym_name: string | null
          max_users: number | null
          members_with_access: number | null
          monthly_fee: number | null
          new_members_30d: number | null
          total_members: number | null
        }
        Relationships: []
      }
      partner_active_users: {
        Row: {
          code_used_at: string | null
          discount_code: string | null
          is_active: boolean | null
          partner_email: string | null
          partner_name: string | null
          partner_user_id: string | null
          referred_user_email: string | null
          referred_user_id: string | null
          referred_user_name: string | null
          subscription_created_at: string | null
          subscription_end_date: string | null
          subscription_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_discount_code_usage_user"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_discount_code_usage_user"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      partner_payments_summary: {
        Row: {
          active_subscriptions: number | null
          commission_per_subscription: number | null
          commission_type: string | null
          discount_code: string | null
          last_payment_date: string | null
          partner_email: string | null
          partner_name: string | null
          partner_user_id: string | null
          payments_count: number | null
          pending_payments: number | null
          total_earnings: number | null
          total_paid: number | null
          total_referrals: number | null
        }
        Relationships: []
      }
      partner_referrals: {
        Row: {
          discount_code: string | null
          discount_percentage: number | null
          is_active_subscription: boolean | null
          partner_email: string | null
          partner_name: string | null
          partner_user_id: string | null
          referral_date: string | null
          referred_user_email: string | null
          referred_user_id: string | null
          referred_user_name: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_discount_code_usage_user"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_discount_code_usage_user"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trainer_students_view: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          student_photo: string | null
          student_username: string | null
          trainer_id: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          discount_code: string | null
          email: string | null
          empresario_id: string | null
          empresario_name: string | null
          is_admin_active: boolean | null
          name: string | null
          partner_id: string | null
          partner_name: string | null
          profile_photo_url: string | null
          role_type: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "empresario_stats"
            referencedColumns: ["empresario_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_active_users"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_payments_summary"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "discount_code_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "empresario_stats"
            referencedColumns: ["empresario_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "partner_active_users"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "partner_payments_summary"
            referencedColumns: ["partner_user_id"]
          },
          {
            foreignKeyName: "gym_members_empresario_id_fkey"
            columns: ["empresario_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["partner_user_id"]
          },
        ]
      }
      v_user_subscription: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          current_period_start: string | null
          is_active: boolean | null
          is_gym_member: boolean | null
          platform: string | null
          product_identifier: string | null
          status: string | null
          subscription_source: string | null
          trial_end: string | null
          trial_start: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          current_period_start?: string | null
          is_active?: never
          is_gym_member?: never
          platform?: string | null
          product_identifier?: string | null
          status?: string | null
          subscription_source?: never
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          current_period_start?: string | null
          is_active?: never
          is_gym_member?: never
          platform?: string | null
          product_identifier?: string | null
          status?: string | null
          subscription_source?: never
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_workout_plan: {
        Args: { p_plan_id: string; p_user_id: string }
        Returns: undefined
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_partner_earnings: {
        Args: { partner_user_id: string }
        Returns: Json
      }
      calculate_weekly_changes: {
        Args: { p_user_id: string }
        Returns: {
          body_fat_change: number
          muscle_change: number
          weeks_tracked: number
          weight_change_kg: number
        }[]
      }
      cleanup_old_typing_indicators: { Args: never; Returns: undefined }
      count_empresario_active_members: {
        Args: { p_empresario_id: string }
        Returns: number
      }
      find_exercise_video: {
        Args: { exercise_name: string }
        Returns: {
          canonical_name: string
          description: string
          is_storage_video: boolean
          key_points: string[]
          storage_path: string
          thumbnail_url: string
          video_url: string
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_empresario_dashboard_stats: {
        Args: { p_empresario_id: string }
        Returns: Json
      }
      get_empresario_messages_history: {
        Args: { p_empresario_id: string; p_limit?: number }
        Returns: {
          id: string
          message_body: string
          message_title: string
          recipient_count: number
          recipient_type: string
          sender_name: string
          sent_at: string
        }[]
      }
      get_empresario_users: {
        Args: { p_empresario_id: string }
        Returns: {
          email: string
          is_active: boolean
          joined_at: string
          name: string
          subscription_expires_at: string
          user_id: string
        }[]
      }
      get_gym_empresario: { Args: { check_user_id: string }; Returns: string }
      get_last_muscle_workout_sets: {
        Args: {
          p_current_session_id?: string
          p_exercise_id: string
          p_user_id: string
        }
        Returns: {
          duration_seconds: number
          reps: number
          set_number: number
          weight_kg: number
        }[]
      }
      get_latest_body_measurement: {
        Args: { p_user_id: string }
        Returns: {
          body_fat_percentage: number
          id: string
          measured_at: string
          muscle_percentage: number
          weight_kg: number
        }[]
      }
      get_partner_active_users_list: {
        Args: { partner_user_id: string }
        Returns: {
          code_used_at: string
          days_active: number
          is_active: boolean
          referred_user_email: string
          referred_user_id: string
          referred_user_name: string
          subscription_end_date: string
          subscription_status: string
        }[]
      }
      get_partner_active_users_stats: {
        Args: { partner_user_id: string }
        Returns: Json
      }
      get_partner_payment_history: {
        Args: { limit_count?: number; partner_user_id: string }
        Returns: {
          active_subscriptions_count: number
          amount: number
          commission_per_subscription: number
          id: string
          notes: string
          payment_date: string
          payment_reference: string
          period_end_date: string
          period_start_date: string
          status: string
        }[]
      }
      get_partner_referral_stats: {
        Args: { partner_user_id: string }
        Returns: Json
      }
      get_push_tokens_for_users: {
        Args: { p_user_ids: string[] }
        Returns: {
          platform: string
          push_token: string
          user_id: string
        }[]
      }
      get_student_stats: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_student_id: string
          p_trainer_id: string
        }
        Returns: Json
      }
      get_unread_notifications_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_notifications: {
        Args: { p_limit?: number; p_unread_only?: boolean; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string
          sender_name: string
          title: string
        }[]
      }
      get_user_role: { Args: { check_user_id: string }; Returns: string }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin_or_socio: { Args: { check_user_id: string }; Returns: boolean }
      is_gym_member: { Args: { check_user_id: string }; Returns: boolean }
      mark_all_notifications_as_read: {
        Args: { p_user_id: string }
        Returns: number
      }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      respond_to_trainer_invitation: {
        Args: {
          p_accept: boolean
          p_relationship_id: string
          p_student_id: string
        }
        Returns: Json
      }
      send_gym_message: {
        Args: {
          p_empresario_id: string
          p_message_body: string
          p_message_title: string
          p_recipient_ids?: string[]
          p_recipient_type: string
          p_sender_name: string
        }
        Returns: Json
      }
      send_trainer_invitation: {
        Args: { p_student_username: string; p_trainer_id: string }
        Returns: Json
      }
      sync_revenuecat_subscription: {
        Args: {
          p_expiration_date: string
          p_platform?: string
          p_product_identifier: string
          p_revenuecat_customer_id: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
    Enums: {},
  },
} as const
