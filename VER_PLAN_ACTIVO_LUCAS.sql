-- ============================================================================
-- VER PLAN ACTIVO DE LUCAS
-- ============================================================================

SELECT 
  id,
  plan_name,
  description,
  is_active,
  plan_data,
  created_at
FROM workout_plans
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY created_at DESC;


