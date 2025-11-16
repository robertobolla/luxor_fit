# ⚡ Solución Rápida: Admin Ve Paywall

## 🎯 Problema

`pablochavez1192@gmail.com` está como admin pero ve el paywall.

## ✅ Solución en 2 Pasos

### Paso 1: Ejecutar SQL en Supabase

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta:

```sql
-- Actualizar si existe
UPDATE admin_roles
SET 
  role_type = 'admin',
  is_active = true,
  name = COALESCE(name, 'Pablo Chavez'),
  updated_at = NOW()
WHERE email = 'pablochavez1192@gmail.com';

-- Crear si NO existe (con user_id temporal)
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

### Paso 2: Probar

1. **Pablo inicia sesión** con `pablochavez1192@gmail.com`
2. **Revisa los logs**, deberías ver:
   - `✅ Admin encontrado por email`
   - `✅ Usuario es admin, acceso automático concedido`
3. **NO debería ver el paywall**
4. **Debería ir a dashboard u onboarding**

---

## 🔍 Si No Funciona

Comparte los logs cuando Pablo inicia sesión, especialmente:
- `🔍 checkAdminAccess: Verificando admin`
- `📧 Email del usuario`
- `✅ Admin encontrado` o `❌ No se encontró admin`

---

## 📝 Nota

El `user_id` puede ser temporal (`temp_xxx`). La función `checkAdminAccess()`:
1. Busca por `user_id` primero
2. Si no encuentra, busca por `email`
3. Si encuentra por email, actualiza el `user_id` automáticamente

Así que aunque el `user_id` inicial sea temporal, funcionará correctamente.

