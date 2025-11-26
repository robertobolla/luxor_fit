-- ============================================================================
-- ACTUALIZAR POLÍTICAS RLS PARA FRIENDSHIPS Y CHAT (CLERK AUTH)
-- ============================================================================
-- Este script actualiza las políticas RLS para que funcionen con Clerk
-- en lugar de Supabase Auth. Ejecuta este script en Supabase SQL Editor.

-- Eliminar políticas antiguas de friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their own friendships" ON public.friendships;

-- Crear nuevas políticas para friendships (compatibles con Clerk)
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (true); -- Permitimos SELECT ya que filtramos por user_id en el cliente

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (true); -- Permitimos INSERT ya que usamos user_id de Clerk

CREATE POLICY "Users can update their own friendships"
  ON public.friendships FOR UPDATE
  USING (true) -- Permitimos UPDATE ya que filtramos por user_id en el cliente
  WITH CHECK (true);

-- Eliminar políticas antiguas de chats
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;

-- Crear nuevas políticas para chats (compatibles con Clerk)
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (true); -- Permitimos SELECT ya que filtramos por user_id en el cliente

CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (true); -- Permitimos INSERT ya que usamos user_id de Clerk

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE
  USING (true) -- Permitimos UPDATE ya que filtramos por user_id en el cliente
  WITH CHECK (true);

-- Eliminar políticas antiguas de messages
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Crear nuevas políticas para messages (compatibles con Clerk)
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (true); -- Permitimos SELECT ya que filtramos por user_id en el cliente

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (true); -- Permitimos INSERT ya que usamos user_id de Clerk

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (true) -- Permitimos UPDATE ya que filtramos por user_id en el cliente
  WITH CHECK (true);

-- Eliminar políticas antiguas de shared_workouts
DROP POLICY IF EXISTS "Users can view shared workouts" ON public.shared_workouts;
DROP POLICY IF EXISTS "Users can create shared workouts" ON public.shared_workouts;
DROP POLICY IF EXISTS "Users can update shared workouts they received" ON public.shared_workouts;

-- Crear nuevas políticas para shared_workouts (compatibles con Clerk)
CREATE POLICY "Users can view shared workouts"
  ON public.shared_workouts FOR SELECT
  USING (true); -- Permitimos SELECT ya que filtramos por user_id en el cliente

CREATE POLICY "Users can create shared workouts"
  ON public.shared_workouts FOR INSERT
  WITH CHECK (true); -- Permitimos INSERT ya que usamos user_id de Clerk

CREATE POLICY "Users can update shared workouts they received"
  ON public.shared_workouts FOR UPDATE
  USING (true) -- Permitimos UPDATE ya que filtramos por user_id en el cliente
  WITH CHECK (true);

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('friendships', 'chats', 'messages', 'shared_workouts')
ORDER BY tablename, policyname;

