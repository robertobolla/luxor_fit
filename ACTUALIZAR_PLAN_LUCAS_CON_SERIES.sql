-- ============================================================================
-- ACTUALIZAR PLAN DE LUCAS CON SERIES INDIVIDUALES Y RIR
-- ============================================================================

-- Actualizar el plan con estructura detallada incluyendo exercise_sets
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
          "rest_seconds": 120,
          "exercise_sets": [
            {"set_number": 1, "reps": 10, "weight": 75, "rir": 3},
            {"set_number": 2, "reps": 9, "weight": 80, "rir": 2},
            {"set_number": 3, "reps": 8, "weight": 80, "rir": 2},
            {"set_number": 4, "reps": 8, "weight": 85, "rir": 1}
          ]
        },
        {
          "name": "Press Inclinado con Mancuernas",
          "sets": 3,
          "reps": "10-12",
          "weight": 30,
          "rest_seconds": 90,
          "exercise_sets": [
            {"set_number": 1, "reps": 12, "weight": 28, "rir": 3},
            {"set_number": 2, "reps": 10, "weight": 30, "rir": 2},
            {"set_number": 3, "reps": 10, "weight": 32, "rir": 2}
          ]
        },
        {
          "name": "Aperturas con Mancuernas",
          "sets": 3,
          "reps": "12-15",
          "weight": 20,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 18, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 20, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 20, "rir": 2}
          ]
        },
        {
          "name": "Fondos en Paralelas",
          "sets": 3,
          "reps": "8-10",
          "rest_seconds": 90,
          "exercise_sets": [
            {"set_number": 1, "reps": 10, "weight": 0, "rir": 3},
            {"set_number": 2, "reps": 9, "weight": 0, "rir": 2},
            {"set_number": 3, "reps": 8, "weight": 0, "rir": 1}
          ]
        },
        {
          "name": "Extensiones de Tríceps en Polea",
          "sets": 3,
          "reps": "12-15",
          "weight": 25,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 23, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 25, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 25, "rir": 2}
          ]
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
          "rest_seconds": 120,
          "exercise_sets": [
            {"set_number": 1, "reps": 8, "weight": 0, "rir": 3},
            {"set_number": 2, "reps": 7, "weight": 0, "rir": 2},
            {"set_number": 3, "reps": 6, "weight": 0, "rir": 2},
            {"set_number": 4, "reps": 6, "weight": 0, "rir": 1}
          ]
        },
        {
          "name": "Remo con Barra",
          "sets": 4,
          "reps": "8-10",
          "weight": 70,
          "rest_seconds": 90,
          "exercise_sets": [
            {"set_number": 1, "reps": 10, "weight": 65, "rir": 3},
            {"set_number": 2, "reps": 9, "weight": 70, "rir": 2},
            {"set_number": 3, "reps": 8, "weight": 70, "rir": 2},
            {"set_number": 4, "reps": 8, "weight": 75, "rir": 1}
          ]
        },
        {
          "name": "Jalón al Pecho",
          "sets": 3,
          "reps": "10-12",
          "weight": 60,
          "rest_seconds": 90,
          "exercise_sets": [
            {"set_number": 1, "reps": 12, "weight": 55, "rir": 3},
            {"set_number": 2, "reps": 10, "weight": 60, "rir": 2},
            {"set_number": 3, "reps": 10, "weight": 60, "rir": 2}
          ]
        },
        {
          "name": "Remo con Mancuerna",
          "sets": 3,
          "reps": "10-12",
          "weight": 35,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 12, "weight": 32, "rir": 3},
            {"set_number": 2, "reps": 11, "weight": 35, "rir": 2},
            {"set_number": 3, "reps": 10, "weight": 35, "rir": 2}
          ]
        },
        {
          "name": "Curl con Barra",
          "sets": 3,
          "reps": "10-12",
          "weight": 30,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 12, "weight": 28, "rir": 3},
            {"set_number": 2, "reps": 11, "weight": 30, "rir": 2},
            {"set_number": 3, "reps": 10, "weight": 30, "rir": 2}
          ]
        },
        {
          "name": "Curl Martillo",
          "sets": 3,
          "reps": "12-15",
          "weight": 15,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 14, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 15, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 15, "rir": 2}
          ]
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
          "rest_seconds": 180,
          "exercise_sets": [
            {"set_number": 1, "reps": 10, "weight": 95, "rir": 3},
            {"set_number": 2, "reps": 9, "weight": 100, "rir": 2},
            {"set_number": 3, "reps": 8, "weight": 100, "rir": 2},
            {"set_number": 4, "reps": 8, "weight": 105, "rir": 1}
          ]
        },
        {
          "name": "Prensa de Piernas",
          "sets": 4,
          "reps": "10-12",
          "weight": 150,
          "rest_seconds": 120,
          "exercise_sets": [
            {"set_number": 1, "reps": 12, "weight": 140, "rir": 3},
            {"set_number": 2, "reps": 11, "weight": 150, "rir": 2},
            {"set_number": 3, "reps": 10, "weight": 150, "rir": 2},
            {"set_number": 4, "reps": 10, "weight": 160, "rir": 1}
          ]
        },
        {
          "name": "Peso Muerto Rumano",
          "sets": 3,
          "reps": "10-12",
          "weight": 80,
          "rest_seconds": 120,
          "exercise_sets": [
            {"set_number": 1, "reps": 12, "weight": 75, "rir": 3},
            {"set_number": 2, "reps": 10, "weight": 80, "rir": 2},
            {"set_number": 3, "reps": 10, "weight": 85, "rir": 2}
          ]
        },
        {
          "name": "Extensiones de Cuádriceps",
          "sets": 3,
          "reps": "12-15",
          "weight": 50,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 45, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 50, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 50, "rir": 2}
          ]
        },
        {
          "name": "Curl Femoral",
          "sets": 3,
          "reps": "12-15",
          "weight": 40,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 35, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 40, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 40, "rir": 2}
          ]
        },
        {
          "name": "Elevaciones de Gemelos",
          "sets": 4,
          "reps": "15-20",
          "weight": 60,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 20, "weight": 55, "rir": 3},
            {"set_number": 2, "reps": 18, "weight": 60, "rir": 2},
            {"set_number": 3, "reps": 16, "weight": 60, "rir": 2},
            {"set_number": 4, "reps": 15, "weight": 65, "rir": 1}
          ]
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
          "rest_seconds": 120,
          "exercise_sets": [
            {"set_number": 1, "reps": 10, "weight": 45, "rir": 3},
            {"set_number": 2, "reps": 9, "weight": 50, "rir": 2},
            {"set_number": 3, "reps": 8, "weight": 50, "rir": 2},
            {"set_number": 4, "reps": 8, "weight": 55, "rir": 1}
          ]
        },
        {
          "name": "Elevaciones Laterales",
          "sets": 4,
          "reps": "12-15",
          "weight": 12,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 10, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 12, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 12, "rir": 2},
            {"set_number": 4, "reps": 12, "weight": 14, "rir": 1}
          ]
        },
        {
          "name": "Elevaciones Frontales",
          "sets": 3,
          "reps": "12-15",
          "weight": 10,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 8, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 10, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 10, "rir": 2}
          ]
        },
        {
          "name": "Pájaros (Deltoides Posterior)",
          "sets": 3,
          "reps": "12-15",
          "weight": 10,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 8, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 10, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 10, "rir": 2}
          ]
        },
        {
          "name": "Encogimientos con Barra",
          "sets": 3,
          "reps": "12-15",
          "weight": 60,
          "rest_seconds": 60,
          "exercise_sets": [
            {"set_number": 1, "reps": 15, "weight": 55, "rir": 3},
            {"set_number": 2, "reps": 13, "weight": 60, "rir": 2},
            {"set_number": 3, "reps": 12, "weight": 60, "rir": 2}
          ]
        },
        {
          "name": "Crunches",
          "sets": 3,
          "reps": "20-25",
          "rest_seconds": 45,
          "exercise_sets": [
            {"set_number": 1, "reps": 25, "weight": 0, "rir": 3},
            {"set_number": 2, "reps": 22, "weight": 0, "rir": 2},
            {"set_number": 3, "reps": 20, "weight": 0, "rir": 2}
          ]
        },
        {
          "name": "Plancha",
          "sets": 3,
          "reps": "60s",
          "rest_seconds": 45,
          "exercise_sets": [
            {"set_number": 1, "reps": "60s", "weight": 0, "rir": 3},
            {"set_number": 2, "reps": "55s", "weight": 0, "rir": 2},
            {"set_number": 3, "reps": "50s", "weight": 0, "rir": 1}
          ]
        }
      ]
    }
  ]
}'::jsonb
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg' 
  AND is_active = true;

-- Verificar el plan actualizado
SELECT 
  '✅ PLAN ACTUALIZADO CON SERIES' as verificacion,
  plan_name,
  jsonb_array_length(plan_data->'days') as cantidad_dias
FROM workout_plans
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg' 
  AND is_active = true;

