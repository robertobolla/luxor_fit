# Fitness Luxor App - Descripción Completa del Proyecto

## Visión General

**Fitness Luxor App** es una aplicación móvil de fitness y entrenamiento personalizado desarrollada con **React Native (Expo)** que incluye:

- Aplicación móvil multiplataforma (iOS/Android)
- Dashboard administrativo web (React + Vite)
- Backend en Supabase (PostgreSQL)
- Sistema de autenticación con Clerk
- Notificaciones push con OneSignal

## Arquitectura del Sistema

### Stack Tecnológico

#### Frontend Móvil

- **Framework**: React Native + Expo (SDK 51)
- **Routing**: Expo Router (file-based routing)
- **Estado**: React Hooks + Context API
- **Autenticación**: Clerk
- **Base de datos**: Supabase (cliente JavaScript)
- **Notificaciones**: OneSignal + Notificaciones locales
- **UI**: React Native components + Ionicons
- **Video**: Expo AV

#### Dashboard Admin Web

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite
- **Routing**: React Router
- **Autenticación**: Clerk
- **Base de datos**: Supabase
- **Hosting**: Hostinger (subdominio: admin.luxorfitness.xyz)
- **Estilos**: CSS modules

#### Backend

- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Clerk (sincronizado con Supabase)
- **Storage**: Supabase Storage (videos de ejercicios)
- **Edge Functions**: Supabase Functions
- **IA**: OpenAI GPT-4o-mini (generación de contenido)

## Estructura del Proyecto

```
fitmind-new/
├── app/                           # React Native app (Expo Router)
│   ├── (tabs)/                    # Tab navigation screens
│   │   ├── index.tsx              # Home/Dashboard
│   │   ├── entrenar.tsx           # Workout tab
│   │   ├── progress.tsx           # Progress tracking
│   │   ├── chat.tsx               # AI chat
│   │   └── perfil.tsx             # User profile
│   │   └── workout-day-detail.tsx # Detalle de día de entrenamiento
│   │   └── workout-plan-detail.tsx # Detalle de plan completo
│   │   └── workout/               # Workout-related screens
│   │       ├── custom-plan-days.tsx
│   │       ├── custom-plan-day-detail.tsx
│   │       └── custom-plan-select-exercise.tsx
│   ├── _layout.tsx                # Root layout
│   └── exercise-progress-stats.tsx # Exercise stats
│
├── src/
│   ├── components/                # Shared components
│   │   ├── ExerciseSetTracker.tsx # Registro de series
│   │   ├── ExerciseVideoModal.tsx # Modal de videos
│   │   └── LoadingOverlay.tsx
│   ├── contexts/                  # React contexts
│   │   └── AlertContext.tsx
│   ├── services/                  # Business logic
│   │   ├── supabase.ts
│   │   ├── exerciseVideoService.ts
│   │   └── smartNotifications.ts
│   └── types/                     # TypeScript types
│
├── admin-dashboard/               # Web dashboard
│   └── src/
│       ├── pages/                 # Dashboard pages
│       │   ├── Dashboard.tsx
│       │   ├── Users.tsx
│       │   ├── Exercises.tsx
│       │   ├── Empresarios.tsx
│       │   ├── Partners.tsx
│       │   └── Mensajeria.tsx
│       ├── components/
│       │   ├── ExerciseMetadataModal.tsx
│       │   └── Layout.tsx
│       └── services/
│           ├── adminService.ts
│           └── aiService.ts
│
├── supabase/                      # SQL migrations & functions
└── *.sql                          # SQL scripts
```

## Modelos de Datos Principales

### Base de Datos Supabase

#### Tablas Core

**`user_profiles`** - Perfiles de usuarios

```sql
- id (UUID, PK) → Clerk user_id
- email
- full_name
- profile_picture_url
- date_of_birth
- gender
- height_cm
- current_weight_kg
- goal_weight_kg
- fitness_goal
- fitness_level
- available_equipment
- preferred_workout_days
- created_at, updated_at
```

**`workout_plans`** - Planes de entrenamiento

```sql
- id (UUID, PK)
- user_id (FK → user_profiles)
- plan_data (JSONB) → Estructura completa del plan
- plan_name
- created_at, updated_at
- is_active
```

**`workout_completions`** - Registro de entrenamientos completados

```sql
- id (UUID, PK)
- user_id (FK)
- plan_id (FK)
- day_name (ej: 'day_1')
- completed_at
- duration_minutes
- difficulty_rating (1-5)
- notes
```

**`exercise_videos`** - Videos y metadata de ejercicios

