-- ============================================================================
-- DIAGNÓSTICO COMPLETO DE REPLICA IDENTITY
-- ============================================================================

-- 1. Verificar el estado de REPLICA IDENTITY para la tabla messages específicamente
SELECT 
  'messages' as table_name,
  CASE 
    WHEN relreplident = 'd' THEN 'DEFAULT ❌ (Necesita ser FULL)'
    WHEN relreplident = 'n' THEN 'NOTHING ❌'
    WHEN relreplident = 'f' THEN 'FULL ✅ (Correcto)'
    WHEN relreplident = 'i' THEN 'INDEX ⚠️'
  END as replica_identity_status,
  relreplident as code
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'messages';

-- 2. Si el resultado NO es 'FULL ✅', ejecuta esto:
-- ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Verificar todas las tablas de chat de una vez
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

-- 4. Verificar que todas las tablas estén en la publicación de Realtime
SELECT
  tablename,
  '✅ En publicación' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'chats', 'friendships', 'typing_indicators', 'shared_workouts')
ORDER BY tablename;

