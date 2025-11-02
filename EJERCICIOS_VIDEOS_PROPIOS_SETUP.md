# 🎥 Sistema de Videos Propios para Ejercicios

Este documento explica cómo configurar el sistema para usar tus propios videos almacenados en Supabase Storage en lugar de YouTube.

---

## 📋 Resumen

El sistema ahora permite:
- ✅ **Subir videos propios** a Supabase Storage
- ✅ **Reproducir videos directamente** desde tu banco de ejercicios
- ✅ **Sin dependencia de YouTube** (opcional, puedes seguir usando URLs externas)
- ✅ **Matching flexible** de nombres de ejercicios

---

## 🚀 Configuración Inicial

### Paso 1: Ejecutar SQL en Supabase

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Ejecuta `supabase_exercise_videos.sql` (actualizado con campos para Storage)
3. Esto creará:
   - Tabla `exercise_videos` con campos para Storage
   - Función `find_exercise_video()` actualizada
   - Índices para búsquedas rápidas

### Paso 2: Crear Bucket de Storage

1. Ve a **Supabase Dashboard** → **Storage**
2. Haz clic en **Create bucket**
3. Configura:
   - **Nombre:** `exercise-videos`
   - **Público:** ✅ **SÍ** (para que los videos sean accesibles)
4. Haz clic en **Create bucket**

### Paso 3: Configurar Políticas de Storage

1. Ve a **Storage** → **Policies** (o ejecuta el SQL directamente)
2. Ejecuta `supabase_exercise_videos_storage.sql`
3. Esto configurará:
   - ✅ Cualquiera puede ver los videos (públicos)
   - ✅ Usuarios autenticados pueden subir videos
   - ✅ Usuarios autenticados pueden actualizar/eliminar videos

---

## 📹 Cómo Agregar Videos

### Opción A: Desde la App (si creas una pantalla de administración)

Puedes crear una pantalla para subir videos usando:

```typescript
import { uploadExerciseVideo } from '../src/services/exerciseVideoService';
import * as ImagePicker from 'expo-image-picker';

// Pedir permiso para acceder a la galería
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permisos', 'Se necesita acceso a la galería para seleccionar videos');
  return;
}

// Seleccionar video
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  allowsEditing: true,
  quality: 1,
});

if (!result.canceled && result.assets[0]) {
  const videoUri = result.assets[0].uri;
  
  // Subir video
  const { success, error, video } = await uploadExerciseVideo(
    'Press de banca',
    videoUri,
    ['press de banca', 'bench press', 'press de pecho'],
    {
      category: 'chest',
      equipment: ['barbell'],
      description: 'Ejercicio compuesto para el pecho',
    }
  );

  if (success) {
    Alert.alert('Éxito', 'Video subido correctamente');
  } else {
    Alert.alert('Error', error || 'No se pudo subir el video');
  }
}
```

### Opción B: Desde Supabase Dashboard (manual)

1. **Subir video a Storage:**
   - Ve a **Storage** → **exercise-videos**
   - Haz clic en **Upload file**
   - Selecciona tu video (formato: MP4 recomendado)
   - Copia el nombre del archivo (ej: `press-de-banca.mp4`)

2. **Obtener URL pública:**
   - Haz clic en el video subido
   - Copia la **Public URL** (ej: `https://tu-proyecto.supabase.co/storage/v1/object/public/exercise-videos/press-de-banca.mp4`)

3. **Registrar en la base de datos:**
   - Ve a **Table Editor** → `exercise_videos`
   - Haz clic en **Insert row**
   - Completa:
     - `canonical_name`: "Press de banca"
     - `video_url`: (la Public URL que copiaste)
     - `storage_path`: "press-de-banca.mp4"
     - `is_storage_video`: ✅ true
     - `name_variations`: `["press de banca", "bench press", "press de pecho"]`
     - `category`: "chest"
     - `equipment`: `["barbell"]`

### Opción C: Usando SQL Directamente

```sql
-- Insertar video subido manualmente a Storage
INSERT INTO exercise_videos (
  canonical_name,
  video_url,
  storage_path,
  is_storage_video,
  name_variations,
  category,
  equipment,
  description
) VALUES (
  'Press de banca',
  'https://tu-proyecto.supabase.co/storage/v1/object/public/exercise-videos/press-de-banca.mp4',
  'press-de-banca.mp4',
  true,
  ARRAY['press de banca', 'bench press', 'press de pecho', 'press de pecho con barra'],
  'chest',
  ARRAY['barbell'],
  'Ejercicio compuesto básico para el pecho'
);
```

