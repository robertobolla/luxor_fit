# 🚀 Configurar Edge Function para Crear Usuarios desde Dashboard

## 📋 ¿Qué hace esta función?

Cuando creas un usuario desde el dashboard de empresarios:
1. ✅ Crea el usuario en **Clerk** (autenticación)
2. ✅ Crea el registro en **Supabase** (gimnasio)
3. ✅ Envía email de invitación automáticamente
4. ✅ Asocia al usuario con el gimnasio

**Sin esta función:** Solo se crea en Supabase, el usuario no puede iniciar sesión.

---

## 🛠️ Paso 1: Desplegar la Edge Function

### Opción A: Desde Supabase Dashboard (Recomendada)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **FitMind**
3. En el menú lateral: **Edge Functions**
4. Clic en **"Create a new function"**

5. **Configuración:**
   - **Name:** `create-gym-user`
   - **Template:** Selecciona "HTTP Request"

6. **Código:**
   - Copia **TODO** el contenido del archivo `supabase_edge_functions_create-gym-user/index.ts`
   - Pégalo en el editor
   - Clic en **"Deploy"**

### Opción B: Desde CLI (Avanzado)

Si tienes Supabase CLI instalado:

```bash
# Navegar al directorio del proyecto
cd c:/roberto/fitmind-new

# Login a Supabase
supabase login

# Link al proyecto
supabase link --project-ref TU_PROJECT_REF

# Desplegar la función
supabase functions deploy create-gym-user
```

---

## 🔐 Paso 2: Configurar Variables de Entorno

### 2.1 Obtener CLERK_SECRET_KEY

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu proyecto **FitMind**
3. En el menú lateral: **API Keys**
4. Copia la **Secret key** (empieza con `sk_test_` o `sk_live_`)

⚠️ **IMPORTANTE:** Es la clave **SECRET**, NO la publishable key.

### 2.2 Configurar en Supabase

1. En Supabase Dashboard: **Edge Functions** → **Settings**
2. En la sección **"Secrets"**, agrega:

```
CLERK_SECRET_KEY = sk_test_TU_CLAVE_AQUI
```

3. Clic en **"Add secret"**

### 2.3 Verificar otras variables

Estas deberían estar configuradas automáticamente:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

Si no están, agrégalas manualmente desde **Project Settings** → **API**.

---

## ✅ Paso 3: Verificar que Funciona

### Prueba desde el Dashboard

1. Ve al dashboard de empresarios
2. Selecciona un gimnasio
3. Clic en **"Crear Nuevo Usuario"**
4. Completa:
   - Email: `test@example.com`
   - Nombre: Test User
   - Período: 1 mes
5. Clic en **"Crear Usuario"**

### ¿Qué debería pasar?

✅ **Si funciona:**
- Mensaje: "Usuario creado exitosamente"
- El usuario recibe un email de Clerk
- Aparece en la lista de usuarios del gimnasio
- Puede iniciar sesión con ese email

❌ **Si NO funciona:**
- Error: "Failed to fetch" o "Edge Function not found"
- Ver sección de **Troubleshooting** abajo

---

## 🔍 Paso 4: Ver Logs (Debugging)

Si algo falla:

1. **Supabase Dashboard** → **Edge Functions**
2. Selecciona `create-gym-user`
3. Clic en **"Logs"**
4. Revisa los errores (especialmente variables faltantes)

Errores comunes:
```
❌ "Faltan variables de entorno: CLERK_SECRET_KEY"
→ Agrega la variable en Step 2

❌ "Error creando usuario en Clerk: unauthorized"
→ Verifica que la CLERK_SECRET_KEY sea correcta

❌ "Email already exists"
→ El usuario ya existe en Clerk, puede iniciar sesión normalmente
```

---

## 🐛 Troubleshooting

### Error: "Failed to fetch"

**Causa:** La Edge Function no está desplegada.

**Solución:**
1. Ve a **Edge Functions** en Supabase
2. Verifica que `create-gym-user` aparezca en la lista
3. Si no aparece, vuelve al **Paso 1**

### Error: "Missing CLERK_SECRET_KEY"

**Causa:** Variable de entorno no configurada.

**Solución:**
1. **Edge Functions** → **Settings** → **Secrets**
2. Agrega `CLERK_SECRET_KEY` con tu clave de Clerk
3. Redespliega la función

### Error: "Unauthorized"

**Causa:** CLERK_SECRET_KEY incorrecta.

**Solución:**
1. Verifica en Clerk Dashboard que copiaste la **Secret key** (no la publishable)
2. Debe empezar con `sk_test_` o `sk_live_`
3. Actualiza el secret en Supabase

### Usuario recibe email pero no puede iniciar sesión

**Causa:** El registro en `gym_members` no se creó correctamente.

**Solución:**
```sql
-- Verificar en Supabase SQL Editor
SELECT * FROM gym_members 
WHERE email = 'EMAIL_DEL_USUARIO';

-- Si falta, ejecutar desde el dashboard "Crear Nuevo Usuario" otra vez
```

---

## 📊 Verificar Estado Actual

Ejecuta estos queries para diagnosticar:

```sql
-- 1. Ver todos los usuarios del gimnasio
SELECT 
  email,
  name,
  user_id,
  CASE 
    WHEN user_id IS NULL THEN '❌ Sin user_id (no puede login)'
    ELSE '✅ Tiene user_id (puede login)'
  END as estado
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
ORDER BY created_at DESC;

-- 2. Ver usuarios problemáticos (sin user_id)
SELECT email, name, created_at
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
  AND (user_id IS NULL OR user_id = '');

-- 3. Arreglar usuario específico (después de crearlo en Clerk)
UPDATE gym_members
SET user_id = 'USER_ID_DE_CLERK'
WHERE email = 'EMAIL_USUARIO'
  AND (user_id IS NULL OR user_id = '');
```

---

## 🎯 Resumen Rápido

**Para que funcione automáticamente:**

1. ✅ Desplegar `create-gym-user` en Supabase Edge Functions
2. ✅ Configurar `CLERK_SECRET_KEY` en Secrets
3. ✅ Usar "Crear Nuevo Usuario" en el dashboard (no "Agregar Existente")
4. ✅ Usuario recibe email y puede iniciar sesión

**Tiempo estimado:** 5-10 minutos

---

## 📞 Soporte

Si después de seguir estos pasos sigue sin funcionar:

1. Comparte los logs de la Edge Function
2. Comparte el error exacto del dashboard
3. Verifica que el proyecto de Clerk esté en el mismo entorno (test/production)

---

## 🔗 Referencias

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Clerk Admin API Docs](https://clerk.com/docs/reference/backend-api)
- Archivo de función: `supabase_edge_functions_create-gym-user/index.ts`

