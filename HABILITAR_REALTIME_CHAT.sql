-- ============================================================================
-- HABILITAR REALTIME PARA CHAT Y NOTIFICACIONES
-- ============================================================================
-- Este script habilita Realtime en Supabase para las tablas de chat
-- Necesario para que funcionen las notificaciones push cuando llegan mensajes

-- Habilitar Realtime para la tabla de mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Habilitar Realtime para la tabla de chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Habilitar Realtime para la tabla de friendships (solicitudes de amistad)
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

-- Habilitar Realtime para la tabla de typing_indicators (indicadores de escritura)
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Habilitar Realtime para la tabla de shared_workouts (entrenamientos compartidos)
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_workouts;

-- Configurar REPLICA IDENTITY para que Realtime funcione correctamente
-- Esto permite que Realtime detecte cambios en las filas

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

-- Verificar que Realtime esté habilitado
-- Puedes verificar esto en el dashboard de Supabase:
-- Database > Replication > Verificar que las tablas aparezcan como "Active"

-- NOTA: Si alguna tabla no aparece en la publicación, ejecuta:
-- ALTER PUBLICATION supabase_realtime ADD TABLE nombre_tabla;