---

## 🎯 Recomendaciones para Videos

### Formato de Archivo
- **Formato:** MP4 (H.264)
- **Resolución:** 720p o 1080p (suficiente para móviles)
- **Duración:** 1-3 minutos (suficiente para mostrar técnica)
- **Tamaño:** Comprimir videos para reducir almacenamiento

### Contenido del Video
- ✅ Mostrar técnica correcta desde múltiples ángulos
- ✅ Explicar puntos clave del ejercicio
- ✅ Mencionar errores comunes a evitar
- ✅ Música de fondo opcional (pero no esencial)

### Nombres de Archivos
Usa nombres consistentes y descriptivos:
- ✅ `press-de-banca.mp4`
- ✅ `sentadillas.mp4`
- ✅ `peso-muerto.mp4`
- ❌ `video1.mp4`
- ❌ `ejercicio.mp4`

---

## 📊 Estructura de Datos

### Tabla: `exercise_videos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `canonical_name` | TEXT | Nombre canónico del ejercicio |
| `video_url` | TEXT | URL pública del video |
| `storage_path` | TEXT | Ruta en Supabase Storage (ej: `press-de-banca.mp4`) |
| `is_storage_video` | BOOLEAN | Si está en Supabase Storage (`true`) o es URL externa (`false`) |
| `name_variations` | TEXT[] | Array de variaciones del nombre |
| `category` | TEXT | Categoría (chest, legs, etc.) |
| `equipment` | TEXT[] | Array de equipamiento requerido |

---

## 🔧 Uso en el Código

El servicio ya está actualizado para usar videos propios:

```typescript
import { getExerciseVideoUrl, openExerciseVideo } from '../src/services/exerciseVideoService';

// Obtener URL del video
const videoUrl = await getExerciseVideoUrl('Press de banca');

if (videoUrl) {
  // Reproducir video
  // Puedes usar un reproductor de video o abrir la URL
  Linking.openURL(videoUrl);
} else {
  // No hay video asignado
  Alert.alert('Video no disponible', 'Este ejercicio no tiene video asignado');
}
```

---

## 🎬 Reproducir Videos en la App

### Opción 1: Abrir en Navegador/App Externa

Actualmente, los videos se abren en el navegador o app externa usando `Linking.openURL()`. Esto funciona bien, pero el usuario sale de la app.

### Opción 2: Reproductor In-App (Recomendado)

Puedes instalar un reproductor de video para mostrar los videos dentro de la app:

```bash
npx expo install expo-av
```

Luego crear un componente de video:

```typescript
import { Video, AVPlaybackStatus } from 'expo-av';
import { useState } from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';

function ExerciseVideoPlayer({ videoUrl, visible, onClose }) {
  const [status, setStatus] = useState({});

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Video
          source={{ uri: videoUrl }}
          style={{ flex: 1 }}
          useNativeControls
          resizeMode="contain"
          onPlaybackStatusUpdate={setStatus}
        />
        <TouchableOpacity onPress={onClose} style={{ padding: 20 }}>
          <Text style={{ color: '#fff' }}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

---

## 💡 Tips

1. **Empieza con los ejercicios más comunes** (20-30 ejercicios básicos)
2. **Sube videos de buena calidad** pero comprimidos (para ahorrar almacenamiento)
3. **Usa nombres consistentes** para facilitar el mantenimiento
4. **Agrega variaciones del nombre** para mejorar el matching
5. **Considera generar thumbnails** automáticamente o subirlos manualmente

---

## 📝 Próximos Pasos

1. ✅ Ejecutar SQL en Supabase
2. ✅ Crear bucket `exercise-videos` (público)
3. ✅ Configurar políticas de Storage
4. ✅ Subir primeros videos (20-30 ejercicios comunes)
5. 🔄 (Opcional) Crear pantalla de administración para subir videos desde la app
6. 🔄 (Opcional) Implementar reproductor in-app con `expo-av`

---

**¡Listo!** Ahora tienes tu propio banco de videos de ejercicios almacenado en Supabase Storage. Los videos se reproducirán directamente desde tu servidor en lugar de redirigir a YouTube.

