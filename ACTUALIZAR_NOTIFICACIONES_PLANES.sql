-- ============================================================================
-- ACTUALIZAR SISTEMA DE NOTIFICACIONES PARA PLANES COMPARTIDOS
-- Ejecutar en Supabase SQL Editor
-- 
-- ⚠️ IMPORTANTE: Este script es COMPATIBLE HACIA ATRÁS
-- - Agrega nuevos tipos de notificación sin eliminar los antiguos
-- - Agrega el campo related_id a la función (el código antiguo lo ignorará)
-- - No afecta notificaciones existentes
-- ============================================================================

-- 1. Actualizar el constraint de notification_type para incluir workout_plan y nutrition_plan
--    (Los tipos antiguos: 'gym_message', 'subscription', 'achievement' siguen siendo válidos)
ALTER TABLE user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_notification_type_check;

ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_notification_type_check 
CHECK (notification_type IN ('gym_message', 'workout_plan', 'nutrition_plan', 'subscription', 'achievement'));

-- 2. Eliminar la función existente para poder cambiar su tipo de retorno
DROP FUNCTION IF EXISTS get_user_notifications(TEXT, INTEGER, BOOLEAN);

-- 3. Crear la función get_user_notifications con el nuevo tipo de retorno que incluye related_id
--    NOTA: El código antiguo que no usa related_id seguirá funcionando normalmente
--    porque simplemente ignorará este campo adicional
CREATE FUNCTION get_user_notifications(
  p_user_id TEXT,
  p_limit INT DEFAULT 20,
  p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  sender_name TEXT,
  related_id UUID,  -- Campo nuevo: código antiguo lo ignorará
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    un.id,
    un.notification_type,
    un.title,
    un.message,
    un.sender_name,
    un.related_id,  -- Campo nuevo agregado
    un.is_read,
    un.created_at,
    un.read_at
  FROM user_notifications un
  WHERE un.user_id = p_user_id
    AND (NOT p_unread_only OR un.is_read = false)
  ORDER BY un.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Verificación
SELECT '✅ Sistema de notificaciones actualizado para planes compartidos' as resultado;
SELECT '✅ Compatibilidad hacia atrás: Los tipos antiguos siguen funcionando' as compatibilidad;