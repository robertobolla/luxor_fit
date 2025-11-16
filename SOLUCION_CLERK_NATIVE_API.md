# 🔧 Solución: Error "The Native API is disabled for this instance"

## 🐛 Problema

```
ERROR  The Native API is disabled for this instance.
Go to Clerk Dashboard > Configure > Native applications to enable it.
```

Este error ocurre cuando Clerk no tiene habilitada la Native API para aplicaciones móviles.

## ✅ Solución: Habilitar Native API en Clerk

### Paso 1: Ir al Dashboard de Clerk

1. Ve a: https://dashboard.clerk.com
2. Inicia sesión con tu cuenta
3. Selecciona tu aplicación (la que estás usando para esta app)

### Paso 2: Habilitar Native Applications

1. En el menú lateral, ve a **"Configure"** → **"Native applications"**
   - O ve directamente a: https://dashboard.clerk.com/last-active?path=native-applications

2. Verás una opción para **"Enable Native API"** o **"Enable Native Applications"**

3. Haz clic en **"Enable"** o **"Activate"**

4. Si te pide confirmación, confirma la acción

### Paso 3: Verificar la Configuración

Después de habilitar, deberías ver:
- ✅ Native API: **Enabled**
- ✅ Status: **Active**

### Paso 4: Reiniciar la App

1. Detén el servidor de desarrollo (Ctrl+C)
2. Reinicia con:
   ```bash
   npm start -- --clear
   ```
3. Recarga la app en Expo Go o tu dispositivo

## 🔍 Verificación Adicional

Si el problema persiste, verifica:

1. **Clave de Clerk correcta:**
   - Para desarrollo local: `pk_test_...`
   - Para producción: `pk_live_...`
   - Verifica que estés usando la clave correcta según el entorno

2. **Variables de entorno:**
   ```bash
   # Verifica que EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY esté configurada
   echo $EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

3. **Reinstalar dependencias (si es necesario):**
   ```bash
   npm install
   ```

## 📝 Nota Importante

- La Native API debe estar habilitada **por aplicación** en Clerk
- Si tienes múltiples aplicaciones en Clerk, habilítala para la aplicación correcta
- Los cambios pueden tardar unos segundos en aplicarse

## 🚀 Después de Habilitar

Una vez habilitada la Native API, el error debería desaparecer y la autenticación debería funcionar correctamente.

