-- 03_RLS: Políticas de Seguridad (RLS)
SET search_path = public, temp;

DROP POLICY IF EXISTS "Allow delete exercises" ON public.exercises;
CREATE POLICY "Allow delete exercises" ON public.exercises
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Allow insert exercises" ON public.exercises;
CREATE POLICY "Allow insert exercises" ON public.exercises
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Allow read access to exercises" ON public.exercises;
CREATE POLICY "Allow read access to exercises" ON public.exercises
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Allow update exercises" ON public.exercises;
CREATE POLICY "Allow update exercises" ON public.exercises
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios completions" ON public.workout_completions;
CREATE POLICY "Usuarios pueden actualizar sus propios completions" ON public.workout_completions
FOR UPDATE TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "Usuarios pueden crear sus propios completions" ON public.workout_completions;
CREATE POLICY "Usuarios pueden crear sus propios completions" ON public.workout_completions
FOR INSERT TO public WITH CHECK (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios completions" ON public.workout_completions;
CREATE POLICY "Usuarios pueden eliminar sus propios completions" ON public.workout_completions
FOR DELETE TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios completions" ON public.workout_completions;
CREATE POLICY "Usuarios pueden ver sus propios completions" ON public.workout_completions
FOR SELECT TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "Admins manage plans" ON public.workout_plans;
CREATE POLICY "Admins manage plans" ON public.workout_plans
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Users view own plans" ON public.workout_plans;
CREATE POLICY "Users view own plans" ON public.workout_plans
FOR SELECT TO public USING ((user_id = auth_user_id())) ;

DROP POLICY IF EXISTS "Admins manage everything" ON public.admin_roles;
CREATE POLICY "Admins manage everything" ON public.admin_roles
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Public read for auth check" ON public.admin_roles;
CREATE POLICY "Public read for auth check" ON public.admin_roles
FOR SELECT TO authenticated USING (true) ;

DROP POLICY IF EXISTS "Admins manage gym members" ON public.gym_members;
CREATE POLICY "Admins manage gym members" ON public.gym_members
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Users view own gym membership" ON public.gym_members;
CREATE POLICY "Users view own gym membership" ON public.gym_members
FOR SELECT TO public USING ((user_id = auth_user_id())) ;

DROP POLICY IF EXISTS "Users can view typing indicators in their chats" ON public.typing_indicators;
CREATE POLICY "Users can view typing indicators in their chats" ON public.typing_indicators
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Admins manage webhooks" ON public.webhook_events;
CREATE POLICY "Admins manage webhooks" ON public.webhook_events
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Allow all selects" ON public.progress_photos;
CREATE POLICY "Allow all selects" ON public.progress_photos
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can delete measurements" ON public.body_measurements;
CREATE POLICY "Users can delete measurements" ON public.body_measurements
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can insert measurements" ON public.body_measurements;
CREATE POLICY "Users can insert measurements" ON public.body_measurements
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can update measurements" ON public.body_measurements;
CREATE POLICY "Users can update measurements" ON public.body_measurements
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view measurements" ON public.body_measurements;
CREATE POLICY "Users can view measurements" ON public.body_measurements
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "push_tokens_delete" ON public.user_push_tokens;
CREATE POLICY "push_tokens_delete" ON public.user_push_tokens
FOR DELETE TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "push_tokens_insert" ON public.user_push_tokens;
CREATE POLICY "push_tokens_insert" ON public.user_push_tokens
FOR INSERT TO public WITH CHECK (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "push_tokens_select" ON public.user_push_tokens;
CREATE POLICY "push_tokens_select" ON public.user_push_tokens
FOR SELECT TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "push_tokens_update" ON public.user_push_tokens;
CREATE POLICY "push_tokens_update" ON public.user_push_tokens
FOR UPDATE TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "Sender or Receiver access" ON public.shared_workouts;
CREATE POLICY "Sender or Receiver access" ON public.shared_workouts
FOR ALL TO public USING ((((auth.uid())::text = sender_id) OR ((auth.uid())::text = receiver_id))) ;

DROP POLICY IF EXISTS "Users can view shared workouts" ON public.shared_workouts;
CREATE POLICY "Users can view shared workouts" ON public.shared_workouts
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Participants manage messages" ON public.messages;
CREATE POLICY "Participants manage messages" ON public.messages
FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM chats c
  WHERE ((c.id = messages.chat_id) AND ((c.user1_id = (auth.uid())::text) OR (c.user2_id = (auth.uid())::text)))))) ;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats" ON public.messages
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can delete exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can delete exercise sets" ON public.exercise_sets
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can insert exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can insert exercise sets" ON public.exercise_sets
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can update exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can update exercise sets" ON public.exercise_sets
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can view exercise sets" ON public.exercise_sets
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Manage own plan weeks" ON public.nutrition_plan_weeks;
CREATE POLICY "Manage own plan weeks" ON public.nutrition_plan_weeks
FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM nutrition_plans np
  WHERE ((np.id = nutrition_plan_weeks.plan_id) AND (np.user_id = (auth.jwt() ->> 'sub'::text)))))) ;

