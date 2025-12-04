-- ============================================================================
-- TABLA PARA REGISTRO DE MEDIDAS CORPORALES (CHECK-IN SEMANAL)
-- ============================================================================

-- Crear tabla para almacenar medidas corporales semanales
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Medidas básicas
  weight_kg DECIMAL(5, 2) NOT NULL,
  body_fat_percentage DECIMAL(4, 2),
  muscle_percentage DECIMAL(4, 2),
  
  -- Medidas opcionales de circunferencias (cm)
  chest_cm DECIMAL(5, 2),
  waist_cm DECIMAL(5, 2),
  hips_cm DECIMAL(5, 2),
  arms_cm DECIMAL(5, 2),
  thighs_cm DECIMAL(5, 2),
  
  -- Metadatos
  notes TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'smart_scale', 'apple_health', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date 
  ON body_measurements(user_id, measured_at DESC);

-- Nota: No creamos índice con DATE_TRUNC porque no es IMMUTABLE con TIMESTAMPTZ
-- El índice por user_id y measured_at es suficiente para queries eficientes

-- RLS (Row Level Security)
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- NOTA: La app usa Clerk authentication, no Supabase Auth
-- Por lo tanto, usamos políticas abiertas (true) y la validación
-- real se hace en el frontend verificando el user_id de Clerk

-- Política: Los usuarios pueden ver mediciones
CREATE POLICY "Users can view measurements"
  ON body_measurements FOR SELECT
  USING (true);

-- Política: Los usuarios pueden insertar mediciones
CREATE POLICY "Users can insert measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (true);

-- Política: Los usuarios pueden actualizar mediciones
CREATE POLICY "Users can update measurements"
  ON body_measurements FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Los usuarios pueden eliminar mediciones
CREATE POLICY "Users can delete measurements"
  ON body_measurements FOR DELETE
  USING (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_body_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_body_measurements_updated_at_trigger
  BEFORE UPDATE ON body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_body_measurements_updated_at();

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Obtener última medida del usuario
CREATE OR REPLACE FUNCTION get_latest_body_measurement(p_user_id TEXT)
RETURNS TABLE (
  id UUID,
  weight_kg DECIMAL,
  body_fat_percentage DECIMAL,
  muscle_percentage DECIMAL,
  measured_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.id,
    bm.weight_kg,
    bm.body_fat_percentage,
    bm.muscle_percentage,
    bm.measured_at
  FROM body_measurements bm
  WHERE bm.user_id = p_user_id
  ORDER BY bm.measured_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Calcular cambios semanales
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
      measured_at
    FROM body_measurements
    WHERE user_id = p_user_id
      AND measured_at >= NOW() - INTERVAL '8 weeks'
    ORDER BY measured_at DESC
  ),
  latest AS (
    SELECT * FROM recent_measurements LIMIT 1
  ),
  previous AS (
    SELECT * FROM recent_measurements OFFSET 1 LIMIT 1
  )
  SELECT 
    COALESCE(latest.weight_kg - previous.weight_kg, 0) as weight_change_kg,
    COALESCE(latest.body_fat_percentage - previous.body_fat_percentage, 0) as body_fat_change,
    COALESCE(latest.muscle_percentage - previous.muscle_percentage, 0) as muscle_change,
    (SELECT COUNT(*)::INTEGER FROM recent_measurements) as weeks_tracked
  FROM latest, previous;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE body_measurements IS 'Almacena medidas corporales semanales para tracking de progreso y ajuste de dieta';
COMMENT ON COLUMN body_measurements.weight_kg IS 'Peso corporal en kilogramos';
COMMENT ON COLUMN body_measurements.body_fat_percentage IS 'Porcentaje de grasa corporal';
COMMENT ON COLUMN body_measurements.muscle_percentage IS 'Porcentaje de masa muscular';
COMMENT ON COLUMN body_measurements.source IS 'Origen de los datos: manual, smart_scale, apple_health, google_fit';