```sql
- id (UUID, PK)
- canonical_name (nombre principal)
- name_variations (TEXT[]) → variaciones del nombre
- video_url
- storage_path
- is_storage_video
- thumbnail_url
- description
- category (CORE, FUERZA_SUPERIOR_PUSH, FUERZA_SUPERIOR_PULL, etc.)
- muscles (TEXT[])
- muscle_zones (TEXT[])
- movement_type
- exercise_type (compound/isolation)
- equipment (TEXT[])
- goals (TEXT[])
- activity_types (TEXT[])
- uses_time (boolean)
- key_points (TEXT[]) → Puntos clave técnicos
- is_primary, priority, language
```

**`exercise_sets`** - Series registradas por ejercicio

```sql
- id (UUID, PK)
- user_id (FK)
- workout_session_id (FK, nullable)
- exercise_id (string)
- exercise_name
- set_number
- reps
- weight_kg
- duration_seconds
- notes
- muscle_group
- created_at
```

**`body_metrics`** - Métricas corporales

```sql
- id (UUID, PK)
- user_id (FK)
- weight_kg
- body_fat_percentage
- muscle_mass_kg
- notes
- recorded_at
```

**`subscriptions`** - Suscripciones de usuarios

```sql
- id (UUID, PK)
- user_id (FK)
- plan_type (free/premium/empresario)
- status (active/cancelled/expired)
- start_date, end_date
- empresario_id (FK → user_profiles, nullable)
```

#### Sistema Multi-Rol

**`admin_roles`** - Roles administrativos

```sql
- id (UUID, PK)
- user_id (FK → user_profiles)
- role_type ('admin', 'socio', 'empresario')
- gym_name (para empresarios)
- is_active
- created_at
```

**`gym_members`** - Relación usuarios-empresarios

```sql
- id (UUID, PK)
- user_id (FK → user_profiles) → El usuario/alumno
- empresario_id (FK → user_profiles) → El empresario
- status (active/inactive)
- joined_at
```

**`partner_referrals`** - Sistema de referidos para socios

```sql
- id (UUID, PK)
- partner_id (FK → user_profiles)
- referred_user_id (FK → user_profiles)
- status (pending/active/cancelled)
- created_at
```

**`partner_payments`** - Pagos a socios

```sql
- id (UUID, PK)
- partner_id (FK)
- amount
- period_start, period_end
- paid_at, created_at
```

#### Sistema de Mensajería

**`messages`** - Mensajes del sistema

```sql
- id (UUID, PK)
- title
- body
- link_url
- link_text
- created_by (FK → user_profiles)
- created_at
- scheduled_for
- sent_at
- recipient_type ('all_users', 'specific_user', 'empresario_users')
- recipient_id (nullable)
```

**`message_recipients`** - Destinatarios de mensajes

```sql
- id (UUID, PK)
- message_id (FK)
- user_id (FK)
- read_at
- created_at
```

**`user_push_tokens`** - Tokens de OneSignal

```sql
- id (UUID, PK)
- user_id (FK)
- push_token (OneSignal player_id)
- device_type
- created_at, updated_at
```

### Estructura de Datos JSONB

**`workout_plans.plan_data`** - Estructura del plan de entrenamiento:

```json
{
  "day_1": {
    "day": "Día 1",
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
          { "type": "normal", "reps": 8 },
          { "type": "failure", "reps": null }
        ]
      }
    ]
  },
  "day_2": { ... },
  ...
}
```

**Tipos de series (`setTypes`)**:

- `warmup` - Serie de calentamiento
- `normal` - Serie normal
- `failure` - Serie al fallo
- `drop` - Serie drop
- `rir` - RIR (Reps in Reserve)

## Roles y Permisos

### 1. **Usuario Regular (`user`)**

- Acceso completo a la app móvil
- Crear y seguir planes de entrenamiento
- Registrar progreso y series
- Chat con IA
- Suscripción: free o premium

### 2. **Empresario (`empresario`)**

- Tiene su propio "gimnasio" virtual
- Puede invitar usuarios a su gimnasio
- Dashboard para ver:
  - Lista de sus usuarios/alumnos
  - Estadísticas de uso
  - Entrenamientos completados
- Enviar mensajes a sus usuarios
- Ver métricas de rendimiento

### 3. **Socio (`socio`)**

- Puede referir nuevos usuarios
- Recibe comisiones por referidos activos
- Dashboard para ver:
  - Lista de referidos
  - Pagos recibidos
  - Estadísticas de conversión

### 4. **Admin (`admin`)**

