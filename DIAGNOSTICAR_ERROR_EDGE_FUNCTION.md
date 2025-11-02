# 🔍 Diagnosticar Error de Edge Function

## ✅ Verificaciones Paso a Paso

### 1. Verificar que la Edge Function Está Desplegada

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Verifica que `create-gym-user` aparece en la lista
3. Debe estar en estado **"Active"** o **"Deployed"**
4. Si tiene errores, haz clic en la función para ver los logs

### 2. Verificar Variables de Entorno (Secrets)

En **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**, verifica que existan:

#### ✅ CLERK_SECRET_KEY (CRÍTICO)
- **Nombre exacto:** `CLERK_SECRET_KEY` (sin espacios)
- **Valor:** Debe empezar con `sk_test_` o `sk_live_`
- **Cómo verificar:** 
  1. Haz clic en la función `create-gym-user`
  2. Ve a la pestaña **"Logs"**
  3. Intenta crear un usuario
  4. Si ves "Faltan variables de entorno", falta esta variable

#### ✅ SUPABASE_URL
- Generalmente se configura automáticamente
- Si falta, agrégalo manualmente con el valor de tu proyecto

#### ✅ SUPABASE_SERVICE_ROLE_KEY  
- Generalmente se configura automáticamente
- Si falta, obténlo de: Settings → API → Service Role Key

### 3. Verificar Logs de la Edge Function

1. Ve a **Supabase Dashboard** → **Edge Functions** → `create-gym-user`
2. Haz clic en la pestaña **"Logs"**
3. Intenta crear un usuario desde el dashboard
4. Revisa los logs para ver el error específico

**Errores comunes en los logs:**

- `"Faltan variables de entorno"` → Falta `CLERK_SECRET_KEY`
- `"email y empresario_id son requeridos"` → Error en los datos enviados
- `"Error creando usuario en Clerk"` → Problema con Clerk (verificar clave)
- `"Error creando miembro de gimnasio"` → Problema con Supabase

### 4. Verificar Código de la Edge Function

Asegúrate de que el código en Supabase sea exactamente igual a `supabase_edge_functions_create-gym-user/index.ts`:

1. Ve a **Edge Functions** → `create-gym-user`
2. Compara el código con el archivo local
3. Si es diferente, cópialo y vuelve a desplegar

### 5. Verificar Variables de Entorno del Dashboard

En el archivo `.env` del dashboard (`admin-dashboard/.env`):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Verificar:**
- ✅ La URL debe ser exacta (sin espacios, sin trailing slash)
- ✅ La clave ANON debe ser completa
- ✅ Reinicia el servidor después de cambiar `.env`: `npm run dev`

### 6. Probar la Edge Function Directamente

Puedes probar la Edge Function directamente desde Supabase:

1. Ve a **Edge Functions** → `create-gym-user`
2. Haz clic en **"Invoke"** o **"Test"**
3. Ingresa este JSON de prueba:
```json
{
  "email": "test@example.com",
  "name": "Test User",
  "empresario_id": "tu_empresario_id_aqui",
  "subscription_expires_at": null
}
```
4. Haz clic en **"Invoke"**
5. Revisa la respuesta y los logs

### 7. Verificar en la Consola del Navegador

1. Abre el dashboard en el navegador
2. Abre las **Herramientas de Desarrollador** (F12)
3. Ve a la pestaña **"Console"**
4. Intenta crear un usuario
5. Revisa los errores en la consola

**Mensajes comunes:**
- `"Failed to fetch"` → La Edge Function no está desplegada o la URL es incorrecta
- `"NetworkError"` → Problema de conexión
- `"CORS error"` → Problema de permisos (poco común en Supabase)

---

## 🔧 Soluciones Rápidas

### Solución 1: Re-desplegar la Edge Function

1. Ve a **Edge Functions** → `create-gym-user`
2. Copia todo el código de `supabase_edge_functions_create-gym-user/index.ts`
3. Pégalo en el editor de Supabase
4. Haz clic en **"Deploy"**
5. Espera a que termine el despliegue
6. Intenta crear un usuario de nuevo

### Solución 2: Verificar y Re-agregar Secrets

1. Ve a **Edge Functions** → **Settings** → **Secrets**
2. Elimina `CLERK_SECRET_KEY` si existe
3. Vuelve a agregarla con el valor correcto
4. Asegúrate de que el nombre sea exactamente `CLERK_SECRET_KEY` (sin espacios, mayúsculas/minúsculas exactas)

### Solución 3: Verificar URL de Supabase

1. Abre `admin-dashboard/.env`
2. Verifica que `VITE_SUPABASE_URL` tenga la URL correcta
3. Debe ser: `https://xxxxx.supabase.co` (sin trailing slash)
4. Reinicia el servidor: `npm run dev`

---

## 🐛 Errores Específicos y Soluciones

### Error: "Failed to fetch"
**Causa:** La Edge Function no está accesible  
**Solución:** 
1. Verifica que esté desplegada
2. Verifica que la URL en `.env` sea correcta
3. Verifica tu conexión a internet

### Error: "Faltan variables de entorno"
**Causa:** Falta `CLERK_SECRET_KEY` en Secrets  
**Solución:** Agrega `CLERK_SECRET_KEY` en Edge Functions → Settings → Secrets

### Error: "email y empresario_id son requeridos"
**Causa:** Los datos no se están enviando correctamente  
**Solución:** Verifica la consola del navegador para ver qué se está enviando

### Error: "Error creando usuario en Clerk"
**Causa:** Problema con la clave de Clerk  
**Solución:** 
1. Verifica que `CLERK_SECRET_KEY` sea la clave SECRET (empieza con `sk_test_` o `sk_live_`)
2. Verifica que la clave sea válida en Clerk Dashboard

---

## ✅ Checklist Final

Antes de reportar un problema, verifica:

- [ ] Edge Function `create-gym-user` está desplegada en Supabase
- [ ] `CLERK_SECRET_KEY` está en Edge Functions → Settings → Secrets
- [ ] El código de la Edge Function coincide con el archivo local
- [ ] Las variables `.env` del dashboard son correctas
- [ ] Has reiniciado el servidor después de cambiar `.env`
- [ ] Has revisado los logs de la Edge Function en Supabase
- [ ] Has revisado la consola del navegador para errores específicos

---

Si después de todas estas verificaciones el error persiste, comparte:
1. El mensaje de error exacto
2. Los logs de la Edge Function (desde Supabase)
3. Los errores de la consola del navegador (F12 → Console)
