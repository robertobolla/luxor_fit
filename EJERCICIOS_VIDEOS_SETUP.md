# 🎥 Sistema de Videos para Ejercicios

Este documento explica cómo configurar y usar el sistema de videos para ejercicios generados por IA.

---

## 📋 Resumen

El sistema permite vincular videos de YouTube (o otros proveedores) a ejercicios generados dinámicamente por la IA, incluso cuando los nombres varían ligeramente.

**Características:**
- ✅ Matching flexible de nombres (ej: "Press de banca" = "Bench press")
- ✅ Soporte para múltiples variaciones del mismo ejercicio
- ✅ Fallback automático a búsqueda de YouTube si no hay video asignado
- ✅ Fácil de agregar nuevos ejercicios y videos

---

## 🚀 Configuración Inicial

### Paso 1: Crear la tabla en Supabase

1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `supabase_exercise_videos.sql`
4. Ejecuta el script

Esto creará:
- La tabla `exercise_videos`
- La función `find_exercise_video` para búsquedas flexibles
- Los índices necesarios para búsquedas rápidas

### Paso 2: Agregar videos de ejercicios

Puedes agregar videos de dos formas:

#### Opción A: Desde Supabase Dashboard

1. Ve a **Table Editor** → `exercise_videos`
2. Haz clic en **Insert row**
3. Completa los campos:
   - `canonical_name`: Nombre canónico del ejercicio (ej: "Press de banca")
   - `name_variations`: Array de variaciones del nombre:
     ```json
     ["press de banca", "bench press", "press de pecho", "press de pecho con barra"]
     ```
   - `video_url`: URL completa de YouTube (ej: `https://www.youtube.com/watch?v=...`)
   - `category`: Categoría opcional (ej: "chest", "legs")
   - `equipment`: Array de equipamiento (ej: `["barbell"]`)
   - `is_primary`: `true` si es el video principal
   - `priority`: Número (1 = más importante)

#### Opción B: Usando el servicio TypeScript

```typescript
import { upsertExerciseVideo } from '../src/services/exerciseVideoService';

// Agregar video para "Press de banca"
await upsertExerciseVideo(
  'Press de banca',
  'https://www.youtube.com/watch?v=EXAMPLE1',
  ['press de banca', 'bench press', 'press de pecho', 'press de pecho con barra'],
  {
    category: 'chest',
    equipment: ['barbell'],
    description: 'Ejercicio compuesto para el pecho',
  }
);
```

---

## 📝 Cómo Funciona el Matching

El sistema usa **matching flexible** para encontrar videos incluso si los nombres varían:

### 1. Coincidencia Exacta
- **Canónico:** "Press de banca" = "Press de banca" ✅
- **Variación:** "Bench press" → encuentra "Press de banca" ✅

### 2. Coincidencia Parcial
- **"Press de banca con mancuernas"** → encuentra "Press de banca" ✅
- **"Sentadilla con barra"** → encuentra "Sentadillas" ✅

### 3. Normalización
- Elimina acentos: "Press de banca" = "Press de banca"
- Case insensitive: "press de banca" = "PRESS DE BANCA"
- Normaliza espacios y caracteres especiales

### Ejemplo de Configuración:

```sql
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  category,
  equipment
) VALUES (
  'Press de banca',
  ARRAY[
    'press de banca',
    'bench press',
    'press de pecho',
    'press de pecho con barra',
    'press de pecho barra',
    'chest press'
  ],
  'https://www.youtube.com/watch?v=EXAMPLE1',
  'chest',
  ARRAY['barbell']
);
```

**Ahora estos nombres todos encontrarán el mismo video:**
- "Press de banca" ✅
- "Bench press" ✅
- "Press de pecho" ✅
- "Press de banca con mancuernas" ✅ (coincidencia parcial)
- "Press de pecho con barra" ✅

---

## 🎯 Estrategia para Agregar Videos

### Fase 1: Ejercicios Más Comunes

Empieza agregando videos para los ejercicios más comunes que usa la IA:

**Compuestos básicos:**
1. Sentadillas / Squats
2. Press de banca / Bench press
3. Peso muerto / Deadlift
4. Press militar / Overhead press
5. Remo con barra / Barbell row
6. Dominadas / Pull-ups
7. Flexiones / Push-ups

