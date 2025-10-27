# 🗺️ Pantalla de Tracking GPS con Mapa en Vivo

## 📋 Resumen

¡La pantalla de tracking GPS con **mapa visual en vivo** ya está implementada!

### ✅ **Funciona en Expo Go:**

- ✅ Mapa GPS en tiempo real (Google Maps/Apple Maps)
- ✅ Ruta dibujada en verde conforme te mueves
- ✅ Marcador de punto de inicio
- ✅ Cámara que te sigue automáticamente
- ✅ Tracking GPS en tiempo real
- ✅ Estadísticas en vivo (tiempo, distancia, velocidad)
- ✅ Botones Pausar/Reanudar y Terminar
- ✅ Guardar en Supabase
- ⚠️ **Nota**: En Expo Go, el mapa puede mostrar marca de agua "For development purposes only"

---

## 🚀 **Cómo Usar:**

### **Opción 1: Probar Ahora en Expo Go** (Más Rápido)

1. **Abre la app en Expo Go**
2. **Ve a "Ejercicio" → "Añadir ejercicio"**
3. **Selecciona "Empezar a monitorizar"**
4. **Elige una actividad: Correr, Caminar, Bici, o Senderismo**
5. **Acepta permisos de ubicación**
6. **¡Sal a la calle y empieza a moverte!** 🏃‍♂️

✅ **Verás:**

- Mapa en tiempo real con tu ubicación
- Ruta verde dibujándose conforme te mueves
- Estadísticas actualizándose en vivo
- Marca de agua "For development purposes only" (es normal en Expo Go)

---

### **Opción 2: Mapa Sin Marca de Agua** (Development Build)

Si quieres el mapa **sin marca de agua** y con mejor rendimiento, necesitas crear un **Development Build**.

#### **Paso 1: Obtener Google Maps API Key**

##### **Para Android:**

1. **Ve a Google Cloud Console**

   - [https://console.cloud.google.com](https://console.cloud.google.com)
   - Inicia sesión con tu cuenta de Google

2. **Crea un proyecto** (si no tienes uno)

   - Clic en "Nuevo proyecto"
   - Nombre: "FitMind"

3. **Habilita la API de Maps**

   - Ve a "APIs y servicios" → "Biblioteca"
   - Busca "Maps SDK for Android"
   - Clic en "Habilitar"

4. **Crea una API Key**

   - Ve a "APIs y servicios" → "Credenciales"
   - Clic en "Crear credenciales" → "Clave de API"
   - Copia la clave

5. **Restringe la clave** (opcional pero recomendado)
   - Clic en la clave recién creada
   - En "Restricciones de la aplicación", selecciona "Aplicaciones de Android"
   - Agrega el nombre del paquete: `com.fitmind.app`

##### **Para iOS:**

1. **Habilita la API de Maps**

   - Ve a "APIs y servicios" → "Biblioteca"
   - Busca "Maps SDK for iOS"
   - Clic en "Habilitar"

2. **Crea una API Key para iOS**

   - Ve a "APIs y servicios" → "Credenciales"
   - Clic en "Crear credenciales" → "Clave de API"
   - Copia la clave

3. **Restringe la clave** (opcional pero recomendado)
   - En "Restricciones de la aplicación", selecciona "Aplicaciones de iOS"
   - Agrega el Bundle ID: `com.fitmind.app`

#### **Paso 2: Configurar las API Keys**

Abre `app.json` y agrega las claves:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "TU_API_KEY_DE_IOS_AQUI"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "TU_API_KEY_DE_ANDROID_AQUI"
        }
      }
    }
  }
}
```

#### **Paso 3: Crear Development Build**

```bash
# Para iOS:
npm run build:dev:ios

