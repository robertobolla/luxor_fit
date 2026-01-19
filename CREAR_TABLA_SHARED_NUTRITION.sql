-- ============================================================================
-- CREAR TABLA PARA COMPARTIR PLANES DE NUTRICIÓN
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Agregar columna nutrition_plan_id a messages (si no existe)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL;

-- Crear tabla de planes de nutrición compartidos
CREATE TABLE IF NOT EXISTS shared_nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  nutrition_plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_sender ON shared_nutrition_plans(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_receiver ON shared_nutrition_plans(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_status ON shared_nutrition_plans(status);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_plan ON shared_nutrition_plans(nutrition_plan_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_shared_nutrition_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shared_nutrition_plans_updated_at ON shared_nutrition_plans;
CREATE TRIGGER trigger_shared_nutrition_plans_updated_at
  BEFORE UPDATE ON shared_nutrition_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_nutrition_plans_updated_at();

-- RLS Policies
ALTER TABLE shared_nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver planes compartidos donde son sender o receiver
CREATE POLICY "Users can view their shared nutrition plans"
ON shared_nutrition_plans FOR SELECT
USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);

-- Política para que los usuarios puedan crear compartidos donde son el sender
CREATE POLICY "Users can create shared nutrition plans"
ON shared_nutrition_plans FOR INSERT
WITH CHECK (sender_id = auth.uid()::text);

-- Política para que los receivers puedan actualizar el estado
CREATE POLICY "Receivers can update shared nutrition plan status"
ON shared_nutrition_plans FOR UPDATE
USING (receiver_id = auth.uid()::text);

-- Verificar tabla creada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shared_nutrition_plans'
ORDER BY ordinal_position;
