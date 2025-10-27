# Integración con Apps de Salud

Este documento explica cómo conectar FitMind con Apple Health (iOS) y Google Fit (Android) para obtener datos reales de salud.

## Estado Actual

✅ **Implementado:**

- Servicio de salud con arquitectura lista para integración real
- Navegación por fechas (anterior/siguiente día)
- Datos simulados realistas para desarrollo
- Interfaz preparada para mostrar datos reales

⏳ **Pendiente:**

- Integración real con Apple Health
- Integración real con Google Fit
- Sincronización en tiempo real

## Integración con Apple Health (iOS)

### Paso 1: Instalar dependencias

```bash
npm install react-native-health --legacy-peer-deps
```

### Paso 2: Configurar permisos en app.json

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "FitMind necesita acceso a tus datos de salud para mostrarte estadísticas personalizadas.",
        "NSHealthUpdateUsageDescription": "FitMind necesita actualizar tus datos de salud."
      }
    },
    "plugins": [
      [
        "react-native-health",
        {
          "healthSharePermission": "Permitir a FitMind leer datos de salud",
          "healthUpdatePermission": "Permitir a FitMind actualizar datos de salud"
        }
      ]
    ]
  }
}
```

### Paso 3: Descomentar código en healthService.ts

En `src/services/healthService.ts`, descomentar las secciones marcadas con `TODO` para Apple Health.

### Paso 4: Probar en dispositivo real

⚠️ **Importante**: Apple Health NO funciona en el simulador, solo en dispositivos iOS reales.

```bash
npx expo run:ios
```

## Integración con Google Fit (Android)

### Paso 1: Configurar Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un nuevo proyecto o seleccionar uno existente
3. Habilitar "Fitness API"
4. Crear credenciales OAuth 2.0

### Paso 2: Instalar dependencias

```bash
npm install @react-native-community/google-fit --legacy-peer-deps
```

### Paso 3: Configurar permisos en app.json

```json
{
  "expo": {
    "android": {
      "permissions": ["ACTIVITY_RECOGNITION"],
      "config": {
        "googleMobileAdsAppId": "YOUR_GOOGLE_FIT_CLIENT_ID"
      }
    }
  }
}
```

### Paso 4: Actualizar AndroidManifest.xml

Agregar en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
```

## Tipos de Datos Disponibles

### Apple Health

- Pasos (Steps)
- Distancia (Walking + Running Distance)
- Calorías activas (Active Energy Burned)
- Sueño (Sleep Analysis)
- Frecuencia cardíaca (Heart Rate)
- Peso (Body Mass)
- Glucosa (Blood Glucose)

### Google Fit

- Pasos (TYPE_STEP_COUNT_DELTA)
- Distancia (TYPE_DISTANCE_DELTA)
- Calorías (TYPE_CALORIES_EXPENDED)
- Sueño (TYPE_SLEEP_SEGMENT)
- Frecuencia cardíaca (TYPE_HEART_RATE_BPM)
- Peso (TYPE_WEIGHT)

## Código de Ejemplo

### Obtener pasos de Apple Health

```typescript
import AppleHealthKit from "react-native-health";

const options = {
  startDate: new Date(2024, 0, 1).toISOString(),
  endDate: new Date().toISOString(),
};

AppleHealthKit.getStepCount(options, (err, results) => {
  if (err) {
    console.error("Error getting steps:", err);
    return;
  }
  console.log("Steps:", results.value);
});
```

### Obtener pasos de Google Fit

```typescript
import GoogleFit from "@react-native-community/google-fit";

const options = {
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: new Date().toISOString(),
};

GoogleFit.getDailyStepCountSamples(options)
  .then((res) => {
    console.log("Daily steps:", res);
  })
  .catch((err) => {
    console.error("Error getting steps:", err);
  });
```

## Testing

Mientras la integración real no esté completa, el servicio utiliza datos simulados realistas:

- Los datos varían según la fecha seleccionada
- Los datos de "hoy" varían según la hora del día
- Se simula variación natural día a día

## Próximos Pasos

1. **Configurar proyecto en Expo Development Build** (requerido para plugins nativos)
2. **Implementar integración con Apple Health**
3. **Implementar integración con Google Fit**
4. **Agregar sincronización en tiempo real**
5. **Guardar datos en Supabase para respaldo y análisis**
6. **Implementar caché local para datos offline**

## Referencias

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Google Fit API](https://developers.google.com/fit)
- [react-native-health](https://github.com/agencyenterprise/react-native-health)
- [Expo Development Builds](https://docs.expo.dev/development/introduction/)
