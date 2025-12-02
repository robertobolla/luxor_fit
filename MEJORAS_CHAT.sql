-- ============================================================================
-- MEJORAS AL SISTEMA DE CHAT
-- ============================================================================

-- Agregar soporte para imágenes en mensajes
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Actualizar message_type para incluir 'image'
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'workout_share', 'workout_accepted', 'workout_rejected', 'image'));

-- Tabla para indicadores de escritura (typing indicators)
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  is_typing BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(chat_id, user_id)
);

-- Índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_typing_indicators_chat_id ON public.typing_indicators(chat_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id ON public.typing_indicators(user_id);

-- RLS para typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing indicators in their chats"
  ON public.typing_indicators FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own typing indicators"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update typing indicators"
  ON public.typing_indicators FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Función para limpiar typing indicators antiguos (más de 5 segundos)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '5 seconds';
END;
$$ language 'plpgsql';

-- Índice para búsqueda de mensajes (full text search)
CREATE INDEX IF NOT EXISTS idx_messages_text_search ON public.messages USING gin(to_tsvector('spanish', message_text));

