# 🚀 Publicar FitMind en el Celular

## 📋 Requisitos Previos

1. Tener cuenta de Expo (gratis): https://expo.dev
2. Instalar EAS CLI: `npm install -g eas-cli`
3. Iniciar sesión: `eas login`

## 🎯 Opción 1: Build de Preview (Recomendado para probar)

### Para Android:

```bash
eas build --profile preview --platform android
```

### Para iOS:

```bash
eas build --profile preview --platform ios
```

Este comando:

- ✅ Compila la app en la nube
- ✅ Genera un APK/IPA que puedes instalar directamente
- ✅ No requiere certificados de desarrollo

## 🎯 Opción 2: Build de Producción (Para publicar en tiendas)

### Para Android (Google Play):

```bash
eas build --profile production --platform android
```

### Para iOS (App Store):

```bash
eas build --profile production --platform ios
```

## 📱 Después del Build

1. **Copia la URL** del QR que aparecerá en la terminal
2. **Escanea el QR** con tu celular
3. **Instala la app** directamente

O descarga desde: https://expo.dev/accounts/robertobolla9/projects/fitmind/builds

## 🔄 Actualizaciones OTA (Over-The-Air)

Para actualizar la app sin hacer un nuevo build:

```bash
eas update --branch production --message "Actualización de UI"
```

Los usuarios recibirán la actualización automáticamente al abrir la app.

## 📝 Notas Importantes

1. **Primera vez**: El build puede tardar 15-30 minutos
2. **Builds posteriores**: Solo 5-10 minutos (usa caché)
3. **Límite gratuito**: 30 builds gratis por mes
4. **Variables de entorno**: Se mantienen seguras en EAS Secrets

## 🛠️ Configuración Adicional

Si necesitas configurar variables de entorno en la nube:

```bash
# Agregar secretos a EAS
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value tu_url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value tu_key
```

## 📊 Ver Estado de Builds

```bash
eas build:list
```

## 🔗 Comandos Útiles

- `eas whoami` - Ver quién está logueado
- `eas build:list` - Ver historial de builds
- `eas build:cancel` - Cancelar un build en progreso
- `eas update:list` - Ver actualizaciones OTA
