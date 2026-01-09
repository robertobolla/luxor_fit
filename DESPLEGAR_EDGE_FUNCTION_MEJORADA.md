# 🚀 Desplegar Edge Function Mejorada - create-gym-user

## 🎯 Problema

La Edge Function `create-gym-user` está devolviendo error 500 al intentar crear usuarios de gimnasio.

## ✅ Solución

He creado una versión mejorada (`index_v2.ts`) con:
- ✅ Mejor manejo de errores
- ✅ Logs más detallados para debugging
- ✅ Mejor manejo de usuarios existentes
- ✅ Stack traces en errores

---

## 📋 Pasos para Desplegar

### **Opción A: Usando Supabase CLI (Recomendado)**

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Login en Supabase**:
   ```bash
   supabase login
   ```

3. **Link al proyecto**:
   ```bash
   supabase link --project-ref fseyophzvhafjywyufsa
   ```

4. **Desplegar la función**:
   ```bash
   supabase functions deploy create-gym-user --no-verify-jwt
   ```
   
   O usando el archivo directamente:
   ```bash
   cd supabase_edge_functions_create-gym-user
   supabase functions deploy create-gym-user --project-ref fseyophzvhafjywyufsa
   ```

---

### **Opción B: Desde Supabase Dashboard**

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Busca la función `create-gym-user`
3. Haz clic en **"Edit"**
4. **Reemplaza todo el código** con el contenido de `index_v2.ts`
5. Haz clic en **"Deploy"**

---

## 🔍 Ver Logs de la Función

Para ver exactamente qué está causando el error 500:

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Haz clic en `create-gym-user`
3. Ve a la pestaña **"Logs"** o **"Invocations"**
4. Intenta crear un usuario desde el dashboard
5. **Busca el error en los logs**

Los logs mejorados mostrarán:
```
🔵 Iniciando creación de usuario de gimnasio
📋 Variables de entorno: { hasCLERK_SECRET_KEY: true, ... }
✅ Parámetros validados: { email: ..., name: ..., empresario_id: ... }
🔵 Creando usuario en Clerk...
```

Si hay error, verás exactamente en qué paso falló.

---

## 🔧 Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas en **Supabase Dashboard** → **Edge Functions** → **Secrets**:

- ✅ `CLERK_SECRET_KEY` (sk_live_... o sk_test_...)
- ✅ `SUPABASE_URL` (https://fseyophzvhafjywyufsa.supabase.co)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (eyJhbGci...)

---

## 📋 Errores Comunes

### Error 500: "Faltan variables de entorno"
**Solución**: Configura las variables en Edge Functions → Secrets

### Error 500: "Error creando usuario en Clerk"
**Solución**: Verifica que `CLERK_SECRET_KEY` sea correcta y esté activa

### Error 500: "Error creando miembro de gimnasio"
**Solución**: Verifica que la tabla `gym_members` exista y tenga las columnas correctas

---

## 🎯 Siguiente Paso

1. **Ve a Supabase Dashboard → Edge Functions → create-gym-user → Logs**
2. **Comparte la captura** de lo que muestra en los logs cuando intentas crear un usuario
3. Con esos logs sabré exactamente qué está fallando

---

¿Prefieres desplegar la función mejorada o primero ver los logs del error actual?


