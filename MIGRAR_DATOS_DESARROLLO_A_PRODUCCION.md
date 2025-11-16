# 🔄 Migrar Datos de Desarrollo a Producción

## 🚨 Problema

Cuando pasas de desarrollo (`pk_test_...`) a producción (`pk_live_...`), Clerk crea **usuarios diferentes** porque son aplicaciones distintas:

- **Desarrollo**: Usuarios con `user_id` como `user_test_xxxxx` o `user_xxxxx` (de la app de test)
- **Producción**: Usuarios con `user_id` como `user_xxxxx` (de la app de live)

Los datos en Supabase están asociados al `user_id` de desarrollo, pero cuando entras en producción, Clerk te da un **nuevo `user_id` de producción**, por lo que no encuentra tus datos.

## ✅ Solución

Necesitamos migrar los datos del `user_id` de desarrollo al `user_id` de producción usando el **email** como identificador común.

## 📋 Pasos para Migrar

### Paso 1: Identificar Usuarios que Necesitan Migración

Ejecuta este query en **Supabase SQL Editor** para ver qué usuarios tienen datos en desarrollo pero no en producción:

```sql
-- Ver usuarios con datos en desarrollo
SELECT 
  up.user_id as user_id_desarrollo,
  up.email,
  up.name,
  up.created_at as fecha_creacion_desarrollo,
  -- Verificar si existe en producción (necesitarás el user_id de producción)
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_profiles up2 
      WHERE up2.email = up.email 
      AND up2.user_id != up.user_id
    ) THEN '✅ Ya existe en producción'
    ELSE '❌ Necesita migración'
  END as estado
FROM user_profiles up
WHERE up.email IS NOT NULL
ORDER BY up.created_at DESC;
```

### Paso 2: Obtener el user_id de Producción

Para cada usuario que necesitas migrar, necesitas obtener su `user_id` de producción. Tienes dos opciones:

#### Opción A: Desde la App en Producción
1. Abre la app en producción
2. Inicia sesión con tu cuenta
3. Abre la consola de desarrollador (si es posible) o revisa los logs
4. Busca el `user_id` que muestra Clerk (formato: `user_xxxxx`)

#### Opción B: Desde Clerk Dashboard
1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu aplicación de **PRODUCCIÓN** (Live Mode)
3. Ve a **Users**
4. Busca el usuario por email
5. Copia el **User ID**

### Paso 3: Ejecutar la Migración

Una vez que tengas el `user_id` de producción, ejecuta el script `supabase_migrar_desarrollo_a_produccion.sql` (ver siguiente sección).

## 🔧 Script de Migración

He creado el archivo `supabase_migrar_desarrollo_a_produccion.sql` que:

1. **Actualiza `user_profiles`** - Cambia el `user_id` de desarrollo al de producción
2. **Migra todas las tablas relacionadas**:
   - `nutrition_profiles`
   - `nutrition_targets`
   - `meal_plans`
   - `meal_logs`
   - `progress_photos`
   - `workout_completions`
   - `admin_roles`
   - `gym_members`
   - Y cualquier otra tabla que use `user_id`

## ⚠️ Importante

- **Haz un backup** de tu base de datos antes de ejecutar la migración
- **Verifica** que el email y `user_id` de producción son correctos
- **Ejecuta primero** las queries de verificación para ver qué se va a migrar
- **No elimines** el registro de desarrollo hasta verificar que todo funciona en producción

## 🎯 Después de la Migración

1. **Verifica** que puedes iniciar sesión en producción y ver tus datos
2. **Confirma** que todos los datos están presentes (perfil, entrenamientos, nutrición, etc.)
3. **Opcional**: Una vez confirmado, puedes eliminar los registros de desarrollo (pero hazlo con cuidado)

## 📝 Notas

- Si un usuario tiene datos tanto en desarrollo como en producción, el script **actualizará** el registro de producción con los datos de desarrollo
- Si prefieres **combinar** datos (por ejemplo, mantener entrenamientos de ambos), necesitarás un script personalizado
- Los `user_id` de desarrollo y producción son **completamente diferentes**, por eso necesitas el email como identificador común

