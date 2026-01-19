-- ============================================================================
-- FIX PARA COMPARTIR PLANES DE NUTRICIÓN
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar columna nutrition_plan_id a messages (si no existe)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL;

-- 2. Agregar columna image_url a messages (si no existe)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Eliminar el constraint antiguo de message_type y crear uno nuevo que incluya nutrición
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'workout_share', 'workout_accepted', 'workout_rejected', 'nutrition_share', 'nutrition_accepted', 'nutrition_rejected', 'image'));

-- 4. Crear tabla de planes de nutrición compartidos (si no existe)
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

-- 5. Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_sender ON shared_nutrition_plans(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_receiver ON shared_nutrition_plans(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_status ON shared_nutrition_plans(status);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_plan ON shared_nutrition_plans(nutrition_plan_id);

-- 6. Trigger para actualizar updated_at
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

-- 7. Habilitar RLS
ALTER TABLE shared_nutrition_plans ENABLE ROW LEVEL SECURITY;

-- 8. Eliminar políticas existentes y crear nuevas
-- NOTA: La app usa Clerk para autenticación, no Supabase Auth
-- Por eso las políticas son permisivas (la validación se hace en el cliente)
DROP POLICY IF EXISTS "Users can view their shared nutrition plans" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "Users can create shared nutrition plans" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "Receivers can update shared nutrition plan status" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "Users can view shared plans" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "Users can insert shared plans" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "Users can update shared plans" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "shared_nutrition_select" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "shared_nutrition_insert" ON shared_nutrition_plans;
DROP POLICY IF EXISTS "shared_nutrition_update" ON shared_nutrition_plans;

-- Política para SELECT: permitir lectura (filtrado en cliente por user_id de Clerk)
CREATE POLICY "shared_nutrition_select"
ON shared_nutrition_plans FOR SELECT
USING (true);

-- Política para INSERT: permitir inserción (validación en cliente)
CREATE POLICY "shared_nutrition_insert"
ON shared_nutrition_plans FOR INSERT
WITH CHECK (true);

-- Política para UPDATE: permitir actualización (validación en cliente)
CREATE POLICY "shared_nutrition_update"
ON shared_nutrition_plans FOR UPDATE
USING (true);

-- 9. Verificar que la tabla messages tenga las columnas nuevas
SELECT 
  'messages' as tabla,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name IN ('nutrition_plan_id', 'image_url');

-- 10. Verificar estructura de shared_nutrition_plans
SELECT 
  'shared_nutrition_plans' as tabla,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shared_nutrition_plans'
ORDER BY ordinal_position;

-- 11. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'shared_nutrition_plans';
