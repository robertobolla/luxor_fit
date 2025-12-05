# 🔍 Verificar Configuración de Edge Function create-gym-user

Tu Edge Function YA ESTÁ DESPLEGADA ✅

Ahora necesitas verificar que las variables de entorno estén configuradas correctamente.

---

## ✅ Paso 1: Verificar Variables en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **FitMind**
3. **Edge Functions** → Selecciona `create-gym-user`
4. Clic en **"Settings"** o el ícono de configuración ⚙️
5. Busca la sección **"Secrets"** o **"Environment Variables"**

Deberías ver estas variables:

```
✅ SUPABASE_URL (automática)
✅ SUPABASE_SERVICE_ROLE_KEY (automática)
❓ CLERK_SECRET_KEY (necesitas agregarla manualmente)
```

---

## 🔑 Paso 2: Configurar CLERK_SECRET_KEY

### 2.1 Obtener la Clave de Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu proyecto **FitMind**
3. En el menú lateral: **Configure** → **API Keys**
4. Busca la sección **"Secret keys"**
5. Copia la clave que empieza con `sk_test_` o `sk_live_`

⚠️ **IMPORTANTE:** 
- NO copies la "Publishable key" (empieza con `pk_`)
- Debe ser la **SECRET key** (empieza con `sk_`)

### 2.2 Agregar en Supabase

1. En Supabase: **Edge Functions** → **create-gym-user** → **Settings**
2. En la sección **"Secrets"**, clic en **"Add new secret"**
3. **Name:** `CLERK_SECRET_KEY`
4. **Value:** Pega la clave que copiaste (sk_test_...)
5. Clic en **"Add secret"** o **"Save"**

---

## 🧪 Paso 3: Probar que Funciona

### Test Rápido desde el Dashboard

1. Ve al **Dashboard de Empresarios**
2. Selecciona un gimnasio
3. Clic en **"Crear Nuevo Usuario"** (NO "Agregar Existente")
4. Completa:
   ```
   Email: test123@gmail.com
   Nombre: Usuario Prueba
   Período: 1 mes
   ```
5. Clic en **"Crear Usuario"**

### ✅ Si funciona correctamente:

Deberías ver:
```
✅ "Usuario creado exitosamente"
```

En los logs de Supabase verás:
```
Variables de entorno: {
  hasCLERK_SECRET_KEY: true,
  hasSUPABASE_URL: true,
  hasSUPABASE_SERVICE_ROLE_KEY: true
}
Datos recibidos: { email: 'presente', ... }
Usuario creado en Clerk...
```

### ❌ Si NO funciona:

**Error: "Faltan variables de entorno"**
```json
{
  "message": "Faltan variables de entorno",
  "missing": ["CLERK_SECRET_KEY"]
}
```
→ Vuelve al **Paso 2** y agrega la variable

**Error: "Error creando usuario en Clerk: unauthorized"**
```
Error 401 o 403
```
→ La CLERK_SECRET_KEY es incorrecta o no es válida
→ Verifica que sea la **Secret key**, no la Publishable

**Error: "Failed to fetch" o "Network error"**
```
Connection error o timeout
```
→ Verifica que la Edge Function esté activa
→ Puede que necesite redesplegar

---

## 📊 Paso 4: Ver Logs en Tiempo Real

Para ver qué está pasando cuando creas un usuario:

### Desde Supabase Dashboard:

1. **Edge Functions** → **create-gym-user**
2. Clic en **"Logs"** o **"Invocations"**
3. Intenta crear un usuario
4. Actualiza los logs para ver el resultado

### Desde Terminal (avanzado):

```bash
supabase functions logs create-gym-user --follow
```

Esto te mostrará en tiempo real qué está pasando.

---

## 🔧 Paso 5: Verificar Usuarios Creados

Después de crear un usuario de prueba, verifica en Supabase SQL Editor:

```sql
-- Ver el último usuario creado
SELECT 
  email,
  name,
  user_id,
  created_at,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ Creado correctamente en Clerk'
    ELSE '❌ Falta user_id - Edge Function no funcionó'
  END as estado
FROM gym_members
ORDER BY created_at DESC
LIMIT 1;
```

### ✅ Resultado esperado:
```
email: test123@gmail.com
name: Usuario Prueba
user_id: user_2abc123xyz... (un ID de Clerk)
estado: ✅ Creado correctamente en Clerk
```

### ❌ Si ves esto:
```
user_id: null
estado: ❌ Falta user_id
```
→ La Edge Function no se ejecutó o falló
→ Revisa los logs en el **Paso 4**

---

## 🎯 Paso 6: Arreglar Usuarios Anteriores

Si ya creaste usuarios ANTES de configurar la Edge Function (como celu8145@gmail.com):

```sql
-- 1. Ver usuarios sin user_id
SELECT email, name, created_at
FROM gym_members
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- 2. Eliminar los registros incompletos
DELETE FROM gym_members
WHERE email = 'celu8145@gmail.com'  -- Cambia por el email
  AND user_id IS NULL;

-- 3. Después, desde el dashboard:
--    "Crear Nuevo Usuario" con ese mismo email
--    Ahora SÍ debería funcionar correctamente
```

---

## 📋 Checklist Final

Antes de crear usuarios reales, verifica:

- [ ] Edge Function `create-gym-user` está desplegada
- [ ] Variable `CLERK_SECRET_KEY` está configurada en Secrets
- [ ] La clave empieza con `sk_test_` o `sk_live_` (NO `pk_`)
- [ ] Probaste con un usuario de prueba y funcionó
- [ ] El usuario de prueba tiene `user_id` en `gym_members`
- [ ] Los logs no muestran errores

Si todos están ✅, puedes crear usuarios reales sin problemas.

---

## 💡 Troubleshooting Rápido

| Síntoma | Causa | Solución |
|---------|-------|----------|
| "Faltan variables de entorno" | No está configurada CLERK_SECRET_KEY | Agregar en Secrets |
| "unauthorized" | Clave incorrecta | Verificar que sea sk_test_... |
| user_id es NULL | Edge Function no se ejecutó | Revisar logs |
| "Failed to fetch" | Edge Function no responde | Redesplegar función |
| "Usuario ya existe" | Email duplicado en Clerk | Normal, el usuario puede login |

---

## 🚨 Si Nada Funciona

Comparte:
1. Screenshot de los logs de la Edge Function
2. Screenshot de las variables de entorno (sin mostrar los valores completos)
3. El error exacto que aparece al crear usuario
4. Resultado del query del Paso 5

Y te ayudo a diagnosticar el problema exacto.

---

## ✅ Una Vez Configurado

Cuando todo esté funcionando:

1. **Elimina** usuarios de prueba:
   ```sql
   DELETE FROM gym_members WHERE email = 'test123@gmail.com';
   ```

2. **Recrea** usuarios problemáticos desde el dashboard

3. **Notifica** a los usuarios que pueden iniciar sesión:
   - Con Google OAuth (no necesitan email)
   - Con email/contraseña (recibirán email para establecer contraseña)

¡Listo! 🎉

