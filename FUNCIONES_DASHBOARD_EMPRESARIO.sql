-- ============================================================================
-- FUNCIONES RPC PARA DASHBOARD DE EMPRESARIOS
-- ============================================================================

-- Función principal que devuelve todas las estadísticas del empresario
CREATE OR REPLACE FUNCTION get_empresario_dashboard_stats(p_empresario_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
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
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_empresario_dashboard_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresario_dashboard_stats(TEXT) TO anon;

