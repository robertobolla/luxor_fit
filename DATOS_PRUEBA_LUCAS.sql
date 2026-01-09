-- ============================================================================
-- DATOS DE PRUEBA PARA LUCAS
-- Inserta datos de entrenamiento, nutrición, métricas corporales y pasos
-- ============================================================================

-- Paso 1: Buscar el user_id de Lucas
DO $$ 
DECLARE
  v_lucas_id TEXT;
BEGIN
  -- Buscar el user_id de Lucas (asume que su nombre o email contiene "lucas")
  SELECT user_id INTO v_lucas_id
  FROM public.user_profiles
  WHERE LOWER(name) LIKE '%lucas%' OR LOWER(email) LIKE '%lucas%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontró usuario Lucas. Por favor, proporciona su user_id manualmente.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Usuario Lucas encontrado: %', v_lucas_id;

  -- ========================================================================
  -- PLAN DE ENTRENAMIENTO ACTIVO
  -- ========================================================================
  
  -- Eliminar planes anteriores (opcional, para limpieza)
  UPDATE public.workout_plans 
  SET is_active = false 
  WHERE user_id = v_lucas_id;

  -- Insertar nuevo plan de entrenamiento
  INSERT INTO public.workout_plans (
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
      'focus', 'Fuerza y Hipertrofia',
      'difficulty', 'Avanzado'
    ),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Plan de entrenamiento insertado';

  -- ========================================================================
  -- ENTRENAMIENTOS COMPLETADOS (últimos 30 días)
  -- ========================================================================
  
  -- Insertar 15 entrenamientos distribuidos en el último mes
  INSERT INTO public.workout_completions (user_id, completed_at, duration_minutes, notes)
  SELECT 
    v_lucas_id,
    NOW() - (interval '1 day' * generate_series),
    45 + (random() * 30)::int,  -- Duración entre 45-75 minutos
    CASE 
      WHEN generate_series % 3 = 0 THEN 'Excelente sesión, aumenté peso'
      WHEN generate_series % 3 = 1 THEN 'Buena intensidad'
      ELSE 'Sesión regular'
    END
  FROM generate_series(1, 15)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workout_completions 
    WHERE user_id = v_lucas_id 
    AND completed_at::DATE = (NOW() - (interval '1 day' * generate_series))::DATE
  );

  RAISE NOTICE '✅ Entrenamientos completados insertados';

  -- ========================================================================
  -- MÉTRICAS CORPORALES
  -- ========================================================================
  
  -- Insertar peso actual y composición corporal
  INSERT INTO public.body_metrics (
    user_id,
    date,
    weight_kg,
    body_fat_percentage,
    muscle_percentage,
    created_at,
    updated_at
  ) VALUES (
    v_lucas_id,
    CURRENT_DATE,
    82.5,
    15.8,
    42.3,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    weight_kg = 82.5,
    body_fat_percentage = 15.8,
    muscle_percentage = 42.3,
    updated_at = NOW();

  -- Insertar histórico de peso (últimos 3 meses)
  INSERT INTO public.body_metrics (user_id, date, weight_kg, created_at, updated_at)
  SELECT 
    v_lucas_id,
    (CURRENT_DATE - (interval '1 week' * generate_series))::DATE,
    85.0 - (generate_series * 0.2),  -- Pérdida gradual de peso
    NOW(),
    NOW()
  FROM generate_series(1, 12)
  ON CONFLICT (user_id, date) DO NOTHING;

  RAISE NOTICE '✅ Métricas corporales insertadas';

  -- ========================================================================
  -- NUTRICIÓN (últimos 7 días)
  -- ========================================================================
  
  INSERT INTO public.nutrition_targets (user_id, date, calories, protein_g, carbs_g, fats_g, created_at, updated_at)
  SELECT 
    v_lucas_id,
    (CURRENT_DATE - (interval '1 day' * generate_series))::DATE,
    2500 + (random() * 300)::int,  -- Entre 2500-2800 calorías
    180 + (random() * 30)::int,    -- Entre 180-210g proteína
    280 + (random() * 40)::int,    -- Entre 280-320g carbos
    70 + (random() * 20)::int,     -- Entre 70-90g grasas
    NOW(),
    NOW()
  FROM generate_series(0, 6)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    calories = EXCLUDED.calories,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fats_g = EXCLUDED.fats_g,
    updated_at = NOW();

  RAISE NOTICE '✅ Datos de nutrición insertados';

  -- ========================================================================
  -- PASOS DIARIOS (últimos 7 días)
  -- ========================================================================
  
  INSERT INTO public.health_data_daily (user_id, date, steps, created_at, updated_at)
  SELECT 
    v_lucas_id,
    (CURRENT_DATE - (interval '1 day' * generate_series))::DATE,
    8000 + (random() * 4000)::int,  -- Entre 8000-12000 pasos
    NOW(),
    NOW()
  FROM generate_series(0, 6)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    steps = EXCLUDED.steps,
    updated_at = NOW();

  RAISE NOTICE '✅ Datos de pasos insertados';

  -- ========================================================================
  -- RESUMEN
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Datos de prueba insertados exitosamente para Lucas!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '  - Plan de entrenamiento activo: "Plan de Fuerza Avanzado"';
  RAISE NOTICE '  - Entrenamientos completados: 15 (último mes)';
  RAISE NOTICE '  - Peso actual: 82.5 kg';
  RAISE NOTICE '  - Grasa corporal: 15.8%%';
  RAISE NOTICE '  - Masa muscular: 42.3%%';
  RAISE NOTICE '  - Nutrición: Últimos 7 días (~2600 cal/día)';
  RAISE NOTICE '  - Pasos: Últimos 7 días (~10000 pasos/día)';
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICAR DATOS INSERTADOS
-- ============================================================================

-- Ver resumen de datos de Lucas
SELECT 
  up.user_id,
  up.name,
  up.email,
  (SELECT COUNT(*) FROM workout_completions wc WHERE wc.user_id = up.user_id) as total_workouts,
  (SELECT COUNT(*) FROM body_metrics bm WHERE bm.user_id = up.user_id) as total_metrics,
  (SELECT COUNT(*) FROM nutrition_targets nt WHERE nt.user_id = up.user_id) as total_nutrition,
  (SELECT COUNT(*) FROM health_data_daily hdd WHERE hdd.user_id = up.user_id) as total_steps_days
FROM user_profiles up
WHERE LOWER(up.name) LIKE '%lucas%' OR LOWER(up.email) LIKE '%lucas%'
ORDER BY up.created_at DESC
LIMIT 1;


