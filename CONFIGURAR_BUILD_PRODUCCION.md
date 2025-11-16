# 🚀 Configurar Build de Producción (Funciona Sin Servidor)

## 🎯 Objetivo

Crear un build de producción que funcione **sin necesidad de tener el servidor corriendo**. Perfecto para que otras personas prueben la app.

## ✅ Diferencia: Development Build vs Production Build

| Característica | Development Build | Production Build |
|---------------|-------------------|------------------|
| **Requiere servidor** | ✅ Sí (`npm start`) | ❌ No |
| **Funciona offline** | ❌ No | ✅ Sí |
| **Para compartir** | ❌ No recomendado | ✅ Perfecto |
| **URL OAuth** | Fija (`luxorfitness://`) | Fija (`luxorfitness://`) |

## 📋 Pasos para Crear Build de Producción

### Paso 1: Configurar Variables de Entorno para Producción

Las variables de entorno deben estar configuradas para el entorno `production`:

```bash
# Clerk
npx eas-cli env:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_tu_clave" --type string --visibility sensitive --environment production

# Supabase URL
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tu-proyecto.supabase.co" --type string --visibility sensitive --environment production

# Supabase Anon Key
npx eas-cli env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJtu_clave" --type string --visibility sensitive --environment production

# OpenAI (opcional)
npx eas-cli env:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-tu_clave" --type string --visibility sensitive --environment production
```

### Paso 2: Crear Build de Producción

```bash
npx eas-cli build --profile production --platform ios
```

Este build:
- ✅ Funciona **sin servidor**
- ✅ Se puede compartir con otros
- ✅ Funciona offline
- ✅ Se sube automáticamente a TestFlight

### Paso 3: Subir a TestFlight

Una vez que termine el build:

```bash
npx eas-cli submit --platform ios --latest
```

O manualmente desde App Store Connect.

### Paso 4: Configurar URL Fija en Clerk

1. Ve a: https://dashboard.clerk.com
2. **Configure** → **Native applications** → **iOS**
3. Agrega esta URL:
   ```
   luxorfitness://oauth-native-callback
   ```
4. Haz clic en **"Add"**

## 🎉 Resultado

Después de estos pasos:

1. ✅ El build funciona **sin servidor**
2. ✅ Otras personas pueden descargarlo desde TestFlight
3. ✅ Funciona completamente offline
4. ✅ OAuth funciona con la URL fija

## ⚠️ Notas Importantes

- **Usa claves de PRODUCCIÓN** (`pk_live_...`) para el build de producción
- **No uses `developmentClient: true`** en el perfil de producción
- **El build de producción incluye todo el código** compilado, no necesita servidor

## 🔄 Para Desarrollo

Si quieres seguir desarrollando:

- **Usa Expo Go** para desarrollo rápido
- **O usa Development Build** con `npm start` corriendo

Pero para **compartir con otros**, siempre usa un **build de producción**.

