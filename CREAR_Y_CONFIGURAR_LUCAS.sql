-- ============================================================================
-- CREAR Y CONFIGURAR USUARIO LUCAS CON DATOS DE PRUEBA
-- ============================================================================

DO $$
DECLARE
  v_lucas_id TEXT;
  v_empresario_id TEXT;
  v_lucas_email TEXT := 'lucas@gmail.com';
  v_lucas_name TEXT := 'Lucas';
  v_plan_id UUID;
BEGIN
  -- Paso 1: Obtener empresario
  SELECT user_id INTO v_empresario_id
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_empresario_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró empresario activo';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Empresario encontrado: %', v_empresario_id;

  -- Paso 2: Buscar si Lucas ya existe
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = v_lucas_email OR LOWER(name) = 'lucas';

  -- Paso 3: Si no existe, crear usuario Lucas
  IF v_lucas_id IS NULL THEN
    -- Generar un user_id único para Lucas (simulando Clerk)
    v_lucas_id := 'user_lucas_' || substr(md5(random()::text), 1, 20);
    
    INSERT INTO user_profiles (
      user_id,
      email,
      name,
      username,
      age,
      fitness_level,
      gender,
      height,
      weight_kg,
      created_at,
      updated_at
    ) VALUES (
      v_lucas_id,
      v_lucas_email,
      v_lucas_name,
      'lucas',
      28,
      'intermediate',
      'male',
      178,
      82.5,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Usuario Lucas creado: %', v_lucas_id;
  ELSE
    RAISE NOTICE '✅ Usuario Lucas ya existe: %', v_lucas_id;
  END IF;

  -- Paso 4: Asociar Lucas al gimnasio
  INSERT INTO gym_members (
    user_id,
    empresario_id,
    is_active,
    joined_at,
    subscription_expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_lucas_id,
    v_empresario_id,
    true,
    NOW(),
    CURRENT_DATE + INTERVAL '1 year',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, empresario_id) 
  DO UPDATE SET
    is_active = true,
    subscription_expires_at = CURRENT_DATE + INTERVAL '1 year',
    updated_at = NOW();

  RAISE NOTICE '✅ Lucas asociado al gimnasio';

  -- Paso 5: CREAR PLAN DE ENTRENAMIENTO
  UPDATE workout_plans SET is_active = false WHERE user_id = v_lucas_id;
  
  INSERT INTO workout_plans (
    user_id,
    plan_name,
    description,
    plan_data,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_lucas_id,
    'Plan de Fuerza Avanzado',
    'Programa de 12 semanas enfocado en aumento de fuerza y masa muscular',
    jsonb_build_object(
      'duration_weeks', 12,
      'days_per_week', 5,
      'focus', 'Fuerza e Hipertrofia',
      'difficulty', 'Avanzado'
    ),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_plan_id;

  RAISE NOTICE '✅ Plan de entrenamiento creado';

  -- Paso 6: ENTRENAMIENTOS COMPLETADOS
  DELETE FROM workout_completions WHERE user_id = v_lucas_id;
  
  INSERT INTO workout_completions (user_id, completed_at, duration_minutes, notes)
  SELECT 
    v_lucas_id,
    NOW() - (interval '1 day' * gs),
    45 + (random() * 30)::int,
    CASE 
      WHEN gs % 3 = 0 THEN 'Excelente sesión, aumenté peso'
      WHEN gs % 3 = 1 THEN 'Buena intensidad'
      ELSE 'Sesión regular'
    END
  FROM generate_series(1, 15) gs;

  RAISE NOTICE '✅ 15 entrenamientos completados insertados';

  -- Paso 7: MÉTRICAS CORPORALES
  DELETE FROM body_metrics WHERE user_id = v_lucas_id;
  
  -- Peso actual
  INSERT INTO body_metrics (
    user_id, date, weight_kg, body_fat_percentage, muscle_percentage, created_at, updated_at
  ) VALUES (
    v_lucas_id, CURRENT_DATE, 82.5, 15.8, 42.3, NOW(), NOW()
  );

  -- Histórico de peso
  INSERT INTO body_metrics (user_id, date, weight_kg, created_at, updated_at)
  SELECT 
    v_lucas_id,
    (CURRENT_DATE - (interval '1 week' * gs))::DATE,
    85.0 - (gs * 0.2),
    NOW(),
    NOW()
  FROM generate_series(1, 12) gs;

  RAISE NOTICE '✅ Métricas corporales insertadas';

  -- Paso 8: NUTRICIÓN
  DELETE FROM nutrition_targets WHERE user_id = v_lucas_id;
  
  INSERT INTO nutrition_targets (user_id, date, calories, protein_g, carbs_g, fats_g, created_at, updated_at)
  SELECT 
    v_lucas_id,
    (CURRENT_DATE - (interval '1 day' * gs))::DATE,
    2500 + (random() * 300)::int,
    180 + (random() * 30)::int,
    280 + (random() * 40)::int,
    70 + (random() * 20)::int,
    NOW(),
    NOW()
  FROM generate_series(0, 6) gs;

  RAISE NOTICE '✅ Datos de nutrición insertados (7 días)';

  -- Paso 9: PASOS
  DELETE FROM health_data_daily WHERE user_id = v_lucas_id;
  
  INSERT INTO health_data_daily (user_id, date, steps, created_at, updated_at)
  SELECT 
    v_lucas_id,
    (CURRENT_DATE - (interval '1 day' * gs))::DATE,
    8000 + (random() * 4000)::int,
    NOW(),
    NOW()
  FROM generate_series(0, 6) gs;

  RAISE NOTICE '✅ Datos de pasos insertados (7 días)';

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡LUCAS CREADO Y CONFIGURADO EXITOSAMENTE!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '   User ID: %', v_lucas_id;
  RAISE NOTICE '   Email: %', v_lucas_email;
  RAISE NOTICE '   Plan activo: Plan de Fuerza Avanzado (12 semanas, 5 días/semana)';
  RAISE NOTICE '   Entrenamientos: 15 completados';
  RAISE NOTICE '   Peso: 82.5 kg | Grasa: 15.8%% | Músculo: 42.3%%';
  RAISE NOTICE '   Nutrición: ~2600 cal/día (últimos 7 días)';
  RAISE NOTICE '   Pasos: ~10,000 pasos/día (últimos 7 días)';
  RAISE NOTICE '';

END $$;

-- VERIFICACIÓN FINAL
SELECT 
  '✅ VERIFICACIÓN FINAL' as titulo,
  up.user_id as lucas_id,
  up.email,
  up.name,
  (SELECT COUNT(*) FROM workout_plans WHERE user_id = up.user_id AND is_active = true) as planes_activos,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id) as entrenamientos,
  (SELECT COUNT(*) FROM body_metrics WHERE user_id = up.user_id) as metricas,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = up.user_id) as nutricion,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = up.user_id) as pasos,
  gm.is_active as activo_en_gym
FROM user_profiles up
LEFT JOIN gym_members gm ON gm.user_id = up.user_id
WHERE up.email = 'lucas@gmail.com' OR LOWER(up.name) = 'lucas'
ORDER BY up.created_at DESC
LIMIT 1;


