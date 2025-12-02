-- ============================================================================
-- VERIFICAR SI REALTIME ESTÁ HABILITADO
-- ============================================================================
-- Ejecuta este script para verificar qué tablas tienen Realtime habilitado

-- Ver todas las tablas en la publicación de Realtime
SELECT 
  schemaname, 
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Verificar REPLICA IDENTITY de las tablas de chat
SELECT 
  tablename,
  CASE 
    WHEN relreplident = 'd' THEN 'DEFAULT (primary key only)'
    WHEN relreplident = 'n' THEN 'NOTHING (no replica identity)'
    WHEN relreplident = 'f' THEN 'FULL (all columns)'
    WHEN relreplident = 'i' THEN 'INDEX (specific index)'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('messages', 'chats', 'friendships', 'typing_indicators', 'shared_workouts')
ORDER BY tablename;

-- Resultado esperado:
-- Todas las tablas deberían aparecer en la primera query
-- Todas las tablas deberían tener replica_identity = 'FULL (all columns)'

