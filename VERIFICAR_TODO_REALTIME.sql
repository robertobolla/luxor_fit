-- ============================================================================
-- VERIFICACIÓN COMPLETA DE REALTIME PARA NOTIFICACIONES
-- ============================================================================

-- 1. Verificar REPLICA IDENTITY de todas las tablas de chat
SELECT 
  c.relname as table_name,
  CASE 
    WHEN c.relreplident = 'd' THEN 'DEFAULT ❌'
    WHEN c.relreplident = 'n' THEN 'NOTHING ❌'
    WHEN c.relreplident = 'f' THEN 'FULL ✅'
    WHEN c.relreplident = 'i' THEN 'INDEX ⚠️'
  END as replica_identity_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('messages', 'chats', 'friendships', 'typing_indicators', 'shared_workouts')
ORDER BY c.relname;

-- 2. Verificar que todas las tablas estén en la publicación de Realtime
SELECT
  tablename,
  CASE 
    WHEN tablename IS NOT NULL THEN '✅ En publicación'
    ELSE '❌ No en publicación'
  END as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'chats', 'friendships', 'typing_indicators', 'shared_workouts')
ORDER BY tablename;

-- 3. Si alguna tabla falta en la publicación, ejecuta:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.nombre_tabla;

-- 4. Si alguna tabla no tiene REPLICA IDENTITY FULL, ejecuta:
-- ALTER TABLE public.nombre_tabla REPLICA IDENTITY FULL;