# Para Android:
npm run build:dev:android
```

Espera a que termine el build (~10-15 minutos), luego:

- **iOS**: Escanea el QR o descarga el archivo .ipa
- **Android**: Escanea el QR o descarga el archivo .apk

#### **Paso 4: Instalar y Disfrutar**

¡Listo! Ahora el mapa se verá perfecto sin marca de agua.

---

## 📱 **Características del Mapa:**

### **Visualización:**

- ✅ Mapa de Google (Android) o Apple Maps (iOS)
- ✅ Tu ubicación en tiempo real (punto azul)
- ✅ **Polyline verde** que dibuja tu ruta
- ✅ **Marcador verde** en el punto de inicio
- ✅ Cámara que te sigue automáticamente
- ✅ Zoom ajustado para ver tu ruta completa

### **Estadísticas en Vivo:**

- ⏱️ **Tiempo transcurrido** (HH:MM:SS)
- 📍 **Distancia recorrida** (km con 2 decimales)
- 🚀 **Velocidad actual** (km/h)
- 📊 **Velocidad promedio** (calculada en tiempo real)

### **Controles:**

- ⏸️ **Pausar** - Pausa cronómetro y distancia
- ▶️ **Reanudar** - Continúa el tracking
- ⏹️ **Terminar** - Opciones:
  - Guardar en Supabase ✅
  - Descartar ❌
  - Cancelar ↩️

---

## 🎨 **Diseño de la Pantalla:**

```
┌─────────────────────────────┐
│  🏃 Correr      [PAUSADO]   │ ← Header transparente
├─────────────────────────────┤
│                             │
│     🗺️ MAPA EN VIVO        │
│                             │
│   ┌─────────────────┐       │
│   │ Tu ubicación   📍│      │ ← Punto azul
│   │                 │       │
│   │    ╱╲          │       │
│   │   ╱  ╲ Ruta    │       │ ← Línea verde
│   │  ╱    ╲        │       │   (tu recorrido)
│   │ 🟢     ╲       │       │
│   │ Inicio  ╲      │       │
│   └─────────────────┘       │
│                             │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │      0:05:23         │  │ ← Tiempo
│  │      Tiempo          │  │
│  ├───────────────────────┤  │
│  │ 📍 2.45 km           │  │ ← Stats
│  │ 🚀 8.5 km/h          │  │
│  │ 📊 9.2 prom          │  │
│  └───────────────────────┘  │
│                             │
│  [⏸️ Pausar] [⏹️ Terminar]  │
└─────────────────────────────┘
```

---

## 🔧 **Archivos Modificados:**

1. ✅ `app/(tabs)/tracking-screen.tsx` - Pantalla fullscreen con MapView
2. ✅ `app/(tabs)/exercise-detail.tsx` - Navegación a tracking
3. ✅ `app.json` - Plugin de react-native-maps
4. ✅ `react-native-maps` - Instalado con Expo

---

## 🐛 **Troubleshooting:**

### **Problema: "Mapa no se muestra"**

**Solución:**

1. Asegúrate de estar en un lugar abierto (el GPS no funciona bien en interiores)
2. Espera unos segundos a que el GPS se estabilice
3. Verifica que aceptaste los permisos de ubicación
4. Si estás en Expo Go, la marca de agua es normal

### **Problema: "For development purposes only"**

**Solución:**

- Esto es normal en Expo Go
- Para quitarlo, crea un Development Build con las API Keys de Google Maps (ver Opción 2)

### **Problema: "GPS no actualiza"**

**Solución:**

1. Sal a un lugar abierto (parque, calle)
2. Muévete al menos 5 metros
3. El GPS se actualiza cada 1 segundo o 5 metros
4. En interiores el GPS no funciona bien

### **Problema: "Ruta no se dibuja"**

**Solución:**

1. Asegúrate de estar en movimiento
2. La ruta se dibuja después de 2 puntos GPS
3. En Expo Go, puede tardar un poco más en cargar

---

## 💡 **Consejos:**

1. **Prueba en exterior** - El GPS funciona mejor al aire libre
2. **Espera 10-15 segundos** - Para que el GPS se estabilice
3. **Muévete de verdad** - Necesitas moverte al menos 5 metros
4. **Usa Development Build** - Para mejor rendimiento y sin marca de agua
5. **Guarda solo entrenamientos reales** - Los datos falsos no sirven

---

## 🎯 **Próximos Pasos Opcionales:**

- [ ] Agregar diferentes tipos de mapa (satélite, híbrido, terreno)
- [ ] Mostrar altitud y elevación
- [ ] Agregar alertas cada kilómetro
- [ ] Modo nocturno en el mapa
- [ ] Exportar ruta a GPX/KML
- [ ] Compartir entrenamiento con captura del mapa
- [ ] Historial de rutas guardadas

---

¡Listo! Ahora tienes tracking GPS con mapa visual en tiempo real 🎉🗺️

**Para probar ahora mismo:** Solo abre Expo Go y comienza a correr. El mapa funcionará con la marca de agua "For development purposes only", pero **todo lo demás funciona perfectamente**.
