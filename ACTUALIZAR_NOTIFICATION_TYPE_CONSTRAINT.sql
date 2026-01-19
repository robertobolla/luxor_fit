-- ============================================================================
-- ACTUALIZAR CHECK CONSTRAINT PARA NOTIFICATION_TYPE
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Primero eliminar el constraint existente
ALTER TABLE user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_notification_type_check;

-- 2. Agregar el nuevo constraint con todos los tipos permitidos
ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_notification_type_check 
CHECK (notification_type IN (
  -- Tipos originales
  'workout_plan',
  'nutrition_plan',
  'friend_request',
  'friend_accepted',
  'general',
  'system',
  'achievement',
  'reminder',
  -- Nuevos tipos para planes compartidos
  'workout_plan_shared',
  'workout_plan_accepted', 
  'workout_plan_rejected',
  'nutrition_plan_shared',
  'nutrition_plan_accepted',
  'nutrition_plan_rejected'
));

-- 3. Verificar que el constraint se creó correctamente
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'user_notifications_notification_type_check';
