-- 01_TABLES: Creación de Tablas
SET search_path = public, temp;

-- TABLA: exercises
DROP TABLE IF EXISTS public.exercises CASCADE;
CREATE TABLE public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  activity_type text NOT NULL,
  activity_name text NOT NULL,
  date date NOT NULL,
  duration_minutes integer NOT NULL,
  distance_km numeric,
  calories integer,
  notes text,
  has_gps boolean NOT NULL DEFAULT false,
  average_speed_kmh numeric,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  route_points jsonb,
  elevation_gain integer,
  elevation_loss integer,
  PRIMARY KEY (id)
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- TABLA: workout_completions
DROP TABLE IF EXISTS public.workout_completions CASCADE;
CREATE TABLE public.workout_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_plan_id uuid,
  day_name text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  exercises_completed jsonb,
  duration_minutes integer,
  difficulty_rating integer,
  created_at timestamp with time zone DEFAULT now(),
  user_id text,
  PRIMARY KEY (id)
);

ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

-- TABLA: workout_plans
DROP TABLE IF EXISTS public.workout_plans CASCADE;
CREATE TABLE public.workout_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  description text,
  duration_weeks integer,
  plan_data jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  adaptation_prompt text,
  parent_plan_id uuid,
  activated_at timestamp with time zone,
  times_repeated integer DEFAULT 0,
  last_week_monday date,
  user_id text,
  PRIMARY KEY (id)
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- TABLA: admin_roles
DROP TABLE IF EXISTS public.admin_roles CASCADE;
CREATE TABLE public.admin_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  email text,
  role_type text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by text,
  notes text,
  discount_code text,
  discount_description text,
  discount_percentage integer DEFAULT 0,
  free_access boolean DEFAULT false,
  referral_stats jsonb DEFAULT '{}'::jsonb,
  commission_per_subscription numeric DEFAULT 0,
  commission_type text DEFAULT 'fixed'::text,
  total_earnings numeric DEFAULT 0,
  last_payment_date timestamp with time zone,
  payment_notes text,
  monthly_fee numeric,
  max_users integer,
  gym_name text,
  gym_address text,
  gym_phone text,
  gym_contact_email text,
  annual_fee numeric,
  benefit_duration_days integer,
  code_expires_at timestamp with time zone,
  subscription_expires_at timestamp with time zone,
  subscription_started_at timestamp with time zone DEFAULT now(),
  parent_partner_id uuid,
  commission_per_subscription_2nd_level numeric DEFAULT 1.00,
  commission_per_annual_subscription_2nd_level numeric DEFAULT 7.00,
  referred_by text,
  commission_per_annual_subscription numeric DEFAULT 21.00,
  PRIMARY KEY (id)
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- TABLA: gym_members
DROP TABLE IF EXISTS public.gym_members CASCADE;
CREATE TABLE public.gym_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  empresario_id text NOT NULL,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_expires_at timestamp with time zone,
  email text,
  PRIMARY KEY (id)
);

ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

-- TABLA: typing_indicators
DROP TABLE IF EXISTS public.typing_indicators CASCADE;
CREATE TABLE public.typing_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  user_id text NOT NULL,
  is_typing boolean DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- TABLA: webhook_events
DROP TABLE IF EXISTS public.webhook_events CASCADE;
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'revenuecat'::text,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- TABLA: progress_photos
DROP TABLE IF EXISTS public.progress_photos CASCADE;
CREATE TABLE public.progress_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  photo_url text NOT NULL,
  photo_date date NOT NULL,
  photo_type text DEFAULT 'front'::text,
  weight_kg numeric,
  notes text,
  ai_analysis jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- TABLA: payment_history
DROP TABLE IF EXISTS public.payment_history CASCADE;
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_email text,
  user_name text,
  stripe_subscription_id text,
  stripe_customer_id text,
  monthly_amount numeric NOT NULL,
  total_paid numeric,
  currency text DEFAULT 'USD'::text,
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  last_payment_date timestamp with time zone,
  canceled_date timestamp with time zone DEFAULT now(),
  status text NOT NULL,
  cancel_reason text,
  canceled_by text,
  subscription_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- TABLA: body_measurements