**Tren inferior:**
8. Hip thrust
9. Zancadas / Lunges
10. Peso muerto rumano / Romanian deadlift
11. Sentadilla búlgara / Bulgarian squat

**Tren superior:**
12. Fondos / Dips
13. Aperturas / Flyes
14. Curl de bíceps / Bicep curl
15. Extensiones de tríceps / Tricep extensions

**Cardio/HIIT:**
16. Burpees
17. Mountain climbers
18. Jumping jacks
19. Box jumps

**Core:**
20. Plancha / Plank
21. Crunch / Abdominales
22. Bicicleta abdominal

### Fase 2: Agregar Más Variaciones

Una vez que tengas los básicos, agrega:
- Variaciones de equipamiento (con mancuernas, con barra, en máquina)
- Ejercicios de aislamiento
- Ejercicios avanzados

---

## 💡 Tips para Buscar Videos en YouTube

### Qué Buscar:
1. **"Ejercicio nombre correcta técnica"** → videos educativos
2. **"Cómo hacer ejercicio nombre"** → tutoriales paso a paso
3. **Canales recomendados:**
   - Athlean-X (inglés/español subtítulos)
   - Jeff Nippard (inglés/español subtítulos)
   - Jeremy Ethier (inglés/español subtítulos)
   - Vitónica (español)
   - GymVirtual (español)

### Qué Evitar:
- ❌ Videos de gente haciendo ejercicio sin explicación
- ❌ Videos con técnica incorrecta
- ❌ Videos muy largos (>5 min para ejercicios simples)
- ❌ Videos promocionales

### Formato Preferido:
- ✅ Videos cortos (1-3 min) con explicación clara
- ✅ Muestran técnica desde múltiples ángulos
- ✅ Explican puntos clave y errores comunes
- ✅ Subtítulos en español (si el video está en inglés)

---

## 🔧 Uso en el Código

El servicio ya está integrado en `workout-day-detail.tsx`. Cuando el usuario hace clic en el botón de video:

```typescript
// Busca el video asignado
const video = await getExerciseVideo(exerciseName);

if (video) {
  // Abre el video asignado
  Linking.openURL(video.video_url);
} else {
  // Fallback: búsqueda de YouTube
  const youtubeUrl = getYouTubeSearchUrl(exerciseName);
  Linking.openURL(youtubeUrl);
}
```

---

## 📊 Ejemplo de Datos Completos

```sql
-- Ejemplo completo para "Sentadillas"
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  thumbnail_url,
  description,
  category,
  equipment,
  language,
  is_primary,
  priority
) VALUES (
  'Sentadillas',
  ARRAY[
    'sentadillas',
    'squats',
    'sentadilla',
    'sentadilla con peso corporal',
    'squat',
    'bodyweight squat'
  ],
  'https://www.youtube.com/watch?v=YaXPRqUwItQ',
  'https://img.youtube.com/vi/YaXPRqUwItQ/maxresdefault.jpg',
  'Ejercicio compuesto básico para piernas y glúteos. Técnica correcta es fundamental.',
  'legs',
  ARRAY['bodyweight'],
  'es',
  true,
  1
);

-- Variación con barra
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  category,
  equipment,
  is_primary,
  priority
) VALUES (
  'Sentadilla con barra',
  ARRAY[
    'sentadilla con barra',
    'barbell squat',
    'squat con barra',
    'sentadilla barra'
  ],
  'https://www.youtube.com/watch?v=EXAMPLE2',
  'legs',
  ARRAY['barbell'],
  true,
  1
);
```

---

## 🎯 Próximos Pasos

1. **Ejecutar el SQL** en Supabase
2. **Agregar 20-30 videos** para los ejercicios más comunes
3. **Probar en la app** haciendo clic en el botón de video de diferentes ejercicios
4. **Ir agregando más videos** gradualmente según necesidad

---

## 📝 Notas

- **El fallback a YouTube siempre funciona**, así que no es crítico tener todos los videos desde el inicio
- **Puedes empezar con 20-30 ejercicios comunes** y expandir gradualmente
- **El matching flexible hace que funcione bien** incluso si no tienes una variación exacta agregada

---

**¡Listo!** Una vez que ejecutes el SQL y agregues algunos videos, el sistema funcionará automáticamente. Los usuarios verán el video asignado cuando hagan clic en el botón, o una búsqueda de YouTube si no hay video asignado.

