# 🔧 Solución: Redirección al Onboarding

## 🚨 Problema

Cuando abres la app, te redirige automáticamente al onboarding aunque ya completaste el proceso. Esto sucede porque:

1. **Cambiaste de desarrollo a producción**: Tu `user_id` de Clerk cambió
2. **Los datos están asociados al `user_id` de desarrollo**: La app busca tu perfil con el nuevo `user_id` de producción y no lo encuentra
3. **La app piensa que no completaste el onboarding**: Por eso te redirige

## ✅ Solución

Necesitas migrar tus datos del `user_id` de desarrollo al `user_id` de producción.

### Paso 1: Obtener tu user_id de Producción

**Opción A: Desde la App en Producción**
1. Abre la app en producción (TestFlight o build de producción)
2. Abre la consola de logs (si tienes acceso)
3. Busca en los logs: `🔍 Verificando perfil para usuario: user_xxxxx`
4. Copia ese `user_id`

**Opción B: Desde Clerk Dashboard**
1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. **Selecciona tu aplicación de PRODUCCIÓN** (asegúrate de estar en **Live Mode**, no Test Mode)
3. Ve a **Users** en el menú lateral
4. Busca tu usuario por email: `robertobolla9@gmail.com`
5. Copia el **User ID** (formato: `user_xxxxx`)

### Paso 2: Verificar tus Datos

Ejecuta el script `VERIFICAR_Y_MIGRAR_DATOS.sql` en Supabase SQL Editor:

1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `VERIFICAR_Y_MIGRAR_DATOS.sql`
3. Reemplaza `'robertobolla9@gmail.com'` con tu email si es diferente
4. Ejecuta el script
5. Verás todos los registros con tu email y sus `user_id`

### Paso 3: Migrar los Datos

Una vez que tengas tu `user_id` de producción:

1. Abre el archivo `supabase_migrar_desarrollo_a_produccion.sql`
2. Reemplaza:
   - `'TU_EMAIL_AQUI'` → `'robertobolla9@gmail.com'`
   - `'USER_ID_PRODUCCION_AQUI'` → Tu `user_id` de producción (ej: `user_2abc123xyz456`)
3. Ejecuta el script completo en Supabase SQL Editor

### Paso 4: Verificar

Después de migrar:

1. Reinicia la app completamente (ciérrala y ábrela de nuevo)
2. Inicia sesión con tu cuenta
3. Deberías ir directamente al dashboard (no al onboarding)
4. Tus datos deberían estar todos presentes

## 🔍 Verificación Rápida

Para verificar rápidamente si tienes datos:

```sql
-- Ver si tienes perfil con tu email
SELECT 
  user_id,
  email,
  name,
  fitness_level,
  created_at
FROM user_profiles
WHERE email = 'robertobolla9@gmail.com';
```

Si no ves ningún resultado, significa que:
- Los datos están con un `user_id` diferente
- O no se guardaron correctamente

## ⚠️ Nota sobre el Botón de Limpiar Sesión

Si aún ves el botón de "Limpiar Sesión de Clerk", es porque la app está usando una versión en caché. Para solucionarlo:

1. **Cierra completamente la app** (no solo minimizarla)
2. **Reinicia la app** desde cero
3. Si persiste, **limpia el caché de la app**:
   - iOS: Elimina y reinstala la app
   - Android: Configuración → Apps → Luxor Fitness → Almacenamiento → Limpiar caché

El botón ya fue eliminado del código, solo necesitas que la app cargue la versión actualizada.

