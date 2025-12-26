-- ============================================================================
-- SISTEMA DE MENSAJERÍA Y NOTIFICACIONES
-- ============================================================================

-- 1. Tabla para mensajes masivos del gimnasio
CREATE TABLE IF NOT EXISTS gym_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresario_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,  -- Ej: "Rocket Gym"
  message_title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'selected')),
  recipient_ids TEXT[],  -- Array de user_ids si es 'selected' o 'single'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla para notificaciones de usuarios
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,  -- 'gym_message', 'workout_plan', 'subscription', 'achievement'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_name TEXT,  -- Para mensajes de gimnasio
  related_id UUID,  -- ID relacionado (mensaje, plan, etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_gym_messages_empresario ON gym_messages(empresario_id);
CREATE INDEX IF NOT EXISTS idx_gym_messages_sent_at ON gym_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- 3. Función para enviar mensaje masivo del gimnasio
CREATE OR REPLACE FUNCTION send_gym_message(
  p_empresario_id TEXT,
  p_sender_name TEXT,
  p_message_title TEXT,
  p_message_body TEXT,
  p_recipient_type TEXT,
  p_recipient_ids TEXT[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
  v_recipient_list TEXT[];
  v_notifications_created INT := 0;
  v_recipient_id TEXT;
BEGIN
  -- Validar tipo de destinatario
  IF p_recipient_type NOT IN ('all', 'selected') THEN
    RAISE EXCEPTION 'Tipo de destinatario inválido: %', p_recipient_type;
  END IF;
  
  -- Crear el mensaje
  INSERT INTO gym_messages (
    empresario_id,
    sender_name,
    message_title,
    message_body,
    recipient_type,
    recipient_ids
  )
  VALUES (
    p_empresario_id,
    p_sender_name,
    p_message_title,
    p_message_body,
    p_recipient_type,
    p_recipient_ids
  )
  RETURNING id INTO v_message_id;
  
  -- Determinar lista de destinatarios
  IF p_recipient_type = 'all' THEN
    -- Todos los miembros activos del gimnasio
    SELECT ARRAY_AGG(user_id) INTO v_recipient_list
    FROM gym_members
    WHERE empresario_id = p_empresario_id
      AND is_active = true;
  ELSIF p_recipient_type = 'selected' THEN
    -- Lista específica de usuarios seleccionados
    v_recipient_list := p_recipient_ids;
  END IF;
  
  -- Crear notificaciones para cada destinatario
  IF v_recipient_list IS NOT NULL THEN
    FOREACH v_recipient_id IN ARRAY v_recipient_list
    LOOP
      INSERT INTO user_notifications (
        user_id,
        notification_type,
        title,
        message,
        sender_name,
        related_id,
        is_read
      )
      VALUES (
        v_recipient_id,
        'gym_message',
        p_message_title,
        p_message_body,
        p_sender_name,
        v_message_id,
        false
      );
      
      v_notifications_created := v_notifications_created + 1;
    END LOOP;
  END IF;
  
  -- Retornar resultado
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message_id', v_message_id,
    'notifications_created', v_notifications_created,
    'recipients', v_recipient_list
  );
END;
$$;

-- 4. Función para obtener notificaciones de un usuario
CREATE OR REPLACE FUNCTION get_user_notifications(
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

-- 5. Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE id = p_notification_id
    AND is_read = false;
  
  RETURN FOUND;
END;
$$;

-- 6. Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE user_id = p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- 7. Función para obtener contador de notificaciones no leídas
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_notifications
  WHERE user_id = p_user_id
    AND is_read = false;
  
  RETURN v_count;
END;
$$;

-- 8. Función para obtener historial de mensajes enviados por un empresario
CREATE OR REPLACE FUNCTION get_empresario_messages_history(
  p_empresario_id TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  sender_name TEXT,
  message_title TEXT,
  message_body TEXT,
  recipient_type TEXT,
  recipient_count INT,
  sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.sender_name,
    gm.message_title,
    gm.message_body,
    gm.recipient_type,
    CASE 
      WHEN gm.recipient_ids IS NOT NULL THEN array_length(gm.recipient_ids, 1)
      ELSE (SELECT COUNT(*)::INT FROM gym_members WHERE empresario_id = p_empresario_id AND is_active = true)
    END as recipient_count,
    gm.sent_at
  FROM gym_messages gm
  WHERE gm.empresario_id = p_empresario_id
  ORDER BY gm.sent_at DESC
  LIMIT p_limit;
END;
$$;

-- Otorgar permisos
GRANT ALL ON gym_messages TO authenticated;
GRANT ALL ON user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION send_gym_message(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(TEXT, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notifications_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresario_messages_history(TEXT, INT) TO authenticated;

-- Verificación
SELECT '✅ Tablas y funciones creadas exitosamente' as resultado;

