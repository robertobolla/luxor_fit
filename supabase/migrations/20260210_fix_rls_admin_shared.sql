-- Fix RLS for Admin, Shared, and remaining tables (Script 4)
-- Also includes CLEANUP for persistent policies on User Data tables.

-- ==============================================================================
-- SECTION A: Admin & Shared Tables
-- ==============================================================================

-- 1. Admin Roles
DROP POLICY IF EXISTS "Allow all operations for Clerk" ON public.admin_roles;
DROP POLICY IF EXISTS "Anyone can delete admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Anyone can insert admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Anyone can update admin roles" ON public.admin_roles;
-- New Policy: Users can only see/edit their own admin role entry
CREATE POLICY "Users manage own admin role" ON public.admin_roles USING (auth.uid()::text = user_id);

-- 2. Chats
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
-- New Policy: Participants can access their chats
CREATE POLICY "Participants manage chats" ON public.chats USING (auth.uid()::text = user1_id OR auth.uid()::text = user2_id);

-- 3. Messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
-- New Policy: Read/Write if participant in the chat
CREATE POLICY "Participants manage messages" ON public.messages USING (
    EXISTS (
        SELECT 1 FROM public.chats c 
        WHERE c.id = messages.chat_id 
        AND (c.user1_id = auth.uid()::text OR c.user2_id = auth.uid()::text)
    )
);

-- 4. Discount Code Usage
DROP POLICY IF EXISTS "Anyone can insert discount code usage" ON public.discount_code_usage;
CREATE POLICY "Users manage own discount usage" ON public.discount_code_usage USING (auth.uid()::text = user_id);

-- 5. Friendships
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their own friendships" ON public.friendships;
CREATE POLICY "Users manage friendships" ON public.friendships USING (auth.uid()::text = user_id OR auth.uid()::text = friend_id);

-- 6. Gym Members
DROP POLICY IF EXISTS "Admins and empresarios can delete gym_members" ON public.gym_members;
DROP POLICY IF EXISTS "Admins and empresarios can insert gym_members" ON public.gym_members;
DROP POLICY IF EXISTS "Admins and empresarios can update gym_members" ON public.gym_members;
-- New Policy: Member or Empresario can access
CREATE POLICY "Member or Owner access" ON public.gym_members USING (auth.uid()::text = user_id OR auth.uid()::text = empresario_id);

-- 7. Partner Payments
DROP POLICY IF EXISTS "Anyone can delete partner payments" ON public.partner_payments;
DROP POLICY IF EXISTS "Anyone can insert partner payments" ON public.partner_payments;
DROP POLICY IF EXISTS "Anyone can update partner payments" ON public.partner_payments;
-- New Policy: Partner only
CREATE POLICY "Partner access payments" ON public.partner_payments USING (auth.uid()::text = partner_id);

-- 8. Meal Plans
DROP POLICY IF EXISTS "Users can create their own meal plans." ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans." ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans." ON public.meal_plans;
CREATE POLICY "Users manage meal plans" ON public.meal_plans USING (auth.uid()::text = user_id);

-- 9. Shared Workouts
DROP POLICY IF EXISTS "Users can create shared workouts" ON public.shared_workouts;
DROP POLICY IF EXISTS "Users can update shared workouts they received" ON public.shared_workouts;
CREATE POLICY "Sender or Receiver access" ON public.shared_workouts USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

-- 10. Shared Nutrition Plans
DROP POLICY IF EXISTS "shared_nutrition_insert" ON public.shared_nutrition_plans;
DROP POLICY IF EXISTS "shared_nutrition_update" ON public.shared_nutrition_plans;
-- Assuming columns sender_id/receiver_id exist, similar to shared_workouts. 
-- If names differ, this might fail, but checking schema implies consistency.
CREATE POLICY "Sender or Receiver nutrition access" ON public.shared_nutrition_plans USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);


