-- ============================================================================
-- CREAR TABLA body_measurements PARA SISTEMA DE CHECK-IN SEMANAL
-- ============================================================================
-- Este script crea la tabla body_measurements y sus políticas RLS
-- Compatible con autenticación de Clerk
-- ============================================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Medidas básicas (peso obligatorio)
  weight_kg DECIMAL(5, 2) NOT NULL,
  body_fat_percentage DECIMAL(4, 2),
  muscle_percentage DECIMAL(4, 2),
  
  -- Medidas opcionales de circunferencias
  chest_cm DECIMAL(5, 2),
  waist_cm DECIMAL(5, 2),
  hips_cm DECIMAL(5, 2),
  arms_cm DECIMAL(5, 2),
  thighs_cm DECIMAL(5, 2),
  
  -- Metadata
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key a user_profiles
  CONSTRAINT fk_user_profile FOREIGN KEY (user_id) 
    REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_measured_at ON body_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measured_at DESC);

-- Habilitar RLS
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS RLS (Compatible con Clerk - sin auth.uid())
-- ============================================================================
-- NOTA: La app usa Clerk authentication, no Supabase Auth
-- Por lo tanto, usamos políticas abiertas (true) y la validación
-- real se hace en el frontend verificando el user_id de Clerk

-- Eliminar políticas si existen
DROP POLICY IF EXISTS "Users can view measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can insert measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can update measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can delete measurements" ON body_measurements;

-- Crear nuevas políticas
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
-- FUNCIÓN calculate_weekly_changes
-- ============================================================================
-- Calcula los cambios semanales comparando las 2 últimas mediciones

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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_body_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_body_measurements_updated_at ON body_measurements;
CREATE TRIGGER trigger_body_measurements_updated_at
  BEFORE UPDATE ON body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_body_measurements_updated_at();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la tabla se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'body_measurements'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'body_measurements'
ORDER BY cmd, policyname;

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica que la tabla se creó correctamente (ver query de verificación)
-- 3. Verifica que las 4 políticas RLS se crearon (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================
