# 🔧 Flujo: Admin Sin Cuenta en la App

## Situación

Pablo (`pablochavez1192@gmail.com`) está agregado como admin en el dashboard, pero **NO tiene cuenta en la app todavía**. Cuando intente crear cuenta o iniciar sesión, debe:

1. ✅ Detectar que el email es de un admin
2. ✅ NO pedirle pago
3. ✅ Permitirle crear su perfil (onboarding)

---

## ✅ Solución Implementada

### 1. Verificación de Admin en Servicio de Pagos

**Archivo:** `src/services/payments.ts`

- `getSubscriptionStatus()` ahora verifica si el usuario es admin **PRIMERO**
- Si es admin, retorna `isActive: true` inmediatamente
- No verifica suscripción si es admin

### 2. Búsqueda por Email

**Archivo:** `src/services/adminService.ts`

- `checkAdminAccess()` busca por `user_id` primero
- Si no encuentra, busca por `email` (case-insensitive)
- Si encuentra por email, actualiza el `user_id` automáticamente

### 3. Flujo de Redirección

**Archivo:** `app/_layout.tsx` (SubscriptionGate)

- Espera a que termine la verificación de suscripción/admin
- Si `isActive = true` (admin), permite navegación libre
- Si está en onboarding, no redirige al paywall

---

## 📋 Pasos para Configurar

### Paso 1: Ejecutar SQL en Supabase

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta:

```sql
-- Verificar si existe
SELECT * FROM admin_roles 
WHERE email = 'pablochavez1192@gmail.com';

-- Crear o actualizar admin
UPDATE admin_roles
SET 
  role_type = 'admin',
  is_active = true,
  name = COALESCE(name, 'Pablo Chavez'),
  updated_at = NOW()
WHERE email = 'pablochavez1192@gmail.com';

-- Si NO existe, crear con user_id temporal
INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
SELECT 
  'temp_' || gen_random_uuid()::text,
  'pablochavez1192@gmail.com',
  'admin',
  true,
  'Pablo Chavez'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles WHERE email = 'pablochavez1192@gmail.com'
);

-- Verificar
SELECT * FROM admin_roles WHERE email = 'pablochavez1192@gmail.com';
```

**Resultado esperado:**
- `email = 'pablochavez1192@gmail.com'`
- `role_type = 'admin'`
- `is_active = true`
- `user_id` puede ser temporal (se actualizará automáticamente)

---

## 🎯 Flujo Esperado

### Cuando Pablo Crea Cuenta o Inicia Sesión:

1. **Pablo se registra/inicia sesión** con `pablochavez1192@gmail.com`
   - Clerk crea la cuenta
   - Obtiene `user_id` de Clerk

2. **`useSubscription` hook se ejecuta:**
   ```
   📋 useSubscription: Verificando suscripción para user: user_xxx
   ```

3. **`getSubscriptionStatus()` verifica admin:**
   ```
   🔍 checkAdminAccess: Verificando admin para user_id: user_xxx
   📧 Email del usuario: pablochavez1192@gmail.com
   🔍 No encontrado por user_id, buscando por email: pablochavez1192@gmail.com
   ✅ Admin encontrado por email: pablochavez1192@gmail.com
   ✅ Usuario es admin, acceso automático concedido
   ```

4. **`SubscriptionGate` ve `isActive = true`:**
   ```
   🚪 SubscriptionGate: Usuario tiene acceso activo, permitiendo navegación
   ```

5. **`index.tsx` verifica perfil:**
   ```
   🔍 Verificando perfil para usuario: user_xxx
   📊 Datos del perfil: null (no tiene perfil todavía)
   ✅ Usuario tiene perfil completo: false
   ```

6. **Redirige al onboarding:**
   ```
   router.replace('/onboarding')
   ```

7. **Pablo completa el onboarding** y crea su perfil

8. **Después del onboarding, va al dashboard**

---

## 🔍 Logs Esperados (Si Funciona)

```
📋 useSubscription: Verificando suscripción para user: user_xxx
🔍 checkAdminAccess: Verificando admin para user_id: user_xxx
📧 Email del usuario: pablochavez1192@gmail.com
🔍 No encontrado por user_id, buscando por email: pablochavez1192@gmail.com
✅ Admin encontrado por email: pablochavez1192@gmail.com
✅ Usuario es admin, acceso automático concedido
📋 useSubscription: Resultado: { isActive: true, isAdmin: true, ... }
🚪 SubscriptionGate: Usuario tiene acceso activo, permitiendo navegación
🔍 Verificando perfil para usuario: user_xxx
📊 Datos del perfil: null
✅ Usuario tiene perfil completo: false
→ Redirige a /onboarding
```

---

## ❓ Troubleshooting

### Si Pablo Sigue Viendo el Paywall

1. **Verifica que el SQL se ejecutó:**
   ```sql
   SELECT * FROM admin_roles WHERE email = 'pablochavez1192@gmail.com';
   ```
   - Debe existir el registro
   - `role_type = 'admin'`
   - `is_active = true`

2. **Revisa los logs cuando Pablo inicia sesión:**
   - Busca `🔍 checkAdminAccess: Verificando admin`
   - Busca `📧 Email del usuario`
   - Busca `✅ Admin encontrado` o `❌ No se encontró admin`

3. **Si ves "❌ No se encontró admin":**
   - Verifica que el email en `admin_roles` coincida exactamente
   - Verifica que `is_active = true`
   - Verifica que `role_type = 'admin'`

4. **Si el email no se obtiene de Clerk:**
   - Algunos proveedores OAuth no proporcionan email
   - La función buscará por `user_id` después de que se actualice

---

## 📝 Notas Importantes

### user_id Temporal

Si creas el admin con `user_id` temporal (`temp_xxx`), no hay problema:
- La función `checkAdminAccess()` buscará por email
- Si encuentra por email, actualizará el `user_id` automáticamente
- La próxima vez buscará por `user_id` directamente

### Email Case-Insensitive

La búsqueda por email usa `ilike` (case-insensitive), así que:
- `pablochavez1192@gmail.com`
- `PabloChavez1192@gmail.com`
- `PABLOCHAVEZ1192@GMAIL.COM`

Todos funcionarán igual.

---

## ✅ Checklist

- [ ] SQL ejecutado en Supabase
- [ ] Usuario existe en `admin_roles` con email correcto
- [ ] `role_type = 'admin'`
- [ ] `is_active = true`
- [ ] Pablo crea cuenta o inicia sesión
- [ ] Revisa logs: `✅ Admin encontrado por email`
- [ ] Revisa logs: `✅ Usuario es admin, acceso automático concedido`
- [ ] NO ve el paywall
- [ ] Va directamente a onboarding
- [ ] Puede completar el onboarding
- [ ] Después del onboarding, va al dashboard

---

**Próximo paso:** Ejecuta el SQL y prueba que Pablo pueda crear cuenta sin ver el paywall.

