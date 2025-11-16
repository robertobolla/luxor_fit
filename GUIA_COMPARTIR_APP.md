# Guía para Compartir la App con Otros Usuarios

## Opciones Disponibles

### 1. **Android (Más Fácil) - APK Preview Build**

Los usuarios pueden descargar e instalar el APK directamente en sus dispositivos Android.

#### Pasos:

1. **Generar el build:**
   ```bash
   eas build --profile preview --platform android
   ```

2. **Compartir el APK:**
   - Una vez completado el build, EAS te dará un enlace de descarga
   - Comparte ese enlace con los usuarios
   - Los usuarios deben:
     - Habilitar "Instalar desde fuentes desconocidas" en su Android
     - Descargar el APK desde el enlace
     - Instalarlo en su dispositivo

### 2. **iOS (Requiere Apple Developer Account)**

Para iOS, necesitas una cuenta de Apple Developer ($99/año). Hay dos opciones:

#### Opción A: TestFlight (Recomendado)

1. **Generar el build:**
   ```bash
   eas build --profile preview --platform ios
   ```

2. **Subir a TestFlight:**
   ```bash
   eas submit --platform ios --profile preview
   ```

3. **Compartir:**
   - Agrega los emails de los usuarios en App Store Connect > TestFlight
   - Los usuarios recibirán una invitación por email
   - Instalan TestFlight desde la App Store
   - Instalan tu app desde TestFlight

#### Opción B: Distribución Ad-Hoc (Sin App Store)

Requiere registrar los UDIDs de los dispositivos de los usuarios (máximo 100 dispositivos).

### 3. **Usar EAS Update para Actualizaciones Rápidas**

Una vez que los usuarios tienen el build instalado, puedes actualizar la app sin crear un nuevo build usando EAS Update:

```bash
eas update --branch preview --message "Nueva versión"
```

## Comandos Rápidos

### Para Android:
```bash
# Generar build preview para Android
npm run build:preview:android

# O directamente:
eas build --profile preview --platform android
```

### Para iOS:
```bash
# Generar build preview para iOS
npm run build:preview:ios

# O directamente:
eas build --profile preview --platform ios
```

## Notas Importantes

1. **Android:** No necesitas cuenta de desarrollador, solo el APK
2. **iOS:** Requiere cuenta de Apple Developer ($99/año)
3. **Actualizaciones:** Puedes usar EAS Update para actualizar sin rebuilds
4. **Límites:**
   - Android: Sin límites
   - iOS TestFlight: Hasta 10,000 usuarios
   - iOS Ad-Hoc: Máximo 100 dispositivos

## Próximos Pasos

1. Ejecuta el comando para generar el build según la plataforma
2. Espera a que EAS complete el build (puede tomar 10-20 minutos)
3. Comparte el enlace de descarga con los usuarios
4. Para iOS, agrega los usuarios en TestFlight