-- ==============================================================================
-- SECTION B: Content Tables (Exercise Videos, Foods)
-- ==============================================================================
-- Strategy: Public Read, Service Role Write (No Authenticated User Write)

-- 11. Exercise Videos
DROP POLICY IF EXISTS "Anyone can delete exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Anyone can insert exercise videos" ON public.exercise_videos;
DROP POLICY IF EXISTS "Anyone can update exercise videos" ON public.exercise_videos;
-- Allow Read for everyone
CREATE POLICY "Public Read Videos" ON public.exercise_videos FOR SELECT USING (true);
-- Write: None (implicitly denies, so only Service Role can write)

-- 12. Foods
DROP POLICY IF EXISTS "Foods can be deleted by admins" ON public.foods;
DROP POLICY IF EXISTS "Foods can be inserted by admins" ON public.foods;
DROP POLICY IF EXISTS "Foods can be updated by admins" ON public.foods;
-- Allow Read for everyone
CREATE POLICY "Public Read Foods" ON public.foods FOR SELECT USING (true);


-- ==============================================================================
-- SECTION C: Zombie Policy Cleanup (Force Drop permissive policies)
-- ==============================================================================

-- Health Data Daily
DROP POLICY IF EXISTS "Users can delete health data" ON public.health_data_daily;
DROP POLICY IF EXISTS "Users can update health data" ON public.health_data_daily;

-- Lesson Progress
DROP POLICY IF EXISTS "Users can create their own lesson progress." ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can delete their own lesson progress." ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update their own lesson progress." ON public.lesson_progress;

-- Nutrition Plan Details (Nested)
DROP POLICY IF EXISTS "Allow all operations on plan days" ON public.nutrition_plan_days;
DROP POLICY IF EXISTS "Allow all operations on meal foods" ON public.nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Allow all operations on plan meals" ON public.nutrition_plan_meals;
DROP POLICY IF EXISTS "Allow all operations on plan weeks" ON public.nutrition_plan_weeks;

-- Nutrition Profiles
DROP POLICY IF EXISTS "Users can create their own nutrition profile." ON public.nutrition_profiles;
DROP POLICY IF EXISTS "Users can delete their own nutrition profile." ON public.nutrition_profiles;
DROP POLICY IF EXISTS "Users can update their own nutrition profile." ON public.nutrition_profiles;

-- Nutrition Targets
DROP POLICY IF EXISTS "Users can create their own nutrition targets." ON public.nutrition_targets;
DROP POLICY IF EXISTS "Users can delete their own nutrition targets." ON public.nutrition_targets;
DROP POLICY IF EXISTS "Users can update their own nutrition targets." ON public.nutrition_targets;

-- Personal Records
DROP POLICY IF EXISTS "personal_records_delete_policy" ON public.personal_records;
DROP POLICY IF EXISTS "personal_records_insert_policy" ON public.personal_records;
DROP POLICY IF EXISTS "personal_records_update_policy" ON public.personal_records;

-- Progress Photos
DROP POLICY IF EXISTS "Allow all deletes" ON public.progress_photos;
DROP POLICY IF EXISTS "Allow all inserts" ON public.progress_photos;
DROP POLICY IF EXISTS "Allow all updates" ON public.progress_photos;

-- Subscriptions
DROP POLICY IF EXISTS "subscriptions_insert_self" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_self" ON public.subscriptions;

-- Typing Indicators
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update typing indicators" ON public.typing_indicators;

-- User Profiles
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuarios pueden eliminar su propio perfil" ON public.user_profiles;

-- User Push Tokens
DROP POLICY IF EXISTS "Enable all access for public" ON public.user_push_tokens;

-- Workout Completions
DROP POLICY IF EXISTS "workout_completions_delete_policy" ON public.workout_completions;
DROP POLICY IF EXISTS "workout_completions_insert_policy" ON public.workout_completions;
DROP POLICY IF EXISTS "workout_completions_update_policy" ON public.workout_completions;

-- Workout Plans
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;