DROP TABLE IF EXISTS public.body_measurements CASCADE;
CREATE TABLE public.body_measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  measured_at timestamp with time zone NOT NULL DEFAULT now(),
  weight_kg numeric NOT NULL,
  body_fat_percentage numeric,
  muscle_percentage numeric,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  arms_cm numeric,
  thighs_cm numeric,
  notes text,
  source text DEFAULT 'manual'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- TABLA: messages
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text,
  workout_plan_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  nutrition_plan_id uuid,
  PRIMARY KEY (id)
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- TABLA: shared_workouts
DROP TABLE IF EXISTS public.shared_workouts CASCADE;
CREATE TABLE public.shared_workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  workout_plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  message_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.shared_workouts ENABLE ROW LEVEL SECURITY;

-- TABLA: user_push_tokens
DROP TABLE IF EXISTS public.user_push_tokens CASCADE;
CREATE TABLE public.user_push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  push_token text NOT NULL,
  platform text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- TABLA: exercise_sets
DROP TABLE IF EXISTS public.exercise_sets CASCADE;
CREATE TABLE public.exercise_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  workout_session_id uuid,
  exercise_id text NOT NULL,
  exercise_name text,
  set_number integer NOT NULL,
  reps integer,
  weight_kg numeric,
  duration_seconds integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rir integer,
  workout_plan_id text,
  day_name text,
  PRIMARY KEY (id)
);

ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_plan_meals
DROP TABLE IF EXISTS public.nutrition_plan_meals CASCADE;
CREATE TABLE public.nutrition_plan_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL,
  meal_order integer NOT NULL DEFAULT 1,
  meal_name text DEFAULT 'Comida'::text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.nutrition_plan_meals ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_plan_meal_foods
DROP TABLE IF EXISTS public.nutrition_plan_meal_foods CASCADE;
CREATE TABLE public.nutrition_plan_meal_foods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL,
  food_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 100,
  quantity_unit text DEFAULT 'grams'::text,
  calculated_calories integer DEFAULT 0,
  calculated_protein numeric DEFAULT 0,
  calculated_carbs numeric DEFAULT 0,
  calculated_fat numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.nutrition_plan_meal_foods ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_plan_weeks
DROP TABLE IF EXISTS public.nutrition_plan_weeks CASCADE;
CREATE TABLE public.nutrition_plan_weeks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  week_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.nutrition_plan_weeks ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_plan_days
DROP TABLE IF EXISTS public.nutrition_plan_days CASCADE;
CREATE TABLE public.nutrition_plan_days (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  day_name text,
  target_calories integer DEFAULT 2000,
  target_protein integer DEFAULT 150,
  target_carbs integer DEFAULT 200,
  target_fat integer DEFAULT 70,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.nutrition_plan_days ENABLE ROW LEVEL SECURITY;

-- TABLA: gym_messages
DROP TABLE IF EXISTS public.gym_messages CASCADE;
CREATE TABLE public.gym_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  empresario_id text NOT NULL,
  sender_name text NOT NULL,
  message_title text NOT NULL,
  message_body text NOT NULL,
  recipient_type text NOT NULL,
  recipient_ids text[],
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.gym_messages ENABLE ROW LEVEL SECURITY;

-- TABLA: user_notifications
DROP TABLE IF EXISTS public.user_notifications CASCADE;
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  sender_name text,
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  PRIMARY KEY (id)
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- TABLA: partner_monthly_stats
DROP TABLE IF EXISTS public.partner_monthly_stats CASCADE;
CREATE TABLE public.partner_monthly_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id text,
  year integer NOT NULL,
  month integer NOT NULL,
  codes_redeemed integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  commission_earned numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.partner_monthly_stats ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_plans
DROP TABLE IF EXISTS public.nutrition_plans CASCADE;
CREATE TABLE public.nutrition_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  plan_name text NOT NULL,
  description text,
  plan_type text NOT NULL DEFAULT 'custom'::text,
  is_active boolean DEFAULT false,
  plan_data jsonb NOT NULL DEFAULT '{"weeks": [], "total_weeks": 0}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_ai_generated boolean DEFAULT false,
  total_weeks integer DEFAULT 1,
  name text,
  activated_at timestamp with time zone,
  current_week_number integer DEFAULT 1,
  initial_weight_kg numeric,
  initial_body_fat numeric,
  initial_muscle_mass numeric,
  renewal_completed boolean DEFAULT false,
  last_renewal_date date,
  nutrition_goal text,
  PRIMARY KEY (id)
);

ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

-- TABLA: shared_nutrition_plans
DROP TABLE IF EXISTS public.shared_nutrition_plans CASCADE;
CREATE TABLE public.shared_nutrition_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  nutrition_plan_id uuid NOT NULL,
  message_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.shared_nutrition_plans ENABLE ROW LEVEL SECURITY;

