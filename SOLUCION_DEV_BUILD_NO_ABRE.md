# 🔧 Solución: Development Build No Se Abre / Error al Iniciar

## 🐛 Problema

La app "Luxor Fitness" se descarga pero muestra un error y no se abre.

## ✅ Soluciones (Prueba en este orden)

### 1. Confiar en el Certificado del Desarrollador

**Este es el problema más común:**

1. Ve a **Configuración** en tu iPhone
2. Ve a **General**
3. Busca **"Gestión de dispositivos"** o **"Gestión de VPN y dispositivo"**
4. Busca una entrada con el nombre de tu cuenta de desarrollador (ej: "Roberto Bolla" o "Expo")
5. Toca esa entrada
6. Toca **"Confiar en [nombre]"**
7. Confirma tocando **"Confiar"** de nuevo
8. Vuelve a la pantalla de inicio
9. Intenta abrir la app de nuevo

### 2. Verificar que el Servidor de Desarrollo Esté Corriendo

Un Development Build **necesita** el servidor de desarrollo corriendo:

1. En tu computadora, ejecuta:
   ```bash
   npm start
   ```

2. Deberías ver un QR code en la terminal

3. **Abre la app "Luxor Fitness"** en tu iPhone
   - NO uses Expo Go
   - Usa la app Development Build que descargaste

4. La app debería conectarse automáticamente al servidor

### 3. Conectar Manualmente al Servidor

Si la app no se conecta automáticamente:

1. Asegúrate de que `npm start` esté corriendo
2. En la app, debería aparecer una pantalla para escanear QR o ingresar URL
3. Escanea el QR que aparece en la terminal
4. O ingresa la URL manualmente (aparece en la terminal)

### 4. Verificar Variables de Entorno

El Development Build necesita las variables de entorno configuradas. Verifica que estén en EAS:

```bash
npx eas-cli env:list
```

Asegúrate de tener:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY` (opcional)

Si faltan, agrégalas:
```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "tu_clave" --type string --visibility sensitive --environment preview
```

### 5. Reinstalar la App

Si nada funciona:

1. **Elimina la app** de tu iPhone (mantén presionado el ícono → Eliminar app)
2. **Reinstala** desde el link de descarga o TestFlight
3. **Confía en el certificado** de nuevo (paso 1)
4. **Inicia el servidor**: `npm start`
5. **Abre la app** y conéctala al servidor

### 6. Verificar el Tipo de Build

Asegúrate de que el build sea un **Development Build** (no un build de producción):

```bash
npx eas-cli build:list --platform ios --limit 1
```

Verifica que el **Profile** sea `development` o `preview` (con `developmentClient: true`).

---

## 🔍 Diagnóstico: ¿Qué Error Ves Exactamente?

### Error: "Untrusted Developer"
→ **Solución:** Confía en el certificado (paso 1)

### Error: "Could not connect to development server"
→ **Solución:** Inicia `npm start` (paso 2)

### Error: Pantalla negra / Se cierra inmediatamente
→ **Solución:** 
1. Verifica variables de entorno (paso 4)
2. Reinstala la app (paso 5)

### Error: "App requires developer mode"
→ **Solución:** Confía en el certificado (paso 1)

---

## 📋 Checklist Completo

Antes de reportar un problema, verifica:

- [ ] Confiaste en el certificado en Configuración
- [ ] El servidor `npm start` está corriendo
- [ ] Tu iPhone está en la misma WiFi que tu computadora
- [ ] Las variables de entorno están configuradas en EAS
- [ ] El build es un Development Build (no producción)
- [ ] Reinstalaste la app después de confiar en el certificado

---

## 🚀 Flujo Correcto de Uso

1. **Inicia el servidor:**
   ```bash
   npm start
   ```

2. **Abre la app "Luxor Fitness" (Development Build)** en tu iPhone
   - NO uses Expo Go
   - Usa la app que descargaste

3. **La app se conecta automáticamente** al servidor
   - Si no, escanea el QR que aparece en la terminal

4. **¡Listo!** La app debería funcionar

---

## ⚠️ Notas Importantes

- **Un Development Build NO funciona sin el servidor corriendo**
- Siempre necesitas ejecutar `npm start` antes de abrir la app
- La app se conecta al servidor para cargar el código JavaScript
- Si cierras el servidor, la app dejará de funcionar

---

## 🆘 Si Nada Funciona

1. **Verifica los logs del build:**
   ```bash
   npx eas-cli build:list --platform ios --limit 1
   ```
   Copia el link de "Logs" y revisa si hay errores

2. **Crea un nuevo build:**
   ```bash
   npx eas-cli build --profile development --platform ios
   ```

3. **Usa Expo Go temporalmente:**
   - Mientras solucionas el Development Build
   - Expo Go funciona sin necesidad de builds