- Acceso completo al dashboard
- Gestionar todos los usuarios
- Gestionar empresarios y socios
- CRUD de ejercicios y videos
- Sistema de mensajería masiva
- Ver todas las estadísticas

## Funcionalidades Principales

### App Móvil

#### 1. **Generación de Planes de Entrenamiento**

- Wizard de 8 pasos para personalizar plan
- Algoritmo que considera:
  - Nivel de fitness
  - Objetivos (perder peso, ganar músculo, etc.)
  - Equipamiento disponible
  - Días por semana disponibles
  - Preferencia de duración
- Genera plan JSON con ejercicios, series, repeticiones, descansos

#### 2. **Planes Personalizados**

- Crear planes desde cero
- Seleccionar ejercicios por grupo muscular
- Configurar series con tipos (warmup, normal, failure, drop, RIR)
- Planes multi-semana (1-12 semanas)
- Guardar y activar planes

#### 3. **Seguimiento de Entrenamientos**

- Ver plan activo
- Detalles de cada día
- Registrar series con:
  - Peso utilizado
  - Repeticiones realizadas
  - Comparación con última vez
- Temporizador de descanso
- Videos de ejercicios
- Marcar día como completado

#### 4. **Registro de Series**

- Componente `ExerciseSetTracker`
- Carga valores previos automáticamente
- Función SQL `get_last_muscle_workout_sets()`
- Añadir/eliminar series dinámicamente
- Guardar en `exercise_sets`

#### 5. **Progreso y Métricas**

- Gráficas de peso corporal
- Historial de ejercicios
- Estadísticas de volumen (peso x reps x series)
- Récords personales
- Registro de métricas corporales

#### 6. **Chat con IA**

- GPT-4 personalizado
- Respuestas sobre entrenamiento, nutrición, técnica
- Historial de conversaciones

#### 7. **Videos de Ejercicios**

- 259 ejercicios con videos
- Almacenados en Supabase Storage
- Matching flexible de nombres
- Función SQL `find_exercise_video()`
- Reproducción en modal

#### 8. **Notificaciones**

- OneSignal para push notifications
- Notificaciones locales
- Recordatorios de entrenamientos
- Mensajes del gimnasio (empresarios)

### Dashboard Admin Web

#### 1. **Gestión de Usuarios**

- Lista paginada de usuarios
- Búsqueda y filtros
- Ver detalles completos
- Editar perfil
- Ver planes y progreso
- Crear usuarios manualmente

#### 2. **Gestión de Empresarios**

- Lista de empresarios (gimnasios)
- Crear nuevos empresarios
- Ver usuarios por empresario
- Estadísticas:
  - Total usuarios
  - Entrenamientos completados esta semana
  - Últimos entrenamientos
- Editar información del gimnasio

#### 3. **Gestión de Socios**

- Lista de socios
- Ver referidos por socio
- Registrar pagos
- Estadísticas de comisiones

#### 4. **Gestión de Ejercicios**

- CRUD completo de ejercicios
- Subir videos a Supabase Storage
- Modal multi-paso para metadata:
  - **Paso 1**: Categoría y tipo
  - **Paso 2**: Músculos y zonas
  - **Paso 3**: Equipamiento
  - **Paso 4**: Objetivos y actividad
  - **Paso 5**: Puntos clave (con IA)
- Botón **"🤖 Generar con IA"** para puntos clave
- Preview de videos
- Búsqueda y filtros

#### 5. **Sistema de Mensajería**

- Enviar mensajes a:
  - Todos los usuarios
  - Usuario específico
  - Usuarios de un empresario
- Mensajes con:
  - Título y cuerpo
  - Link opcional con texto personalizado
  - Programación de envío
- Vista de mensajes enviados
- Push notifications automáticas

#### 6. **Estadísticas**

- Total usuarios, empresarios, socios
- Entrenamientos completados
- Usuarios activos
- Gráficas de crecimiento

## Funciones SQL Importantes

### `find_exercise_video(exercise_name TEXT)`

Busca un video con matching flexible:

- Nombre exacto (case insensitive)
- Variaciones del nombre
- Matching parcial
- Retorna: canonical_name, video_url, storage_path, thumbnail_url, description, key_points

### `get_last_muscle_workout_sets(p_user_id UUID, p_muscle_group TEXT)`

Obtiene las últimas series registradas para un grupo muscular

### `get_empresario_stats(p_empresario_id UUID)`

Estadísticas de un empresario: total usuarios, entrenamientos esta semana

### `get_empresario_users(p_empresario_id UUID)`

