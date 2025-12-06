-- ==================================================================
-- SCRIPT PARA NORMALIZAR NOMBRES DE EJERCICIOS
-- Asegura que todos los nombres empiecen con mayúscula
-- ==================================================================

-- 1. Normalizar nombres canónicos en exercise_videos
-- INITCAP() capitaliza la primera letra de cada palabra
UPDATE exercise_videos
SET canonical_name = INITCAP(LOWER(canonical_name));

-- 2. Normalizar variaciones de nombres en exercise_videos
UPDATE exercise_videos
SET name_variations = ARRAY(
  SELECT INITCAP(LOWER(unnest(name_variations)))
);

-- 3. Verificar resultados en exercise_videos
SELECT 
  canonical_name,
  name_variations
FROM exercise_videos
ORDER BY canonical_name;

-- ==================================================================
-- OPCIONAL: Si también quieres normalizar nombres en planes guardados
-- ==================================================================

-- Este script actualizará los nombres de ejercicios en los planes de entrenamiento
-- guardados en la tabla workout_plans

-- IMPORTANTE: Este proceso puede tardar si tienes muchos planes
-- Recomendación: Hacer un backup antes de ejecutar

-- Función para actualizar nombres en la estructura del plan
UPDATE workout_plans
SET plan_data = jsonb_set(
  plan_data,
  '{weekly_structure}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        day,
        '{exercises}',
        (
          SELECT jsonb_agg(
            CASE 
              WHEN exercise ? 'name' THEN
                jsonb_set(
                  exercise,
                  '{name}',
                  to_jsonb(INITCAP(LOWER(exercise->>'name')))
                )
              ELSE exercise
            END
          )
          FROM jsonb_array_elements(day->'exercises') AS exercise
        )
      )
    )
    FROM jsonb_array_elements(plan_data->'weekly_structure') AS day
  )
)
WHERE plan_data->'weekly_structure' IS NOT NULL;

-- También actualizar multi_week_structure si existe
UPDATE workout_plans
SET plan_data = jsonb_set(
  plan_data,
  '{multi_week_structure}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        week,
        '{days}',
        (
          SELECT jsonb_agg(
            jsonb_set(
              day,
              '{exercises}',
              (
                SELECT jsonb_agg(
                  CASE 
                    WHEN exercise ? 'name' THEN
                      jsonb_set(
                        exercise,
                        '{name}',
                        to_jsonb(INITCAP(LOWER(exercise->>'name')))
                      )
                    ELSE exercise
                  END
                )
                FROM jsonb_array_elements(day->'exercises') AS exercise
              )
            )
          )
          FROM jsonb_array_elements(week->'days') AS day
        )
      )
    )
    FROM jsonb_array_elements(plan_data->'multi_week_structure') AS week
  )
)
WHERE plan_data->'multi_week_structure' IS NOT NULL;

-- ==================================================================
-- VERIFICACIÓN: Revisar que los cambios se aplicaron correctamente
-- ==================================================================

-- Ver nombres de ejercicios en exercise_videos
SELECT 
  canonical_name AS "Nombre del Ejercicio",
  array_length(name_variations, 1) AS "Variaciones"
FROM exercise_videos
ORDER BY canonical_name
LIMIT 20;

-- Ver algunos ejercicios en planes guardados
SELECT 
  plan_name,
  jsonb_pretty(plan_data->'weekly_structure'->0->'exercises')
FROM workout_plans
WHERE plan_data->'weekly_structure' IS NOT NULL
LIMIT 5;

-- ==================================================================
-- NOTAS IMPORTANTES
-- ==================================================================
-- 
-- 1. INITCAP() capitaliza la primera letra de CADA palabra
--    Ejemplos:
--    - "press banca plano" → "Press Banca Plano"
--    - "CURL DE BÍCEPS" → "Curl De Bíceps"
--    - "dominadas pronas" → "Dominadas Pronas"
-- 
-- 2. Si solo quieres capitalizar la primera letra de la frase completa,
--    usa esta alternativa:
--    
--    UPDATE exercise_videos
--    SET canonical_name = UPPER(SUBSTRING(canonical_name FROM 1 FOR 1)) || 
--                         LOWER(SUBSTRING(canonical_name FROM 2));
-- 
-- 3. Haz un BACKUP antes de ejecutar cambios en workout_plans
--    porque modificará todos los planes guardados
-- 
-- 4. Este script también puede ejecutarse periódicamente como mantenimiento
-- 
-- ==================================================================

