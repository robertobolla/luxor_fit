# Contexto del Proyecto FitMind para ChatGPT

Copia y pega este prompt al iniciar una conversación con ChatGPT sobre FitMind:

---

Estoy trabajando en **FitMind**, una aplicación móvil de fitness con dashboard web administrativo. Aquí está el contexto completo:

## Stack Tecnológico
- **App Móvil**: React Native + Expo (SDK 51), Expo Router
- **Dashboard Web**: React + Vite + TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Push Notifications**: OneSignal
- **IA**: OpenAI GPT-4o-mini
- **Storage**: Supabase Storage

## Estructura del Proyecto
```
fitmind-new/
├── app/                    # React Native app
│   ├── (tabs)/            # Tab screens: home, entrenar, progress, chat, perfil
│   └── workout/           # Workout-related screens
├── src/
│   ├── components/        # ExerciseSetTracker, ExerciseVideoModal, etc.
│   ├── services/          # supabase, exerciseVideoService, smartNotifications
│   └── contexts/
├── admin-dashboard/       # Web dashboard (React + Vite)
│   └── src/
│       ├── pages/         # Dashboard, Users, Exercises, Empresarios, etc.
│       ├── components/
│       └── services/
└── *.sql                  # SQL scripts y migraciones
```

## Modelo de Datos Clave

### Tablas Principales:
1. **user_profiles**: Usuarios con perfil fitness (altura, peso, objetivos, nivel)
2. **workout_plans**: Planes de entrenamiento (JSONB con estructura de días/ejercicios)
3. **exercise_videos**: 259 ejercicios con videos, metadata y puntos clave técnicos
4. **exercise_sets**: Series registradas (peso, reps, fecha)
5. **admin_roles**: Roles (admin, empresario, socio)
6. **gym_members**: Relación usuarios-empresarios
7. **subscriptions**: Planes (free, premium, empresario)
8. **messages**: Sistema de mensajería

### Estructura de Planes (JSONB):
```json
{
  "day_1": {
    "focus": "Pecho y Tríceps",
    "exercises": [
      {
        "name": "Press de Banca",
        "sets": 4,
        "reps": [10, 8, 8, 6],
        "rest": 90,
        "setTypes": [
          { "type": "warmup", "reps": 15 },
          { "type": "normal", "reps": 10 },
          { "type": "failure", "reps": null }
        ]
      }
    ]
  }
}
```

## Roles y Funcionalidades

### 1. Usuario Regular
- Generar planes con wizard (8 pasos, considera nivel/objetivos/equipamiento)
- Crear planes personalizados multi-semana
- Registrar series (compara con último entrenamiento del mismo músculo)
- Ver videos de ejercicios
- Chat con IA
- Temporizador de descanso

### 2. Empresario (Dueño de gimnasio)
- Dashboard con sus usuarios/alumnos
- Ver estadísticas de uso
- Enviar mensajes push a sus usuarios
- Invitar nuevos usuarios

### 3. Socio (Partner/Afiliado)
- Referir usuarios
- Dashboard con referidos y pagos

### 4. Admin
- Acceso completo al dashboard web
- CRUD de ejercicios con modal multi-paso
- Subir videos a Supabase Storage
- Gestionar usuarios, empresarios, socios
- Sistema de mensajería masiva

## Funcionalidades Destacadas

### Sistema de Puntos Clave (Recién implementado)
- **259 ejercicios** con 3-5 puntos técnicos específicos en BD
- Columna `key_points TEXT[]` en `exercise_videos`
- **Generación automática con IA**: Botón en dashboard que usa GPT-4o-mini
- Contexto para IA: nombre ejercicio + categoría + músculos + equipamiento
- Función `getExerciseKeyPoints()` en app móvil
- Fallback a función hardcodeada si no hay datos en BD

### Modal de Ejercicios (Dashboard)
5 pasos:
1. Categoría y tipo (compound/isolation)
2. Músculos y zonas musculares
3. Equipamiento necesario
4. Objetivos y tipo de actividad
5. **Puntos clave** (con botón "🤖 Generar con IA")

### Registro de Series
- Componente `ExerciseSetTracker`
- Función SQL `get_last_muscle_workout_sets()` carga valores previos
- Tipos de series: warmup, normal, failure, drop, RIR

### Videos de Ejercicios
- Función SQL `find_exercise_video()` con matching flexible
- Retorna: video_url, storage_path, key_points, description

## Funciones SQL Importantes
```sql
find_exercise_video(exercise_name TEXT)
  → Matching flexible, retorna video + key_points

get_last_muscle_workout_sets(user_id, muscle_group)
  → Últimas series del mismo músculo

get_empresario_users(empresario_id)
  → Usuarios de un empresario específico

get_empresario_stats(empresario_id)
  → Estadísticas: total usuarios, entrenamientos semana
```

## Estado Actual

### ✅ Completado Recientemente
- Sistema de puntos clave con generación IA
- Modal de ejercicios de 5 pasos en dashboard
- Consolidación de datos empresario-usuarios
- Función SQL actualizada para incluir key_points
- Servicio IA en dashboard (`aiService.ts`)

### Variables de Entorno Requeridas
```bash
# App móvil
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_ONESIGNAL_APP_ID
EXPO_PUBLIC_OPENAI_API_KEY

# Dashboard
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLERK_PUBLISHABLE_KEY
VITE_OPENAI_API_KEY  # Para generar puntos clave
```

## Arquitectura de Archivos Clave

### App Móvil:
- `app/(tabs)/workout-day-detail.tsx`: Detalle día entrenamiento, muestra key points
- `app/(tabs)/entrenar.tsx`: Tab principal workout
- `src/components/ExerciseSetTracker.tsx`: Registro de series
- `src/services/exerciseVideoService.ts`: `getExerciseKeyPoints()`

### Dashboard:
- `pages/Exercises.tsx`: Lista y gestión de ejercicios
- `components/ExerciseMetadataModal.tsx`: Modal 5 pasos con IA
- `services/aiService.ts`: Generación de puntos con OpenAI

### SQL:
- `AGREGAR_KEY_POINTS_EJERCICIOS.sql`: Agrega columna + datos iniciales
- `ACTUALIZAR_FUNCION_FIND_EXERCISE.sql`: Actualiza función para incluir key_points

## Convenciones de Código
- React hooks para estado y efectos
- Async/await para operaciones asíncronas
- Supabase client para queries
- Clerk para auth
- Expo Router para navegación (file-based)
- TypeScript en dashboard, JavaScript en app móvil

## Problemas Comunes Resueltos
1. **Conteo usuarios empresario**: Función SQL siempre filtra por empresario_id
2. **Duplicados empresarios**: Script de consolidación
3. **RLS trainer**: Políticas ajustadas
4. **Key points**: Sistema completo BD → IA → UI implementado

---

**Con este contexto puedes ayudarme con cualquier aspecto del proyecto: frontend, backend, SQL, arquitectura, features nuevas, debugging, etc.**