-- TABLA: subscriptions
DROP TABLE IF EXISTS public.subscriptions CASCADE;
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  monthly_amount numeric,
  revenuecat_customer_id text,
  product_identifier text,
  platform text,
  promo_code_used text,
  is_promo_subscription boolean DEFAULT false,
  PRIMARY KEY (id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- TABLA: lessons
DROP TABLE IF EXISTS public.lessons CASCADE;
CREATE TABLE public.lessons (
  id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY,
  slug text NOT NULL,
  title text NOT NULL,
  content_md text NOT NULL,
  quiz_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- TABLA: body_metrics
DROP TABLE IF EXISTS public.body_metrics CASCADE;
CREATE TABLE public.body_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  weight_kg numeric NOT NULL,
  waist_cm numeric,
  hips_cm numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  body_fat_percentage numeric,
  muscle_percentage numeric,
  PRIMARY KEY (id)
);

ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

-- TABLA: hydration_logs
DROP TABLE IF EXISTS public.hydration_logs CASCADE;
CREATE TABLE public.hydration_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  water_ml integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

-- TABLA: meal_logs
DROP TABLE IF EXISTS public.meal_logs CASCADE;
CREATE TABLE public.meal_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  datetime timestamp with time zone NOT NULL,
  meal_type text NOT NULL,
  item_json jsonb NOT NULL,
  calories integer NOT NULL,
  protein_g integer NOT NULL,
  carbs_g integer NOT NULL,
  fats_g integer NOT NULL,
  photo_url text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- TABLA: personal_records
DROP TABLE IF EXISTS public.personal_records CASCADE;
CREATE TABLE public.personal_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  exercise_name text NOT NULL,
  workout_plan_id text,
  day_name text,
  date date NOT NULL,
  weight_kg numeric NOT NULL,
  reps integer NOT NULL,
  sets integer DEFAULT 1,
  notes text,
  is_pr boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- TABLA: lesson_progress
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
CREATE TABLE public.lesson_progress (
  user_id text NOT NULL,
  lesson_id integer NOT NULL,
  completed_at timestamp with time zone,
  score integer,
  PRIMARY KEY (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_targets
DROP TABLE IF EXISTS public.nutrition_targets CASCADE;
CREATE TABLE public.nutrition_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  calories integer NOT NULL,
  protein_g integer NOT NULL,
  carbs_g integer NOT NULL,
  fats_g integer NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

-- TABLA: meal_plans
DROP TABLE IF EXISTS public.meal_plans CASCADE;
CREATE TABLE public.meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  week_start date NOT NULL,
  plan_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- TABLA: nutrition_profiles
DROP TABLE IF EXISTS public.nutrition_profiles CASCADE;
CREATE TABLE public.nutrition_profiles (
  user_id text NOT NULL,
  meals_per_day integer NOT NULL DEFAULT 3,
  fasting_window text,
  custom_prompts text[] DEFAULT '{}'::text[],
  updated_at timestamp with time zone DEFAULT now(),
  activity_level text DEFAULT 'moderate'::text,
  current_weight_kg numeric,
  PRIMARY KEY (user_id)
);

ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;

-- TABLA: discount_code_usage
DROP TABLE IF EXISTS public.discount_code_usage CASCADE;
CREATE TABLE public.discount_code_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  discount_code text NOT NULL,
  partner_id text,
  stripe_session_id text,
  subscription_id text,
  discount_amount numeric,
  is_free_access boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.discount_code_usage ENABLE ROW LEVEL SECURITY;

-- TABLA: user_profiles
DROP TABLE IF EXISTS public.user_profiles CASCADE;
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text,
  age integer,
  height integer,
  weight integer,
  fitness_level text,
  goals text[] DEFAULT '{}'::text[],
  available_days integer DEFAULT 3,
  session_duration integer DEFAULT 30,
  equipment text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gender text DEFAULT 'male'::text,
  email text,
  body_fat_percentage numeric,
  muscle_percentage numeric,
  profile_photo_url text,
  username text,
  birth_date date,
  PRIMARY KEY (id)
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- TABLA: exercise_videos
DROP TABLE IF EXISTS public.exercise_videos CASCADE;
CREATE TABLE public.exercise_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  name_variations text[] DEFAULT ARRAY[]::text[],
  video_url text,
  thumbnail_url text,
  description text,
  category text,
  equipment text[],
  language text DEFAULT 'es'::text,
  is_primary boolean DEFAULT true,
  priority integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  storage_path text,
  is_storage_video boolean DEFAULT false,
  muscles text[],
  muscle_zones text[],
  movement_type text,
  exercise_type text,
  goals text[],
  equipment_alternatives text[],
  uses_time boolean DEFAULT false,
  name_en text,
  notes text,
  PRIMARY KEY (id)
);

ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;

-- TABLA: partner_payments
DROP TABLE IF EXISTS public.partner_payments CASCADE;
CREATE TABLE public.partner_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id text NOT NULL,
  partner_name text,
  partner_email text,
  period_start_date timestamp with time zone NOT NULL,
  period_end_date timestamp with time zone NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  amount numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  active_subscriptions_count integer NOT NULL DEFAULT 0,
  commission_per_subscription numeric NOT NULL,
  commission_type text DEFAULT 'fixed'::text,
  status text DEFAULT 'pending'::text,
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by text,
  PRIMARY KEY (id)
);

ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;

-- TABLA: trainer_student_relationships
DROP TABLE IF EXISTS public.trainer_student_relationships CASCADE;
CREATE TABLE public.trainer_student_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trainer_id text NOT NULL,
  student_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  PRIMARY KEY (id)
);

