# 📱 Cómo Revisar los Logs de la Consola

## 🎯 Métodos para Ver los Logs

### 1. **Terminal donde corre Metro/Expo (Desarrollo)**

Si estás ejecutando la app con `npm start` o `expo start`:

1. Abre la terminal donde está corriendo el servidor de desarrollo
2. Los logs aparecerán automáticamente en esa terminal
3. Busca los logs que empiezan con:
   - `💬` (notificaciones de chat)
   - `✅` (éxito)
   - `❌` (errores)
   - `⚠️` (advertencias)

**Ejemplo de lo que deberías ver:**
```
💬 Configurando notificaciones de chat para: user_abc123
💬 Creando suscripción Realtime para usuario: user_abc123
✅ Suscripción Realtime establecida correctamente para: user_abc123
```

### 2. **Expo Go (App en desarrollo)**

Si estás usando Expo Go en tu dispositivo:

1. **En iOS:**
   - Agita el dispositivo o presiona `Cmd + D` (Mac) / `Ctrl + M` (Windows)
   - Selecciona "Debug Remote JS"
   - Abre Chrome y ve a `chrome://inspect`
   - O usa Safari: Develop > [Tu iPhone] > [Tu App]

2. **En Android:**
   - Agita el dispositivo o presiona `Cmd + M` (Mac) / `Ctrl + M` (Windows)
   - Selecciona "Debug"
   - Abre Chrome y ve a `chrome://inspect`
   - Abre la consola de Chrome DevTools

### 3. **React Native Debugger (Recomendado)**

1. Descarga React Native Debugger: https://github.com/jhen0409/react-native-debugger
2. Instálalo
3. En la app, agita el dispositivo y selecciona "Debug"
4. Abre React Native Debugger
5. Ve a la pestaña "Console" para ver todos los logs

### 4. **Flipper (Para desarrollo avanzado)**

1. Descarga Flipper: https://fbflipper.com/
2. Instálalo y ábrelo
3. Conecta tu dispositivo
4. Ve a la sección "Logs" para ver todos los logs de la app

### 5. **Logs del Dispositivo (iOS)**

**En Mac:**
```bash
# Conecta tu iPhone/iPad
# Abre Console.app (aplicación nativa de macOS)
# Selecciona tu dispositivo en la barra lateral
# Filtra por "Luxor Fitness" o "Expo"
```

**En Terminal:**
```bash
# iOS Simulator
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Expo"'

# Dispositivo físico (requiere Xcode)
# Abre Xcode > Window > Devices and Simulators
# Selecciona tu dispositivo > View Device Logs
```

### 6. **Logs del Dispositivo (Android)**

**En Terminal:**
```bash
# Ver todos los logs
adb logcat

# Filtrar solo logs de React Native
adb logcat | grep -i "ReactNativeJS"

# Filtrar solo logs de Expo
adb logcat | grep -i "Expo"

# Filtrar solo nuestros logs (los que empiezan con emojis)
adb logcat | grep -E "💬|✅|❌|⚠️"
```

### 7. **Chrome DevTools (Más fácil para desarrollo)**

1. Ejecuta la app con `expo start` o `npm start`
2. Presiona `j` en la terminal para abrir en el navegador
3. O agita el dispositivo y selecciona "Debug Remote JS"
4. Abre Chrome y ve a `chrome://inspect`
5. Haz clic en "inspect" debajo de tu dispositivo
6. Ve a la pestaña "Console" para ver todos los logs

## 🔍 Qué Buscar en los Logs

### Logs de Configuración (al abrir la app):
```
💬 Configurando notificaciones de chat para: user_xxx
💬 Creando suscripción Realtime para usuario: user_xxx
✅ Suscripción Realtime establecida correctamente para: user_xxx
```

### Logs cuando llega un mensaje:
```
💬 Evento Realtime recibido: {...}
💬 Nuevo mensaje recibido: {id: "...", type: "text", ...}
💬 Enviando notificación de mensaje de texto
💬 Notificación de mensaje enviada: ...
```

### Logs de errores (si algo falla):
```
❌ Error en canal Realtime: ...
⏱️ Timeout al suscribirse a Realtime
⚠️ Canal Realtime cerrado
💬 No se pueden enviar notificaciones - permisos denegados
```

## 🛠️ Comandos Útiles

### Filtrar logs específicos en terminal:
```bash
# Solo logs de chat
npm start | grep "💬"

# Solo errores
npm start | grep "❌"

# Solo notificaciones
npm start | grep "Notificación"
```

### Ver logs en tiempo real (Android):
```bash
# Ver logs en tiempo real filtrados
adb logcat -c && adb logcat | grep -E "💬|✅|❌|⚠️|Notificación"
```

## 📝 Nota Importante

Si no ves los logs con emojis (💬, ✅, ❌), puede ser que:
1. La terminal no soporte emojis (usa otra terminal o método)
2. Los logs estén siendo filtrados
3. La app no esté ejecutando el código de notificaciones

En ese caso, busca los logs sin emojis:
- "Configurando notificaciones de chat"
- "Suscripción Realtime"
- "Nuevo mensaje recibido"
- "Error en canal Realtime"

