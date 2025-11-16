# 📱 Cómo Compartir la App para Pruebas

## 🚀 Opción Rápida: Android (APK)

### Paso 1: Generar el Build
Ejecuta este comando:
```bash
eas build --profile preview --platform android
```

### Paso 2: Obtener el Link
- El build tomará 15-30 minutos
- Al terminar, EAS te dará un link de descarga
- Ejemplo: `https://expo.dev/artifacts/...`

### Paso 3: Compartir
1. Copia el link de descarga
2. Compártelo por WhatsApp, Email, etc.
3. Los usuarios:
   - Abren el link en su Android
   - Descargan el APK
   - Instalan (puede pedir "Permitir fuentes desconocidas")

## 📲 Para iOS

Requiere cuenta de Apple Developer ($99/año). Si la tienes:

```bash
eas build --profile preview --platform ios
eas submit --platform ios --latest
```

Luego agrega usuarios en TestFlight.

## ⚡ Actualizaciones Rápidas

Una vez instalada, puedes actualizar sin rebuild:
```bash
eas update --branch preview --message "Nueva versión"
```

