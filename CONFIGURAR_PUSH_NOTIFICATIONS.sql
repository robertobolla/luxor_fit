-- ============================================================================
-- CONFIGURACIÓN DE PUSH NOTIFICATIONS
-- ============================================================================
-- Este script crea la tabla para almacenar push tokens y la función
-- para enviar notificaciones push desde Supabase Edge Functions
-- ============================================================================

-- Tabla para almacenar los push tokens de los dispositivos
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON user_push_tokens(platform);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_user_push_tokens_updated_at ON user_push_tokens;
CREATE TRIGGER trigger_update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_push_tokens_updated_at();

-- RLS Policies
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver y modificar sus propios tokens
CREATE POLICY "Users can view their own push tokens"
  ON user_push_tokens
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON user_push_tokens
  FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON user_push_tokens
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Comentarios
COMMENT ON TABLE user_push_tokens IS 'Almacena los tokens de push notification de cada usuario';
COMMENT ON COLUMN user_push_tokens.push_token IS 'Token de Expo Push Notifications';
COMMENT ON COLUMN user_push_tokens.platform IS 'Plataforma del dispositivo (ios o android)';

-- ============================================================================
-- MODIFICAR LA FUNCIÓN send_gym_message PARA ENVIAR PUSH NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION send_gym_message(
  p_empresario_id TEXT,
  p_sender_name TEXT,
  p_message_title TEXT,
  p_message_body TEXT,
  p_recipient_type TEXT,
  p_recipient_ids TEXT[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_message_id UUID;
  v_recipient_list TEXT[];
  v_recipient_count INT;
BEGIN
  -- Validar tipo de destinatario
  IF p_recipient_type NOT IN ('all', 'selected') THEN
    RAISE EXCEPTION 'Tipo de destinatario inválido: %', p_recipient_type;
  END IF;

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

  -- Validar que haya destinatarios
  IF v_recipient_list IS NULL OR ARRAY_LENGTH(v_recipient_list, 1) = 0 THEN
    RAISE EXCEPTION 'No hay destinatarios para enviar el mensaje';
  END IF;

  v_recipient_count := ARRAY_LENGTH(v_recipient_list, 1);

  -- Insertar el mensaje en la tabla gym_messages
  INSERT INTO gym_messages (
    empresario_id,
    sender_name,
    title,
    message,
    recipient_type,
    recipient_ids,
    recipient_count
  ) VALUES (
    p_empresario_id,
    p_sender_name,
    p_message_title,
    p_message_body,
    p_recipient_type,
    v_recipient_list,
    v_recipient_count
  )
  RETURNING id INTO v_message_id;

  -- Crear notificaciones individuales para cada destinatario
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    sender_name,
    gym_message_id
  )
  SELECT
    unnest(v_recipient_list),
    p_message_title,
    p_message_body,
    p_sender_name,
    v_message_id;

  -- Retornar resultado
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message_id', v_message_id,
    'recipient_count', v_recipient_count
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN PARA OBTENER PUSH TOKENS DE LOS DESTINATARIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_push_tokens_for_users(p_user_ids TEXT[])
RETURNS TABLE (
  user_id TEXT,
  push_token TEXT,
  platform TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upt.user_id,
    upt.push_token,
    upt.platform
  FROM user_push_tokens upt
  WHERE upt.user_id = ANY(p_user_ids);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ¡IMPORTANTE!
-- ============================================================================
-- Después de ejecutar este script, necesitas:
--
-- 1. Crear una Edge Function en Supabase para enviar las push notifications
-- 2. Configurar Expo Push Notifications en tu proyecto
-- 3. Obtener el projectId de EAS en app.json
--
-- Ver el archivo PUSH_NOTIFICATIONS_SETUP.md para instrucciones completas
-- ============================================================================

