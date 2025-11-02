# 🔧 Solucionar Error: Edge Function No Desplegada

## 🚨 Error Actual
```
No se pudo conectar al servidor. Verifica tu conexión a internet o que la Edge Function esté desplegada.
```

## ✅ Solución: Desplegar la Edge Function

### Paso 1: Abrir Supabase Dashboard

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto

### Paso 2: Crear/Verificar la Edge Function

1. En el menú lateral, ve a **Edge Functions**
2. Busca si existe `create-gym-user`
   - **Si NO existe:**
     - Haz clic en **"Create a new function"**
     - Nombre: `create-gym-user`
     - Copia todo el contenido de `supabase_edge_functions_create-gym-user/index.ts`
     - Pégalo en el editor
     - Haz clic en **"Deploy"**

   - **Si YA existe:**
     - Haz clic en `create-gym-user`
     - Verifica que el código esté actualizado
     - Si no, copia el contenido de `supabase_edge_functions_create-gym-user/index.ts` y actualízalo
     - Haz clic en **"Deploy"**

### Paso 3: Configurar Variables de Entorno (SECRETS)

1. En Edge Functions, ve a **Settings** (o **Secrets**)
2. Agrega las siguientes variables:

#### CLERK_SECRET_KEY (CRÍTICO)
- **Nombre:** `CLERK_SECRET_KEY`
- **Valor:** Tu clave secreta de Clerk
- **Cómo obtenerla:**
  1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
  2. Selecciona tu aplicación
  3. Ve a **API Keys** en el menú lateral
  4. Copia la **Secret key** (empieza con `sk_test_` o `sk_live_`)
  5. **IMPORTANTE:** Es la clave **SECRET**, no la pública

#### Variables Automáticas (ya deberían estar)
- `SUPABASE_URL` - Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Se configura automáticamente

### Paso 4: Verificar que Está Desplegada

1. En Edge Functions, verifica que `create-gym-user` aparece en la lista
2. Debe mostrar estado **"Active"** o **"Deployed"**
3. Si hay errores, revisa los logs haciendo clic en la función

### Paso 5: Probar de Nuevo

1. Vuelve al dashboard en `localhost:3001`
2. Intenta crear un usuario de nuevo
3. Si el error persiste, verifica:
   - Que la Edge Function esté desplegada
   - Que `CLERK_SECRET_KEY` esté configurada correctamente
   - Revisa los logs de la Edge Function en Supabase

---

## 🐛 Problemas Comunes

### Error: "Faltan variables de entorno"
**Solución:** Asegúrate de que `CLERK_SECRET_KEY` esté configurada en Edge Functions → Settings → Secrets

### Error: "Failed to fetch"
**Solución:** 
- Verifica tu conexión a internet
- Verifica que la URL de Supabase en `.env` sea correcta
- Asegúrate de que la Edge Function esté desplegada

### Error: "User already exists"
**Solución:** Esto es normal, significa que el usuario ya existe en Clerk. La función lo maneja automáticamente.

---

## ✅ Verificación Final

Para verificar que todo está correcto:

1. ✅ Edge Function `create-gym-user` desplegada en Supabase
2. ✅ Variable `CLERK_SECRET_KEY` configurada en Secrets
3. ✅ La función aparece como "Active" o "Deployed"
4. ✅ No hay errores en los logs de la función

¡Una vez completados estos pasos, deberías poder crear usuarios sin problemas!
