# Solución: Email no se muestra en usuarios de empresarios

## Problema
Los usuarios creados desde el dashboard de empresarios no muestran su email en la tabla, apareciendo solo un guión "-".

## Solución

### Paso 1: Ejecutar SQL en Supabase
Ejecuta el siguiente script en el **Supabase SQL Editor**:

```sql
-- Ver archivo: supabase_fix_email_display_gym_members.sql
```

Este script:
1. ✅ Agrega la columna `email` a la tabla `gym_members` (si no existe)
2. ✅ Actualiza la función `get_empresario_users` para usar `COALESCE(up.email, gm.email)`
3. ✅ Crea un índice para búsquedas rápidas

### Paso 2: Verificar que la Edge Function esté desplegada
Asegúrate de que la Edge Function `create-gym-user` esté desplegada y actualizada, ya que es la que guarda el email en `gym_members` cuando se crea un usuario.

### Paso 3: Actualizar emails de usuarios existentes (Opcional)
Si ya creaste usuarios antes de que se agregara la columna `email`, ejecuta el script:

**Archivo:** `supabase_update_existing_gym_members_emails.sql`

Este script:
1. ✅ Muestra estadísticas de usuarios sin email
2. ✅ Actualiza automáticamente los emails de usuarios que ya tienen perfil completo
3. ✅ Lista los usuarios que aún no tienen email (no han completado onboarding)

**Nota:** Los usuarios creados desde el dashboard pero que aún no han iniciado sesión en la app aparecerán sin email hasta que completen su registro. Una vez que se registren, el email se actualizará automáticamente desde su perfil de Clerk.

## Paso 4: Redesplegar la Edge Function
Después de ejecutar el SQL, necesitas redesplegar la Edge Function `create-gym-user` para que guarde el email correctamente:

```bash
# Desde la raíz del proyecto
cd supabase_edge_functions_create-gym-user
supabase functions deploy create-gym-user
```

O desde el Supabase Dashboard:
1. Ve a **Edge Functions** → **create-gym-user**
2. Haz clic en **Deploy** o **Redeploy**

## Verificación
Después de ejecutar el SQL y redesplegar:
1. ✅ Recarga la página de usuarios del empresario
2. ✅ Los usuarios **nuevos** creados desde el dashboard mostrarán su email **inmediatamente**
3. ✅ Los usuarios que ya tienen perfil completo seguirán mostrando el email de su perfil
4. ✅ Los usuarios existentes que no tienen email se actualizarán con el script del Paso 3

## Notas
- La función SQL `get_empresario_users` prioriza el email del `user_profiles` si existe, y usa el de `gym_members` como fallback
- Esto permite ver el email **inmediatamente** desde que se crea el usuario en el dashboard, sin esperar a que complete el onboarding
- La Edge Function ahora guarda el email en **todos los casos**, tanto para usuarios nuevos como existentes

