-- ============================================================================
-- SISTEMA DE CHAT Y AMISTADES
-- ============================================================================

-- Tabla de relaciones de amistad
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- ID del usuario que envía la solicitud
  friend_id TEXT NOT NULL, -- ID del usuario que recibe la solicitud
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Tabla de chats (conversaciones entre dos usuarios)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id TEXT NOT NULL, -- ID del primer usuario
  user2_id TEXT NOT NULL, -- ID del segundo usuario
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Asegurar orden consistente
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL, -- ID del usuario que envía
  receiver_id TEXT NOT NULL, -- ID del usuario que recibe
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'workout_share', 'workout_accepted', 'workout_rejected')),
  workout_plan_id UUID, -- ID del entrenamiento compartido (si aplica)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de entrenamientos compartidos
CREATE TABLE IF NOT EXISTS public.shared_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL, -- Usuario que comparte
  receiver_id TEXT NOT NULL, -- Usuario que recibe
  workout_plan_id UUID NOT NULL, -- ID del plan de entrenamiento compartido
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'active')),
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);
CREATE INDEX IF NOT EXISTS idx_chats_user1_id ON public.chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2_id ON public.chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_receiver_id ON public.shared_workouts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_status ON public.shared_workouts(status);

-- RLS (Row Level Security)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_workouts ENABLE ROW LEVEL SECURITY;

-- Políticas para friendships
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    friend_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own friendships"
  ON public.friendships FOR UPDATE
  USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    friend_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Políticas para chats
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (
    user1_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    user2_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (
    user1_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    user2_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE
  USING (
    user1_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    user2_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Políticas para messages
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    sender_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    receiver_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Políticas para shared_workouts
CREATE POLICY "Users can view shared workouts"
  ON public.shared_workouts FOR SELECT
  USING (
    sender_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
    receiver_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users can create shared workouts"
  ON public.shared_workouts FOR INSERT
  WITH CHECK (sender_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update shared workouts they received"
  ON public.shared_workouts FOR UPDATE
  USING (receiver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_workouts_updated_at BEFORE UPDATE ON public.shared_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar last_message_at y last_message_text en chats
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET 
    last_message_at = NEW.created_at,
    last_message_text = NEW.message_text,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar chat cuando se envía un mensaje
CREATE TRIGGER update_chat_on_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_last_message();

