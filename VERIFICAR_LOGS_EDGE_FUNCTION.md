# 🔍 Cómo Ver los Logs de la Edge Function

## 📍 Paso 1: Acceder a los Logs en Supabase

1. Ve a **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Selecciona tu proyecto: **`fitmind`** o **`fitness_mind`**
3. En el menú lateral, ve a **"Edge Functions"**
4. Busca la función **`create-gym-user`**
5. Haz clic en la función
6. Ve a la pestaña **"Logs"** o **"Invocations"**

---

## 🧪 Paso 2: Reproducir el Error

1. En el **Admin Dashboard** (localhost:3003 o producción)
2. Ve a tu gimnasio (Mis Usuarios)
3. Haz clic en **"+ Agregar Usuario"**
4. Ingresa un email de prueba (ej: `test123@gmail.com`)
5. Selecciona **"1 mes"**
6. Haz clic en **"Crear Usuario"**
7. **Verás el error 500**

---

## 📋 Paso 3: Buscar el Error en los Logs

En los logs de Supabase, busca la invocación más reciente (la que acaba de fallar).

### **Lo que deberías ver:**

Si todo funciona bien:
```
🔵 Iniciando creación de usuario de gimnasio
📋 Variables de entorno: { hasCLERK_SECRET_KEY: true, ... }
✅ Parámetros validados
🔵 Creando usuario en Clerk...
✅ Usuario creado en Clerk: user_xxxxx
🔵 Creando registro en gym_members...
✅ Usuario creado exitosamente
```

Si hay error:
```
❌ Faltan variables de entorno: [...]
```
O
```
❌ Error al crear en Clerk: 401 Unauthorized
```
O
```
❌ Error insertando en gym_members: ...
```

---

## 🎯 Errores Comunes y Soluciones

### **Error: "Faltan variables de entorno"**

**Causa**: `CLERK_SECRET_KEY`, `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` no están configuradas.

**Solución**:
1. Ve a **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Agrega las variables faltantes:
   - `CLERK_SECRET_KEY`: Tu secret key de Clerk (sk_live_... o sk_test_...)
   - `SUPABASE_URL`: `https://fseyophzvhafjywyufsa.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu service role key (eyJhbGci...)

---

### **Error: "401 Unauthorized" de Clerk**

**Causa**: `CLERK_SECRET_KEY` incorrecta o expirada.

**Solución**:
1. Ve a **[Clerk Dashboard](https://dashboard.clerk.com)**
2. Ve a **API Keys**
3. Copia la **Secret Key** correcta
4. Actualízala en Supabase Edge Functions → Secrets

**⚠️ Importante**: 
- Para **desarrollo** usa `sk_test_...`
- Para **producción** usa `sk_live_...`

---

### **Error: "Error creando miembro de gimnasio"**

**Causa**: Problema con la tabla `gym_members` o sus columnas.

**Solución**:
1. Verifica que la tabla `gym_members` exista
2. Verifica que tenga las columnas: `user_id`, `empresario_id`, `email`, `is_active`, `subscription_expires_at`
3. Si falta alguna columna, ejecuta:
   ```sql
   ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS email TEXT;
   ```

---

## 📸 Comparte los Logs

Para que pueda ayudarte mejor, comparte una captura de pantalla de:
1. **Los logs de la invocación fallida** (donde está el error)
2. **Las variables de entorno configuradas** (sin mostrar los valores completos)

---

## 🚀 Después de Ver los Logs

Una vez que identifiques el error exacto, puedo ayudarte a:
1. Desplegar la versión mejorada de la función
2. Configurar las variables faltantes
3. Corregir problemas en la base de datos

---

**Ve a Supabase Dashboard → Edge Functions → create-gym-user → Logs y comparte qué dice el último error.** 🔍


