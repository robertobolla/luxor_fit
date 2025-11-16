# 🔧 Instrucciones: Configurar Admin para pablochavez1192@gmail.com

## Problema

El usuario `pablochavez1192@gmail.com` está configurado como admin pero sigue viendo la pantalla de pago.

## ✅ Solución

### Paso 1: Ejecutar SQL en Supabase

1. Ve a: **Supabase Dashboard** → **SQL Editor**
2. Copia y pega este SQL:

```sql
-- Verificar si existe
SELECT * FROM admin_roles 
WHERE email = 'pablochavez1192@gmail.com';

-- Crear o actualizar admin
INSERT INTO admin_roles (email, role_type, is_active, name)
VALUES (
  'pablochavez1192@gmail.com',
  'admin',
  true,
  'Pablo Chavez'
)
ON CONFLICT (email) DO UPDATE
SET 
  role_type = 'admin',
  is_active = true,
  name = COALESCE(admin_roles.name, 'Pablo Chavez'),
  updated_at = NOW();

-- Verificar que se creó
SELECT * FROM admin_roles 
WHERE email = 'pablochavez1192@gmail.com';
```

3. Ejecuta el SQL
4. Verifica que el resultado muestre:
   - `email = 'pablochavez1192@gmail.com'`
   - `role_type = 'admin'`
   - `is_active = true`

### Paso 2: Probar en la App

1. **Pablo inicia sesión** con `pablochavez1192@gmail.com`
2. **Revisa los logs** en la consola, deberías ver:
   ```
   🔍 checkAdminAccess: Verificando admin para user_id: user_xxx
   📧 Email del usuario: pablochavez1192@gmail.com
   ✅ Admin encontrado por email: pablochavez1192@gmail.com
   ✅ Usuario es admin, acceso automático concedido
   ```
3. **NO debería ver el paywall**
4. **Debería ir directamente a:**
   - Dashboard si tiene perfil completo
   - Onboarding si no tiene perfil

---

## 🔍 Debugging

Si aún no funciona, revisa los logs:

### Logs Esperados (Si Funciona):

```
🔍 checkAdminAccess: Verificando admin para user_id: user_xxx
📧 Email del usuario: pablochavez1192@gmail.com
🔍 No encontrado por user_id, buscando por email: pablochavez1192@gmail.com
✅ Admin encontrado por email: pablochavez1192@gmail.com
✅ Usuario es admin, acceso automático concedido
📋 useSubscription: Resultado: { isActive: true, isAdmin: true, ... }
🚪 SubscriptionGate: isActive: true
```

### Logs Si NO Funciona:

```
🔍 checkAdminAccess: Verificando admin para user_id: user_xxx
📧 Email del usuario: pablochavez1192@gmail.com
🔍 No encontrado por user_id, buscando por email: pablochavez1192@gmail.com
❌ No se encontró admin con email: pablochavez1192@gmail.com
📋 Admins existentes: [...]
❌ No es admin
```

Si ves "❌ No se encontró admin", significa que:
- El email no está en la base de datos
- O el email tiene mayúsculas/minúsculas diferentes
- O `is_active = false`

---

## 🛠️ Solución Si No Funciona

### Opción 1: Verificar Email Exacto

El email debe coincidir **exactamente** (aunque ahora usamos búsqueda case-insensitive):

```sql
-- Ver todos los admins para ver el formato exacto
SELECT email, role_type, is_active FROM admin_roles 
WHERE role_type = 'admin';
```

### Opción 2: Crear Manualmente con user_id

Si tienes el `user_id` de Clerk de Pablo:

```sql
-- Obtener user_id de Clerk (desde los logs cuando Pablo inicia sesión)
-- Luego ejecutar:
UPDATE admin_roles
SET 
  user_id = 'user_id_de_clerk_aqui',
  updated_at = NOW()
WHERE email = 'pablochavez1192@gmail.com';
```

### Opción 3: Verificar Permisos de Tabla

Asegúrate de que la tabla `admin_roles` tenga RLS configurado correctamente o deshabilitado para esta consulta.

---

## 📝 Checklist

- [ ] SQL ejecutado en Supabase
- [ ] Usuario existe en `admin_roles` con `email = 'pablochavez1192@gmail.com'`
- [ ] `role_type = 'admin'`
- [ ] `is_active = true`
- [ ] Pablo inicia sesión y revisa los logs
- [ ] Ve `✅ Usuario es admin` en los logs
- [ ] NO ve el paywall
- [ ] Va a dashboard u onboarding

---

## 🚨 Si Aún No Funciona

Comparte los logs completos cuando Pablo inicia sesión, especialmente:
- `🔍 checkAdminAccess: Verificando admin`
- `📧 Email del usuario`
- `✅ Admin encontrado` o `❌ No se encontró admin`
- `📋 Admins existentes`

Esto me ayudará a identificar el problema exacto.

