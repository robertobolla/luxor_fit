# Instrucciones para Crear Development Build

Esta guía te ayudará a crear un **Development Build** de FitMind con integración completa de Apple Health y Google Fit.

## ✅ Prerequisitos Completados

- [x] EAS CLI instalado
- [x] Librerías de salud instaladas (`react-native-health`, `react-native-google-fit`)
- [x] Permisos configurados en `app.json`
- [x] Código de integración implementado en `src/services/healthService.ts`

## 📱 Paso 1: Configurar Cuenta de Expo

Si no tienes una cuenta de Expo, créala:

```bash
eas login
```

O crea una cuenta en: https://expo.dev/signup

## 🔧 Paso 2: Configurar el Proyecto con EAS

Inicializa EAS en tu proyecto:

```bash
eas build:configure
```

Esto creará automáticamente el archivo `eas.json` (ya está creado).

## 🍎 Para iOS (iPhone)

### Paso 2.1: Crear Development Build para iOS

```bash
npm run build:dev:ios
```

O directamente:

```bash
eas build --profile development --platform ios
```

**Durante el proceso te preguntará:**

1. **"Would you like to automatically create an Expo push notification service?"**

   - Responde: `Y` (sí)

2. **"Generate a new Apple Distribution Certificate?"**

   - Responde: `Y` (sí)

3. **"Generate a new Apple Provisioning Profile?"**
   - Responde: `Y` (sí)

### Paso 2.2: Esperar el Build

El proceso tomará entre 10-20 minutos. Puedes ver el progreso en:

- Terminal
- https://expo.dev/accounts/[tu-usuario]/projects/fitmind/builds

### Paso 2.3: Instalar en tu iPhone

Una vez completado el build:

1. Abre el link que aparece en terminal en tu iPhone
2. Instala el perfil de desarrollo
3. Descarga e instala la app
4. Ve a **Ajustes > General > VPN y gestión de dispositivos**
5. Confía en el certificado de desarrollo

### Paso 2.4: Ejecutar la App

```bash
npm start
```

- Escanea el código QR con la app que acabas de instalar
- La app se conectará y cargará tu código
- **¡Ahora tendrás acceso real a Apple Health!** 🎉

## 🤖 Para Android

### Paso 3.1: Crear Development Build para Android

```bash
npm run build:dev:android
```

O directamente:

```bash
eas build --profile development --platform android
```

### Paso 3.2: Configurar Google Fit (Requerido)

Antes de que la app funcione con Google Fit, necesitas:

1. **Crear proyecto en Google Cloud Console**

   - Ve a: https://console.cloud.google.com
   - Crea un nuevo proyecto llamado "FitMind"

2. **Habilitar Fitness API**

   - En el menú lateral: APIs & Services > Library
   - Busca "Fitness API"
   - Click en "Enable"

3. **Crear credenciales OAuth 2.0**

   - APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth Client ID"
   - Tipo: Android
   - Package name: `com.fitmind.app`
   - SHA-1: Lo obtienes con:
     ```bash
     eas credentials
     ```
   - Selecciona tu proyecto
   - Selecciona Android
   - Copia el SHA-1 fingerprint

4. **Actualizar app.json**

   En `app.json`, en la sección `android`, agrega:

   ```json
   "android": {
     "config": {
       "googleSignIn": {
         "apiKey": "TU_API_KEY_AQUI",
         "certificateHash": "TU_SHA1_AQUI"
       }
     }
   }
   ```

### Paso 3.3: Instalar en tu Android

1. Descarga el APK desde el link que aparece en terminal
2. Abre el archivo en tu teléfono
3. Acepta instalar apps de fuentes desconocidas
4. Instala la app

### Paso 3.4: Ejecutar la App

```bash
npm start
```

- Escanea el código QR con la app
- **¡Ahora tendrás acceso real a Google Fit!** 🎉

## 🔄 Actualizaciones Over-The-Air (OTA)

Una vez instalado el Development Build, los cambios de código se actualizan automáticamente:

1. Haces cambios en tu código
2. Guardas los archivos
3. La app se recarga automáticamente en tu dispositivo

**No necesitas rebuilder** a menos que:

- Agregues una nueva librería nativa
- Cambies configuración en `app.json`
- Cambies permisos nativos

## 🧪 Probar la Integración de Salud

Una vez instalada la app:

1. **Abre la app**
2. **Inicia sesión con Clerk**
3. **Ve al Dashboard**
4. **La app solicitará permisos de salud**
   - iOS: Aparecerá el diálogo de Apple Health
   - Android: Aparecerá el diálogo de Google Fit
5. **Acepta todos los permisos**
6. **¡Deberías ver tus datos reales!** 📊

## 🐛 Solución de Problemas

### iOS: "Unable to access Health data"

1. Ve a iPhone **Ajustes > Salud > Compartir datos**
2. Encuentra "FitMind"
3. Activa todos los permisos

### Android: "Google Fit not authorized"

1. Ve a **Ajustes > Google > Manage your Google Account > Data & privacy**
2. En "Third-party apps with account access"
3. Encuentra "FitMind" y verifica permisos

### Build falla en EAS

1. Verifica que tu cuenta de Expo esté verificada
2. Asegúrate de tener créditos de build (gratis: 30/mes)
3. Revisa los logs en expo.dev

## 📚 Recursos Adicionales

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Apple HealthKit Setup](https://developer.apple.com/documentation/healthkit/setting_up_healthkit)
- [Google Fit Setup](https://developers.google.com/fit/android/get-started)

## 🎯 Siguiente Paso

Una vez que tengas el Development Build funcionando con datos reales:

1. **Probar diferentes fechas** (navegación anterior/siguiente)
2. **Verificar sincronización de datos**
3. **Ajustar UI según datos reales**
4. **Implementar caché para mejor rendimiento**
5. **Crear build de producción** cuando esté listo

## 💡 Tip Pro

Puedes tener múltiples devices conectados al mismo tiempo. Útil para probar en:

- iPhone (Apple Health)
- Android (Google Fit)
- Diferentes tamaños de pantalla

---

**¿Listo para crear tu primer Development Build?** 🚀

Ejecuta:

```bash
npm run build:dev:ios
```

o

```bash
npm run build:dev:android
```
