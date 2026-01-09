-- ============================================================================
-- VER METRICAS CORPORALES DE LUCAS
-- ============================================================================

SELECT 
  date,
  weight_kg,
  body_fat_percentage,
  muscle_percentage,
  created_at
FROM body_metrics
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY date DESC;


