-- ============================================================================
-- ACTUALIZAR PLAN DE LUCAS CON DETALLES COMPLETOS
-- ============================================================================

-- Actualizar el plan con estructura detallada
UPDATE workout_plans
SET plan_data = '{
  "weeks": 12,
  "days_per_week": 4,
  "focus": "fuerza",
  "days": [
    {
      "name": "Día 1 - Pecho y Tríceps",
      "exercises": [
        {
          "name": "Press de Banca",
          "sets": 4,
          "reps": "8-10",
          "weight": 80,
          "rest_seconds": 120
        },
        {
          "name": "Press Inclinado con Mancuernas",
          "sets": 3,
          "reps": "10-12",
          "weight": 30,
          "rest_seconds": 90
        },
        {
          "name": "Aperturas con Mancuernas",
          "sets": 3,
          "reps": "12-15",
          "weight": 20,
          "rest_seconds": 60
        },
        {
          "name": "Fondos en Paralelas",
          "sets": 3,
          "reps": "8-10",
          "rest_seconds": 90
        },
        {
          "name": "Extensiones de Tríceps en Polea",
          "sets": 3,
          "reps": "12-15",
          "weight": 25,
          "rest_seconds": 60
        }
      ]
    },
    {
      "name": "Día 2 - Espalda y Bíceps",
      "exercises": [
        {
          "name": "Dominadas",
          "sets": 4,
          "reps": "6-8",
          "rest_seconds": 120
        },
        {
          "name": "Remo con Barra",
          "sets": 4,
          "reps": "8-10",
          "weight": 70,
          "rest_seconds": 90
        },
        {
          "name": "Jalón al Pecho",
          "sets": 3,
          "reps": "10-12",
          "weight": 60,
          "rest_seconds": 90
        },
        {
          "name": "Remo con Mancuerna",
          "sets": 3,
          "reps": "10-12",
          "weight": 35,
          "rest_seconds": 60
        },
        {
          "name": "Curl con Barra",
          "sets": 3,
          "reps": "10-12",
          "weight": 30,
          "rest_seconds": 60
        },
        {
          "name": "Curl Martillo",
          "sets": 3,
          "reps": "12-15",
          "weight": 15,
          "rest_seconds": 60
        }
      ]
    },
    {
      "name": "Día 3 - Piernas",
      "exercises": [
        {
          "name": "Sentadilla con Barra",
          "sets": 4,
          "reps": "8-10",
          "weight": 100,
          "rest_seconds": 180
        },
        {
          "name": "Prensa de Piernas",
          "sets": 4,
          "reps": "10-12",
          "weight": 150,
          "rest_seconds": 120
        },
        {
          "name": "Peso Muerto Rumano",
          "sets": 3,
          "reps": "10-12",
          "weight": 80,
          "rest_seconds": 120
        },
        {
          "name": "Extensiones de Cuádriceps",
          "sets": 3,
          "reps": "12-15",
          "weight": 50,
          "rest_seconds": 60
        },
        {
          "name": "Curl Femoral",
          "sets": 3,
          "reps": "12-15",
          "weight": 40,
          "rest_seconds": 60
        },
        {
          "name": "Elevaciones de Gemelos",
          "sets": 4,
          "reps": "15-20",
          "weight": 60,
          "rest_seconds": 60
        }
      ]
    },
    {
      "name": "Día 4 - Hombros y Abdomen",
      "exercises": [
        {
          "name": "Press Militar",
          "sets": 4,
          "reps": "8-10",
          "weight": 50,
          "rest_seconds": 120
        },
        {
          "name": "Elevaciones Laterales",
          "sets": 4,
          "reps": "12-15",
          "weight": 12,
          "rest_seconds": 60
        },
        {
          "name": "Elevaciones Frontales",
          "sets": 3,
          "reps": "12-15",
          "weight": 10,
          "rest_seconds": 60
        },
        {
          "name": "Pájaros (Deltoides Posterior)",
          "sets": 3,
          "reps": "12-15",
          "weight": 10,
          "rest_seconds": 60
        },
        {
          "name": "Encogimientos con Barra",
          "sets": 3,
          "reps": "12-15",
          "weight": 60,
          "rest_seconds": 60
        },
        {
          "name": "Crunches",
          "sets": 3,
          "reps": "20-25",
          "rest_seconds": 45
        },
        {
          "name": "Plancha",
          "sets": 3,
          "reps": "60s",
          "rest_seconds": 45
        }
      ]
    }
  ]
}'::jsonb
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg' 
  AND is_active = true;

-- Actualizar los nombres de los días en workout_completions para que coincidan
UPDATE workout_completions
SET day_name = CASE 
  WHEN day_name = 'Día 1' THEN 'Día 1 - Pecho y Tríceps'
  WHEN day_name = 'Día 2' THEN 'Día 2 - Espalda y Bíceps'
  WHEN day_name = 'Día 3' THEN 'Día 3 - Piernas'
  WHEN day_name = 'Día 4' THEN 'Día 4 - Hombros y Abdomen'
  ELSE day_name
END
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Verificar el plan actualizado
SELECT 
  '✅ PLAN ACTUALIZADO' as verificacion,
  plan_name,
  jsonb_array_length(plan_data->'days') as cantidad_dias
FROM workout_plans
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg' 
  AND is_active = true;

-- Ver los días completados
SELECT 
  '✅ DÍAS COMPLETADOS' as verificacion,
  day_name,
  COUNT(*) as veces_completado
FROM workout_completions
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg'
GROUP BY day_name
ORDER BY day_name;

