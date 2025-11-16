# 🔧 Solución: Error OAuth Redirect URI

## 🐛 Problema

```
ERROR  OAuth error: [e: The current redirect url passed in the sign in or sign up request does not match an authorized redirect URI for this instance. Review authorized redirect urls for your instance. exp://ybbu1g4-robertobolla9-8081.exp.direct/--/oauth-native-callback]
```

Este error ocurre cuando la URL de redirección de OAuth no está autorizada en Clerk Dashboard.

## ✅ Solución: Agregar Redirect URI en Clerk

### Paso 1: Ir al Dashboard de Clerk

1. Ve a: https://dashboard.clerk.com
2. Inicia sesión con tu cuenta
3. Selecciona tu aplicación

### Paso 2: Configurar Redirect URIs

1. En el menú lateral, ve a **"Configure"** → **"Native applications"**
   - O ve directamente a: https://dashboard.clerk.com/last-active?path=native-applications

2. Busca la sección **"Redirect URIs"** o **"Authorized redirect URLs"**

3. **IMPORTANTE:** Clerk NO acepta wildcards (`*`). Debes agregar la URL EXACTA que aparece en el error.

   **Copia la URL exacta del error:**
   ```
   exp://ybbu1g4-robertobolla9-8081.exp.direct/--/oauth-native-callback
   ```
   
   **Pégala en el campo "Redirect URLs"** (sin comillas, sin espacios)

   **Para Development Build (Producción):**
   ```
   luxorfitness://oauth-native-callback
   fitmind://oauth-native-callback
   ```

4. Haz clic en **"Add"** o **"Save"**

### Paso 3: ⚠️ Limitación de Expo Go

**Problema:** En Expo Go, la URL cambia cada vez que reinicias el servidor porque el tunnel ID cambia.

**Solución temporal:**
- Agrega la URL exacta que aparece en el error actual
- Si reinicias el servidor y cambia la URL, tendrás que agregar la nueva URL en Clerk

**Solución recomendada (para desarrollo):**
- Usa un **Development Build** en lugar de Expo Go
- Las URLs son fijas y no cambian: `luxorfitness://oauth-native-callback`

### Paso 4: Reiniciar la App

1. Detén el servidor de desarrollo (Ctrl+C)
2. Reinicia con:
   ```bash
   npm start -- --clear
   ```
3. Recarga la app en Expo Go

## 🔍 Verificación

Después de agregar las URLs, verifica que:

1. ✅ Las URLs estén guardadas en Clerk Dashboard
2. ✅ El formato sea correcto (sin espacios, sin comillas)
3. ✅ La app se haya reiniciado

## 📝 Notas Importantes

### Para Expo Go:
- Las URLs cambian cada vez que reinicias el servidor (el tunnel ID cambia)
- Por eso es mejor usar el patrón wildcard: `exp://*/--/oauth-native-callback`

### Para Development Build / Producción:
- Las URLs son fijas según tu `app.json`:
  - `luxorfitness://oauth-native-callback`
  - `fitmind://oauth-native-callback`
- Estas deben estar configuradas en Clerk para builds de producción

### Múltiples Entornos:

Si tienes desarrollo y producción, agrega ambas:

**Desarrollo (Expo Go):**
```
exp://*/--/oauth-native-callback
```

**Producción (Development Build):**
```
luxorfitness://oauth-native-callback
fitmind://oauth-native-callback
```

## 🚀 Después de Configurar

Una vez agregadas las URLs, el error debería desaparecer y OAuth (Google, TikTok) debería funcionar correctamente.

## ⚠️ Si el Problema Persiste

1. **Verifica el formato de la URL:**
   - No debe tener espacios
   - No debe tener comillas
   - Debe terminar exactamente en `/--/oauth-native-callback`

2. **Verifica que estés usando la aplicación correcta en Clerk:**
   - Asegúrate de estar en la misma aplicación que usa tu `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

3. **Espera unos segundos:**
   - Los cambios en Clerk pueden tardar unos segundos en aplicarse