DROP POLICY IF EXISTS "Manage own plan days" ON public.nutrition_plan_days;
CREATE POLICY "Manage own plan days" ON public.nutrition_plan_days
FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (nutrition_plan_weeks npw
     JOIN nutrition_plans np ON ((np.id = npw.plan_id)))
  WHERE ((npw.id = nutrition_plan_days.week_id) AND (np.user_id = (auth.jwt() ->> 'sub'::text)))))) ;

DROP POLICY IF EXISTS "Manage own plan meals" ON public.nutrition_plan_meals;
CREATE POLICY "Manage own plan meals" ON public.nutrition_plan_meals
FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM ((nutrition_plan_days npd
     JOIN nutrition_plan_weeks npw ON ((npw.id = npd.week_id)))
     JOIN nutrition_plans np ON ((np.id = npw.plan_id)))
  WHERE ((npd.id = nutrition_plan_meals.day_id) AND (np.user_id = (auth.jwt() ->> 'sub'::text)))))) ;

DROP POLICY IF EXISTS "Manage own meal foods" ON public.nutrition_plan_meal_foods;
CREATE POLICY "Manage own meal foods" ON public.nutrition_plan_meal_foods
FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (((nutrition_plan_meals npm
     JOIN nutrition_plan_days npd ON ((npd.id = npm.day_id)))
     JOIN nutrition_plan_weeks npw ON ((npw.id = npd.week_id)))
     JOIN nutrition_plans np ON ((np.id = npw.plan_id)))
  WHERE ((npm.id = nutrition_plan_meal_foods.meal_id) AND (np.user_id = (auth.jwt() ->> 'sub'::text)))))) ;

DROP POLICY IF EXISTS "Authenticated access notifications" ON public.user_notifications;
CREATE POLICY "Authenticated access notifications" ON public.user_notifications
FOR ALL TO public USING ((auth.uid() IS NOT NULL)) ;

DROP POLICY IF EXISTS "Authenticated access gym messages" ON public.gym_messages;
CREATE POLICY "Authenticated access gym messages" ON public.gym_messages
FOR ALL TO public USING ((auth.uid() IS NOT NULL)) ;

