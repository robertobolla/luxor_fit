# 🚀 Guía para Probar la App en Local

Esta guía te ayudará a configurar y probar la app en tu entorno local antes de subirla a TestFlight.

## 📋 Requisitos Previos

1. **Node.js** instalado (versión 18 o superior)
2. **Expo CLI** instalado globalmente
3. **Expo Go** instalado en tu dispositivo móvil (iOS/Android)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 🔧 Paso 1: Instalar Dependencias

Si es la primera vez que clonas el proyecto o no has instalado las dependencias:

```bash
npm install
```

## 🔑 Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Clerk (Autenticación) - REQUERIDO
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase (Base de Datos) - REQUERIDO
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenAI (Opcional)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

### 📍 Dónde Obtener las Claves:

- **Clerk**: [Dashboard](https://dashboard.clerk.com/) → API Keys → Publishable Key
- **Supabase**: [Dashboard](https://supabase.com/dashboard) → Settings → API
- **OpenAI**: [Platform](https://platform.openai.com/) → API Keys

> ⚠️ **Importante**: El archivo `.env` ya está en `.gitignore`, así que no se subirá a Git.

## 🎯 Paso 3: Iniciar el Servidor de Desarrollo

Tienes varias opciones según cómo quieras conectarte:

### Opción A: Modo Tunnel (Recomendado para desarrollo)
```bash
npm start
# o
npm run start
```

### Opción B: Modo LAN (Más rápido, requiere estar en la misma red WiFi)
```bash
npm run start:local
```

### Opción C: Limpiar caché y empezar
```bash
npm run start:clear
```

## 📱 Paso 4: Conectar tu Dispositivo

Una vez que el servidor esté corriendo, verás un código QR en la terminal:

### Para iOS:
1. Abre la app **Expo Go** en tu iPhone
2. Escanea el código QR con la cámara del iPhone
3. La app se abrirá automáticamente en Expo Go

### Para Android:
1. Abre la app **Expo Go** en tu Android
2. Presiona "Scan QR code" dentro de Expo Go
3. Escanea el código QR

### Alternativa: Usar URL directa
También puedes presionar:
- `i` para abrir en simulador iOS (si tienes Xcode)
- `a` para abrir en emulador Android (si tienes Android Studio)
- `w` para abrir en navegador web

## 🔄 Desarrollo Activo

Mientras desarrollas:

- **Hot Reload**: Los cambios se reflejan automáticamente en la app
- **Fast Refresh**: React recarga los componentes automáticamente
- **Logs**: Verás los logs en la terminal donde corre el servidor

### Comandos Útiles Durante el Desarrollo:

- `r` - Recargar la app
- `m` - Abrir el menú de desarrollador
- `j` - Abrir el debugger
- `Ctrl+C` - Detener el servidor

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
# Limpia node_modules y reinstala
rm -rf node_modules
npm install
```

### Error: Variables de entorno no cargan
```bash
# Reinicia con caché limpio
npm run start:clear
```

### Error: "Network request failed"
- Verifica que estás en la misma red WiFi (si usas `--lan`)
- Usa `--tunnel` si estás en redes diferentes
- Verifica que las variables de entorno están correctas

### La app no se conecta
1. Verifica que Expo Go está actualizado
2. Verifica que el servidor está corriendo
3. Intenta escanear el QR nuevamente
4. Reinicia el servidor con `npm run start:clear`

## 📦 Preparar para TestFlight

Una vez que hayas probado y estés listo para subir a TestFlight:

### 1. Verificar que todo funciona en local
- ✅ Login/Registro funciona
- ✅ Onboarding completo funciona
- ✅ Navegación funciona
- ✅ No hay errores en consola

### 2. Configurar variables de producción en EAS
```bash
# Configurar secrets para producción
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

### 3. Crear build para TestFlight
```bash
# Build de preview para TestFlight
npm run build:preview:ios
```

O usar el script existente:
```bash
# Si tienes el script .bat
crear_build_testflight.bat
```

## 📝 Resumen de Comandos

| Acción | Comando |
|--------|---------|
| Instalar dependencias | `npm install` |
| Iniciar servidor (tunnel) | `npm start` |
| Iniciar servidor (LAN) | `npm run start:local` |
| Limpiar y empezar | `npm run start:clear` |
| Build para TestFlight | `npm run build:preview:ios` |

## 🔗 Enlaces Útiles

- [Documentación de Expo](https://docs.expo.dev/)
- [Expo Go App](https://expo.dev/client)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

**¡Listo!** Ahora puedes desarrollar y probar cambios en local antes de subirlos a TestFlight. 🎉


