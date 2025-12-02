# 🔔 Configurar Realtime para Notificaciones Push

## 📋 Problema

Las notificaciones push no funcionan cuando llegan mensajes porque **Realtime no está habilitado** en Supabase para las tablas de chat.

## ✅ Solución

### Paso 1: Ejecutar Script SQL

1. Ve al **SQL Editor** en el dashboard de Supabase (ícono de base de datos en el sidebar izquierdo)
2. Crea una nueva query o abre el editor
3. Copia y pega el contenido completo de `HABILITAR_REALTIME_CHAT.sql`
4. Haz clic en **"Run"** o presiona `Ctrl+Enter`
5. Verifica que no haya errores (debería mostrar "Success. No rows returned")

**Nota:** Si ves errores como "table already in publication", es normal - significa que algunas tablas ya estaban habilitadas.

### Paso 2: Verificar en el Dashboard

**IMPORTANTE:** No confundas "Replication" (replicar datos a otros destinos) con "Realtime" (notificaciones en tiempo real).

Para verificar Realtime:

1. Ve a **Database** > **Publications** en Supabase (NO "Replication")
2. Haz clic en la publicación `supabase_realtime`
3. Verifica que estas tablas estén listadas:
   - ✅ `messages`
   - ✅ `chats`
   - ✅ `friendships`
   - ✅ `typing_indicators`
   - ✅ `shared_workouts`

**Alternativa:** También puedes verificar ejecutando este SQL:

```sql
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Deberías ver las 5 tablas listadas arriba.

### Paso 3: Verificar Políticas RLS

Asegúrate de que las políticas RLS permitan las suscripciones Realtime:

```sql
-- Verificar políticas para messages
SELECT * FROM pg_policies WHERE tablename = 'messages';

-- Verificar políticas para chats
SELECT * FROM pg_policies WHERE tablename = 'chats';
```

Las políticas deben permitir `SELECT` para que Realtime funcione.

### Paso 4: Probar Notificaciones

1. Abre la app en dos dispositivos/usuarios diferentes
2. Envía un mensaje desde un usuario
3. Verifica que el otro usuario reciba la notificación push

## 🔍 Verificación Adicional

### Usar Realtime Inspector

1. Ve a **Realtime** > **Inspector** en Supabase
2. Selecciona el canal: `user_messages:USER_ID`
3. Haz clic en **"Start listening"**
4. Envía un mensaje desde otro usuario
5. Deberías ver el evento en tiempo real

## ⚠️ Troubleshooting

### Si Realtime sigue sin funcionar:

1. **Verifica que Realtime esté habilitado en el proyecto:**

   - Ve a **Settings** > **API** en Supabase
   - Verifica que "Realtime" esté habilitado

2. **Verifica las políticas RLS:**

   - Las políticas deben permitir `SELECT` para los usuarios autenticados
   - Ejecuta `ACTUALIZAR_POLITICAS_RLS_FRIENDSHIPS.sql` si es necesario

3. **Verifica los permisos de la app:**

   - La app debe tener permisos de notificaciones
   - Verifica en la configuración del dispositivo

4. **Revisa los logs:**
   - Ve a **Logs** > **Realtime** en Supabase
   - Busca errores relacionados con las suscripciones

## 📝 Notas Importantes

- **REPLICA IDENTITY FULL**: Se configura para que Realtime pueda detectar todos los cambios en las filas
- **ALTER PUBLICATION**: Agrega las tablas a la publicación de Realtime
- **RLS Policies**: Deben permitir `SELECT` para que los usuarios puedan suscribirse

## ✅ Después de Configurar

Una vez configurado, las notificaciones push deberían funcionar automáticamente cuando:

- Llega un nuevo mensaje
- Llega una solicitud de amistad
- Se comparte un entrenamiento
- Se acepta/rechaza un entrenamiento compartido