Lista de usuarios de un empresario con sus datos

### `send_push_notification_to_user(user_id UUID, title TEXT, body TEXT, ...)`

Envía notificación push a un usuario específico

## Características Avanzadas Recientes

### Sistema de Puntos Clave (Key Points)

- **259 ejercicios** con 3-5 puntos clave técnicos específicos
- Almacenados en `exercise_videos.key_points` (TEXT[])
- Generación automática con **OpenAI GPT-4o-mini**:
  - Contexto: nombre, categoría, músculos, equipamiento
  - Costo: ~$0.0001 USD por ejercicio
  - Servicio: `admin-dashboard/src/services/aiService.ts`
- Consulta en app móvil: `getExerciseKeyPoints()`
- Fallback a función hardcodeada si no hay datos
- Edición manual en dashboard (Paso 5 del modal)

### Temporizador de Descanso

- Modal con temporizador visual (circular)
- Tiempos predefinidos: 30s, 60s, 90s, 120s, 180s
- Sonido y vibración al terminar
- Pausar/reanudar/reiniciar

### Sistema de Drag & Drop (Ejercicios)

- Reordenar ejercicios en planes personalizados
- Biblioteca: @dnd-kit
- Funciona en iOS y Android

### Invitación de Entrenadores (En desarrollo)

- Empresarios pueden invitar usuarios
- Link de invitación único
- Auto-asignación al gimnasio al aceptar

## Variables de Entorno

### App Móvil (`.env`)

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_ONESIGNAL_APP_ID=
EXPO_PUBLIC_OPENAI_API_KEY=
```

### Dashboard Admin (`.env`)

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_OPENAI_API_KEY=
```

## Estado Actual del Proyecto

### ✅ Completado

- Autenticación con Clerk
- Generación de planes con IA
- Planes personalizados multi-semana
- Registro de series con valores previos
- Sistema de roles (admin, empresario, socio, user)
- Dashboard admin completo
- Sistema de mensajería con push notifications
- Videos de ejercicios (259 videos)
- Puntos clave de ejercicios con IA
- Drag & drop de ejercicios
- Temporizador de descanso
- Gráficas de progreso

### 🚧 En Desarrollo

- Sistema de invitaciones de entrenadores
- Mejoras en estadísticas
- Optimización de rendimiento

### 📋 Backlog

- App para entrenadores (separada)
- Sistema de pagos integrado
- Notificaciones inteligentes basadas en uso
- Análisis predictivo de progreso

## Despliegue

### App Móvil

- **Desarrollo**: Expo Go
- **Producción**:
  - iOS: App Store (EAS Build)
  - Android: Google Play (EAS Build)
  - Comando: `eas build --platform all`

### Dashboard Admin

- **Hosting**: Hostinger
- **Dominio**: admin.luxorfitness.xyz
- **Build**: `npm run build` → carpeta `dist/`
- **Upload**: FTP a Hostinger

### Base de Datos

- **Supabase**: Hosted (cloud)
- **Migraciones**: Scripts SQL manuales

## Problemas Conocidos y Soluciones

### 1. Inconsistencias de datos empresario-usuarios

**Solución**: Scripts SQL de consolidación

- `CONSOLIDAR_HOCKEY_EMPRESARIO_FIX.sql`
- Validación: `VERIFICAR_ESTADO_ACTUAL.sql`

### 2. Conteo incorrecto de usuarios por empresario

**Solución**: Función `get_empresario_users()` actualizada

- Siempre filtra por `p_empresario_id`
- No muestra usuarios de otros empresarios para admins

### 3. RLS en tablas trainer

**Solución**: Políticas RLS ajustadas para permitir acceso correcto

## Próximas Funcionalidades Solicitadas

1. **Sistema de Nutrición**

   - Planes de comidas
   - Contador de calorías
   - Recetas

2. **Gamificación**

   - Logros y badges
   - Racha de entrenamientos
   - Leaderboards

3. **Social Features**

   - Feed de actividad
   - Compartir entrenamientos
   - Seguir a otros usuarios

4. **Análisis Avanzado**
   - Predicción de progreso con ML
   - Detección de sobre-entrenamiento
   - Recomendaciones personalizadas

## Contacto y Recursos

- **Proyecto**: Fitness Luxor App
- **Dominio**: luxorfitness.xyz
- **Admin**: admin.luxorfitness.xyz
- **Repositorio**: Local (c:\roberto\fitmind-new)
- **Documentación**: Archivos \*.md en raíz del proyecto

---

**Última actualización**: Diciembre 2024
**Versión del documento**: 1.0
