# 🔍 Cómo Obtener tu user_id de Producción

Para migrar tus datos de desarrollo a producción, necesitas obtener tu `user_id` de producción. Aquí tienes varias formas de hacerlo:

## Método 1: Desde la App en Producción (Más Fácil)

1. **Abre la app en producción** (TestFlight o build de producción)
2. **Inicia sesión** con tu cuenta
3. **Abre la consola de logs** (si tienes acceso)
4. Busca en los logs algo como:
   ```
   🔍 Verificando perfil para user_id: user_2abc123xyz456
   ```
5. **Copia ese `user_id`**

## Método 2: Desde Clerk Dashboard

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. **Selecciona tu aplicación de PRODUCCIÓN** (asegúrate de estar en **Live Mode**, no Test Mode)
3. Ve a **Users** en el menú lateral
4. **Busca tu usuario** por email
5. **Copia el User ID** (formato: `user_xxxxx`)

## Método 3: Agregar Log Temporal en la App

Si no puedes ver los logs, puedes agregar un log temporal en la app:

1. Abre `app/(tabs)/profile.tsx` o cualquier pantalla donde tengas acceso al usuario
2. Agrega este código temporalmente:

```typescript
const { user } = useUser();

useEffect(() => {
  if (user?.id) {
    console.log('🔍 MI USER_ID DE PRODUCCIÓN:', user.id);
    Alert.alert('User ID', `Tu user_id es: ${user.id}`);
  }
}, [user?.id]);
```

3. **Compila y ejecuta** la app en producción
4. **Copia el user_id** que aparece en la alerta
5. **Elimina el código temporal** después

## Método 4: Query SQL Directo (Si conoces tu email)

Si solo necesitas verificar qué `user_id` tienes en producción, puedes ejecutar este query en Supabase:

```sql
-- Ver todos los usuarios con tu email
SELECT 
  user_id,
  email,
  name,
  created_at
FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ Reemplaza con tu email
ORDER BY created_at DESC;
```

Esto te mostrará todos los registros con tu email. El más reciente probablemente sea el de producción.

## ⚠️ Importante

- El `user_id` de **desarrollo** (pk_test_) es diferente al de **producción** (pk_live_)
- Necesitas el `user_id` de **PRODUCCIÓN** para migrar los datos
- Una vez que tengas el `user_id` de producción, usa el script `supabase_migrar_desarrollo_a_produccion.sql`

