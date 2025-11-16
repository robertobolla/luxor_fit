# 🔧 Solución: Admin Ve Pantalla de Pago

## Problema

El usuario `pablochavez1192@gmail.com` está configurado como admin pero sigue viendo la pantalla de pago en lugar de ser redirigido al dashboard u onboarding.

## ✅ Soluciones Implementadas

### 1. Verificación de Admin en Servicio de Pagos

**Archivo:** `src/services/adminService.ts` (NUEVO)

Creada función `checkAdminAccess()` que:
- Verifica si el usuario es admin por `user_id`
- Si no encuentra, busca por `email` como fallback
- Si encuentra por email, actualiza el `user_id` en la base de datos

**Archivo:** `src/services/payments.ts`

Modificado `getSubscriptionStatus()` para:
- **PRIMERO** verificar si el usuario es admin
- Si es admin, retornar `isActive: true` inmediatamente
- Los admins tienen acceso automático sin verificar suscripción

### 2. Actualización del Edge Function

**Archivo:** `supabase_edge_functions_return-to-app.ts`

- Cambiado esquema de `fitmind://` a `luxorfitness://`
- Cambiado ruta de `paywall/success` a `home` (más directo)
- Actualizado textos de "FitMind" a "Luxor Fitness"

### 3. Soporte de Deep Links

**Archivo:** `app/_layout.tsx`

- Agregado soporte para ambos esquemas (`luxorfitness://` y `fitmind://`) para compatibilidad
- Mejorado parsing de `session_id` en deep links

---

## 🔍 Verificación en Base de Datos

Para verificar que el usuario está correctamente configurado como admin:

```sql
-- Verificar si el usuario existe como admin
SELECT * FROM admin_roles 
WHERE email = 'pablochavez1192@gmail.com' 
   OR user_id = 'user_id_de_clerk_aqui';

-- Si no existe, crear el registro
INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
VALUES (
  'user_id_de_clerk_del_usuario',
  'pablochavez1192@gmail.com',
  'admin',
  true,
  'Pablo Chavez'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    role_type = 'admin',
    is_active = true;
```

---

## 🚀 Cómo Funciona Ahora

1. **Usuario inicia sesión** con `pablochavez1192@gmail.com`

2. **`useSubscription` hook** llama a `getSubscriptionStatus()`

3. **`getSubscriptionStatus()`** PRIMERO verifica:
   ```typescript
   const isAdmin = await checkAdminAccess(userId, user);
   if (isAdmin) {
     return { isActive: true, isAdmin: true, ... };
   }
   ```

4. **Si es admin:**
   - `isActive = true` inmediatamente
   - No verifica suscripción
   - No redirige al paywall

5. **`SubscriptionGate`** ve `isActive = true` y permite acceso

6. **Usuario va a:**
   - Dashboard si tiene perfil completo
   - Onboarding si no tiene perfil

---

## 📝 Notas Importantes

### Verificación por Email

La función `checkAdminAccess()` busca por email si no encuentra por `user_id`. Esto es útil porque:
- El `user_id` de Clerk puede cambiar entre entornos
- El email es más estable
- Si encuentra por email, actualiza el `user_id` automáticamente

### Edge Function

**IMPORTANTE:** Necesitas actualizar el Edge Function en Supabase:

1. Ve a: Supabase Dashboard → Edge Functions
2. Encuentra `return-to-app`
3. Reemplaza el código con el contenido de `supabase_edge_functions_return-to-app.ts`
4. Despliega la función

O desde terminal:
```bash
supabase functions deploy return-to-app
```

---

## 🧪 Testing

Para verificar que funciona:

1. **Inicia sesión** con `pablochavez1192@gmail.com`
2. **Revisa los logs** en la consola:
   - Deberías ver: `✅ Usuario es admin, acceso automático concedido`
   - `isActive = true`
3. **Verifica que NO ve el paywall**
4. **Debería ir a:**
   - Dashboard si tiene perfil
   - Onboarding si no tiene perfil

---

## ❓ Troubleshooting

### El usuario sigue viendo el paywall

1. **Verifica en la base de datos:**
   ```sql
   SELECT * FROM admin_roles WHERE email = 'pablochavez1192@gmail.com';
   ```
   - Debe tener `role_type = 'admin'`
   - Debe tener `is_active = true`

2. **Verifica el user_id de Clerk:**
   - Obtén el `user_id` de Clerk para ese email
   - Verifica que coincida con el `user_id` en `admin_roles`

3. **Revisa los logs:**
   - Busca `🔍 checkAdminAccess: Verificando admin`
   - Busca `✅ Usuario es admin` o `❌ No es admin`

### El deep link no funciona

- Verifica que el Edge Function esté actualizado
- Verifica que el esquema en `app.json` sea `luxorfitness`
- Prueba manualmente: `luxorfitness://home`

---

## ✅ Checklist

- [x] Función `checkAdminAccess()` creada
- [x] `getSubscriptionStatus()` verifica admin primero
- [x] Edge Function actualizado con esquema correcto
- [x] Deep links soportan ambos esquemas
- [ ] **Edge Function desplegado en Supabase** (necesitas hacerlo)
- [ ] **Usuario verificado en base de datos** (verificar que existe)

---

**Próximo paso:** Desplegar el Edge Function actualizado en Supabase y verificar que el usuario existe en `admin_roles`.