DROP POLICY IF EXISTS "Users can delete own plans" ON public.nutrition_plans;
CREATE POLICY "Users can delete own plans" ON public.nutrition_plans
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can insert own plans" ON public.nutrition_plans;
CREATE POLICY "Users can insert own plans" ON public.nutrition_plans
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can update own plans" ON public.nutrition_plans;
CREATE POLICY "Users can update own plans" ON public.nutrition_plans
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view own plans" ON public.nutrition_plans;
CREATE POLICY "Users can view own plans" ON public.nutrition_plans
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "nutrition_plans_delete" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans_delete" ON public.nutrition_plans
FOR DELETE TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "nutrition_plans_insert" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans_insert" ON public.nutrition_plans
FOR INSERT TO public WITH CHECK (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "nutrition_plans_select" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans_select" ON public.nutrition_plans
FOR SELECT TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "nutrition_plans_update" ON public.nutrition_plans;
CREATE POLICY "nutrition_plans_update" ON public.nutrition_plans
FOR UPDATE TO public USING (((auth.jwt() ->> 'sub'::text) = user_id)) ;

DROP POLICY IF EXISTS "Sender or Receiver nutrition access" ON public.shared_nutrition_plans;
CREATE POLICY "Sender or Receiver nutrition access" ON public.shared_nutrition_plans
FOR ALL TO public USING ((((auth.uid())::text = sender_id) OR ((auth.uid())::text = receiver_id))) ;

DROP POLICY IF EXISTS "shared_nutrition_select" ON public.shared_nutrition_plans;
CREATE POLICY "shared_nutrition_select" ON public.shared_nutrition_plans
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Admins view all subs" ON public.subscriptions;
CREATE POLICY "Admins view all subs" ON public.subscriptions
FOR SELECT TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Users view own subs" ON public.subscriptions;
CREATE POLICY "Users view own subs" ON public.subscriptions
FOR SELECT TO public USING ((user_id = auth_user_id())) ;

DROP POLICY IF EXISTS "Admins view all" ON public.user_profiles;
CREATE POLICY "Admins view all" ON public.user_profiles
FOR SELECT TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Users update own" ON public.user_profiles;
CREATE POLICY "Users update own" ON public.user_profiles
FOR UPDATE TO public USING ((user_id = auth_user_id())) ;

DROP POLICY IF EXISTS "Users view own" ON public.user_profiles;
CREATE POLICY "Users view own" ON public.user_profiles
FOR SELECT TO public USING ((user_id = auth_user_id())) ;

DROP POLICY IF EXISTS "Everyone can view lessons." ON public.lessons;
CREATE POLICY "Everyone can view lessons." ON public.lessons
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can create their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can create their own body metrics." ON public.body_metrics
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can delete their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can delete their own body metrics." ON public.body_metrics
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can update their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can update their own body metrics." ON public.body_metrics
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can view their own body metrics." ON public.body_metrics
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can create their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can create their own hydration logs." ON public.hydration_logs
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can delete their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can delete their own hydration logs." ON public.hydration_logs
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can update their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can update their own hydration logs." ON public.hydration_logs
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can view their own hydration logs." ON public.hydration_logs
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can create their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can create their own meal logs." ON public.meal_logs
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can delete their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can delete their own meal logs." ON public.meal_logs
FOR DELETE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can update their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can update their own meal logs." ON public.meal_logs
FOR UPDATE TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can view their own meal logs." ON public.meal_logs
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "personal_records_select_policy" ON public.personal_records;
CREATE POLICY "personal_records_select_policy" ON public.personal_records
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can view their own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can view their own lesson progress." ON public.lesson_progress
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can view their own nutrition targets." ON public.nutrition_targets;
CREATE POLICY "Users can view their own nutrition targets." ON public.nutrition_targets
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can view their own meal plans." ON public.meal_plans;
CREATE POLICY "Users can view their own meal plans." ON public.meal_plans
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users manage meal plans" ON public.meal_plans;
CREATE POLICY "Users manage meal plans" ON public.meal_plans
FOR ALL TO public USING (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view their own nutrition profile." ON public.nutrition_profiles;
CREATE POLICY "Users can view their own nutrition profile." ON public.nutrition_profiles
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Anyone can read discount code usage" ON public.discount_code_usage;
CREATE POLICY "Anyone can read discount code usage" ON public.discount_code_usage
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Anyone can read exercise videos" ON public.exercise_videos;
CREATE POLICY "Anyone can read exercise videos" ON public.exercise_videos
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Public Read Videos" ON public.exercise_videos;
CREATE POLICY "Public Read Videos" ON public.exercise_videos
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Admins manage partner payments" ON public.partner_payments;
CREATE POLICY "Admins manage partner payments" ON public.partner_payments
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Authenticated access relationships" ON public.trainer_student_relationships;
CREATE POLICY "Authenticated access relationships" ON public.trainer_student_relationships
FOR ALL TO public USING ((auth.uid() IS NOT NULL)) ;

DROP POLICY IF EXISTS "Participants manage chats" ON public.chats;
CREATE POLICY "Participants manage chats" ON public.chats
FOR ALL TO public USING ((((auth.uid())::text = user1_id) OR ((auth.uid())::text = user2_id))) ;

DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Users manage friendships" ON public.friendships;
CREATE POLICY "Users manage friendships" ON public.friendships
FOR ALL TO public USING ((((auth.uid())::text = user_id) OR ((auth.uid())::text = friend_id))) ;

DROP POLICY IF EXISTS "Users can insert health data" ON public.health_data_daily;
CREATE POLICY "Users can insert health data" ON public.health_data_daily
FOR INSERT TO public WITH CHECK (((auth.uid())::text = user_id)) ;

DROP POLICY IF EXISTS "Users can view health data" ON public.health_data_daily;
CREATE POLICY "Users can view health data" ON public.health_data_daily
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Admins manage partners" ON public.partners;
CREATE POLICY "Admins manage partners" ON public.partners
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Public read partners" ON public.partners;
CREATE POLICY "Public read partners" ON public.partners
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Admins view redemptions" ON public.offer_code_redemptions;
CREATE POLICY "Admins view redemptions" ON public.offer_code_redemptions
FOR ALL TO public USING (is_admin()) ;

DROP POLICY IF EXISTS "Authenticated access permissions" ON public.trainer_permissions;
CREATE POLICY "Authenticated access permissions" ON public.trainer_permissions
FOR ALL TO public USING ((auth.uid() IS NOT NULL)) ;

DROP POLICY IF EXISTS "Students can update their permissions" ON public.trainer_permissions;
CREATE POLICY "Students can update their permissions" ON public.trainer_permissions
FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM trainer_student_relationships
  WHERE ((trainer_student_relationships.id = trainer_permissions.relationship_id) AND (trainer_student_relationships.student_id = (auth.uid())::text))))) ;

DROP POLICY IF EXISTS "Trainers can insert permissions" ON public.trainer_permissions;
CREATE POLICY "Trainers can insert permissions" ON public.trainer_permissions
FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM trainer_student_relationships
  WHERE ((trainer_student_relationships.id = trainer_permissions.relationship_id) AND (trainer_student_relationships.trainer_id = (auth.uid())::text))))) ;

DROP POLICY IF EXISTS "View permissions for trainer or student" ON public.trainer_permissions;
CREATE POLICY "View permissions for trainer or student" ON public.trainer_permissions
FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM trainer_student_relationships
  WHERE ((trainer_student_relationships.id = trainer_permissions.relationship_id) AND ((trainer_student_relationships.trainer_id = (auth.uid())::text) OR (trainer_student_relationships.student_id = (auth.uid())::text)))))) ;

DROP POLICY IF EXISTS "Foods are viewable by everyone" ON public.foods;
CREATE POLICY "Foods are viewable by everyone" ON public.foods
FOR SELECT TO public USING (true) ;

DROP POLICY IF EXISTS "Public Read Foods" ON public.foods;
CREATE POLICY "Public Read Foods" ON public.foods
FOR SELECT TO public USING (true) ;

