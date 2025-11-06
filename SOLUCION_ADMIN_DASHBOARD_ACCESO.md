# 🔧 Solución: Admin no puede acceder al Dashboard

## Problema
Un usuario tiene permisos de admin en la base de datos (tabla `admin_roles`) pero no puede acceder al dashboard cuando está en producción.

## Causas Comunes
1. **El `user_id` en `admin_roles` no coincide con el `user_id` real de Clerk**
   - Cuando un usuario se registra en Clerk desde diferentes dispositivos o sesiones, puede tener un `user_id` diferente
   - El `user_id` en la base de datos puede estar desactualizado

2. **El email en la base de datos no coincide con el email de Clerk**
   - Puede haber diferencias de mayúsculas/minúsculas o caracteres especiales

## Solución Implementada

He actualizado el código del dashboard para que:

1. **Busque primero por `user_id`** (como antes)
2. **Si no encuentra, busque por email** (nuevo)
3. **Actualice automáticamente el `user_id`** si encuentra por email

### Archivos Modificados:
- `admin-dashboard/src/services/adminService.ts` - Función `checkAdminRole()` ahora acepta email como parámetro opcional
- `admin-dashboard/src/App.tsx` - Pasa el email del usuario a la función de verificación

## Cómo Funciona Ahora

Cuando un usuario intenta acceder:
1. El sistema busca en `admin_roles` por `user_id` (ID de Clerk)
2. Si no encuentra, busca por `email` (del usuario en Clerk)
3. Si encuentra por email, actualiza automáticamente el `user_id` en la base de datos
4. Permite el acceso al dashboard

## Solución Manual (si es necesario)

Si el problema persiste, puedes actualizar manualmente el `user_id` en la base de datos:

### Opción 1: Usar el Script SQL
Ejecuta `supabase_fix_admin_user_id_by_email.sql` en Supabase SQL Editor:

```sql
UPDATE admin_roles
SET 
  user_id = 'user_ID_REAL_DE_CLERK',  -- Reemplaza con el user_id real
  updated_at = NOW()
WHERE 
  email = 'email@deladmin.com'  -- Reemplaza con el email real
  AND is_active = true;
```

### Opción 2: Desde Supabase Dashboard
1. Ve a **Table Editor** → `admin_roles`
2. Busca el registro por email
3. Edita el campo `user_id` con el ID correcto de Clerk
4. Guarda los cambios

### Cómo Obtener el user_id Real de Clerk

**Método 1: Desde la Consola del Navegador**
1. Abre el dashboard en el navegador
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña "Console"
4. Inicia sesión
5. Busca en los logs: `🔍 Verificando rol para user_id: user_...`
6. Copia ese `user_id`

**Método 2: Desde Clerk Dashboard**
1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu aplicación
3. Ve a **Users**
4. Busca el usuario por email
5. Copia el **User ID** (formato: `user_xxxxx`)

**Método 3: Desde la App Móvil**
1. Abre la app móvil
2. Ve a Profile
3. El `user_id` debería estar visible en algún lugar (o en los logs)

## Verificación

Después de aplicar la solución:

1. **Reinicia el dashboard** (si está en desarrollo: `npm run dev`)
2. **Abre la consola del navegador** (F12)
3. **Inicia sesión** con el email del admin
4. **Revisa los logs** en la consola:
   - Deberías ver: `✅ Encontrado por email:` si se encontró por email
   - Deberías ver: `✅ user_id actualizado correctamente` si se actualizó
   - Deberías ver: `✅ Usuario tiene rol: admin`

## Debugging

Si el problema persiste, revisa:

1. **Variables de entorno** en producción:
   - `VITE_SUPABASE_URL` está configurada correctamente
   - `VITE_SUPABASE_ANON_KEY` está configurada correctamente
   - `VITE_CLERK_PUBLISHABLE_KEY` está configurada correctamente

2. **En la base de datos**:
   - El registro en `admin_roles` tiene `is_active = true`
   - El `email` coincide exactamente (sin espacios, mismo formato)
   - El `role_type` es `'admin'` o `'socio'`

3. **En Clerk**:
   - El usuario está activo
   - El email en Clerk coincide con el email en la base de datos

## Logs Útiles

Cuando un usuario intenta acceder, verás estos logs en la consola:

```
🔍 Verificando rol para user_id: user_xxxxx
📧 Email del usuario: email@ejemplo.com
🔍 No se encontró por user_id, buscando por email...
✅ Encontrado por email: {...}
🔄 Actualizando user_id en admin_roles...
✅ user_id actualizado correctamente
✅ Usuario tiene rol: admin
```

Si ves estos logs, el sistema está funcionando correctamente y el problema debería resolverse automáticamente.

