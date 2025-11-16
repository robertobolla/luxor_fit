# 🛠️ Guía: Crear Development Build

## ⚠️ Importante para iOS

Para crear un build de iOS necesitas:

1. **Apple Developer Account** ($99/año)
   - O usar Expo's managed workflow (más limitado)

2. **Autenticarte en EAS:**
   ```bash
   eas login
   ```

3. **Configurar credenciales de Apple:**
   - EAS puede hacerlo automáticamente la primera vez
   - O puedes configurarlas manualmente

## 📱 Para Android (Más Fácil)

Android no requiere cuenta de desarrollador:

```bash
# 1. Autenticarte (si no lo has hecho)
eas login

# 2. Crear el build
npm run build:dev:android

# 3. Esperar 10-20 minutos
# 4. EAS te dará un link para descargar el APK
# 5. Compartir el link con la otra persona
# 6. Instalar el APK en el dispositivo Android
```

## 🍎 Para iOS

```bash
# 1. Autenticarte
eas login

# 2. Crear el build
npm run build:dev:ios

# 3. EAS te pedirá:
#    - Apple Developer Account
#    - Configurar certificados (puede hacerlo automático)
#    - Agregar UDID del dispositivo (si es necesario)

# 4. Esperar 15-30 minutos
# 5. Descargar e instalar en el dispositivo
```

## 🚀 Después del Build

Una vez instalado el Development Build:

1. **Inicia el servidor:**
   ```bash
   npm start
   ```

2. **Abre la app Development Build** (no Expo Go)

3. **Escanea el QR code** que aparece en la terminal

4. ¡Listo! La app se carga con hot reload

## 🔄 Actualizar el Build

Si agregas nuevos módulos nativos, necesitas crear un nuevo build:

```bash
npm run build:dev:android  # o ios
```

Si solo cambias código JavaScript/TypeScript, no necesitas rebuild, solo recarga la app.

## 💡 Recomendación

Para compartir con otras personas **sin estar en la misma WiFi**:

**Opción A: Development Build (Recomendado)**
- Crea un build una vez
- Comparte el APK/IPA
- Funciona offline completamente
- Más estable y completo

**Opción B: Expo Go con Tunnel**
- Más rápido para empezar
- Pero requiere que tu servidor esté corriendo
- Limitado a módulos soportados por Expo Go

## ❓ Troubleshooting

### "Not authenticated"
```bash
eas login
```

### "No Apple Developer Account"
- Para iOS necesitas cuenta de desarrollador
- O usa Android que no requiere cuenta

### El build falla
- Revisa los logs en: https://expo.dev
- Verifica que `eas.json` esté correcto
- Asegúrate de tener todas las dependencias instaladas

### La app no se conecta al servidor
- Verifica que `npm start` esté corriendo
- Usa `--tunnel` si están en redes diferentes
- Verifica que el QR code sea el correcto

