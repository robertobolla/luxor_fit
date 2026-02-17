-- 00_SETUP: Limpieza, Extensiones, Tipos y Secuencias
-- FECHA: 2026-02-17T10:23:16.667Z

SET search_path = public, temp;

-- EXTENSIONS --
CREATE EXTENSION IF NOT EXISTS "http";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";

-- TYPES --
-- SEQUENCES --
CREATE SEQUENCE IF NOT EXISTS public.lessons_id_seq INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647;

-- DROP TABLES (CLEANUP) --
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.workout_completions CASCADE;
DROP TABLE IF EXISTS public.workout_plans CASCADE;
DROP TABLE IF EXISTS public.admin_roles CASCADE;
DROP TABLE IF EXISTS public.gym_members CASCADE;
DROP TABLE IF EXISTS public.typing_indicators CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.progress_photos CASCADE;
DROP TABLE IF EXISTS public.payment_history CASCADE;
DROP TABLE IF EXISTS public.body_measurements CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.shared_workouts CASCADE;
DROP TABLE IF EXISTS public.user_push_tokens CASCADE;
DROP TABLE IF EXISTS public.exercise_sets CASCADE;
DROP TABLE IF EXISTS public.nutrition_plan_meals CASCADE;
DROP TABLE IF EXISTS public.nutrition_plan_meal_foods CASCADE;
DROP TABLE IF EXISTS public.nutrition_plan_weeks CASCADE;
DROP TABLE IF EXISTS public.nutrition_plan_days CASCADE;
DROP TABLE IF EXISTS public.gym_messages CASCADE;
DROP TABLE IF EXISTS public.user_notifications CASCADE;
DROP TABLE IF EXISTS public.partner_monthly_stats CASCADE;
DROP TABLE IF EXISTS public.nutrition_plans CASCADE;
DROP TABLE IF EXISTS public.shared_nutrition_plans CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.body_metrics CASCADE;
DROP TABLE IF EXISTS public.hydration_logs CASCADE;
DROP TABLE IF EXISTS public.meal_logs CASCADE;
DROP TABLE IF EXISTS public.personal_records CASCADE;
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
DROP TABLE IF EXISTS public.nutrition_targets CASCADE;
DROP TABLE IF EXISTS public.meal_plans CASCADE;
DROP TABLE IF EXISTS public.nutrition_profiles CASCADE;
DROP TABLE IF EXISTS public.discount_code_usage CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.exercise_videos CASCADE;
DROP TABLE IF EXISTS public.partner_payments CASCADE;
DROP TABLE IF EXISTS public.trainer_student_relationships CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.partner_offer_campaigns CASCADE;
DROP TABLE IF EXISTS public.offer_code_redemptions CASCADE;
DROP TABLE IF EXISTS public.trainer_permissions CASCADE;
DROP TABLE IF EXISTS public.health_data_daily CASCADE;
DROP TABLE IF EXISTS public.foods CASCADE;

