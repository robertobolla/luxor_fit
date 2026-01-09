# 📱 Descripción Completa de Fitness Luxor App

## 🎯 Visión General

**Fitness Luxor App** es una aplicación móvil de fitness integral desarrollada con React Native y Expo que combina inteligencia artificial, seguimiento de salud, nutrición personalizada y funcionalidades sociales para crear una experiencia completa de entrenamiento personalizado.

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

- **Frontend**: React Native 0.81.5, Expo 54, React 19.1.0
- **Navegación**: Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL, Realtime, Storage)
- **Autenticación**: Clerk (OAuth con Google, TikTok, email/password)
- **IA**: OpenAI GPT-4 (ChatGPT) para generación de planes
- **Pagos**: Stripe (suscripciones mensuales/anuales)
- **Health Integration**: Apple HealthKit, Google Fit
- **Estado Global**: Zustand
- **Notificaciones**: Expo Notifications

### Plataformas

- iOS (App Store, TestFlight)
- Android (Google Play)
- Web (landing page con React + Vite)

---

## 🎨 Diseño y UX

- **Tema**: Oscuro (#0a0a0a fondo, #1a1a1a tarjetas)
- **Color Principal**: #F7931E (naranja/dorado)
- **Estilo**: Moderno, minimalista, similar a Fitbit
- **Idioma**: Español (completamente localizado)

---

## 🚀 Funcionalidades Principales

### 1. **Sistema de Onboarding Inteligente**

Flujo de 8 pasos que recopila:

- Información personal (nombre, edad, altura, peso)
- Nivel de fitness (principiante, intermedio, avanzado)
- Objetivos múltiples (perder peso, ganar músculo, fuerza, resistencia, flexibilidad, mantener forma)
- Tipos de actividad preferidos (cardio, fuerza, deportes, yoga, HIIT, mixto)
- Disponibilidad (días por semana: 1-7)
- Duración de sesión (15, 30, 45, 60, 90 minutos)
- Equipamiento disponible (peso corporal, mancuernas, barra, bandas, gimnasio, etc.)

**Resultado**: Perfil completo del usuario almacenado en Supabase (`user_profiles`)

---

### 2. **Generación de Planes de Entrenamiento con IA**

#### Proceso:

1. Usuario completa onboarding
2. Sistema envía datos a ChatGPT (OpenAI GPT-4)
3. IA genera plan completo basado en:
   - Objetivos del usuario
   - Nivel de fitness
   - Disponibilidad y duración
   - Equipamiento disponible
   - Principios científicos de entrenamiento

#### Estructura del Plan Generado:

- **Nombre personalizado** del plan
- **Descripción detallada** del enfoque
- **Duración**: 8-16 semanas
- **Estructura semanal**: Array de días con:
  - Nombre del día (ej: "Día 1")
  - Enfoque (ej: "Fuerza de tren superior - Empuje")
  - Duración en minutos
  - Lista de ejercicios con:
    - Series de calentamiento (warmup_sets)
    - Series de trabajo (working_sets) con RIR (Reps in Reserve)
    - Progresión (piramidal, ascendente, constante, inversa)
    - Descansos específicos
    - Notas técnicas
- **Principios clave** científicos explicados
- **Plan de progresión** semana a semana
- **Recomendaciones** personalizadas

#### Almacenamiento:

- Guardado en Supabase (`workout_plans` table)
- Formato JSONB para flexibilidad
- Un plan activo por usuario

#### Adaptación Automática:

- Sistema analiza feedback del usuario
- Si un ejercicio no funciona, la IA lo reemplaza automáticamente
- Ajustes semanales basados en progreso

---

### 3. **Dashboard de Salud Integral**

#### Integraciones:

- **Apple Health** (iOS): Pasos, calorías, distancia, sueño, glucosa, peso
- **Google Fit** (Android): Mismas métricas
- **Fallback**: Datos simulados si no hay acceso

#### Métricas Mostradas:

- Pasos diarios (con meta de 10,000)
- Distancia recorrida (km)
- Calorías quemadas
- Horas de sueño
- Días de ejercicio esta semana
- Días de gimnasio esta semana
- Peso actual
- Glucosa (si disponible)
- Días de mindfulness
- Registros de comida
- Agua consumida

#### Características:

- Navegación entre fechas (hoy, ayer, días anteriores)
- Círculos de progreso visuales
- Pull-to-refresh
- Personalización de métricas prioritarias
- Gráficos de progreso temporal

---

### 4. **Módulo de Nutrición Completo**

#### Perfil Nutricional:

- Usa datos del onboarding (no duplica información)
- Campos adicionales:
  - Comidas por día (2-6)
  - Ventana de ayuno (ej: "12-20" o null)

#### Cálculos Automáticos:

- **BMR** (Mifflin-St Jeor): Metabolismo basal
- **TDEE**: Gasto energético total (BMR × factor de actividad)
- **Calorías objetivo**: Ajustadas según meta (cut/recomp/maintain/bulk)
- **Macros**:
  - Proteína: 1.8-2.2 g/kg
  - Grasas: 25% del total
  - Carbohidratos: Resto

#### Plan de Comidas Semanal:

- Generado con IA (OpenAI) o algoritmo determinístico
- 30 alimentos en base de datos embebida
- Respeta preferencias personalizadas (prompts como "rápido", "pescado", "budget")
- Alternativas para cada comida con un clic
- Reemplazos simples entre opciones
- Lista de compras automática generada
- Toggle "ya tengo" por producto

#### Log de Nutrición:

- Registro de comidas por tipo (desayuno, almuerzo, cena, snack)
- Ingreso manual de macros y calorías
- Registro de agua diaria con botones rápidos
- Soporte para fotos (preparado)

#### Ajuste Semanal Automático:

- Cada lunes, sistema analiza:
  - Progreso de peso (últimos 7 días)
  - Adherencia (% de comidas logueadas)
- Si adherencia ≥70%, ajusta calorías ±5%
- Regenera targets y plan automáticamente

#### Academia Nutricional:

- 6 micro-lecciones sobre nutrición
- Mini-quizzes con 2 preguntas por lección
- Tracking de progreso y puntajes

---

### 5. **Seguimiento de Progreso**

#### Fotos de Progreso:

- Fotos de frente, lado y espalda
- Comparación semana a semana, mes a mes
- Visualización de evolución completa

#### Métricas Corporales:

- Peso
- Grasa corporal
- Músculo
- Cintura
- Cadera
- Gráficos de progreso temporal

#### Records Personales (PRs):

- Registro de mejores marcas por ejercicio
- Historial de PRs
- Motivación para superar records

#### Completado de Entrenamientos:

- Marcar días como completados
- Registro de duración, dificultad, notas
- Sincronización con Apple Health/Google Fit

---

### 6. **Sistema Social y Comunidad**

#### Amigos:

- Búsqueda de usuarios por username
- Envío de solicitudes de amistad
- Aceptar/rechazar solicitudes
- Lista de amigos

#### Chat en Tiempo Real:

- Chat 1-a-1 con amigos
- Notificaciones en tiempo real (Supabase Realtime)
- Compartir entrenamientos
- Aceptar/rechazar entrenamientos compartidos
- Soporte para imágenes en chat

#### Notificaciones:

- Mensajes nuevos
- Solicitudes de amistad
- Entrenamientos compartidos
- Recordatorios inteligentes de entrenamiento
- Recordatorios de comidas

---

### 7. **Videos de Ejercicios**

- Biblioteca de más de 500 ejercicios
- Cada ejercicio tiene video explicativo
- Almacenados en Supabase Storage
- Solo admins pueden subir videos
- Acceso público para visualización

---

### 8. **Sistema de Suscripciones**

#### Modelo de Negocio:

- Plan Mensual: $12.99/mes
- Plan Anual: $107/año (ahorra $48.88, 2 meses gratis)

#### Integración Stripe:

- Checkout sessions
- Webhooks para procesar pagos
- Gestión de suscripciones activas
- Paywall para usuarios sin suscripción

#### Acceso Gratuito:

- Admins
- Socios (sistema de partners)
- Usuarios de gimnasio (sistema empresarial)

---

### 9. **Sistema de Roles**

- **Usuario regular**: Requiere suscripción
- **Admin**: Acceso completo, puede subir videos, crear usuarios
- **Socio**: Acceso gratuito, códigos de rastreo para referidos
- **Gimnasio**: Sistema empresarial con múltiples usuarios

---

### 10. **Notificaciones Inteligentes**

- Recordatorios contextuales basados en horarios
- Aprende patrones del usuario
- Recordatorios de hidratación
- Recordatorios de comidas
- Recordatorios de pesaje semanal
- Notificaciones push con Expo Notifications

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales:

- `user_profiles`: Perfiles de usuario (onboarding)
- `workout_plans`: Planes de entrenamiento generados
- `workout_completions`: Registro de entrenamientos completados
- `exercise_videos`: Videos de ejercicios
- `exercises`: Base de datos de ejercicios
- `nutrition_profiles`: Perfiles nutricionales
- `nutrition_targets`: Objetivos diarios de macros
- `meal_plans`: Planes de comidas semanales
- `meal_logs`: Registro de comidas
- `hydration_logs`: Registro de agua
- `body_metrics`: Métricas corporales
- `progress_photos`: Fotos de progreso
- `personal_records`: Records personales
- `friendships`: Relaciones de amistad
- `chats`: Conversaciones
- `messages`: Mensajes en tiempo real
- `subscriptions`: Suscripciones activas
- `payment_history`: Historial de pagos

### Seguridad:

- Row Level Security (RLS) habilitado en todas las tablas
- Políticas por `user_id`
- Almacenamiento seguro de credenciales

---

## 🔄 Flujos Principales

### Flujo de Nuevo Usuario:

1. Registro/Login (Clerk)
2. Onboarding (8 pasos)
3. Generación de plan con IA
4. Acceso al dashboard
5. Configuración de nutrición (opcional)
6. Comenzar entrenamiento

### Flujo de Entrenamiento Diario:

1. Usuario abre app → Dashboard muestra entrenamiento del día
2. Toca en el entrenamiento → Ve detalles del día
3. Sigue ejercicios con videos
4. Marca como completado
5. Registra duración, dificultad, notas
6. Sistema actualiza progreso

### Flujo de Nutrición:

1. Usuario configura perfil nutricional
2. Sistema calcula targets (BMR, TDEE, macros)
3. Genera plan de comidas semanal
4. Usuario registra comidas diarias
5. Sistema ajusta semanalmente según progreso

---

## 🎯 Diferenciadores Clave

1. **IA Real**: Usa ChatGPT para generar planes completamente personalizados, no plantillas
2. **Adaptación Continua**: La IA ajusta planes basándose en feedback y progreso
3. **Todo en Uno**: Entrenamiento + Nutrición + Salud + Social en una sola app
4. **Integración Health**: Sincronización automática con Apple Health/Google Fit
5. **Científicamente Basado**: Planes basados en evidencia científica, no solo opiniones
6. **Comunidad**: Sistema social integrado para motivación

---

## 📱 Pantallas Principales

- **Home**: Resumen diario, entrenamiento del día, nutrición del día
- **Dashboard**: Métricas de salud completas
- **Workout**: Lista de planes, generador de planes, detalles de días
- **Nutrition**: Home nutricional, plan semanal, log de comidas, lista de compras
- **Progress**: Fotos, métricas corporales, gráficos, PRs
- **Friends**: Búsqueda, solicitudes, lista de amigos
- **Chat**: Conversaciones en tiempo real
- **Profile**: Configuración, suscripción, logout

---

## 🚀 Estado Actual

- **Versión**: 1.0.4
- **Build iOS**: 14
- **Estado**: En producción, disponible en TestFlight
- **Usuarios**: Sistema listo para escalar
- **Monetización**: Stripe integrado, suscripciones activas

---

## 🔮 Características Técnicas Avanzadas

- **Offline Support**: Datos cacheados localmente
- **Real-time Updates**: Supabase Realtime para chat
- **Image Upload**: Supabase Storage para fotos y videos
- **Deep Linking**: Integración con Stripe para pagos
- **Error Boundaries**: Manejo robusto de errores
- **Loading States**: Skeletons y overlays profesionales
- **Retry Logic**: Reintentos automáticos en operaciones críticas

---

Esta es una aplicación completa, profesional y lista para producción que combina lo mejor de la tecnología moderna (IA, health tracking, real-time) con una experiencia de usuario excepcional.
