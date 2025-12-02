# 🔍 Verificar Realtime para Notificaciones

## Problema
Las notificaciones push no llegan cuando se recibe un mensaje.

## Pasos de Verificación

### 1. Verificar que Realtime esté habilitado en Supabase

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Verificar que las tablas estén en la publicación de Realtime
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Debes ver estas tablas:**
- ✅ `messages`
- ✅ `chats`
- ✅ `friendships`
- ✅ `typing_indicators`
- ✅ `shared_workouts`

Si alguna tabla falta, ejecuta `HABILITAR_REALTIME_CHAT.sql`.

### 2. Verificar REPLICA IDENTITY

```sql
-- Verificar REPLICA IDENTITY para messages
SELECT 
  tablename,
  CASE 
    WHEN relreplident = 'd' THEN 'DEFAULT'
    WHEN relreplident = 'n' THEN 'NOTHING'
    WHEN relreplident = 'f' THEN 'FULL'
    WHEN relreplident = 'i' THEN 'INDEX'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'messages';
```

**Debe mostrar:** `FULL`

Si no es `FULL`, ejecuta:
```sql
ALTER TABLE public.messages REPLICA IDENTITY FULL;
```

### 3. Verificar Políticas RLS

```sql
-- Verificar políticas RLS para messages
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'messages';
```

**Debe haber políticas que permitan SELECT para usuarios autenticados.**

### 4. Verificar en Realtime Inspector

1. Ve a **Realtime** > **Inspector** en Supabase
2. Selecciona el canal: `user_messages:TU_USER_ID`
3. Haz clic en **"Start listening"**
4. Envía un mensaje desde otro usuario
5. Deberías ver el evento en tiempo real

### 5. Verificar Logs de la App

En la consola de la app, busca estos logs:

```
💬 Configurando notificaciones de chat para: USER_ID
💬 Creando suscripción Realtime para usuario: USER_ID
✅ Suscripción Realtime establecida correctamente para: USER_ID
💬 Nuevo mensaje recibido: {...}
💬 Evento Realtime recibido: {...}
```

Si ves errores como:
- `❌ Error en canal Realtime`
- `⏱️ Timeout al suscribirse a Realtime`
- `⚠️ Canal Realtime cerrado`

Entonces hay un problema con la configuración de Realtime.

### 6. Verificar Permisos de Notificaciones

1. En la app, verifica que los permisos de notificaciones estén concedidos
2. En iOS: Configuración > Luxor Fitness > Notificaciones
3. En Android: Configuración > Apps > Luxor Fitness > Notificaciones

### 7. Verificar Logs de Realtime en Supabase

1. Ve a **Logs** > **Realtime** en Supabase
2. Busca errores relacionados con:
   - `user_messages:USER_ID`
   - `messages` table
   - Subscription errors

## Soluciones Comunes

### Si Realtime no está habilitado:
Ejecuta `HABILITAR_REALTIME_CHAT.sql` completo.

### Si la suscripción no se establece:
1. Verifica que el usuario esté autenticado
2. Verifica que las políticas RLS permitan SELECT
3. Verifica que Realtime esté habilitado en Settings > API

### Si los eventos no llegan:
1. Verifica que REPLICA IDENTITY sea FULL
2. Verifica que la tabla esté en la publicación
3. Verifica los logs de Realtime en Supabase

### Si las notificaciones no se envían:
1. Verifica permisos de notificaciones en el dispositivo
2. Verifica que `sendMessageNotification` se esté llamando
3. Revisa los logs de la app para ver errores

## Prueba Manual

1. Abre la app en dos dispositivos diferentes (o un dispositivo y un simulador)
2. Inicia sesión con dos usuarios diferentes
3. Envía un mensaje desde el usuario A al usuario B
4. Verifica que:
   - El usuario B reciba la notificación push
   - Los logs muestren que se recibió el evento Realtime
   - Los logs muestren que se envió la notificación