ALTER TABLE public.trainer_student_relationships ENABLE ROW LEVEL SECURITY;

-- TABLA: chats
DROP TABLE IF EXISTS public.chats CASCADE;
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id text NOT NULL,
  user2_id text NOT NULL,
  last_message_at timestamp with time zone,
  last_message_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- TABLA: friendships
DROP TABLE IF EXISTS public.friendships CASCADE;
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  friend_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- TABLA: partners
DROP TABLE IF EXISTS public.partners CASCADE;
CREATE TABLE public.partners (
  id text NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  business_type text,
  reference_code text NOT NULL,
  commission_percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- TABLA: partner_offer_campaigns
DROP TABLE IF EXISTS public.partner_offer_campaigns CASCADE;
CREATE TABLE public.partner_offer_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id text,
  offer_reference_name text NOT NULL,
  offer_type text NOT NULL,
  discount_description text,
  codes_generated integer NOT NULL DEFAULT 0,
  codes_redeemed integer NOT NULL DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  total_codes_generated integer DEFAULT 0,
  offer_duration text,
  discount_value numeric,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  PRIMARY KEY (id)
);

ALTER TABLE public.partner_offer_campaigns ENABLE ROW LEVEL SECURITY;

-- TABLA: offer_code_redemptions
DROP TABLE IF EXISTS public.offer_code_redemptions CASCADE;
CREATE TABLE public.offer_code_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  partner_id text,
  campaign_id uuid,
  offer_code text,
  offer_reference_name text,
  transaction_id text,
  product_id text,
  price_paid numeric,
  currency text DEFAULT 'USD'::text,
  redeemed_at timestamp with time zone DEFAULT now(),
  revenuecat_event_id text,
  usage_id uuid DEFAULT gen_random_uuid(),
  used_at timestamp with time zone DEFAULT now(),
  is_free_access boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.offer_code_redemptions ENABLE ROW LEVEL SECURITY;

-- TABLA: trainer_permissions
DROP TABLE IF EXISTS public.trainer_permissions CASCADE;
CREATE TABLE public.trainer_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL,
  can_view_workouts boolean DEFAULT true,
  can_edit_workouts boolean DEFAULT true,
  can_view_nutrition boolean DEFAULT true,
  can_view_steps boolean DEFAULT true,
  can_view_body_metrics boolean DEFAULT true,
  can_view_progress_photos boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.trainer_permissions ENABLE ROW LEVEL SECURITY;

-- TABLA: health_data_daily
DROP TABLE IF EXISTS public.health_data_daily CASCADE;
CREATE TABLE public.health_data_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  steps integer DEFAULT 0,
  distance_km numeric DEFAULT 0,
  calories integer DEFAULT 0,
  active_minutes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.health_data_daily ENABLE ROW LEVEL SECURITY;

-- TABLA: foods
DROP TABLE IF EXISTS public.foods CASCADE;
CREATE TABLE public.foods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_es text NOT NULL,
  name_en text,
  food_type text NOT NULL,
  quantity_type text NOT NULL DEFAULT 'grams'::text,
  calories numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  unit_weight_g numeric,
  unit_name_es text DEFAULT 'unidad'::text,
  unit_name_en text DEFAULT 'unit'::text,
  image_url text,
  tags text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'incomplete'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  calories_per_unit numeric,
  protein_per_unit numeric,
  carbs_per_unit numeric,
  fat_per_unit numeric,
  PRIMARY KEY (id)
);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

