# 🔧 Arreglar Usuario celu8145@gmail.com

## 📊 Paso 1: Diagnosticar el Problema

Ejecuta este query en Supabase SQL Editor:

```sql
SELECT 
  user_id,
  email,
  name,
  empresario_id,
  subscription_expires_at,
  created_at
FROM gym_members
WHERE email = 'celu8145@gmail.com';
```

### Resultados posibles:

#### ❌ **Caso A: No aparece nada**
El usuario nunca se agregó. Ve al **Paso 2**.

#### ⚠️ **Caso B: Aparece pero `user_id` es NULL o vacío**
Se agregó al gimnasio pero no se creó en Clerk. Ve al **Paso 3**.

#### ✅ **Caso C: Aparece con `user_id` lleno**
El usuario existe en Clerk. Ve al **Paso 4**.

---

## 🛠️ Paso 2: Usuario no existe (Caso A)

Vuelve al dashboard y:
1. **Empresarios** → Selecciona el gimnasio
2. **"Crear Nuevo Usuario"**
3. Email: `celu8145@gmail.com`
4. Nombre: (opcional)
5. Período: 1 mes o 1 año
6. **Crear Usuario**

Si da error, significa que la **Edge Function no está configurada**. Ve al **Paso 5**.

---

## 🔄 Paso 3: Usuario en DB pero no en Clerk (Caso B)

### Opción 3A: Recrear correctamente

```sql
-- 1. Eliminar el registro incompleto
DELETE FROM gym_members 
WHERE email = 'celu8145@gmail.com' 
  AND (user_id IS NULL OR user_id = '');

-- 2. Vuelve al dashboard y usa "Crear Nuevo Usuario"
```

### Opción 3B: Crear manualmente en Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. **Users** → **Create User**
3. Email: `celu8145@gmail.com`
4. ✅ **Skip password requirement**
5. ✅ Enviar email de invitación
6. Copia el **User ID** (empieza con `user_...`)
7. Ejecuta en Supabase:

```sql
UPDATE gym_members
SET user_id = 'USER_ID_QUE_COPIASTE'
WHERE email = 'celu8145@gmail.com';
```

---

## ✅ Paso 4: Usuario existe en Clerk (Caso C)

El usuario puede iniciar sesión:

1. Abre la app FitMind
2. **"Continuar con Google"**
3. Selecciona `celu8145@gmail.com`
4. ¡Listo! Ya tiene acceso

Si dice que no puede iniciar sesión:
- Verifica en Clerk Dashboard que el usuario esté activo
- Verifica que el email esté verificado

---

## ⚙️ Paso 5: Configurar Edge Function (si no funciona)

Si al crear usuario da error de "Edge Function no disponible":

### 5.1 Verificar que esté desplegada

1. **Supabase Dashboard** → **Edge Functions**
2. Busca `create-gym-user`
3. Si NO existe, créala:
   - **Create function** → Nombre: `create-gym-user`
   - Copia el contenido de `supabase_edge_functions_create-gym-user/index.ts`
   - **Deploy**

### 5.2 Configurar Variables

En **Edge Functions** → **Settings** → **Secrets**:

```
CLERK_SECRET_KEY = sk_test_... (tu clave secreta de Clerk)
```

⚠️ **IMPORTANTE**: Es la clave **SECRET**, no la pública.
La encuentras en [Clerk Dashboard](https://dashboard.clerk.com) → **API Keys** → **Secret key**

### 5.3 Verificar otras variables

Estas deberían estar configuradas automáticamente:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🎯 Solución Más Simple (Recomendada)

**Que el usuario se registre normalmente:**

1. Usuario abre la app FitMind
2. **"Continuar con Google"**
3. Selecciona `celu8145@gmail.com`
4. Completa onboarding si es primera vez
5. Automáticamente se asociará al gimnasio

Esta opción siempre funciona y no requiere configuración adicional.

---

## 📞 Si Nada Funciona

Comparte:
1. El resultado del query del **Paso 1**
2. El error exacto que aparece al crear el usuario
3. Screenshot del dashboard de Supabase Edge Functions

Y te ayudo a diagnosticar el problema específico.

