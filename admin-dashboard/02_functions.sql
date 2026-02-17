-- 02_FUNCTIONS: Funciones y Triggers
SET search_path = public, temp;

CREATE OR REPLACE FUNCTION public.debug_get_auth_uid()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT (auth.jwt() ->> 'sub');
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_partner_earnings(partner_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  stats JSONB;
  
  -- Configuración de comisiones (VALORES FIJOS según requerimiento)
  -- Nivel 1: Directos -> $3.00
  -- Nivel 2: Indirectos -> $1.00
  commission_lvl1 NUMERIC := 3.00;
  commission_lvl2 NUMERIC := 1.00;
  
  -- Contadores
  active_count_lvl1 INTEGER := 0;
  active_count_lvl2 INTEGER := 0;
  
  current_earnings_lvl1 NUMERIC := 0;
  current_earnings_lvl2 NUMERIC := 0;
  
  total_paid NUMERIC := 0;
  total_pending_payments NUMERIC := 0;
BEGIN
  -- A. Calcular Nivel 1: Suscripciones activas de usuarios referidos DIRECTAMENTE por este socio
  SELECT COUNT(DISTINCT dcu.user_id) INTO active_count_lvl1
  FROM discount_code_usage dcu
  INNER JOIN subscriptions sub ON sub.user_id = dcu.user_id
  WHERE dcu.partner_id = partner_user_id
    AND sub.status IN ('active', 'trialing');

  current_earnings_lvl1 := active_count_lvl1 * commission_lvl1;

  -- B. Calcular Nivel 2: Suscripciones activas de usuarios referidos por SOCIOS que fueron invitados por este socio
  -- Flujo: Este Socio -> Invitó a Socio B (Referred By Este Socio) -> Socio B refirió a Usuario Final
  SELECT COUNT(DISTINCT dcu_indirect.user_id) INTO active_count_lvl2
  FROM admin_roles child_partner
  INNER JOIN discount_code_usage dcu_indirect ON dcu_indirect.partner_id = child_partner.user_id
  INNER JOIN subscriptions sub_indirect ON sub_indirect.user_id = dcu_indirect.user_id
  WHERE child_partner.referred_by = partner_user_id -- Socios hijos
    AND child_partner.is_active = true
    AND sub_indirect.status IN ('active', 'trialing');
    
  current_earnings_lvl2 := active_count_lvl2 * commission_lvl2;

  -- C. Obtener información de pagos ya realizados o procesados
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)
  INTO total_paid, total_pending_payments
  FROM partner_payments
  WHERE partner_id = partner_user_id;
  
  -- D. Construir respuesta JSON
  -- "next_payment_amount" es lo que se le debe pagar AHORA (Ganancias Totales Acumuladas - Lo que ya se pagó)
  -- Se asume un modelo "Residual": Se paga mientras estén activos.
  -- Si el modelo fuera "pago único", la lógica sería diferente (basada en históricos).
  -- Dado el requerimiento "mientras una persona renueve... se le sigue pagando", es un modelo de RENTA/RESIDUAL.
  
  -- El total generado "histórico" es difícil de calcular exacto sin una tabla de ledger diaria,
  -- pero para el "pago del mes" o "pago acumulado" usamos: (Activos * Precio) - Pagado.
  -- NOTA: Esto asume que 'partner_payments' restan de la deuda.
  
  SELECT jsonb_build_object(
    'commission_lvl1_rate', commission_lvl1,
    'commission_lvl2_rate', commission_lvl2,
    
    'active_subscriptions_lvl1', active_count_lvl1,
    'active_subscriptions_lvl2', active_count_lvl2,
    
    'earnings_lvl1', current_earnings_lvl1,
    'earnings_lvl2', current_earnings_lvl2,
    
    'total_earnings_generated_current_snapshot', (current_earnings_lvl1 + current_earnings_lvl2),
    
    'total_paid', total_paid,
    'total_pending_payments', total_pending_payments,
    
    -- El monto a pagar es: Lo que generan los activos HOY - Lo que ya se ha pagado históricamente
    -- IMPORTANTE: Esta lógica simple puede fallar si los usuarios cancelan (el 'generado' baja).
    -- Para un sistema robusto se necesitaría "Payment Periods" snapshot.
    -- Por simplicidad y consistencia con el código anterior, mantenemos esta lógica pero sumando niveles.
    'next_payment_amount', GREATEST(0, (current_earnings_lvl1 + current_earnings_lvl2) - total_paid - total_pending_payments)
  ) INTO stats;
  
  RETURN stats;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_shared_nutrition_plans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_admin_role_id(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
BEGIN
  -- Verificar que el usuario autenticado (auth.uid()) quiere reclamar este email
  -- Nota: Esto asume confianza en que el cliente envía su propio email verificado.
  -- En un escenario ideal, verificaríamos auth.jwt() -> email, pero Clerk maneja eso fuera.
  
  UPDATE admin_roles
  SET 
    user_id = auth.uid()::text,
    updated_at = NOW()
  WHERE 
    email = p_email
    AND is_active = true;

  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_or_socio(check_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_roles 
    WHERE user_id = check_user_id 
      AND is_active = true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_chat_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  UPDATE public.chats
  SET 
    last_message_at = NEW.created_at,
    last_message_text = NEW.message_text,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '5 seconds';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role_type INTO user_role
  FROM admin_roles 
  WHERE user_id = check_user_id 
    AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_body_measurements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_foods_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_nutrition_profile(p_meals_per_day integer DEFAULT NULL::integer, p_fasting_window text DEFAULT NULL::text, p_custom_prompts text[] DEFAULT NULL::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id text;
BEGIN
    v_user_id := (auth.jwt() ->> 'sub');
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Upsert profile
    -- For INSERT: Use provided value or default (3 for meals)
    -- For UPDATE: Use provided value (EXCLUDED) or keep existing (nutrition_profiles) if NULL provided
    INSERT INTO public.nutrition_profiles (
        user_id, meals_per_day, fasting_window, custom_prompts, updated_at
    )
    VALUES (
        v_user_id, 
        COALESCE(p_meals_per_day, 3), 
        p_fasting_window, 
        COALESCE(p_custom_prompts, ARRAY[]::text[]), 
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        meals_per_day = COALESCE(EXCLUDED.meals_per_day, nutrition_profiles.meals_per_day),
        fasting_window = COALESCE(EXCLUDED.fasting_window, nutrition_profiles.fasting_window),
        custom_prompts = COALESCE(EXCLUDED.custom_prompts, nutrition_profiles.custom_prompts),
        updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_gym_members_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_complete_nutrition_plan(p_plan_name text, p_description text, p_is_active boolean, p_is_ai_generated boolean, p_weeks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id text;
    v_plan_id uuid;
    v_week_record jsonb;
    v_day_record jsonb;
    v_meal_record jsonb;
    v_food_record jsonb;
    v_week_id uuid;
    v_day_id uuid;
    v_meal_id uuid;
BEGIN
    -- 1. Get User ID
    v_user_id := (auth.jwt() ->> 'sub');
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 2. Deactivate other plans if active
    IF p_is_active THEN
        UPDATE public.nutrition_plans SET is_active = false WHERE user_id = v_user_id;
    END IF;

    -- 3. Insert Plan
    INSERT INTO public.nutrition_plans (
        user_id, plan_name, description, is_active, is_ai_generated, total_weeks
    ) VALUES (
        v_user_id, p_plan_name, p_description, p_is_active, p_is_ai_generated, jsonb_array_length(p_weeks)
    )
    RETURNING id INTO v_plan_id;

    -- 4. Process Weeks
    FOR v_week_record IN SELECT * FROM jsonb_array_elements(p_weeks) LOOP
        INSERT INTO public.nutrition_plan_weeks (plan_id, week_number)
        VALUES (v_plan_id, (v_week_record->>'weekNumber')::int)
        RETURNING id INTO v_week_id;

        -- 5. Process Days
        FOR v_day_record IN SELECT * FROM jsonb_array_elements(v_week_record->'days') LOOP
            INSERT INTO public.nutrition_plan_days (
                week_id, day_number, day_name, target_calories, target_protein, target_carbs, target_fat
            ) VALUES (
                v_week_id,
                (v_day_record->>'dayNumber')::int,
                v_day_record->>'dayName',
                (v_day_record->>'targetCalories')::int,
                (v_day_record->>'targetProtein')::int,
                (v_day_record->>'targetCarbs')::int,
                (v_day_record->>'targetFat')::int
            )
            RETURNING id INTO v_day_id;

            -- 6. Process Meals (Optional)
            IF v_day_record ? 'meals' THEN
                FOR v_meal_record IN SELECT * FROM jsonb_array_elements(v_day_record->'meals') LOOP
                    INSERT INTO public.nutrition_plan_meals (
                        day_id, meal_order, meal_name
                    ) VALUES (
                        v_day_id,
                        (v_meal_record->>'mealOrder')::int,
                        v_meal_record->>'mealName'
                    )
                    RETURNING id INTO v_meal_id;

                    -- 7. Process Foods (Optional)
                    IF v_meal_record ? 'foods' THEN
                        FOR v_food_record IN SELECT * FROM jsonb_array_elements(v_meal_record->'foods') LOOP
                            INSERT INTO public.nutrition_plan_meal_foods (
                                meal_id, food_id, quantity, quantity_unit, 
                                calculated_calories, calculated_protein, calculated_carbs, calculated_fat
                            ) VALUES (
                                v_meal_id,
                                (v_food_record->>'foodId')::int,
                                (v_food_record->>'quantity')::numeric,
                                v_food_record->>'quantityUnit',
                                (v_food_record->>'calculatedCalories')::int,
                                (v_food_record->>'calculatedProtein')::numeric,
                                (v_food_record->>'calculatedCarbs')::numeric,
                                (v_food_record->>'calculatedFat')::numeric
                            );
                        END LOOP;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'plan_id', v_plan_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_gym_empresario(check_user_id text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  empresario_user_id TEXT;
BEGIN
  SELECT empresario_id INTO empresario_user_id
  FROM gym_members 
  WHERE user_id = check_user_id 
    AND is_active = true
  LIMIT 1;
  
  RETURN empresario_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_user_push_token(p_push_token text, p_platform text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id text;
    v_jwt jsonb;
BEGIN
    v_jwt := auth.jwt();
    v_user_id := (v_jwt ->> 'sub');
    
    -- DEBUG: Raise exception with JWT details if user_id is null
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. JWT: %, Current User: %', v_jwt, auth.uid();
    END IF;

    INSERT INTO public.user_push_tokens (user_id, push_token, platform, updated_at)
    VALUES (v_user_id, p_push_token, p_platform, now())
    ON CONFLICT (user_id) DO UPDATE
    SET push_token = EXCLUDED.push_token,
        platform = EXCLUDED.platform,
        updated_at = EXCLUDED.updated_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.activate_nutrition_plan(p_user_id text, p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  -- Desactivar todos los planes del usuario
  UPDATE public.nutrition_plans
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Activar el plan seleccionado
  UPDATE public.nutrition_plans
  SET is_active = TRUE
  WHERE id = p_plan_id AND user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_empresario_dashboard_stats(p_empresario_id text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_stats JSON;
  v_total_members INT;
  v_active_members INT;
  v_inactive_members INT;
  v_new_members_7d INT;
  v_new_members_30d INT;
  v_expiring_7d INT;
  v_expiring_15d INT;
  v_expiring_30d INT;
  v_inactive_training INT;
  v_retention_rate NUMERIC;
  v_total_workouts_week INT;
  v_total_workouts_month INT;
  v_avg_workouts_per_member NUMERIC;
  v_members_with_plan INT;
  v_members_without_plan INT;
  v_plan_adherence NUMERIC;
  v_fitness_distribution JSON;
  v_goals_distribution JSON;
  v_top_active_members JSON;
  v_activity_by_day JSON;
BEGIN
  -- 1. ESTADÍSTICAS DE MIEMBROS
  
  -- Total de miembros (activos e inactivos)
  SELECT COUNT(*) INTO v_total_members
  FROM gym_members
  WHERE empresario_id = p_empresario_id;
  
  -- Miembros activos (con suscripción vigente)
  SELECT COUNT(*) INTO v_active_members
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND is_active = true
    AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW());
  
  -- Miembros inactivos
  v_inactive_members := v_total_members - v_active_members;
  
  -- Nuevos miembros (últimos 7 días)
  SELECT COUNT(*) INTO v_new_members_7d
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND joined_at >= NOW() - INTERVAL '7 days';
  
  -- Nuevos miembros (últimos 30 días)
  SELECT COUNT(*) INTO v_new_members_30d
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND joined_at >= NOW() - INTERVAL '30 days';
  
  -- Miembros por expirar (próximos 7 días)
  SELECT COUNT(*) INTO v_expiring_7d
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND is_active = true
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';
  
  -- Miembros por expirar (próximos 15 días)
  SELECT COUNT(*) INTO v_expiring_15d
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND is_active = true
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '15 days';
  
  -- Miembros por expirar (próximos 30 días)
  SELECT COUNT(*) INTO v_expiring_30d
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND is_active = true
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';
  
  -- Miembros inactivos (último entrenamiento hace >30 días)
  SELECT COUNT(DISTINCT gm.user_id) INTO v_inactive_training
  FROM gym_members gm
  LEFT JOIN workout_completions wc ON wc.user_id = gm.user_id
  WHERE gm.empresario_id = p_empresario_id
    AND gm.is_active = true
    AND (wc.completed_at IS NULL OR wc.completed_at < NOW() - INTERVAL '30 days');
  
  -- Tasa de retención (simplificada: activos / total)
  v_retention_rate := CASE 
    WHEN v_total_members > 0 THEN (v_active_members::NUMERIC / v_total_members::NUMERIC) * 100
    ELSE 0 
  END;
  
  -- 2. ACTIVIDAD DE ENTRENAMIENTOS
  
  -- Total de entrenamientos (última semana)
  SELECT COUNT(*) INTO v_total_workouts_week
  FROM workout_completions wc
  JOIN gym_members gm ON gm.user_id = wc.user_id
  WHERE gm.empresario_id = p_empresario_id
    AND wc.completed_at >= NOW() - INTERVAL '7 days';
  
  -- Total de entrenamientos (último mes)
  SELECT COUNT(*) INTO v_total_workouts_month
  FROM workout_completions wc
  JOIN gym_members gm ON gm.user_id = wc.user_id
  WHERE gm.empresario_id = p_empresario_id
    AND wc.completed_at >= NOW() - INTERVAL '30 days';
  
  -- Promedio de entrenamientos por miembro (último mes)
  SELECT 
    CASE 
      WHEN v_active_members > 0 THEN v_total_workouts_month::NUMERIC / v_active_members::NUMERIC
      ELSE 0 
    END
  INTO v_avg_workouts_per_member;
  
  -- Top 5 miembros más activos
  SELECT JSON_AGG(member_data) INTO v_top_active_members
  FROM (
    SELECT 
      up.name,
      up.email,
      COUNT(wc.id) as workout_count
    FROM gym_members gm
    JOIN user_profiles up ON up.user_id = gm.user_id
    LEFT JOIN workout_completions wc ON wc.user_id = gm.user_id 
      AND wc.completed_at >= NOW() - INTERVAL '30 days'
    WHERE gm.empresario_id = p_empresario_id
      AND gm.is_active = true
    GROUP BY up.name, up.email
    ORDER BY workout_count DESC
    LIMIT 5
  ) member_data;
  
  -- Actividad por día de la semana (último mes)
  SELECT JSON_AGG(day_data) INTO v_activity_by_day
  FROM (
    SELECT 
      TO_CHAR(wc.completed_at, 'Day') as day_name,
      EXTRACT(DOW FROM wc.completed_at) as day_number,
      COUNT(*) as workout_count
    FROM workout_completions wc
    JOIN gym_members gm ON gm.user_id = wc.user_id
    WHERE gm.empresario_id = p_empresario_id
      AND wc.completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY TO_CHAR(wc.completed_at, 'Day'), EXTRACT(DOW FROM wc.completed_at)
    ORDER BY EXTRACT(DOW FROM wc.completed_at)
  ) day_data;
  
  -- 3. PLANES DE ENTRENAMIENTO
  
  -- Miembros con plan activo
  SELECT COUNT(DISTINCT wp.user_id) INTO v_members_with_plan
  FROM gym_members gm
  JOIN workout_plans wp ON wp.user_id = gm.user_id
  WHERE gm.empresario_id = p_empresario_id
    AND gm.is_active = true
    AND wp.is_active = true;
  
  -- Miembros sin plan
  v_members_without_plan := v_active_members - COALESCE(v_members_with_plan, 0);
  
  -- Adherencia a planes (simplificada)
  SELECT 
    CASE 
      WHEN v_members_with_plan > 0 
      THEN (COUNT(DISTINCT wc.user_id)::NUMERIC / v_members_with_plan::NUMERIC) * 100
      ELSE 0 
    END
  INTO v_plan_adherence
  FROM workout_completions wc
  JOIN gym_members gm ON gm.user_id = wc.user_id
  JOIN workout_plans wp ON wp.user_id = wc.user_id AND wp.is_active = true
  WHERE gm.empresario_id = p_empresario_id
    AND wc.completed_at >= NOW() - INTERVAL '7 days';
  
  -- 4. METAS Y PROGRESO
  
  -- Distribución de niveles de fitness
  SELECT JSON_AGG(fitness_data) INTO v_fitness_distribution
  FROM (
    SELECT 
      COALESCE(up.fitness_level, 'Sin especificar') as nivel,
      COUNT(*) as cantidad
    FROM gym_members gm
    JOIN user_profiles up ON up.user_id = gm.user_id
    WHERE gm.empresario_id = p_empresario_id
      AND gm.is_active = true
    GROUP BY up.fitness_level
  ) fitness_data;
  
  -- Distribución de objetivos (goals)
  SELECT JSON_AGG(goal_data) INTO v_goals_distribution
  FROM (
    SELECT 
      unnest(up.goals) as objetivo,
      COUNT(*) as cantidad
    FROM gym_members gm
    JOIN user_profiles up ON up.user_id = gm.user_id
    WHERE gm.empresario_id = p_empresario_id
      AND gm.is_active = true
      AND up.goals IS NOT NULL
      AND array_length(up.goals, 1) > 0
    GROUP BY objetivo
  ) goal_data;
  
  -- Construir el JSON de respuesta
  v_stats := JSON_BUILD_OBJECT(
    'member_stats', JSON_BUILD_OBJECT(
      'total_members', v_total_members,
      'active_members', v_active_members,
      'inactive_members', v_inactive_members,
      'new_members_7d', v_new_members_7d,
      'new_members_30d', v_new_members_30d,
      'expiring_7d', v_expiring_7d,
      'expiring_15d', v_expiring_15d,
      'expiring_30d', v_expiring_30d,
      'inactive_training', v_inactive_training,
      'retention_rate', ROUND(v_retention_rate, 2)
    ),
    'workout_stats', JSON_BUILD_OBJECT(
      'total_workouts_week', v_total_workouts_week,
      'total_workouts_month', v_total_workouts_month,
      'avg_workouts_per_member', ROUND(v_avg_workouts_per_member, 2),
      'top_active_members', COALESCE(v_top_active_members, '[]'::JSON),
      'activity_by_day', COALESCE(v_activity_by_day, '[]'::JSON)
    ),
    'plan_stats', JSON_BUILD_OBJECT(
      'members_with_plan', v_members_with_plan,
      'members_without_plan', v_members_without_plan,
      'plan_coverage_percent', CASE 
        WHEN v_active_members > 0 THEN ROUND((v_members_with_plan::NUMERIC / v_active_members::NUMERIC) * 100, 2)
        ELSE 0 
      END,
      'plan_adherence', ROUND(v_plan_adherence, 2)
    ),
    'progress_stats', JSON_BUILD_OBJECT(
      'fitness_distribution', COALESCE(v_fitness_distribution, '[]'::JSON),
      'goals_distribution', COALESCE(v_goals_distribution, '[]'::JSON)
    )
  );
  
  RETURN v_stats;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.translate_exercise_name(spanish_name text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  name_lower text := lower(spanish_name);
BEGIN
  -- =====================================================
  -- DOMINADAS Y VARIANTES
  -- =====================================================
  IF name_lower = 'dominadas' THEN RETURN 'Pull-ups';
  ELSIF name_lower = 'dominadas asistidas' THEN RETURN 'Assisted Pull-ups';
  ELSIF name_lower = 'dominadas con banda' THEN RETURN 'Band-Assisted Pull-ups';
  ELSIF name_lower = 'dominadas pronas' THEN RETURN 'Pronated Pull-ups';
  ELSIF name_lower = 'dominadas supinas' THEN RETURN 'Chin-ups';
  ELSIF name_lower = 'dominadas neutras' THEN RETURN 'Neutral Grip Pull-ups';
  ELSIF name_lower = 'dominadas con peso' THEN RETURN 'Weighted Pull-ups';
  ELSIF name_lower = 'dominadas explosivas' THEN RETURN 'Explosive Pull-ups';
  ELSIF name_lower = 'dominadas arqueras' THEN RETURN 'Archer Pull-ups';
  
  -- =====================================================
  -- JALONES (LAT PULLDOWN)
  -- =====================================================
  ELSIF name_lower LIKE '%jalon%frontal%' OR name_lower LIKE '%jalon frontal%' THEN RETURN 'Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%tras nuca%' OR name_lower LIKE '%jalon tras nuca%' THEN RETURN 'Behind Neck Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%agarre cerrado%' THEN RETURN 'Close Grip Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%agarre neutro%' THEN RETURN 'Neutral Grip Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%supino%' THEN RETURN 'Supinated Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%un brazo%' OR name_lower LIKE '%jalon unilateral%' THEN RETURN 'Single Arm Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%' THEN RETURN 'Lat Pulldown';
  
  -- =====================================================
  -- REMOS (ROWS)
  -- =====================================================
  ELSIF name_lower LIKE '%remo con barra%' OR name_lower = 'remo con barra' THEN RETURN 'Barbell Row';
  ELSIF name_lower LIKE '%remo con mancuerna%' THEN RETURN 'Dumbbell Row';
  ELSIF name_lower LIKE '%remo pendlay%' THEN RETURN 'Pendlay Row';
  ELSIF name_lower LIKE '%remo t%' OR name_lower LIKE '%remo en t%' THEN RETURN 'T-Bar Row';
  ELSIF name_lower LIKE '%remo en polea%' OR name_lower LIKE '%remo polea%' THEN RETURN 'Cable Row';
  ELSIF name_lower LIKE '%remo sentado%' THEN RETURN 'Seated Cable Row';
  ELSIF name_lower LIKE '%remo invertido%' THEN RETURN 'Inverted Row';
  ELSIF name_lower LIKE '%remo gorila%' THEN RETURN 'Gorilla Row';
  ELSIF name_lower LIKE '%remo meadows%' THEN RETURN 'Meadows Row';
  ELSIF name_lower LIKE '%remo seal%' OR name_lower LIKE '%remo foca%' THEN RETURN 'Seal Row';
  ELSIF name_lower LIKE '%remo%' THEN RETURN 'Row';
  
  -- =====================================================
  -- PRESS DE PECHO (CHEST PRESS)
  -- =====================================================
  ELSIF name_lower LIKE '%press banca%' OR name_lower = 'press de banca' THEN RETURN 'Bench Press';
  ELSIF name_lower LIKE '%press inclinado%' AND name_lower LIKE '%mancuerna%' THEN RETURN 'Incline Dumbbell Press';
  ELSIF name_lower LIKE '%press inclinado%' THEN RETURN 'Incline Bench Press';
  ELSIF name_lower LIKE '%press declinado%' THEN RETURN 'Decline Bench Press';
  ELSIF name_lower LIKE '%press con mancuernas%' OR name_lower LIKE '%press mancuernas%' THEN RETURN 'Dumbbell Press';
  ELSIF name_lower LIKE '%press plano%' THEN RETURN 'Flat Bench Press';
  ELSIF name_lower LIKE '%press cerrado%' THEN RETURN 'Close Grip Bench Press';
  
  -- =====================================================
  -- APERTURAS (FLYES)
  -- =====================================================
  ELSIF name_lower LIKE '%aperturas%mancuerna%' OR name_lower LIKE '%apertura%mancuerna%' THEN RETURN 'Dumbbell Flyes';
  ELSIF name_lower LIKE '%aperturas%inclinado%' OR name_lower LIKE '%apertura%inclinado%' THEN RETURN 'Incline Dumbbell Flyes';
  ELSIF name_lower LIKE '%aperturas%polea%' OR name_lower LIKE '%apertura%polea%' OR name_lower LIKE '%cable crossover%' THEN RETURN 'Cable Crossover';
  ELSIF name_lower LIKE '%pec deck%' OR name_lower LIKE '%mariposa%' THEN RETURN 'Pec Deck';
  ELSIF name_lower LIKE '%aperturas%' OR name_lower LIKE '%apertura%' THEN RETURN 'Flyes';
  
  -- =====================================================
  -- FLEXIONES (PUSH-UPS)
  -- =====================================================
  ELSIF name_lower = 'flexiones' OR name_lower = 'lagartijas' THEN RETURN 'Push-ups';
  ELSIF name_lower LIKE '%flexiones diamante%' THEN RETURN 'Diamond Push-ups';
  ELSIF name_lower LIKE '%flexiones inclinadas%' THEN RETURN 'Incline Push-ups';
  ELSIF name_lower LIKE '%flexiones declinadas%' THEN RETURN 'Decline Push-ups';
  ELSIF name_lower LIKE '%flexiones arquero%' THEN RETURN 'Archer Push-ups';
  ELSIF name_lower LIKE '%flexiones explosivas%' OR name_lower LIKE '%flexiones con palmada%' THEN RETURN 'Clap Push-ups';
  ELSIF name_lower LIKE '%flexiones pike%' THEN RETURN 'Pike Push-ups';
  ELSIF name_lower LIKE '%flexiones%' OR name_lower LIKE '%lagartijas%' THEN RETURN 'Push-ups';
  
  -- =====================================================
  -- PRESS DE HOMBROS (SHOULDER PRESS)
  -- =====================================================
  ELSIF name_lower LIKE '%press militar%' THEN RETURN 'Military Press';
  ELSIF name_lower LIKE '%press arnold%' THEN RETURN 'Arnold Press';
  ELSIF name_lower LIKE '%press hombro%mancuerna%' OR name_lower LIKE '%press de hombro%' THEN RETURN 'Dumbbell Shoulder Press';
  ELSIF name_lower LIKE '%press tras nuca%' THEN RETURN 'Behind Neck Press';
  ELSIF name_lower LIKE '%push press%' THEN RETURN 'Push Press';
  
  -- =====================================================
  -- ELEVACIONES (RAISES)
  -- =====================================================
  ELSIF name_lower LIKE '%elevacion%lateral%' OR name_lower LIKE '%vuelos laterales%' THEN RETURN 'Lateral Raises';
  ELSIF name_lower LIKE '%elevacion%frontal%' OR name_lower LIKE '%vuelos frontales%' THEN RETURN 'Front Raises';
  ELSIF name_lower LIKE '%pajaro%' OR name_lower LIKE '%reverse fly%' OR name_lower LIKE '%posterior%' THEN RETURN 'Reverse Flyes';
  ELSIF name_lower LIKE '%face pull%' THEN RETURN 'Face Pulls';
  
  -- =====================================================
  -- ENCOGIMIENTOS (SHRUGS)
  -- =====================================================
  ELSIF name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN RETURN 'Shrugs';
  
  -- =====================================================
  -- CURL DE BÍCEPS (BICEP CURLS)
  -- =====================================================
  ELSIF name_lower LIKE '%curl%martillo%' THEN RETURN 'Hammer Curls';
  ELSIF name_lower LIKE '%curl%concentrado%' OR name_lower LIKE '%curl concentracion%' THEN RETURN 'Concentration Curls';
  ELSIF name_lower LIKE '%curl%predicador%' OR name_lower LIKE '%curl%scott%' THEN RETURN 'Preacher Curls';
  ELSIF name_lower LIKE '%curl%inclinado%' THEN RETURN 'Incline Dumbbell Curls';
  ELSIF name_lower LIKE '%curl%barra%' OR name_lower LIKE '%curl con barra%' THEN RETURN 'Barbell Curls';
  ELSIF name_lower LIKE '%curl%mancuerna%' THEN RETURN 'Dumbbell Curls';
  ELSIF name_lower LIKE '%curl%polea%' OR name_lower LIKE '%curl%cable%' THEN RETURN 'Cable Curls';
  ELSIF name_lower LIKE '%curl%araña%' OR name_lower LIKE '%spider curl%' THEN RETURN 'Spider Curls';
  ELSIF name_lower LIKE '%curl 21%' OR name_lower LIKE '%21s%' THEN RETURN '21s Bicep Curls';
  ELSIF name_lower LIKE '%curl%' AND name_lower NOT LIKE '%femoral%' AND name_lower NOT LIKE '%pierna%' THEN RETURN 'Bicep Curls';
  
  -- =====================================================
  -- TRÍCEPS (TRICEPS)
  -- =====================================================
  ELSIF name_lower LIKE '%press frances%' OR name_lower LIKE '%skull crusher%' THEN RETURN 'Skull Crushers';
  ELSIF name_lower LIKE '%extension%tricep%polea%' OR name_lower LIKE '%pushdown%' THEN RETURN 'Tricep Pushdown';
  ELSIF name_lower LIKE '%extension%tricep%' OR name_lower LIKE '%tricep extension%' THEN RETURN 'Tricep Extensions';
  ELSIF name_lower LIKE '%patada%tricep%' OR name_lower LIKE '%kickback%' THEN RETURN 'Tricep Kickbacks';
  ELSIF name_lower LIKE '%fondos%' AND name_lower LIKE '%tricep%' THEN RETURN 'Tricep Dips';
  ELSIF name_lower LIKE '%fondos en banco%' THEN RETURN 'Bench Dips';
  ELSIF name_lower LIKE '%fondos%' THEN RETURN 'Dips';
  
  -- =====================================================
  -- SENTADILLAS (SQUATS)
  -- =====================================================
  ELSIF name_lower = 'sentadilla' OR name_lower = 'sentadillas' THEN RETURN 'Squats';
  ELSIF name_lower LIKE '%sentadilla%frontal%' THEN RETURN 'Front Squats';
  ELSIF name_lower LIKE '%sentadilla%sumo%' THEN RETURN 'Sumo Squats';
  ELSIF name_lower LIKE '%sentadilla%goblet%' OR name_lower LIKE '%sentadilla copa%' THEN RETURN 'Goblet Squats';
  ELSIF name_lower LIKE '%sentadilla%bulgara%' THEN RETURN 'Bulgarian Split Squats';
  ELSIF name_lower LIKE '%sentadilla%hack%' THEN RETURN 'Hack Squats';
  ELSIF name_lower LIKE '%sentadilla%pistola%' OR name_lower LIKE '%pistol squat%' THEN RETURN 'Pistol Squats';
  ELSIF name_lower LIKE '%sentadilla%zercher%' THEN RETURN 'Zercher Squats';
  ELSIF name_lower LIKE '%sentadilla%' THEN RETURN 'Squats';
  
  -- =====================================================
  -- PESO MUERTO (DEADLIFT)
  -- =====================================================
  ELSIF name_lower LIKE '%peso muerto%rumano%' OR name_lower LIKE '%rdl%' THEN RETURN 'Romanian Deadlift';
  ELSIF name_lower LIKE '%peso muerto%sumo%' THEN RETURN 'Sumo Deadlift';
  ELSIF name_lower LIKE '%peso muerto%convencional%' THEN RETURN 'Conventional Deadlift';
  ELSIF name_lower LIKE '%peso muerto%un pie%' OR name_lower LIKE '%peso muerto%una pierna%' THEN RETURN 'Single Leg Deadlift';
  ELSIF name_lower LIKE '%peso muerto%' OR name_lower LIKE '%deadlift%' THEN RETURN 'Deadlift';
  
  -- =====================================================
  -- PRENSA DE PIERNAS (LEG PRESS)
  -- =====================================================
  ELSIF name_lower LIKE '%prensa%pierna%' OR name_lower LIKE '%leg press%' THEN RETURN 'Leg Press';
  ELSIF name_lower LIKE '%prensa%45%' THEN RETURN '45 Degree Leg Press';
  ELSIF name_lower LIKE '%prensa%horizontal%' THEN RETURN 'Horizontal Leg Press';
  
  -- =====================================================
  -- EXTENSIONES Y CURLS DE PIERNA
  -- =====================================================
  ELSIF name_lower LIKE '%extension%pierna%' OR name_lower LIKE '%leg extension%' THEN RETURN 'Leg Extensions';
  ELSIF name_lower LIKE '%curl%femoral%' OR name_lower LIKE '%curl%pierna%' OR name_lower LIKE '%leg curl%' THEN RETURN 'Leg Curls';
  ELSIF name_lower LIKE '%curl%femoral%sentado%' THEN RETURN 'Seated Leg Curls';
  ELSIF name_lower LIKE '%curl%femoral%acostado%' OR name_lower LIKE '%curl%femoral%tumbado%' THEN RETURN 'Lying Leg Curls';
  
  -- =====================================================
  -- ZANCADAS (LUNGES)
  -- =====================================================
  ELSIF name_lower LIKE '%zancada%' OR name_lower LIKE '%estocada%' THEN RETURN 'Lunges';
  ELSIF name_lower LIKE '%zancada%caminando%' OR name_lower LIKE '%walking lunge%' THEN RETURN 'Walking Lunges';
  ELSIF name_lower LIKE '%zancada%reversa%' OR name_lower LIKE '%zancada%atras%' THEN RETURN 'Reverse Lunges';
  ELSIF name_lower LIKE '%zancada%lateral%' THEN RETURN 'Lateral Lunges';
  
  -- =====================================================
  -- HIP THRUST Y GLÚTEOS
  -- =====================================================
  ELSIF name_lower LIKE '%hip thrust%' THEN RETURN 'Hip Thrust';
  ELSIF name_lower LIKE '%puente%gluteo%' OR name_lower LIKE '%glute bridge%' THEN RETURN 'Glute Bridge';
  ELSIF name_lower LIKE '%patada%gluteo%' OR name_lower LIKE '%kickback%gluteo%' THEN RETURN 'Glute Kickbacks';
  ELSIF name_lower LIKE '%abduccion%cadera%' OR name_lower LIKE '%hip abduction%' THEN RETURN 'Hip Abduction';
  ELSIF name_lower LIKE '%aduccion%cadera%' OR name_lower LIKE '%hip adduction%' THEN RETURN 'Hip Adduction';
  
  -- =====================================================
  -- PANTORRILLAS (CALVES)
  -- =====================================================
  ELSIF name_lower LIKE '%elevacion%talon%pie%' OR name_lower LIKE '%calf raise%pie%' THEN RETURN 'Standing Calf Raises';
  ELSIF name_lower LIKE '%elevacion%talon%sentado%' OR name_lower LIKE '%calf raise%sentado%' THEN RETURN 'Seated Calf Raises';
  ELSIF name_lower LIKE '%pantorrilla%' OR name_lower LIKE '%gemelo%' OR name_lower LIKE '%calf%' THEN RETURN 'Calf Raises';
  
  -- =====================================================
  -- ABDOMINALES (ABS)
  -- =====================================================
  ELSIF name_lower = 'crunch' OR name_lower = 'crunches' OR name_lower LIKE '%crunch abdominal%' THEN RETURN 'Crunches';
  ELSIF name_lower LIKE '%crunch%inverso%' OR name_lower LIKE '%reverse crunch%' THEN RETURN 'Reverse Crunches';
  ELSIF name_lower LIKE '%crunch%bicicleta%' OR name_lower LIKE '%bicycle crunch%' THEN RETURN 'Bicycle Crunches';
  ELSIF name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' THEN RETURN 'Plank';
  ELSIF name_lower LIKE '%plancha%lateral%' OR name_lower LIKE '%side plank%' THEN RETURN 'Side Plank';
  ELSIF name_lower LIKE '%elevacion%pierna%colgado%' OR name_lower LIKE '%hanging leg raise%' THEN RETURN 'Hanging Leg Raises';
  ELSIF name_lower LIKE '%elevacion%pierna%' OR name_lower LIKE '%leg raise%' THEN RETURN 'Leg Raises';
  ELSIF name_lower LIKE '%rueda%ab%' OR name_lower LIKE '%ab wheel%' OR name_lower LIKE '%ab rollout%' THEN RETURN 'Ab Wheel Rollout';
  ELSIF name_lower LIKE '%sit up%' OR name_lower LIKE '%sit-up%' OR name_lower LIKE '%situp%' THEN RETURN 'Sit-ups';
  ELSIF name_lower LIKE '%v-up%' OR name_lower LIKE '%v up%' THEN RETURN 'V-ups';
  ELSIF name_lower LIKE '%mountain climber%' OR name_lower LIKE '%escalador%' THEN RETURN 'Mountain Climbers';
  
  -- =====================================================
  -- OBLICUOS (OBLIQUES)
  -- =====================================================
  ELSIF name_lower LIKE '%russian twist%' OR name_lower LIKE '%giro ruso%' THEN RETURN 'Russian Twists';
  ELSIF name_lower LIKE '%woodchop%' OR name_lower LIKE '%leñador%' THEN RETURN 'Woodchops';
  ELSIF name_lower LIKE '%oblicuo%' THEN RETURN 'Oblique Crunches';
  
  -- =====================================================
  -- HIPEREXTENSIONES
  -- =====================================================
  ELSIF name_lower LIKE '%hiperextension%' OR name_lower LIKE '%hyperextension%' THEN RETURN 'Hyperextensions';
  ELSIF name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' THEN RETURN 'Good Mornings';
  
  -- =====================================================
  -- CARDIO
  -- =====================================================
  ELSIF name_lower LIKE '%burpee%' THEN RETURN 'Burpees';
  ELSIF name_lower LIKE '%jumping jack%' OR name_lower LIKE '%salto%estrella%' THEN RETURN 'Jumping Jacks';
  ELSIF name_lower LIKE '%salto%cuerda%' OR name_lower LIKE '%jump rope%' OR name_lower LIKE '%comba%' THEN RETURN 'Jump Rope';
  ELSIF name_lower LIKE '%sprint%' THEN RETURN 'Sprints';
  ELSIF name_lower LIKE '%box jump%' OR name_lower LIKE '%salto%caja%' THEN RETURN 'Box Jumps';
  
  -- =====================================================
  -- ANTEBRAZO (FOREARMS)
  -- =====================================================
  ELSIF name_lower LIKE '%curl%muñeca%' OR name_lower LIKE '%wrist curl%' THEN RETURN 'Wrist Curls';
  ELSIF name_lower LIKE '%antebrazo%' OR name_lower LIKE '%forearm%' THEN RETURN 'Forearm Exercises';
  
  -- =====================================================
  -- DEFAULT: Mantener el nombre original
  -- =====================================================
  ELSE
    RETURN NULL;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_network_stats(target_user_id text)
 RETURNS json
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
DECLARE
    -- Variables para datos del socio
    partner_row admin_roles%ROWTYPE;
    
    -- Contadores Directos
    direct_referrals_count INTEGER := 0;
    direct_active_monthly INTEGER := 0;
    direct_active_annual INTEGER := 0;
    
    -- Contadores Indirectos
    indirect_referrals_count INTEGER := 0;
    indirect_active_monthly INTEGER := 0;
    indirect_active_annual INTEGER := 0;
    
    -- Ganancias
    earnings_direct NUMERIC(10, 2) := 0;
    earnings_indirect NUMERIC(10, 2) := 0;
    
    -- Comisiones
    c_direct_m NUMERIC(10, 2);
    c_direct_a NUMERIC(10, 2);
    c_indirect_m NUMERIC(10, 2);
    c_indirect_a NUMERIC(10, 2);
BEGIN
    -- Obtener datos del socio
    SELECT * INTO partner_row FROM admin_roles WHERE user_id = target_user_id LIMIT 1;
    
    IF partner_row IS NULL THEN
        RETURN json_build_object('error', 'Partner not found');
    END IF;
    
    -- Asignar comisiones (con fallbacks)
    c_direct_m := COALESCE(partner_row.commission_per_subscription, 3.00);
    c_direct_a := COALESCE(partner_row.commission_per_annual_subscription, 21.00);
    c_indirect_m := COALESCE(partner_row.commission_per_subscription_2nd_level, 1.00);
    c_indirect_a := COALESCE(partner_row.commission_per_annual_subscription_2nd_level, 7.00);

    -- 1. NIVEL 1 (DIRECTOS)
    WITH direct_subs AS (
        SELECT 
            s.status,
            s.monthly_amount
        FROM discount_code_usage dcu
        JOIN subscriptions s ON dcu.user_id = s.user_id
        WHERE dcu.partner_id = target_user_id
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND (monthly_amount < 20 OR monthly_amount IS NULL)),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND monthly_amount >= 20)
    INTO 
        direct_referrals_count,
        direct_active_monthly,
        direct_active_annual
    FROM direct_subs;

    -- 2. NIVEL 2 (INDIRECTOS)
    WITH indirect_subs AS (
        SELECT 
            s.status,
            s.monthly_amount
        FROM admin_roles child_partner
        JOIN discount_code_usage dcu ON dcu.partner_id = child_partner.user_id
        JOIN subscriptions s ON dcu.user_id = s.user_id
        WHERE child_partner.referred_by = target_user_id
          AND child_partner.is_active = true
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND (monthly_amount < 20 OR monthly_amount IS NULL)),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND monthly_amount >= 20)
    INTO 
        indirect_referrals_count,
        indirect_active_monthly,
        indirect_active_annual
    FROM indirect_subs;

    -- 3. CÁLCULO DE GANANCIAS
    earnings_direct := (direct_active_monthly * c_direct_m) + (direct_active_annual * c_direct_a);
    earnings_indirect := (indirect_active_monthly * c_indirect_m) + (indirect_active_annual * c_indirect_a);

    RETURN json_build_object(
        'partner_id', target_user_id,
        'direct_referrals', direct_referrals_count,
        'direct_active_monthly', direct_active_monthly,
        'direct_active_annual', direct_active_annual,
        'indirect_referrals', indirect_referrals_count,
        'indirect_active_monthly', indirect_active_monthly,
        'indirect_active_annual', indirect_active_annual,
        'comm_direct_monthly', c_direct_m,
        'comm_direct_annual', c_direct_a,
        'comm_indirect_monthly', c_indirect_m,
        'comm_indirect_annual', c_indirect_a,
        'earnings_direct', earnings_direct,
        'earnings_indirect', earnings_indirect,
        'total_earnings', (earnings_direct + earnings_indirect)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_empresario_users_v2(p_empresario_id text)
 RETURNS TABLE(r_user_id text, email text, name text, username text, age integer, fitness_level text, gender text, joined_at timestamp with time zone, is_active boolean, has_subscription boolean, subscription_status text, has_workout_plan boolean, subscription_expires_at timestamp with time zone, notes text)
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    gm.user_id::text, 
    COALESCE(up.email, gm.email, 'Sin email'), 
    COALESCE(up.name, 'Usuario Pendiente'),
    up.username, up.age, up.fitness_level, up.gender, gm.joined_at, gm.is_active,
    CASE WHEN s.status = 'active' OR s.status = 'trialing' OR (gm.subscription_expires_at IS NOT NULL AND gm.subscription_expires_at > NOW()) THEN true ELSE false END,
    COALESCE(s.status, CASE WHEN gm.subscription_expires_at > NOW() THEN 'active' ELSE 'inactive' END),
    CASE WHEN wp.id IS NOT NULL THEN true ELSE false END,
    COALESCE(s.current_period_end, gm.subscription_expires_at), gm.notes
  FROM gym_members gm
  LEFT JOIN user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN subscriptions s ON gm.user_id = s.user_id 
  LEFT JOIN (SELECT DISTINCT ON (wp_inner.user_id) wp_inner.user_id, wp_inner.id FROM workout_plans wp_inner ORDER BY wp_inner.user_id, wp_inner.created_at DESC) wp ON gm.user_id = wp.user_id
  WHERE gm.empresario_id::text = p_empresario_id
  ORDER BY gm.joined_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(p_start_date timestamp with time zone DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP)
 RETURNS json
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_revenue_period DECIMAL(10, 2);
    v_active_partners_count INT;
    v_churn_rate DECIMAL(5, 2);
    v_revenue_split JSON;
    v_daily_revenue JSON;
    v_users_active_start INT;
    v_users_cancelled_period INT;
BEGIN
    -- 1. Ingresos en el PERIODO seleccionado
    SELECT COALESCE(SUM(total_paid), 0)
    INTO v_total_revenue_period
    FROM payment_history
    WHERE created_at >= p_start_date AND created_at <= p_end_date;

    -- 2. Socios Activos
    SELECT COUNT(DISTINCT ar.user_id)
    INTO v_active_partners_count
    FROM admin_roles ar
    JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
    JOIN subscriptions s ON s.user_id = dcu.user_id
    WHERE ar.role_type = 'socio'
    AND s.status = 'active';

    -- 3. Tasa de Cancelación (Churn Rate) en el periodo
    SELECT COUNT(*) INTO v_users_active_start
    FROM subscriptions
    WHERE created_at < p_start_date
    AND (status = 'active' OR (status = 'canceled' AND canceled_at >= p_start_date));
    
    SELECT COUNT(*) INTO v_users_cancelled_period
    FROM subscriptions
    WHERE status = 'canceled' 
    AND canceled_at >= p_start_date AND canceled_at <= p_end_date;

    IF v_users_active_start > 0 THEN
        v_churn_rate := (v_users_cancelled_period::DECIMAL / v_users_active_start::DECIMAL) * 100;
    ELSE
        v_churn_rate := 0; 
    END IF;

    -- 4. Desglose de Ingresos
    WITH RevenueSource AS (
        SELECT 
            CASE 
                WHEN dcu.id IS NOT NULL THEN 'partner' 
                ELSE 'direct' 
            END as source,
            COALESCE(SUM(ph.total_paid), 0) as amount
        FROM payment_history ph
        LEFT JOIN discount_code_usage dcu ON ph.user_id = dcu.user_id
        WHERE ph.created_at >= p_start_date AND ph.created_at <= p_end_date
        GROUP BY 1
    )
    SELECT json_object_agg(source, amount) INTO v_revenue_split FROM RevenueSource;

    -- 5. Ingresos Diarios
    SELECT json_agg(t) INTO v_daily_revenue
    FROM (
        SELECT 
            DATE(created_at) as date,
            SUM(total_paid) as amount
        FROM payment_history
        WHERE created_at >= p_start_date AND created_at <= p_end_date
        GROUP BY 1
        ORDER BY 1
    ) t;

    RETURN json_build_object(
        'revenue_period', v_total_revenue_period,
        'active_partners', v_active_partners_count,
        'churn_rate', v_churn_rate,
        'revenue_split', v_revenue_split,
        'daily_revenue', v_daily_revenue,
        'users_cancelled_period', v_users_cancelled_period,
        'period_start', p_start_date,
        'period_end', p_end_date
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_partners_leaderboard()
 RETURNS TABLE(partner_id text, partner_name text, total_revenue numeric, active_subs bigint, total_commission_paid numeric)
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ar.user_id::TEXT, 
        COALESCE(ar.name, ar.email),
        COALESCE(SUM(ph.total_paid), 0) as revenue,
        COUNT(DISTINCT s.user_id) FILTER (WHERE s.status = 'active') as active_subs,
        (SELECT COALESCE(SUM(amount), 0) FROM partner_payments pp WHERE pp.partner_id = ar.user_id AND pp.status = 'paid') as commission_paid
    FROM admin_roles ar
    LEFT JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
    LEFT JOIN payment_history ph ON ph.user_id = dcu.user_id
    LEFT JOIN subscriptions s ON s.user_id = dcu.user_id
    WHERE ar.role_type = 'socio'
    GROUP BY ar.user_id, ar.name, ar.email
    ORDER BY revenue DESC
    LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_muscle_zone(exercise_name text, main_muscle text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  name_lower text := lower(exercise_name);
BEGIN
  -- Si no hay músculo principal, no asignar zona
  IF main_muscle IS NULL THEN
    RETURN NULL;
  END IF;

  -- =====================================================
  -- PECHO (chest)
  -- =====================================================
  IF main_muscle = 'chest' THEN
    IF name_lower LIKE '%inclinad%' OR name_lower LIKE '%incline%' OR name_lower LIKE '%superior%' THEN
      RETURN 'upper_chest';
    ELSIF name_lower LIKE '%declinad%' OR name_lower LIKE '%decline%' OR name_lower LIKE '%inferior%' THEN
      RETURN 'lower_chest';
    ELSE
      RETURN 'mid_chest';
    END IF;

  -- =====================================================
  -- ESPALDA (back)
  -- =====================================================
  ELSIF main_muscle = 'back' THEN
    IF name_lower LIKE '%dominad%' OR name_lower LIKE '%pull%up%' OR name_lower LIKE '%jalon%' OR name_lower LIKE '%pulldown%' THEN
      RETURN 'lats';
    ELSIF name_lower LIKE '%remo%' OR name_lower LIKE '%row%' THEN
      RETURN 'mid_back';
    ELSIF name_lower LIKE '%hiperext%' OR name_lower LIKE '%hyperext%' OR name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' OR name_lower LIKE '%lumbar%' THEN
      RETURN 'lower_back';
    ELSIF name_lower LIKE '%face pull%' OR name_lower LIKE '%trapecio%' OR name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN
      RETURN 'upper_back';
    ELSE
      RETURN 'lats';
    END IF;

  -- =====================================================
  -- HOMBROS (shoulders)
  -- =====================================================
  ELSIF main_muscle = 'shoulders' THEN
    IF name_lower LIKE '%lateral%' OR name_lower LIKE '%side%' THEN
      RETURN 'side_delts';
    ELSIF name_lower LIKE '%posterior%' OR name_lower LIKE '%rear%' OR name_lower LIKE '%pajaro%' OR name_lower LIKE '%reverse%' THEN
      RETURN 'rear_delts';
    ELSE
      RETURN 'front_delts';
    END IF;

  -- =====================================================
  -- BÍCEPS (biceps)
  -- =====================================================
  ELSIF main_muscle = 'biceps' THEN
    IF name_lower LIKE '%martillo%' OR name_lower LIKE '%hammer%' THEN
      RETURN 'brachialis';
    ELSIF name_lower LIKE '%concentrad%' OR name_lower LIKE '%predicador%' OR name_lower LIKE '%preacher%' OR name_lower LIKE '%scott%' THEN
      RETURN 'biceps_short_head';
    ELSE
      RETURN 'biceps_long_head';
    END IF;

  -- =====================================================
  -- TRÍCEPS (triceps)
  -- =====================================================
  ELSIF main_muscle = 'triceps' THEN
    IF name_lower LIKE '%pushdown%' OR name_lower LIKE '%jalon%' OR name_lower LIKE '%fondos%' OR name_lower LIKE '%dips%' THEN
      RETURN 'triceps_lateral';
    ELSIF name_lower LIKE '%cerrado%' OR name_lower LIKE '%close%' THEN
      RETURN 'triceps_medial';
    ELSE
      RETURN 'triceps_long';
    END IF;

  -- =====================================================
  -- CUÁDRICEPS (quadriceps)
  -- =====================================================
  ELSIF main_muscle = 'quadriceps' THEN
    IF name_lower LIKE '%sumo%' OR name_lower LIKE '%aductor%' OR name_lower LIKE '%abierta%' THEN
      RETURN 'quad_medial';
    ELSIF name_lower LIKE '%hack%' OR name_lower LIKE '%lateral%' THEN
      RETURN 'quad_lateral';
    ELSE
      RETURN 'quad_front';
    END IF;

  -- =====================================================
  -- ISQUIOTIBIALES (hamstrings)
  -- =====================================================
  ELSIF main_muscle = 'hamstrings' THEN
    IF name_lower LIKE '%nordic%' OR name_lower LIKE '%nordico%' THEN
      RETURN 'hamstrings_lower';
    ELSE
      RETURN 'hamstrings_mid';
    END IF;

  -- =====================================================
  -- GLÚTEOS (glutes)
  -- =====================================================
  ELSIF main_muscle = 'glutes' THEN
    IF name_lower LIKE '%abduccion%' OR name_lower LIKE '%abduction%' OR name_lower LIKE '%lateral%' THEN
      RETURN 'glutes_upper';
    ELSE
      RETURN 'glutes_mid';
    END IF;

  -- =====================================================
  -- PANTORRILLAS (calves)
  -- =====================================================
  ELSIF main_muscle = 'calves' THEN
    IF name_lower LIKE '%sentado%' OR name_lower LIKE '%seated%' THEN
      RETURN 'soleus';
    ELSE
      RETURN 'gastrocnemius';
    END IF;

  -- =====================================================
  -- ABDOMINALES (abs)
  -- =====================================================
  ELSIF main_muscle = 'abs' THEN
    IF name_lower LIKE '%inferior%' OR name_lower LIKE '%lower%' OR name_lower LIKE '%inverso%' OR name_lower LIKE '%reverse%' OR name_lower LIKE '%pierna%' OR name_lower LIKE '%leg raise%' THEN
      RETURN 'lower_abs';
    ELSIF name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' THEN
      RETURN 'transverse';
    ELSE
      RETURN 'upper_abs';
    END IF;

  -- =====================================================
  -- OBLICUOS (obliques)
  -- =====================================================
  ELSIF main_muscle = 'obliques' THEN
    RETURN 'external_obliques';

  -- =====================================================
  -- TRAPECIO (trapezius)
  -- =====================================================
  ELSIF main_muscle = 'trapezius' THEN
    RETURN NULL; -- No tiene zonas específicas

  -- =====================================================
  -- ANTEBRAZOS (forearms)
  -- =====================================================
  ELSIF main_muscle = 'forearms' THEN
    RETURN NULL; -- No tiene zonas específicas

  -- =====================================================
  -- CUERPO COMPLETO (fullBody)
  -- =====================================================
  ELSIF main_muscle = 'fullBody' THEN
    RETURN NULL; -- No tiene zonas específicas

  -- =====================================================
  -- LUMBARES (lowerBack)
  -- =====================================================
  ELSIF main_muscle = 'lowerBack' THEN
    RETURN NULL; -- Es la zona en sí misma

  ELSE
    RETURN NULL;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_primary_muscle(exercise_name text, current_muscles text[])
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  name_lower text := lower(exercise_name);
BEGIN
  -- Si solo tiene un músculo, devolverlo
  IF array_length(current_muscles, 1) = 1 THEN
    RETURN current_muscles[1];
  END IF;

  -- =====================================================
  -- REGLAS PARA DETERMINAR MÚSCULO PRINCIPAL
  -- =====================================================

  -- DOMINADAS y variantes → back
  IF name_lower LIKE '%dominad%' OR name_lower LIKE '%pull up%' OR name_lower LIKE '%pullup%' OR name_lower LIKE '%chin up%' THEN
    RETURN 'back';
  END IF;

  -- PRESS BANCA y variantes → chest
  IF name_lower LIKE '%press%banca%' OR name_lower LIKE '%bench press%' OR name_lower LIKE '%press%plano%' OR name_lower LIKE '%press%inclinad%' OR name_lower LIKE '%press%declinad%' THEN
    RETURN 'chest';
  END IF;

  -- APERTURAS → chest
  IF name_lower LIKE '%apertura%' OR name_lower LIKE '%fly%' OR name_lower LIKE '%flye%' OR name_lower LIKE '%cierre%pectoral%' OR name_lower LIKE '%cruce%polea%' OR name_lower LIKE '%crossover%' THEN
    RETURN 'chest';
  END IF;

  -- FLEXIONES → chest
  IF name_lower LIKE '%flexion%' OR name_lower LIKE '%push up%' OR name_lower LIKE '%pushup%' OR name_lower LIKE '%lagartija%' THEN
    RETURN 'chest';
  END IF;

  -- FONDOS → Si menciona tríceps, es tríceps; sino, pecho
  IF name_lower LIKE '%fondo%' OR name_lower LIKE '%dip%' THEN
    IF name_lower LIKE '%tricep%' THEN
      RETURN 'triceps';
    ELSE
      RETURN 'chest';
    END IF;
  END IF;

  -- REMOS → back
  IF name_lower LIKE '%remo%' OR name_lower LIKE '%row%' THEN
    RETURN 'back';
  END IF;

  -- JALONES → back
  IF name_lower LIKE '%jalon%' OR name_lower LIKE '%pulldown%' THEN
    RETURN 'back';
  END IF;

  -- PESO MUERTO RUMANO → hamstrings
  IF name_lower LIKE '%peso muerto%rumano%' OR name_lower LIKE '%rdl%' OR name_lower LIKE '%piernas rígidas%' THEN
    RETURN 'hamstrings';
  END IF;

  -- PESO MUERTO → back (lower back)
  IF name_lower LIKE '%peso muerto%' OR name_lower LIKE '%deadlift%' THEN
    RETURN 'back';
  END IF;

  -- PRESS MILITAR/HOMBRO → shoulders
  IF name_lower LIKE '%press militar%' OR name_lower LIKE '%press%hombro%' OR name_lower LIKE '%shoulder press%' OR name_lower LIKE '%overhead press%' OR name_lower LIKE '%arnold%' THEN
    RETURN 'shoulders';
  END IF;

  -- ELEVACIONES LATERALES/FRONTALES → shoulders
  IF name_lower LIKE '%elevacion%lateral%' OR name_lower LIKE '%elevacion%frontal%' OR name_lower LIKE '%lateral raise%' OR name_lower LIKE '%front raise%' THEN
    RETURN 'shoulders';
  END IF;

  -- CURLS (no femoral) → biceps
  IF (name_lower LIKE '%curl%' AND name_lower NOT LIKE '%femoral%' AND name_lower NOT LIKE '%pierna%' AND name_lower NOT LIKE '%leg curl%') THEN
    RETURN 'biceps';
  END IF;

  -- CURL FEMORAL → hamstrings
  IF name_lower LIKE '%curl%femoral%' OR name_lower LIKE '%leg curl%' THEN
    RETURN 'hamstrings';
  END IF;

  -- EXTENSIONES TRÍCEPS → triceps
  IF name_lower LIKE '%extension%tricep%' OR name_lower LIKE '%tricep%extension%' OR name_lower LIKE '%press frances%' OR name_lower LIKE '%skull crusher%' OR name_lower LIKE '%pushdown%' THEN
    RETURN 'triceps';
  END IF;

  -- SENTADILLAS → quadriceps
  IF name_lower LIKE '%sentadilla%' OR name_lower LIKE '%squat%' THEN
    RETURN 'quadriceps';
  END IF;

  -- PRENSA → quadriceps
  IF name_lower LIKE '%prensa%' OR name_lower LIKE '%leg press%' THEN
    RETURN 'quadriceps';
  END IF;

  -- EXTENSIÓN DE PIERNA → quadriceps
  IF name_lower LIKE '%extension%pierna%' OR name_lower LIKE '%leg extension%' THEN
    RETURN 'quadriceps';
  END IF;

  -- ZANCADAS → quadriceps
  IF name_lower LIKE '%zancada%' OR name_lower LIKE '%lunge%' OR name_lower LIKE '%estocada%' THEN
    RETURN 'quadriceps';
  END IF;

  -- HIP THRUST → glutes
  IF name_lower LIKE '%hip thrust%' OR name_lower LIKE '%puente%gluteo%' OR name_lower LIKE '%glute bridge%' THEN
    RETURN 'glutes';
  END IF;

  -- ABDUCTORES → glutes
  IF name_lower LIKE '%abductor%' OR name_lower LIKE '%abduccion%' OR name_lower LIKE '%abduction%' THEN
    RETURN 'glutes';
  END IF;

  -- ADUCTORES → quadriceps (inner thigh, part of leg work)
  IF name_lower LIKE '%aductor%' OR name_lower LIKE '%aduccion%' OR name_lower LIKE '%adduction%' THEN
    RETURN 'quadriceps';
  END IF;

  -- GEMELOS/PANTORRILLAS → calves
  IF name_lower LIKE '%gemelo%' OR name_lower LIKE '%pantorrilla%' OR name_lower LIKE '%calf%' OR name_lower LIKE '%talon%' THEN
    RETURN 'calves';
  END IF;

  -- ABDOMINALES/CRUNCH → abs
  IF name_lower LIKE '%abdominal%' OR name_lower LIKE '%crunch%' OR name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' OR name_lower LIKE '%sit up%' OR name_lower LIKE '%situp%' THEN
    RETURN 'abs';
  END IF;

  -- OBLICUOS → obliques
  IF name_lower LIKE '%oblicuo%' OR name_lower LIKE '%russian twist%' OR name_lower LIKE '%giro ruso%' THEN
    RETURN 'obliques';
  END IF;

  -- TRAPECIO/ENCOGIMIENTOS → trapezius
  IF name_lower LIKE '%trapecio%' OR name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN
    RETURN 'trapezius';
  END IF;

  -- ANTEBRAZOS → forearms
  IF name_lower LIKE '%antebrazo%' OR name_lower LIKE '%forearm%' OR name_lower LIKE '%muñeca%' OR name_lower LIKE '%wrist%' THEN
    RETURN 'forearms';
  END IF;

  -- HIPEREXTENSIONES → back
  IF name_lower LIKE '%hiperext%' OR name_lower LIKE '%hyperext%' OR name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' THEN
    RETURN 'back';
  END IF;

  -- CARDIO → fullBody (o podríamos dejarlo sin músculo)
  IF name_lower LIKE '%cardio%' OR name_lower LIKE '%burpee%' OR name_lower LIKE '%sprint%' OR name_lower LIKE '%cinta%' OR name_lower LIKE '%bicicleta%' OR name_lower LIKE '%eliptica%' OR name_lower LIKE '%remo%maquina%' THEN
    RETURN 'fullBody';
  END IF;

  -- ESTIRAMIENTOS → Mantener el primero o NULL
  IF name_lower LIKE '%estiramiento%' OR name_lower LIKE '%stretch%' THEN
    IF current_muscles IS NOT NULL AND array_length(current_muscles, 1) > 0 THEN
      RETURN current_muscles[1];
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  -- DEFAULT: Devolver el primer músculo del array
  IF current_muscles IS NOT NULL AND array_length(current_muscles, 1) > 0 THEN
    RETURN current_muscles[1];
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_exercise_video(exercise_name text)
 RETURNS TABLE(canonical_name text, video_url text, thumbnail_url text, description text, is_storage_video boolean, storage_path text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ev.canonical_name,
    ev.video_url,
    ev.thumbnail_url,
    ev.description,
    ev.is_storage_video,
    ev.storage_path
  FROM exercise_videos ev
  WHERE 
    -- Coincidencia exacta (sin distinguir mayúsculas)
    LOWER(ev.canonical_name) = LOWER(exercise_name)
    OR 
    -- Coincidencia en variaciones de nombre
    EXISTS (
      SELECT 1 FROM UNNEST(ev.name_variations) AS variation
      WHERE LOWER(variation) = LOWER(exercise_name)
    )
    OR
    -- Coincidencia parcial (contiene)
    LOWER(ev.canonical_name) LIKE '%' || LOWER(exercise_name) || '%'
  ORDER BY 
    -- Priorizar coincidencias exactas
    CASE WHEN LOWER(ev.canonical_name) = LOWER(exercise_name) THEN 0 ELSE 1 END,
    ev.priority ASC
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_exercise_videos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_user_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE user_id = p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_notifications
  WHERE user_id = p_user_id
    AND is_read = false;
  
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_empresario_messages_history(p_empresario_id text, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, sender_name text, message_title text, message_body text, recipient_type text, recipient_count integer, sent_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.sender_name,
    gm.message_title,
    gm.message_body,
    gm.recipient_type,
    CASE 
      WHEN gm.recipient_ids IS NOT NULL THEN array_length(gm.recipient_ids, 1)
      ELSE (SELECT COUNT(*)::INT FROM gym_members WHERE empresario_id = p_empresario_id AND is_active = true)
    END as recipient_count,
    gm.sent_at
  FROM gym_messages gm
  WHERE gm.empresario_id = p_empresario_id
  ORDER BY gm.sent_at DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_body_measurement(p_user_id text)
 RETURNS TABLE(id uuid, weight_kg numeric, body_fat_percentage numeric, muscle_percentage numeric, measured_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    bm.id,
    bm.weight_kg,
    bm.body_fat_percentage,
    bm.muscle_percentage,
    bm.measured_at
  FROM body_measurements bm
  WHERE bm.user_id = p_user_id
  ORDER BY bm.measured_at DESC
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_trainer_students_secure(p_trainer_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', tsr.id,
      'trainer_id', tsr.trainer_id,
      'student_id', tsr.student_id,
      'status', tsr.status,
      'created_at', tsr.created_at,
      'accepted_at', tsr.accepted_at,
      'student_name', COALESCE(up.name, 'Usuario'),
      'student_username', up.username,
      'student_photo', up.profile_photo_url
    ) 
    ORDER BY 
      CASE WHEN tsr.status = 'accepted' THEN 1 ELSE 2 END,
      tsr.created_at DESC
  ) INTO v_result
  FROM public.trainer_student_relationships tsr
  LEFT JOIN public.user_profiles up ON up.user_id = tsr.student_id
  WHERE tsr.trainer_id = p_trainer_id;

  RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_payment_history(partner_user_id text, limit_count integer DEFAULT 100)
 RETURNS SETOF partner_payments
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM partner_payments
  WHERE partner_id = partner_user_id
  ORDER BY payment_date DESC
  LIMIT limit_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.migrate_user_data(p_email text)
 RETURNS json
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
DECLARE
    v_new_user_id TEXT;
    v_old_user_id TEXT;
    v_email_clean TEXT;
BEGIN
    -- Normalizar email
    v_email_clean := LOWER(TRIM(p_email));

    -- 1. Obtener ID NUEVO (Clerk) desde el token
    v_new_user_id := auth_user_id();
    
    IF v_new_user_id IS NULL THEN
         RETURN json_build_object('success', false, 'error', 'No Auth Token found');
    END IF;

    -- 2. Buscar si existe un "usuario viejo" con ese email y UN ID DIFERENTE
    -- Usamos LOWER() para asegurar que encontramos el email sin importar mayúsculas
    SELECT user_id INTO v_old_user_id
    FROM user_profiles
    WHERE LOWER(email) = v_email_clean 
      AND user_id != v_new_user_id
    LIMIT 1;

    -- Si no está en user_profiles, buscar en admin_roles
    IF v_old_user_id IS NULL THEN
        SELECT user_id INTO v_old_user_id
        FROM admin_roles
        WHERE LOWER(email) = v_email_clean 
          AND user_id != v_new_user_id
        LIMIT 1;
    END IF;

    -- Si no hay usuario viejo, no hacemos nada
    IF v_old_user_id IS NULL THEN
        -- Verificar si YA estamos migrados (para devolver éxito)
        IF EXISTS (SELECT 1 FROM admin_roles WHERE user_id = v_new_user_id) OR
           EXISTS (SELECT 1 FROM user_profiles WHERE user_id = v_new_user_id) THEN
           RETURN json_build_object('success', true, 'message', 'Already migrated', 'new_id', v_new_user_id);
        END IF;

        RETURN json_build_object('success', true, 'message', 'No pending migration found (User not found in old data)', 'new_id', v_new_user_id);
    END IF;

    -- ========================================================================
    -- 3. EJECUTAR MIGRACIÓN (Actualizar todas las tablas)
    -- ========================================================================

    UPDATE admin_roles SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE admin_roles SET referred_by = v_new_user_id WHERE referred_by = v_old_user_id;
    UPDATE user_profiles SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE subscriptions SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE payment_history SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE gym_members SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE gym_members SET empresario_id = v_new_user_id WHERE empresario_id = v_old_user_id;
    UPDATE discount_code_usage SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE discount_code_usage SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE workout_plans SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE partner_payments SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;

    BEGIN
        UPDATE webhook_events SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    EXCEPTION WHEN undefined_column THEN NULL; END;

    IF EXISTS (SELECT 1 FROM partners WHERE id = v_old_user_id) THEN
        UPDATE partners SET id = v_new_user_id WHERE id = v_old_user_id;
    END IF;

    UPDATE partner_offer_campaigns SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE offer_code_redemptions SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE offer_code_redemptions SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE partner_monthly_stats SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE body_measurements SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE body_metrics SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE exercise_sets SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE exercises SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE friendships SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE friendships SET friend_id = v_new_user_id WHERE friend_id = v_old_user_id;
    
    BEGIN
        UPDATE gym_messages SET empresario_id = v_new_user_id WHERE empresario_id = v_old_user_id;
    EXCEPTION WHEN undefined_column THEN NULL; END;

    UPDATE health_data_daily SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE hydration_logs SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE lesson_progress SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE meal_logs SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE meal_plans SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE nutrition_plans SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE nutrition_profiles SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE nutrition_targets SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE personal_records SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE progress_photos SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE trainer_student_relationships SET trainer_id = v_new_user_id WHERE trainer_id = v_old_user_id;
    UPDATE trainer_student_relationships SET student_id = v_new_user_id WHERE student_id = v_old_user_id;
    UPDATE typing_indicators SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE user_notifications SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE user_push_tokens SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE workout_completions SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Migration successful', 
        'old_id', v_old_user_id, 
        'new_id', v_new_user_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auth_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_roles 
    WHERE user_id = auth_user_id() 
      AND role_type = 'admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_gym_member(p_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.gym_members 
    WHERE user_id = p_user_id 
      AND is_active = true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_auth_debug_info()
 RETURNS json
 LANGUAGE plpgsql SET search_path TO 'public', 'temp'
 SECURITY DEFINER
AS $function$
DECLARE
    v_sub text;
    v_claims jsonb;
    v_role text;
    v_is_admin boolean;
    v_user_id_from_func text;
BEGIN
    -- Obtener valores crudos
    v_sub := current_setting('request.jwt.claim.sub', true);
    v_claims := current_setting('request.jwt.claims', true)::jsonb;
    v_role := current_setting('role', true);
    
    -- Probar nuestras funciones
    v_user_id_from_func := auth_user_id();
    v_is_admin := is_admin();

    RETURN json_build_object(
        'jwt_sub_setting', v_sub,
        'jwt_claims', v_claims,
        'postgres_role', v_role,
        'func_auth_user_id', v_user_id_from_func,
        'func_is_admin', v_is_admin
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_stats(p_partner_id uuid)
 RETURNS TABLE(total_codes_generated bigint, total_codes_redeemed bigint, conversion_rate numeric, total_revenue numeric, active_campaigns bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(poc.codes_generated), 0)::BIGINT as total_codes_generated,
    COALESCE(SUM(poc.codes_redeemed), 0)::BIGINT as total_codes_redeemed,
    CASE 
      WHEN COALESCE(SUM(poc.codes_generated), 0) > 0 
      THEN ROUND((COALESCE(SUM(poc.codes_redeemed), 0)::DECIMAL / SUM(poc.codes_generated)::DECIMAL) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    COALESCE((SELECT SUM(price_paid) FROM offer_code_redemptions WHERE partner_id = p_partner_id), 0) as total_revenue,
    (SELECT COUNT(*) FROM partner_offer_campaigns WHERE partner_id = p_partner_id AND is_active = true)::BIGINT as active_campaigns
  FROM partner_offer_campaigns poc
  WHERE poc.partner_id = p_partner_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.count_empresario_active_members(p_empresario_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND is_active = true;
  
  RETURN member_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_update_pr()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    current_pr_weight DECIMAL(10,2);
    current_pr_reps INTEGER;
BEGIN
    -- Buscar el mejor record actual para este ejercicio y usuario
    SELECT weight_kg, reps INTO current_pr_weight, current_pr_reps
    FROM personal_records 
    WHERE user_id = NEW.user_id 
      AND exercise_name = NEW.exercise_name 
      AND is_pr = true
    ORDER BY weight_kg DESC, reps DESC
    LIMIT 1;
    
    -- Si no hay PR anterior o este es mejor, marcarlo como PR
    IF current_pr_weight IS NULL OR 
       NEW.weight_kg > current_pr_weight OR 
       (NEW.weight_kg = current_pr_weight AND NEW.reps > current_pr_reps) THEN
        
        -- Desmarcar el PR anterior si existe
        UPDATE personal_records 
        SET is_pr = false 
        WHERE user_id = NEW.user_id 
          AND exercise_name = NEW.exercise_name 
          AND is_pr = true;
        
        -- Marcar este como nuevo PR
        NEW.is_pr = true;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_revenuecat_subscription(p_user_id text, p_revenuecat_customer_id text, p_product_identifier text, p_status text, p_expiration_date timestamp with time zone, p_platform text DEFAULT 'ios'::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    revenuecat_customer_id,
    product_identifier,
    status,
    current_period_end,
    platform,
    updated_at
  ) VALUES (
    p_user_id,
    p_revenuecat_customer_id,
    p_product_identifier,
    p_status,
    p_expiration_date,
    p_platform,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    revenuecat_customer_id = EXCLUDED.revenuecat_customer_id,
    product_identifier = EXCLUDED.product_identifier,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    platform = EXCLUDED.platform,
    updated_at = NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_last_muscle_workout_sets(p_user_id text, p_exercise_id text, p_current_session_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(set_number integer, reps integer, weight_kg numeric, duration_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  last_workout_date TIMESTAMPTZ;
BEGIN
  -- Obtener la fecha del último entrenamiento de este ejercicio
  SELECT MAX(created_at) INTO last_workout_date
  FROM exercise_sets
  WHERE user_id = p_user_id
    AND exercise_id = p_exercise_id
    AND (p_current_session_id IS NULL OR workout_session_id != p_current_session_id);
  
  -- Si no hay entrenamientos previos, retornar vacío
  IF last_workout_date IS NULL THEN
    RETURN;
  END IF;
  
  -- Retornar todas las series del último entrenamiento
  RETURN QUERY
  SELECT 
    es.set_number,
    es.reps,
    es.weight_kg,
    es.duration_seconds
  FROM exercise_sets es
  WHERE 
    es.user_id = p_user_id
    AND es.exercise_id = p_exercise_id
    AND es.created_at >= last_workout_date
    AND es.created_at < last_workout_date + INTERVAL '5 minutes' -- Series del mismo entrenamiento
  ORDER BY es.set_number ASC
  LIMIT 20; -- Máximo 20 series
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_empresario_invoices_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  prefix TEXT := 'INV';
  year_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  sequence_num INTEGER;
BEGIN
  -- Obtener el siguiente número de secuencia para este mes
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM empresario_invoices
  WHERE invoice_number LIKE prefix || '-' || year_month || '-%';
  
  RETURN prefix || '-' || year_month || '-' || LPAD(sequence_num::TEXT, 5, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.migrate_muscle_names(muscle_array text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  result text[] := '{}';
  muscle text;
  mapped_muscle text;
BEGIN
  IF muscle_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOREACH muscle IN ARRAY muscle_array
  LOOP
    -- Mapear inglés a español
    mapped_muscle := CASE lower(muscle)
      WHEN 'back' THEN 'espalda'
      WHEN 'chest' THEN 'pecho'
      WHEN 'shoulders' THEN 'hombros'
      WHEN 'biceps' THEN 'bíceps'
      WHEN 'triceps' THEN 'tríceps'
      WHEN 'forearms' THEN 'antebrazos'
      WHEN 'traps' THEN 'trapecio'
      WHEN 'quads' THEN 'cuádriceps'
      WHEN 'quadriceps' THEN 'cuádriceps'
      WHEN 'hamstrings' THEN 'isquiotibiales'
      WHEN 'glutes' THEN 'glúteos'
      WHEN 'calves' THEN 'pantorrillas'
      WHEN 'abs' THEN 'abdominales'
      WHEN 'core' THEN 'abdominales'
      WHEN 'obliques' THEN 'oblicuos'
      WHEN 'lower_back' THEN 'lumbares'
      WHEN 'full_body' THEN 'cuerpo_completo'
      WHEN 'lats' THEN 'espalda'
      ELSE muscle -- Mantener si ya está en español o es desconocido
    END;
    
    -- Solo agregar si no está duplicado
    IF NOT mapped_muscle = ANY(result) THEN
      result := array_append(result, mapped_muscle);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_push_tokens_for_users(p_user_ids text[])
 RETURNS TABLE(user_id text, push_token text, platform text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    upt.user_id,
    upt.push_token,
    upt.platform
  FROM user_push_tokens upt
  WHERE upt.user_id = ANY(p_user_ids);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id text, p_limit integer DEFAULT 20, p_unread_only boolean DEFAULT false)
 RETURNS TABLE(id uuid, notification_type text, title text, message text, sender_name text, related_id uuid, is_read boolean, created_at timestamp with time zone, read_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    un.id,
    un.notification_type,
    un.title,
    un.message,
    un.sender_name,
    un.related_id,  -- Campo nuevo agregado
    un.is_read,
    un.created_at,
    un.read_at
  FROM user_notifications un
  WHERE un.user_id = p_user_id
    AND (NOT p_unread_only OR un.is_read = false)
  ORDER BY un.created_at DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.activate_workout_plan(p_user_id text, p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_current_monday DATE;
  v_last_week_monday DATE;
  v_should_increment BOOLEAN;
BEGIN
  -- Calcular el lunes de la semana actual usando ISODOW (lunes = 1)
  v_current_monday := CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER - 1);
  
  -- Obtener el last_week_monday del plan que se está activando
  SELECT last_week_monday INTO v_last_week_monday
  FROM public.workout_plans
  WHERE id = p_plan_id AND user_id = p_user_id;
  
  -- Si no se encontró el plan, lanzar error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado para user_id=% y plan_id=%', p_user_id, p_plan_id;
  END IF;
  
  -- Determinar si debemos incrementar el contador
  -- Solo incrementar si:
  -- 1. El plan ya tiene un last_week_monday (no es la primera activación)
  -- 2. El last_week_monday es diferente al lunes de esta semana (no se reactivó en la misma semana)
  v_should_increment := (v_last_week_monday IS NOT NULL AND v_last_week_monday != v_current_monday);
  
  -- Desactivar todos los planes activos del usuario
  UPDATE public.workout_plans
    SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;

  -- Activar el plan seleccionado y actualizar campos de tracking
  UPDATE public.workout_plans
    SET 
      is_active = true,
      activated_at = NOW(),
      last_week_monday = v_current_monday,
      times_repeated = CASE 
        WHEN v_should_increment THEN COALESCE(times_repeated, 0) + 1
        ELSE COALESCE(times_repeated, 0)
      END,
      updated_at = NOW()
  WHERE id = p_plan_id
    AND user_id = p_user_id;
    
  -- Verificar que se actualizó correctamente
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo activar el plan para user_id=% y plan_id=%', p_user_id, p_plan_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_redemption_count(p_campaign_id uuid, p_partner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  -- Incrementar contador en la campaña
  UPDATE partner_offer_campaigns
  SET 
    codes_redeemed = COALESCE(codes_redeemed, 0) + 1,
    updated_at = NOW()
  WHERE id = p_campaign_id;
  
  -- Actualizar timestamp del partner
  UPDATE partners
  SET updated_at = NOW()
  WHERE id = p_partner_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_empresario_user_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_max_users INTEGER;
    v_current_count INTEGER;
    v_empresario_name TEXT;
BEGIN
    -- Obtener el límite del empresario
    SELECT max_users, gym_name INTO v_max_users, v_empresario_name
    FROM admin_roles
    WHERE user_id = NEW.empresario_id;

    -- Si max_users es NULL, no hay límite, permitir inserción
    IF v_max_users IS NULL THEN
        RETURN NEW;
    END IF;

    -- Contar usuarios activos actuales del empresario
    -- Nota: No contamos el que se está insertando todavía
    SELECT COUNT(*) INTO v_current_count
    FROM gym_members
    WHERE empresario_id = NEW.empresario_id
      AND is_active = true;

    -- Verificar si se alcanzó el límite
    IF v_current_count >= v_max_users THEN
        RAISE EXCEPTION 'El empresario % ha alcanzado su límite de usuarios permitidos (% users).', v_empresario_name, v_max_users;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_empresario_limit_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_max_users INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Solo verificar si se está cambiando is_active de false a true
    IF (OLD.is_active = false OR OLD.is_active IS NULL) AND NEW.is_active = true THEN
        
        -- Obtener el límite del empresario
        SELECT max_users INTO v_max_users
        FROM admin_roles
        WHERE user_id = NEW.empresario_id;

        -- Si max_users es NULL, permitir
        IF v_max_users IS NULL THEN
            RETURN NEW;
        END IF;

        -- Contar usuarios activos (excluyendo este registro para evitar doble conteo si ya era activo, aunque aquí filtré por cambio de estado)
        SELECT COUNT(*) INTO v_current_count
        FROM gym_members
        WHERE empresario_id = NEW.empresario_id
          AND is_active = true
          AND user_id != NEW.user_id; -- Excluirse a sí mismo

        -- Verificar límite
        IF v_current_count >= v_max_users THEN
            RAISE EXCEPTION 'No se puede activar el usuario. El empresario ha alcanzado su límite (% users).', v_max_users;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_weekly_changes(p_user_id text)
 RETURNS TABLE(weight_change_kg numeric, body_fat_change numeric, muscle_change numeric, weeks_tracked integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH recent_measurements AS (
    SELECT 
      bm.weight_kg,
      bm.body_fat_percentage,
      bm.muscle_percentage,
      bm.measured_at,
      ROW_NUMBER() OVER (ORDER BY bm.measured_at DESC) as rn
    FROM body_measurements bm
    WHERE bm.user_id = p_user_id
      AND bm.measured_at >= NOW() - INTERVAL '8 weeks'
  ),
  latest AS (
    SELECT * FROM recent_measurements WHERE rn = 1
  ),
  previous AS (
    SELECT * FROM recent_measurements WHERE rn = 2
  ),
  measurement_count AS (
    SELECT COUNT(*)::INTEGER as total FROM recent_measurements
  )
  SELECT 
    CASE 
      WHEN measurement_count.total >= 2 THEN latest.weight_kg - previous.weight_kg
      ELSE NULL
    END as weight_change_kg,
    CASE 
      WHEN measurement_count.total >= 2 THEN latest.body_fat_percentage - previous.body_fat_percentage
      ELSE NULL
    END as body_fat_change,
    CASE 
      WHEN measurement_count.total >= 2 THEN latest.muscle_percentage - previous.muscle_percentage
      ELSE NULL
    END as muscle_change,
    measurement_count.total as weeks_tracked
  FROM latest
  LEFT JOIN previous ON true
  CROSS JOIN measurement_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_test_partner_to_email(target_email text, source_discount_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  target_user_id_text TEXT;
  target_partner_uuid UUID;
  source_partner_id UUID;
  affected_referrals INTEGER;
  affected_usages INTEGER;
  affected_children INTEGER;
BEGIN
  -- 1. Buscar el ID del usuario (Clerk ID o Auth ID)
  SELECT user_id INTO target_user_id_text FROM admin_roles WHERE email = target_email LIMIT 1;
  
  IF target_user_id_text IS NULL THEN
      SELECT id::text INTO target_user_id_text FROM auth.users WHERE email = target_email;
  END IF;

  IF target_user_id_text IS NULL THEN
    RETURN 'Error: No se encontró ningún usuario con el email ' || target_email || ' en admin_roles ni auth.users.';
  END IF;

  -- 2. Obtener ID del socio de prueba (source)
  SELECT id INTO source_partner_id 
  FROM admin_roles 
  WHERE discount_code = source_discount_code 
  LIMIT 1;

  -- Si no encontramos el source, verificamos si el target YA tiene el código (idempotencia)
  IF source_partner_id IS NULL THEN
     PERFORM 1 FROM admin_roles WHERE email = target_email AND discount_code = source_discount_code;
     IF FOUND THEN
        RETURN 'Aviso: El usuario ' || target_email || ' ya tiene el código ' || source_discount_code || ' (Probablemente ya se ejecutó)';
     END IF;
     RETURN 'Error: No se encontró socio de prueba original con código ' || source_discount_code;
  END IF;

  -- 3. Identificar si el target ya existe en admin_roles para obtener su UUID
  SELECT id INTO target_partner_uuid FROM admin_roles WHERE user_id = target_user_id_text;

  -- CRÍTICO: Primero LIBERAMOS el código del socio de prueba para evitar error de UNIQUE constraint
  UPDATE admin_roles 
  SET 
    discount_code = discount_code || '_OLD_' || floor(random()*1000)::text,
    is_active = false
  WHERE id = source_partner_id;

  -- 4. Ahora sí, asignamos el código al usuario real (Target)
  IF target_partner_uuid IS NULL THEN
    -- Crear el rol si no existe
    INSERT INTO admin_roles (user_id, email, role_type, name, is_active, discount_code, commission_per_subscription)
    VALUES (target_user_id_text, target_email, 'socio', 'Usuario Vinculado', true, source_discount_code, 3.00)
    RETURNING id INTO target_partner_uuid;
  ELSE
    -- Si ya existe, actualizamos sus datos
    UPDATE admin_roles
    SET 
      discount_code = source_discount_code,
      role_type = 'socio',
      commission_per_subscription = 3.00,
      commission_per_subscription_2nd_level = 1.00,
      is_active = true
    WHERE id = target_partner_uuid;
  END IF;

  -- 5. Transferir Referidos (offer_code_redemptions usa UUID)
  UPDATE offer_code_redemptions
  SET partner_id = target_partner_uuid
  WHERE partner_id = source_partner_id;
  GET DIAGNOSTICS affected_referrals = ROW_COUNT;

  -- 6. Transferir Usos de Código (discount_code_usage usa User ID Text)
  UPDATE discount_code_usage
  SET partner_id = target_user_id_text
  WHERE partner_id = (SELECT user_id FROM admin_roles WHERE id = source_partner_id);
  GET DIAGNOSTICS affected_usages = ROW_COUNT;

  -- 7. Transferir Sub-socios (referred_by usa User ID Text)
  UPDATE admin_roles
  SET referred_by = target_user_id_text
  WHERE referred_by = (SELECT user_id FROM admin_roles WHERE id = source_partner_id);
  GET DIAGNOSTICS affected_children = ROW_COUNT;

  RETURN 'Éxito: Se vincularon ' || affected_referrals || ' referidos y ' || affected_children || ' sub-socios a ' || target_email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_muscle_zone(zone_array text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  result text[] := '{}';
  zone text;
  mapped_zone text;
BEGIN
  IF zone_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOREACH zone IN ARRAY zone_array
  LOOP
    mapped_zone := CASE lower(zone)
      -- Español a Inglés
      WHEN 'pecho_superior' THEN 'upper_chest'
      WHEN 'pecho_medio' THEN 'mid_chest'
      WHEN 'pecho_inferior' THEN 'lower_chest'
      WHEN 'espalda_superior' THEN 'upper_back'
      WHEN 'espalda_media' THEN 'mid_back'
      WHEN 'espalda_inferior' THEN 'lower_back'
      WHEN 'espalda_baja' THEN 'lower_back'
      WHEN 'hombros_frontales' THEN 'front_delts'
      WHEN 'hombros_medios' THEN 'side_delts'
      WHEN 'hombros_posteriores' THEN 'rear_delts'
      WHEN 'biceps_cabeza_larga' THEN 'biceps_long_head'
      WHEN 'biceps_cabeza_corta' THEN 'biceps_short_head'
      WHEN 'braquial' THEN 'brachialis'
      WHEN 'triceps_cabeza_lateral' THEN 'triceps_lateral'
      WHEN 'triceps_cabeza_medial' THEN 'triceps_medial'
      WHEN 'triceps_cabeza_larga' THEN 'triceps_long'
      WHEN 'cuadriceps_frontal' THEN 'quad_front'
      WHEN 'cuadriceps_lateral' THEN 'quad_lateral'
      WHEN 'cuadriceps_medial' THEN 'quad_medial'
      WHEN 'cuadriceps_intermedio' THEN 'quad_front'
      WHEN 'isquiotibiales_superior' THEN 'hamstrings_upper'
      WHEN 'isquiotibiales_medio' THEN 'hamstrings_mid'
      WHEN 'isquiotibiales_inferior' THEN 'hamstrings_lower'
      WHEN 'gluteos_superior' THEN 'glutes_upper'
      WHEN 'gluteos_medio' THEN 'glutes_mid'
      WHEN 'gluteos_inferior' THEN 'glutes_lower'
      WHEN 'gemelos' THEN 'gastrocnemius'
      WHEN 'soleo' THEN 'soleus'
      WHEN 'abdominales_superiores' THEN 'upper_abs'
      WHEN 'abdominales_inferiores' THEN 'lower_abs'
      WHEN 'transverso' THEN 'transverse'
      WHEN 'oblicuos_externos' THEN 'external_obliques'
      WHEN 'oblicuos_internos' THEN 'internal_obliques'
      WHEN 'romboides' THEN 'rhomboids'
      WHEN 'trapecio_superior' THEN 'upper_back'
      WHEN 'trapecio_medio' THEN 'mid_back'
      -- Mantener si ya está en inglés
      ELSE zone
    END;
    
    IF NOT mapped_zone = ANY(result) THEN
      result := array_append(result, mapped_zone);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_empresario_expiration_status(p_empresario_id text)
 RETURNS TABLE(expires_at timestamp with time zone, days_until_expiration integer, days_overdue integer, is_service_active boolean, in_grace_period boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT subscription_expires_at INTO v_expires_at
    FROM admin_roles
    WHERE user_id = p_empresario_id;

    RETURN QUERY
    SELECT 
        v_expires_at,
        EXTRACT(DAY FROM (v_expires_at - v_now))::INTEGER as days_until_expiration,
        CASE WHEN v_now > v_expires_at THEN EXTRACT(DAY FROM (v_now - v_expires_at))::INTEGER ELSE 0 END as days_overdue,
        (v_expires_at IS NULL OR v_now <= (v_expires_at + INTERVAL '7 days')) as is_service_active,
        (v_now > v_expires_at AND v_now <= (v_expires_at + INTERVAL '7 days')) as in_grace_period;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE id = p_notification_id
    AND is_read = false;
  
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_empresario_users(p_empresario_id text)
 RETURNS TABLE(user_id uuid, email text, name text, username text, age integer, fitness_level text, gender text, joined_at timestamp with time zone, is_active boolean, has_subscription boolean, subscription_status text, has_workout_plan boolean, subscription_expires_at timestamp with time zone, notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    gm.user_id, 
    COALESCE(up.email, 'Sin email registrado') as email, 
    COALESCE(up.name, 'Usuario Pendiente') as name,
    up.username, 
    up.age,
    up.fitness_level,
    up.gender,
    gm.joined_at,
    gm.is_active,
    CASE 
      WHEN s.status = 'active' OR s.status = 'trialing' THEN true 
      ELSE false 
    END as has_subscription,
    s.status as subscription_status,
    CASE 
      WHEN wp.id IS NOT NULL THEN true 
      ELSE false 
    END as has_workout_plan,
    s.current_period_end as subscription_expires_at,
    gm.notes
  FROM 
    gym_members gm
  LEFT JOIN 
    user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN 
    subscriptions s ON gm.user_id = s.user_id 
  LEFT JOIN 
    (SELECT DISTINCT ON (user_id) user_id, id FROM workout_plans ORDER BY user_id, created_at DESC) wp ON gm.user_id = wp.user_id
  WHERE 
    -- Cast p_empresario_id or gm.empresario_id to text to ensure comparison works
    gm.empresario_id::text = p_empresario_id
  ORDER BY 
    gm.joined_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_partner_referral_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  IF NEW.partner_id IS NOT NULL THEN
    UPDATE admin_roles
    SET referral_stats = get_partner_referral_stats(NEW.partner_id),
        updated_at = NOW()
    WHERE user_id = NEW.partner_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_partner_total_earnings()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE admin_roles
    SET 
      total_earnings = total_earnings + NEW.amount,
      last_payment_date = NEW.payment_date,
      updated_at = NOW()
    WHERE user_id = NEW.partner_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_gym_message(p_empresario_id text, p_sender_name text, p_message_title text, p_message_body text, p_recipient_type text, p_recipient_ids text[] DEFAULT NULL::text[])
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_message_id UUID;
  v_recipient_list TEXT[];
  v_recipient_count INT;
BEGIN
  -- Validar tipo de destinatario
  IF p_recipient_type NOT IN ('all', 'selected') THEN
    RAISE EXCEPTION 'Tipo de destinatario inválido: %', p_recipient_type;
  END IF;

  -- Determinar lista de destinatarios
  IF p_recipient_type = 'all' THEN
    -- Todos los miembros activos del gimnasio
    SELECT ARRAY_AGG(user_id) INTO v_recipient_list
    FROM gym_members
    WHERE empresario_id = p_empresario_id
      AND is_active = true;
  ELSIF p_recipient_type = 'selected' THEN
    -- Lista específica de usuarios seleccionados
    v_recipient_list := p_recipient_ids;
  END IF;

  -- Validar que haya destinatarios
  IF v_recipient_list IS NULL OR ARRAY_LENGTH(v_recipient_list, 1) = 0 THEN
    RAISE EXCEPTION 'No hay destinatarios para enviar el mensaje';
  END IF;

  v_recipient_count := ARRAY_LENGTH(v_recipient_list, 1);

  -- Insertar el mensaje en la tabla gym_messages
  INSERT INTO gym_messages (
    empresario_id,
    sender_name,
    title,
    message,
    recipient_type,
    recipient_ids,
    recipient_count
  ) VALUES (
    p_empresario_id,
    p_sender_name,
    p_message_title,
    p_message_body,
    p_recipient_type,
    v_recipient_list,
    v_recipient_count
  )
  RETURNING id INTO v_message_id;

  -- Crear notificaciones individuales para cada destinatario
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    sender_name,
    gym_message_id
  )
  SELECT
    unnest(v_recipient_list),
    p_message_title,
    p_message_body,
    p_sender_name,
    v_message_id;

  -- Retornar resultado
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message_id', v_message_id,
    'recipient_count', v_recipient_count
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.respond_to_trainer_invitation(p_student_id text, p_relationship_id uuid, p_accept boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_trainer_id TEXT;
BEGIN
  -- Obtener el trainer_id
  SELECT trainer_id INTO v_trainer_id
  FROM public.trainer_student_relationships
  WHERE id = p_relationship_id AND student_id = p_student_id AND status = 'pending';

  IF v_trainer_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitación no encontrada'
    );
  END IF;

  IF p_accept THEN
    -- Aceptar la invitación
    UPDATE public.trainer_student_relationships
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = p_relationship_id;

    -- Aceptar automáticamente la solicitud de amistad si existe
    UPDATE public.friendships
    SET status = 'accepted', updated_at = NOW()
    WHERE (user_id = v_trainer_id AND friend_id = p_student_id)
       OR (user_id = p_student_id AND friend_id = v_trainer_id);

    RETURN json_build_object(
      'success', true,
      'message', 'Invitación aceptada'
    );
  ELSE
    -- Rechazar la invitación
    UPDATE public.trainer_student_relationships
    SET status = 'rejected', updated_at = NOW()
    WHERE id = p_relationship_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Invitación rechazada'
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_total_revenue_today DECIMAL(10, 2);
    v_active_partners_count INT;
    v_churn_rate DECIMAL(5, 2);
    v_revenue_split JSON;
    v_daily_revenue_7d JSON;
    v_users_active_start INT;
    v_users_cancelled_month INT;
BEGIN
    -- 1. Ingresos de HOY
    -- Asumimos que payment_history tiene 'created_at' o 'payment_date'
    SELECT COALESCE(SUM(total_paid), 0)
    INTO v_total_revenue_today
    FROM payment_history
    WHERE DATE(payment_date) = CURRENT_DATE;

    -- 2. Socios Activos (que han traído al menos 1 suscripción activa)
    SELECT COUNT(DISTINCT ar.user_id)
    INTO v_active_partners_count
    FROM admin_roles ar
    JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
    JOIN subscriptions s ON s.user_id = dcu.user_id
    WHERE ar.role_type = 'socio'
    AND s.status = 'active';

    -- 3. Tasa de Cancelación (Churn Rate) del mes actual
    -- Fórmula simple: Cancelados este mes / (Activos al inicio + Nuevos este mes)
    -- O más estándar: Cancelados / Activos al inicio.
    SELECT COUNT(*) INTO v_users_active_start
    FROM subscriptions
    WHERE status = 'active' OR (status = 'canceled' AND canceled_at >= DATE_TRUNC('month', CURRENT_DATE));
    
    SELECT COUNT(*) INTO v_users_cancelled_month
    FROM subscriptions
    WHERE status = 'canceled' 
    AND canceled_at >= DATE_TRUNC('month', CURRENT_DATE);

    IF v_users_active_start > 0 THEN
        v_churn_rate := (v_users_cancelled_month::DECIMAL / v_users_active_start::DECIMAL) * 100;
    ELSE
        v_churn_rate := 0;
    END IF;

    -- 4. Desglose de Ingresos (Directos vs Referidos) - Histórico Total
    -- Se asume que si está en discount_code_usage es referido.
    WITH RevenueSource AS (
        SELECT 
            CASE 
                WHEN dcu.id IS NOT NULL THEN 'partner' 
                ELSE 'direct' 
            END as source,
            COALESCE(SUM(ph.total_paid), 0) as amount
        FROM payment_history ph
        LEFT JOIN discount_code_usage dcu ON ph.user_id = dcu.user_id
        GROUP BY 1
    )
    SELECT json_object_agg(source, amount) INTO v_revenue_split FROM RevenueSource;

    -- 5. Ingresos Diarios (Últimos 7 días)
    SELECT json_agg(t) INTO v_daily_revenue_7d
    FROM (
        SELECT 
            DATE(payment_date) as date,
            SUM(total_paid) as amount
        FROM payment_history
        WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1
    ) t;

    RETURN json_build_object(
        'revenue_today', v_total_revenue_today,
        'active_partners', v_active_partners_count,
        'churn_rate', v_churn_rate,
        'revenue_split', v_revenue_split,
        'daily_revenue', v_daily_revenue_7d
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_commission_history(target_user_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    partner_row admin_roles%ROWTYPE;
    commission_history JSON;
BEGIN
    -- 1. Obtener configuración del partner
    SELECT * INTO partner_row FROM admin_roles WHERE user_id = target_user_id LIMIT 1;
    
    IF partner_row IS NULL THEN
        RETURN json_build_object('error', 'Partner not found');
    END IF;

    -- 2. Calcular historial combinando Nivel 1 y Nivel 2
    WITH level1_commissions AS (
        -- DIRECTOS (Nivel 1)
        SELECT 
            ph.created_at as transaction_date,
            up.name as source_user_name,
            up.email as source_user_email,
            'Nivel 1 (Directo)' as level,
            ph.monthly_amount as payment_amount,
            CASE 
                -- Si es suscripción anual (aprox > $100 o criterio de negocio), usar comisión anual
                WHEN ph.monthly_amount > 100 THEN COALESCE(partner_row.commission_per_annual_subscription, 21.00)
                -- Si es mensual
                ELSE COALESCE(partner_row.commission_per_subscription, 3.00)
            END as commission_amount,
            'Comisión por suscripción directa' as description
        FROM discount_code_usage dcu
        JOIN user_profiles up ON dcu.user_id::text = up.user_id
        JOIN payment_history ph ON ph.user_id = up.user_id::uuid
        WHERE dcu.partner_id = partner_row.id -- Usar ID de la tabla roles
        AND ph.status = 'succeeded'
    ),
    level2_commissions AS (
        -- INDIRECTOS (Nivel 2)
        -- Partners hijos referidos por este partner
        SELECT 
            ph.created_at as transaction_date,
            up.name as source_user_name,
            up.email as source_user_email,
            'Nivel 2 (Indirecto)' as level,
            ph.monthly_amount as payment_amount,
            CASE 
                WHEN ph.monthly_amount > 100 THEN COALESCE(partner_row.commission_per_annual_subscription_2nd_level, 7.00)
                ELSE COALESCE(partner_row.commission_per_subscription_2nd_level, 1.00)
            END as commission_amount,
            'Comisión por referido de ' || child_partner.name as description
        FROM admin_roles child_partner
        JOIN discount_code_usage dcu_child ON dcu_child.partner_id = child_partner.id
        JOIN user_profiles up ON dcu_child.user_id::text = up.user_id
        JOIN payment_history ph ON ph.user_id = up.user_id::uuid
        WHERE child_partner.referred_by = partner_row.id -- Hijos de este partner
        AND ph.status = 'succeeded'
    )
    SELECT json_agg(t) INTO commission_history
    FROM (
        SELECT * FROM level1_commissions
        UNION ALL
        SELECT * FROM level2_commissions
        ORDER BY transaction_date DESC
    ) t;

    RETURN COALESCE(commission_history, '[]'::json);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_data_consistency()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_orphaned_subs INT;
    v_orphaned_payments INT;
    v_orphaned_roles INT;
    v_inconsistent_gym_users INT;
    v_details JSON;
BEGIN
    -- 1. Suscripciones sin usuario en user_profiles
    SELECT COUNT(*) INTO v_orphaned_subs
    FROM subscriptions s
    LEFT JOIN user_profiles u ON s.user_id = u.user_id
    WHERE u.user_id IS NULL;

    -- 2. Pagos sin usuario
    SELECT COUNT(*) INTO v_orphaned_payments
    FROM payment_history p
    LEFT JOIN user_profiles u ON p.user_id = u.user_id
    WHERE u.user_id IS NULL;

    -- 3. Roles admin sin perfil (opcional, a veces es válido si no han completado onboarding)
    SELECT COUNT(*) INTO v_orphaned_roles
    FROM admin_roles ar
    LEFT JOIN user_profiles u ON ar.user_id = u.user_id
    WHERE u.user_id IS NULL;

    -- 4. Usuarios de gimnasio activos pero con suscripción cancelada/inexistente (Inconsistencia lógica)
    SELECT COUNT(*) INTO v_inconsistent_gym_users
    FROM gym_members gm
    LEFT JOIN subscriptions s ON gm.user_id = s.user_id
    WHERE gm.is_active = true 
    AND (s.status IS NULL OR s.status != 'active')
    AND gm.subscription_expires_at > CURRENT_TIMESTAMP; -- Si tienen fecha futura válida, ignora el estado de subscripción tabla

    -- Construir detalle
    v_details := json_build_array(
        json_build_object('type', 'orphaned_subscriptions', 'count', v_orphaned_subs, 'message', 'Suscripciones cuyo usuario no existe'),
        json_build_object('type', 'orphaned_payments', 'count', v_orphaned_payments, 'message', 'Pagos históricos sin usuario asociado'),
        json_build_object('type', 'orphaned_roles', 'count', v_orphaned_roles, 'message', 'Roles administrativos sin perfil de usuario base'),
        json_build_object('type', 'inconsistent_gym_members', 'count', v_inconsistent_gym_users, 'message', 'Miembros de gimnasio activos sin suscripción válida')
    );

    RETURN json_build_object(
        'has_issues', (v_orphaned_subs + v_orphaned_payments + v_inconsistent_gym_users) > 0,
        'summary', json_build_object(
            'orphaned_subs', v_orphaned_subs,
            'orphaned_payments', v_orphaned_payments,
            'orphaned_roles', v_orphaned_roles,
            'inconsistent_gym', v_inconsistent_gym_users
        ),
        'details', v_details
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_push_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.extend_gym_member_subscription(p_empresario_id text, p_user_id text, p_new_expiry timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_updated_member JSON;
BEGIN
  -- Check if member exists and belongs to empresario
  -- We cast to text/uuid as needed. gym_members.user_id is UUID 
  -- but we might pass text from frontend (Clerk ID) if we fixed the table
  -- wait, gym_members.user_id IS UUID in definition? 
  -- In previous steps I found it might be UUID but Clerk IDs are text. 
  -- If createGymUser inserts text into UUID column it would fail unless the column IS text.
  -- Let's assume user_id is compatible with what is passed.
  -- But wait, my previous V2 fix CAST user_id to text in the SELECT.
  -- This implies the column might be UUID and Clerk IDs are NOT used?
  -- OR the column is UUID and the user IDs are actually UUIDs?
  -- create-gym-user script uses `clerkCreateUserResponse.id` which is usually `user_...`.
  -- If gym_members.user_id is UUID, insert triggers must be failing OR it's actually TEXT.
  -- The error "column reference user_id is ambiguous" happened in my V2 function because I used `user_id` as output param.
  -- The valid fix was casting `gm.user_id::text`.
  -- This suggests `gm.user_id` MIGHT be UUID.
  -- If Clerk IDs are `user_...`, they CANNOT be cast to UUID.
  -- So `gm.user_id` MUST be TEXT if it stores Clerk IDs.
  -- If `gm.user_id` is UUID, then Clerk IDs are NOT stored there directly?
  -- No, `create-gym-user` inserts `user_id: clerkUserId`.
  -- If `gym_members.user_id` is UUID, then it must be failing for `user_...` IDs.
  -- BUT `create-gym-user` works? 
  -- Maybe I should cast `p_user_id` to the column type.
  -- To be safe, I will try to update casting both sides to text if needed.
  
  -- Actually, to be safest, let's just let Postgres handle the types by using the column reference directly
  
  UPDATE gym_members
  SET 
    subscription_expires_at = p_new_expiry,
    is_active = true -- Reactivate if expired
  WHERE 
    empresario_id::text = p_empresario_id 
    AND user_id::text = p_user_id
  RETURNING row_to_json(gym_members.*) INTO v_updated_member;

  IF v_updated_member IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Member not found or does not belong to this empresario');
  END IF;

  RETURN json_build_object('success', true, 'data', v_updated_member);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clean_test_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
    -- Eliminar datos en orden de dependencia
    DELETE FROM payment_history WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM discount_code_usage WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM gym_members WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM admin_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    
    -- Finalmente eliminar de auth.users (requiere permisos de superusuario o rol de servicio)
    -- Nota: Si esto falla por permisos, los usuarios quedarán en auth pero sin perfil.
    DELETE FROM auth.users WHERE email LIKE '%@test.fitmind.com';
    
    RAISE NOTICE 'Datos de prueba eliminados correctamente.';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.send_trainer_invitation(p_trainer_id text, p_student_username text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_student_id TEXT;
  v_relationship_id UUID;
  v_permissions_id UUID;
  v_friendship_exists BOOLEAN;
BEGIN
  -- Buscar el user_id del alumno por username
  SELECT user_id INTO v_student_id
  FROM public.user_profiles
  WHERE username = p_student_username;

  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
  END IF;

  -- Verificar que no sea el mismo usuario
  IF v_student_id = p_trainer_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes enviarte una invitación a ti mismo'
    );
  END IF;

  -- Verificar si ya existe una relación
  IF EXISTS (
    SELECT 1 FROM public.trainer_student_relationships
    WHERE trainer_id = p_trainer_id AND student_id = v_student_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya existe una invitación con este usuario'
    );
  END IF;

  -- Crear la relación
  INSERT INTO public.trainer_student_relationships (trainer_id, student_id, status)
  VALUES (p_trainer_id, v_student_id, 'pending')
  RETURNING id INTO v_relationship_id;

  -- Crear permisos por defecto
  INSERT INTO public.trainer_permissions (relationship_id)
  VALUES (v_relationship_id)
  RETURNING id INTO v_permissions_id;

  -- Verificar si ya son amigos
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = p_trainer_id AND friend_id = v_student_id AND status = 'accepted')
       OR (user_id = v_student_id AND friend_id = p_trainer_id AND status = 'accepted')
  ) INTO v_friendship_exists;

  -- Si no son amigos, crear solicitud de amistad automáticamente
  IF NOT v_friendship_exists THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.friendships
      WHERE (user_id = p_trainer_id AND friend_id = v_student_id)
         OR (user_id = v_student_id AND friend_id = p_trainer_id)
    ) THEN
      INSERT INTO public.friendships (user_id, friend_id, status)
      VALUES (p_trainer_id, v_student_id, 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'relationship_id', v_relationship_id,
    'student_id', v_student_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_active_users_stats(partner_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_referrals', COUNT(*),
    'active_users', COUNT(*) FILTER (WHERE is_active = true),
    'inactive_users', COUNT(*) FILTER (WHERE is_active = false),
    'active_subscriptions', COUNT(DISTINCT referred_user_id) FILTER (WHERE is_active = true),
    'new_users_30d', COUNT(*) FILTER (WHERE code_used_at >= NOW() - INTERVAL '30 days'),
    'new_active_30d', COUNT(*) FILTER (WHERE is_active = true AND code_used_at >= NOW() - INTERVAL '30 days')
  ) INTO stats
  FROM partner_active_users
  WHERE partner_user_id = partner_user_id;
  
  RETURN stats;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_active_users_list(partner_user_id text)
 RETURNS TABLE(referred_user_id text, referred_user_name text, referred_user_email text, subscription_status text, subscription_end_date timestamp with time zone, is_active boolean, code_used_at timestamp with time zone, days_active integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pau.referred_user_id,
    pau.referred_user_name,
    pau.referred_user_email,
    pau.subscription_status,
    pau.subscription_end_date,
    pau.is_active,
    pau.code_used_at,
    CASE 
      WHEN pau.subscription_created_at IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - pau.subscription_created_at))::INTEGER
      ELSE 0
    END AS days_active
  FROM partner_active_users pau
  WHERE pau.partner_user_id = partner_user_id
    AND pau.is_active = true
  ORDER BY pau.code_used_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_referral_stats(partner_user_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_partner_uuid UUID;
    total_referrals INTEGER;
    free_access_referrals INTEGER;
    paid_referrals INTEGER;
    active_subscriptions INTEGER;
    total_revenue NUMERIC(10, 2);
BEGIN
    -- 1. Obtener UUID del partner desde su User ID (Clerk)
    SELECT id INTO v_partner_uuid FROM admin_roles WHERE user_id = partner_user_id;

    IF v_partner_uuid IS NULL THEN
        -- Si no encuentra UUID, retorna todo en 0 para no romper el frontend
        RETURN json_build_object(
            'total_referrals', 0,
            'free_access_referrals', 0,
            'paid_referrals', 0,
            'active_subscriptions', 0,
            'total_revenue', 0,
            'debug_message', 'Partner UUID not found for user_id: ' || partner_user_id
        );
    END IF;

    -- 2. Calcular estadísticas directas de la tabla offer_code_redemptions
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_free_access = true),
        COUNT(*) FILTER (WHERE is_free_access = false),
        COALESCE(SUM(price_paid), 0)
    INTO 
        total_referrals,
        free_access_referrals,
        paid_referrals,
        total_revenue
    FROM offer_code_redemptions
    WHERE partner_id = v_partner_uuid;

    -- 3. Calcular suscripciones activas
    SELECT COUNT(*)
    INTO active_subscriptions
    FROM subscriptions s
    JOIN offer_code_redemptions ocr ON s.user_id = ocr.user_id
    WHERE ocr.partner_id = v_partner_uuid
    AND s.status IN ('active', 'trialing');

    RETURN json_build_object(
        'total_referrals', total_referrals,
        'free_access_referrals', free_access_referrals,
        'paid_referrals', paid_referrals,
        'active_subscriptions', active_subscriptions,
        'total_revenue', total_revenue,
        'partner_uuid', v_partner_uuid -- Debug info
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_health_data_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_test_data(p_user_count integer DEFAULT 50)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_created_at TIMESTAMP;
    v_i INT;
    v_j INT;
    v_plan_amount DECIMAL;
    v_status TEXT;
    v_partner_id UUID;
BEGIN
    -- Crear un Partner de prueba para referidos (si no existe)
    SELECT id INTO v_partner_id FROM auth.users WHERE email = 'partner_test@test.fitmind.com';
    
    IF v_partner_id IS NULL THEN
        INSERT INTO auth.users (id, email, created_at)
        VALUES (gen_random_uuid(), 'partner_test@test.fitmind.com', NOW() - INTERVAL '6 months')
        RETURNING id INTO v_partner_id;

        INSERT INTO admin_roles (user_id, email, role_type, name, is_active)
        VALUES (v_partner_id, 'partner_test@test.fitmind.com', 'empresario', 'Partner Test Gym', true);
    END IF;

    FOR v_i IN 1..p_user_count LOOP
        v_email := 'test_user_' || v_i || '@test.fitmind.com';
        -- Fecha aleatoria en los últimos 90 días
        v_created_at := NOW() - (floor(random() * 90) || ' days')::interval;
        
        -- Insertar usuario en auth.users (simulado)
        BEGIN
            INSERT INTO auth.users (id, email, email_confirmed_at, created_at)
            VALUES (gen_random_uuid(), v_email, v_created_at, v_created_at)
            RETURNING id INTO v_user_id;

            -- Insertar perfil
            INSERT INTO user_profiles (user_id, email, name, created_at, updated_at)
            VALUES (v_user_id, v_email, 'Test User ' || v_i, v_created_at, v_created_at);

            -- Decidir si tiene suscripción (80% probabilidad)
            IF random() < 0.8 THEN
                v_plan_amount := CASE WHEN random() < 0.5 THEN 9.99 ELSE 29.99 END;
                
                -- Estado aleatorio
                IF random() < 0.1 THEN v_status := 'canceled';
                ELSIF random() < 0.1 THEN v_status := 'past_due';
                ELSE v_status := 'active';
                END IF;

                INSERT INTO subscriptions (user_id, status, monthly_amount, created_at, updated_at, current_period_end)
                VALUES (
                    v_user_id, 
                    v_status, 
                    v_plan_amount, 
                    v_created_at, 
                    v_created_at,
                    v_created_at + INTERVAL '1 month'
                );

                -- Generar historial de pagos (1 a 3 pagos)
                FOR v_j IN 1..(floor(random() * 3) + 1) LOOP
                    INSERT INTO payment_history (user_id, total_paid, monthly_amount, created_at, status)
                    VALUES (
                        v_user_id,  
                        v_plan_amount,
                        v_plan_amount,
                        v_created_at + ((v_j-1) || ' months')::interval, 
                        'succeeded'
                    );
                END LOOP;

                -- 30% de probabilidad de ser referido
                IF random() < 0.3 THEN
                    INSERT INTO discount_code_usage (user_id, discount_code, partner_id, created_at)
                    VALUES (v_user_id, 'TESTCODE', v_partner_id, v_created_at);
                END IF;
            END IF;
        EXCEPTION WHEN unique_violation THEN
            -- Ignorar si ya existe
            RAISE NOTICE 'Usuario % ya existe, saltando.', v_email;
        END;
    END LOOP;

    RAISE NOTICE 'Generados % usuarios de prueba.', p_user_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_referral_list(p_user_id text)
 RETURNS TABLE(usage_id uuid, partner_user_id text, referred_user_id text, referred_user_name text, referred_user_email text, is_free_access boolean, discount_amount numeric, used_at timestamp with time zone, subscription_status text, subscription_created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_partner_uuid UUID;
BEGIN
    -- 1. Obtener UUID del partner (Con TRIM por seguridad)
    SELECT id INTO v_partner_uuid 
    FROM admin_roles 
    WHERE user_id = TRIM(p_user_id);

    IF v_partner_uuid IS NULL THEN
        -- Si no encuentra al partner, devolvemos vacío
        RETURN;
    END IF;

    -- 2. Retornar los datos directamente
    RETURN QUERY
    SELECT 
        ocr.usage_id,
        p_user_id as partner_user_id,
        ocr.user_id as referred_user_id,
        COALESCE(up.name, 'Usuario Desconocido') as referred_user_name,
        COALESCE(up.email, 'Sin Email') as referred_user_email,
        ocr.is_free_access,
        COALESCE(ocr.price_paid, 0) as discount_amount, 
        ocr.used_at,
        CASE 
            WHEN s.status = 'active' OR s.status = 'trialing' THEN 'active'
            WHEN s.status IS NULL THEN 'inactive'
            ELSE s.status 
        END as subscription_status,
        s.created_at as subscription_created_at
    FROM 
        offer_code_redemptions ocr
    LEFT JOIN 
        user_profiles up ON ocr.user_id = up.user_id
    LEFT JOIN 
        subscriptions s ON ocr.user_id = s.user_id
    WHERE 
        ocr.partner_id = v_partner_uuid
    ORDER BY 
        ocr.used_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_hierarchy(p_user_id text)
 RETURNS TABLE(sub_partner_id uuid, sub_partner_user_id text, sub_partner_name text, sub_partner_email text, joined_at timestamp with time zone, total_sales_count integer, active_subscriptions_count integer, total_earnings_generated numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
    v_my_user_id TEXT := TRIM(p_user_id);
BEGIN
    RETURN QUERY
    SELECT 
        ar.id as sub_partner_id,
        ar.user_id as sub_partner_user_id,
        COALESCE(ar.name, 'Sin Nombre') as sub_partner_name,
        ar.email as sub_partner_email,
        ar.created_at as joined_at,
        
        -- Contar sus ventas (Redenciones de su código)
        (SELECT count(*)::int 
         FROM offer_code_redemptions ocr 
         WHERE ocr.partner_id = ar.id) as total_sales_count,
         
        -- Contar sus suscripciones activas
        (SELECT count(*)::int
         FROM subscriptions s
         JOIN offer_code_redemptions ocr ON s.user_id = ocr.user_id
         WHERE ocr.partner_id = ar.id 
         AND s.status IN ('active', 'trialing')) as active_subscriptions_count,

        -- Ganancias generadas (Placeholder)
        0.0::numeric
        
    FROM 
        admin_roles ar
    WHERE 
        ar.referred_by = v_my_user_id
    ORDER BY 
        ar.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_student_stats(p_trainer_id text, p_student_id text, p_start_date date DEFAULT '2020-01-01'::date, p_end_date date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'temp'
AS $function$
DECLARE
  v_has_permission BOOLEAN := false;
  v_is_admin BOOLEAN := false;
  v_is_empresario BOOLEAN := false;
  v_workout_count INTEGER;
  v_active_plan JSON;
  v_recent_workouts JSON;
  v_body_metrics JSON;
  v_nutrition_stats JSON;
  v_steps_stats JSON;
BEGIN
  -- Verificar si es admin (los admins pueden ver TODO sin restricciones)
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = p_trainer_id 
      AND role_type = 'admin'
      AND is_active = true
  ) INTO v_is_admin;

  IF v_is_admin THEN
    -- ✅ Los admins tienen acceso total a cualquier usuario
    v_has_permission := true;
  ELSE
    -- Verificar si es empresario del alumno
    SELECT EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = p_trainer_id 
        AND role_type = 'empresario'
        AND is_active = true
    ) INTO v_is_empresario;

    IF v_is_empresario THEN
      -- Verificar que el alumno sea miembro de su gimnasio
      SELECT EXISTS (
        SELECT 1 FROM public.gym_members
        WHERE empresario_id = p_trainer_id 
          AND user_id = p_student_id
          AND is_active = true
      ) INTO v_has_permission;
    ELSE
      -- Si no es admin ni empresario, verificar relación de entrenador
      SELECT EXISTS (
        SELECT 1 FROM public.trainer_student_relationships
        WHERE trainer_id = p_trainer_id 
          AND student_id = p_student_id 
          AND status = 'accepted'
      ) INTO v_has_permission;
    END IF;
  END IF;

  IF NOT v_has_permission THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tienes permiso para ver estos datos'
    );
  END IF;

  -- Obtener estadísticas de entrenamientos (con rango de fechas)
  SELECT COUNT(*) INTO v_workout_count
  FROM public.workout_completions
  WHERE user_id = p_student_id
    AND completed_at::DATE >= p_start_date
    AND completed_at::DATE <= p_end_date;

  -- Obtener plan activo
  SELECT json_build_object(
    'id', id,
    'plan_name', plan_name,
    'description', description,
    'plan_data', plan_data,
    'created_at', created_at
  ) INTO v_active_plan
  FROM public.workout_plans
  WHERE user_id = p_student_id AND is_active = true
  LIMIT 1;

  -- Obtener entrenamientos recientes (con rango de fechas)
  SELECT json_agg(
    json_build_object(
      'id', id,
      'completed_at', completed_at,
      'duration_minutes', duration_minutes,
      'notes', notes
    ) ORDER BY completed_at DESC
  ) INTO v_recent_workouts
  FROM (
    SELECT * FROM public.workout_completions
    WHERE user_id = p_student_id
      AND completed_at::DATE >= p_start_date
      AND completed_at::DATE <= p_end_date
    ORDER BY completed_at DESC
    LIMIT 10
  ) recent;

  -- Obtener métricas corporales recientes
  SELECT json_build_object(
    'current_weight', weight_kg,
    'body_fat_percentage', body_fat_percentage,
    'muscle_percentage', muscle_percentage,
    'recorded_at', date
  ) INTO v_body_metrics
  FROM public.body_metrics
  WHERE user_id = p_student_id
  ORDER BY date DESC
  LIMIT 1;

  -- Obtener estadísticas de nutrición (últimos 7 días)
  SELECT json_build_object(
    'avg_calories', COALESCE(AVG(calories), 0),
    'avg_protein', COALESCE(AVG(protein_g), 0),
    'avg_carbs', COALESCE(AVG(carbs_g), 0),
    'avg_fats', COALESCE(AVG(fats_g), 0)
  ) INTO v_nutrition_stats
  FROM public.nutrition_targets
  WHERE user_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';

  -- Obtener estadísticas de pasos (últimos 7 días)
  SELECT json_build_object(
    'avg_steps', COALESCE(AVG(steps), 0),
    'total_steps', COALESCE(SUM(steps), 0)
  ) INTO v_steps_stats
  FROM public.health_data_daily
  WHERE user_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';

  RETURN json_build_object(
    'workout_count', v_workout_count,
    'active_plan', v_active_plan,
    'recent_workouts', COALESCE(v_recent_workouts, '[]'::JSON),
    'body_metrics', v_body_metrics,
    'nutrition_stats', v_nutrition_stats,
    'steps_stats', v_steps_stats
  );
END;
$function$
;

