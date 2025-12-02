-- ============================================================================
-- VERIFICAR Y CORREGIR REPLICA IDENTITY PARA REALTIME
-- ============================================================================

-- 1. Verificar el estado actual de REPLICA IDENTITY para todas las tablas de chat
SELECT 
  c.relname as table_name,
  CASE 
    WHEN c.relreplident = 'd' THEN 'DEFAULT'
    WHEN c.relreplident = 'n' THEN 'NOTHING'
    WHEN c.relreplident = 'f' THEN 'FULL'
    WHEN c.relreplident = 'i' THEN 'INDEX'
  END as replica_identity,
  c.relreplident as replica_identity_code
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('messages', 'chats', 'friendships', 'typing_indicators', 'shared_workouts')
ORDER BY c.relname;

-- 2. Si alguna tabla no tiene FULL, ejecutar estos comandos:
-- (Descomenta y ejecuta solo las que necesites)

-- Para messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Para chats
ALTER TABLE public.chats REPLICA IDENTITY FULL;

-- Para friendships
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

-- Para typing_indicators
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;

-- Para shared_workouts
ALTER TABLE public.shared_workouts REPLICA IDENTITY FULL;

-- 3. Verificar que todas las tablas estén en la publicación de Realtime
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'chats', 'friendships', 'typing_indicators', 'shared_workouts')
ORDER BY tablename;

