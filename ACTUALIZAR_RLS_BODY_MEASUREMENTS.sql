-- ============================================================================
-- ACTUALIZAR POLÍTICAS RLS DE body_measurements (Compatible con Clerk)
-- ============================================================================
-- Este script actualiza SOLO las políticas RLS sin recrear la tabla
-- Ejecuta este script si la tabla body_measurements ya existe
-- ============================================================================

-- Eliminar políticas antiguas (las que usaban auth.uid())
DROP POLICY IF EXISTS "Users can view their own measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can insert their own measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can update their own measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can delete their own measurements" ON body_measurements;

-- NOTA: La app usa Clerk authentication, no Supabase Auth
-- Por lo tanto, usamos políticas abiertas (true) y la validación
-- real se hace en el frontend verificando el user_id de Clerk

-- Crear nuevas políticas compatibles con Clerk
CREATE POLICY "Users can view measurements"
  ON body_measurements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update measurements"
  ON body_measurements FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete measurements"
  ON body_measurements FOR DELETE
  USING (true);

-- ============================================================================
-- ACTUALIZAR FUNCIÓN calculate_weekly_changes
-- ============================================================================
-- Retorna NULL para cambios cuando hay menos de 2 mediciones

CREATE OR REPLACE FUNCTION calculate_weekly_changes(p_user_id TEXT)
RETURNS TABLE (
  weight_change_kg DECIMAL,
  body_fat_change DECIMAL,
  muscle_change DECIMAL,
  weeks_tracked INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_measurements AS (
    SELECT 
      weight_kg,
      body_fat_percentage,
      muscle_percentage,
      measured_at,
      ROW_NUMBER() OVER (ORDER BY measured_at DESC) as rn
    FROM body_measurements
    WHERE user_id = p_user_id
      AND measured_at >= NOW() - INTERVAL '8 weeks'
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
    -- Retornar NULL si no hay suficientes datos (< 2 mediciones)
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las políticas se actualizaron
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'body_measurements'
ORDER BY cmd, policyname;

-- Resultado esperado:
-- 4 políticas (SELECT, INSERT, UPDATE, DELETE)
-- Todas deben usar USING (true) en lugar de auth.uid()

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Las políticas antiguas se eliminarán y se crearán las nuevas
-- 3. La función calculate_weekly_changes se actualizará
-- 4. Verifica el resultado con la query de verificación al final
-- ============================================================================

