# 📋 Lista Completa de Categorías y Formato para Ejercicios

## 🎯 Propósito

Este documento define la estructura completa de categorías de ejercicios que la IA puede usar para generar rutinas personalizadas basadas en la información del onboarding.

---

## 📊 Información del Onboarding que la IA Usa

### Datos Disponibles:

- **fitness_level**: `beginner` | `intermediate` | `advanced`
- **goals**: `weight_loss` | `muscle_gain` | `strength` | `endurance` | `flexibility` | `general_fitness`
- **activity_types**: `cardio` | `strength` | `sports` | `yoga` | `hiit` | `mixed`
- **available_days**: `1-7` días por semana
- **session_duration**: `15` | `30` | `45` | `60` | `90` minutos
- **equipment**: `none` | `dumbbells` | `barbell` | `resistance_bands` | `pull_up_bar` | `bench` | `gym_access`
- **gender**: `male` | `female` | `other`
- **age**: número
- **height**: cm
- **weight**: kg

---

## 🏗️ Estructura de Datos Sugerida

```typescript
interface Exercise {
  // Identificación
  name: string; // Nombre canónico (único, exacto)

  // Categorización (para organización)
  category: string; // Categoría principal (ver abajo)

  // Metadata funcional (lo que la IA usa para buscar)
  muscles: string[]; // Músculos trabajados (PRIMARIO, secundario, terciario)
  muscle_zones?: string[]; // Zonas específicas del músculo trabajadas (ver sección ZONAS MUSCULARES)
  movement_type: string; // Tipo de movimiento (push, pull, legs, etc.)
  exercise_type: string; // Tipo de ejercicio (compound, isolation, cardio, etc.)

  // Equipamiento
  equipment: string[]; // Equipamiento necesario
  equipment_alternatives?: string[]; // Equipamiento alternativo

  // Dificultad y nivel
  difficulty: "beginner" | "intermediate" | "advanced";
  fitness_levels: string[]; // Niveles para los que es apropiado

  // Objetivos
  goals: string[]; // Objetivos que ayuda a alcanzar
  activity_types: string[]; // Tipos de actividad donde se usa

  // Variaciones y nombres alternativos
  name_variations?: string[]; // Nombres alternativos (para matching)

  // Metadata adicional
  instructions?: string; // Instrucciones breves
  tips?: string[]; // Tips de ejecución
  common_mistakes?: string[]; // Errores comunes
}
```

---

## 📂 CATEGORÍAS PRINCIPALES (Para Organización)

### 1. **CARDIO**

Ejercicios cardiovasculares y de resistencia

### 2. **FUERZA_SUPERIOR_PUSH**

Ejercicios de empuje para tren superior (pecho, hombros, tríceps)

### 3. **FUERZA_SUPERIOR_PULL**

Ejercicios de tracción para tren superior (espalda, bíceps)

### 4. **FUERZA_INFERIOR**

Ejercicios para tren inferior (piernas, glúteos)

### 5. **CORE**

Ejercicios para core y abdominales

### 6. **FLEXIBILIDAD**

Ejercicios de estiramiento y movilidad

### 7. **FUNCIONAL**

Ejercicios funcionales y de movimiento completo

### 8. **PLIOMETRIA**

Ejercicios pliométricos y de potencia

### 9. **CALISTENIA**

Ejercicios con peso corporal

### 10. **HIIT**

Ejercicios de alta intensidad

---

## 🎯 MÚSCULOS (Para Búsqueda por Músculo)

### Tren Superior:

- `pecho` (chest)
- `espalda` (back)
- `hombros` (shoulders)
- `bíceps` (biceps)
- `tríceps` (triceps)
- `antebrazos` (forearms)
- `trapecio` (traps)

### Tren Inferior:

- `cuádriceps` (quads)
- `isquiotibiales` (hamstrings)
- `glúteos` (glutes)
- `pantorrillas` (calves)
- `gemelos` (calves)

### Core:

- `abdominales` (abs)
- `oblicuos` (obliques)
- `core` (core completo)
- `lumbares` (lower back)

### Completo:

- `cuerpo_completo` (full body)

---

## 🔄 TIPOS DE MOVIMIENTO (movement_type)

- `push` - Empuje (pecho, hombros, tríceps)
- `pull` - Tracción (espalda, bíceps)
- `legs` - Piernas (cuádriceps, isquiotibiales, glúteos)
- `core` - Core y abdominales
- `cardio` - Cardiovascular
- `flexibility` - Flexibilidad y estiramiento
- `full_body` - Cuerpo completo
- `plyometric` - Pliométrico
- `isometric` - Isométrico

---

## 🏋️ TIPOS DE EJERCICIO (exercise_type)

- `compound` - Compuesto (múltiples músculos)
- `isolation` - Aislado (un músculo principal)
- `cardio` - Cardiovascular
- `stretch` - Estiramiento
- `mobility` - Movilidad
- `plyometric` - Pliométrico
- `functional` - Funcional
- `calisthenic` - Calistenia

---

## 🎯 OBJETIVOS (goals)

- `weight_loss` - Perder peso
- `muscle_gain` - Ganar músculo
- `strength` - Aumentar fuerza
- `endurance` - Mejorar resistencia
- `flexibility` - Flexibilidad
- `general_fitness` - Forma general

---

## 🏃 TIPOS DE ACTIVIDAD (activity_types)

- `cardio` - Cardio
- `strength` - Fuerza
- `sports` - Deportes
- `yoga` - Yoga/Pilates
- `hiit` - HIIT
- `mixed` - Mixto

---

## 🛠️ EQUIPAMIENTO (equipment)

- `none` - Solo peso corporal
- `dumbbells` - Mancuernas
- `barbell` - Barra olímpica
- `resistance_bands` - Bandas de resistencia
- `pull_up_bar` - Barra de dominadas
- `bench` - Banco
- `gym_access` - Acceso a gimnasio
- `kettlebell` - Kettlebell (sugerido agregar)
- `cable_machine` - Máquina de poleas (si gym_access)
- `smith_machine` - Máquina Smith (si gym_access)
- `leg_press` - Prensa de piernas (si gym_access)
- `medicine_ball` - Balón medicinal (sugerido agregar)
- `yoga_mat` - Mat de yoga (sugerido agregar)

---

## 📋 LISTA COMPLETA DE CATEGORÍAS CON EJERCICIOS SUGERIDOS

### 1. CARDIO

**Músculos**: `cuerpo_completo`
**Movement Type**: `cardio`
**Exercise Type**: `cardio`
**Equipamiento**: Varía según ejercicio

**Ejercicios sugeridos** (tú los llenarás):

- Bicicleta estática
- Cinta de correr
- Elíptica
- Remo
- Escaladora
- Burpees
- Jumping jacks
- Mountain climbers
- High knees
- Butt kicks
- Skipping
- Sprints
- Caminata rápida
- Natación (si hay acceso)
- Ciclismo (si hay acceso)

---

### 2. FUERZA_SUPERIOR_PUSH

**Músculos**: `pecho`, `hombros`, `tríceps`
**Movement Type**: `push`
**Exercise Type**: `compound` o `isolation`
**Equipamiento**: Varía

**Ejercicios sugeridos**:

**Pecho (compound)**:

- Press de banca
- Press inclinado
- Press declinado
- Press con mancuernas
- Flexiones
- Flexiones inclinadas
- Flexiones declinadas
- Fondos

**Pecho (isolation)**:

- Aperturas con mancuernas
- Aperturas en banco
- Cruces en polea
- Flexiones diamante

**Hombros (compound)**:

- Press militar
- Press de hombros con mancuernas
- Press Arnold
- Press tras nuca

**Hombros (isolation)**:

- Elevaciones laterales
- Elevaciones frontales
- Vuelos posteriores
- Face pulls

**Tríceps**:

- Extensiones de tríceps
- Fondos en banco
- Patada de tríceps
- Extensión de tríceps en polea
- Press francés

---

### 3. FUERZA_SUPERIOR_PULL

**Músculos**: `espalda`, `bíceps`
**Movement Type**: `pull`
**Exercise Type**: `compound` o `isolation`
**Equipamiento**: Varía

**Ejercicios sugeridos**:

**Espalda (compound)**:

- Dominadas
- Remo con barra
- Remo con mancuernas
- Remo T
- Jalones al pecho
- Jalones tras nuca
- Peso muerto
- Remo en polea

**Espalda (isolation)**:

- Vuelos posteriores
- Remo invertido
- Pullover
- Hiperextensiones

**Bíceps**:

- Curl de bíceps
- Curl martillo
- Curl con barra
- Curl concentrado
- Curl en polea
- Curl 21

---

### 4. FUERZA_INFERIOR

**Músculos**: `cuádriceps`, `isquiotibiales`, `glúteos`, `pantorrillas`
**Movement Type**: `legs`
**Exercise Type**: `compound` o `isolation`
**Equipamiento**: Varía

**Ejercicios sugeridos**:

**Cuádriceps (compound)**:

- Sentadillas
- Sentadilla con barra
- Sentadilla frontal
- Sentadilla búlgara
- Zancadas
- Prensa de piernas
- Hack squat

**Cuádriceps (isolation)**:

- Extensiones de pierna
- Sentadilla isométrica

**Isquiotibiales (compound)**:

- Peso muerto
- Peso muerto rumano
- Peso muerto con piernas rígidas

**Isquiotibiales (isolation)**:

- Curl de pierna
- Curl nórdico
- Good mornings

**Glúteos**:

- Hip thrust
- Puente de glúteos
- Patada de glúteo
- Sentadilla sumo
- Abducción de cadera
- Extensión de cadera

**Pantorrillas**:

- Elevación de talones
- Elevación de talones sentado
- Elevación de talones en máquina

---

### 5. CORE

**Músculos**: `abdominales`, `oblicuos`, `core`, `lumbares`
**Movement Type**: `core`
**Exercise Type**: `isolation` o `functional`
**Equipamiento**: Principalmente `none`

**Ejercicios sugeridos**:

**Abdominales**:

- Crunch
- Crunch inverso
- Bicicleta abdominal
- Plancha
- Plancha lateral
- Abdominales en V
- Russian twists
- Toes to bar
- Hanging leg raises

**Oblicuos**:

- Plancha lateral
- Russian twists
- Crunch lateral
- Side bends

**Core completo**:

- Plancha
- Mountain climbers
- Dead bug
- Bird dog
- Hollow body hold
- L-sit

**Lumbares**:

- Hiperextensiones
- Superman
- Good mornings
- Peso muerto

---

### 6. FLEXIBILIDAD

**Músculos**: `cuerpo_completo`
**Movement Type**: `flexibility`
**Exercise Type**: `stretch` o `mobility`
**Equipamiento**: Principalmente `none`, opcional `yoga_mat`

**Ejercicios sugeridos**:

- Estiramiento de cuádriceps
- Estiramiento de isquiotibiales
- Estiramiento de glúteos
- Estiramiento de pecho
- Estiramiento de espalda
- Estiramiento de hombros
- Estiramiento de bíceps
- Estiramiento de tríceps
- Estiramiento de pantorrillas
- Estiramiento de cadera
- Estiramiento de cuello
- Movilidad de cadera
- Movilidad de hombros
- Movilidad de columna

---

### 7. FUNCIONAL

**Músculos**: `cuerpo_completo`
**Movement Type**: `full_body`
**Exercise Type**: `functional`
**Equipamiento**: Varía

**Ejercicios sugeridos**:

- Peso muerto
- Sentadilla con peso
- Thruster
- Clean and press
- Turkish get-up
- Farmer walks
- Cargadas
- Arrancadas

---

### 8. PLIOMETRIA

**Músculos**: `cuerpo_completo`, `cuádriceps`, `glúteos`, `pantorrillas`
**Movement Type**: `plyometric`
**Exercise Type**: `plyometric`
**Equipamiento**: Principalmente `none`

**Ejercicios sugeridos**:

- Box jumps
- Jump squats
- Burpees
- Jumping lunges
- Broad jumps
- Depth jumps
- Clapping push-ups
- Plyometric push-ups

---

### 9. CALISTENIA

**Músculos**: `cuerpo_completo`
**Movement Type**: `full_body`
**Exercise Type**: `calisthenic`
**Equipamiento**: `none` o `pull_up_bar`

**Ejercicios sugeridos**:

- Flexiones
- Dominadas
- Fondos
- Muscle-ups
- Handstand push-ups
- Plancha
- L-sit
- Human flag
- Front lever
- Back lever

---

### 10. HIIT

**Músculos**: `cuerpo_completo`
**Movement Type**: `cardio` o `full_body`
**Exercise Type**: `cardio` o `compound`
**Equipamiento**: Varía

**Ejercicios sugeridos**:

- Burpees
- Mountain climbers
- Jumping jacks
- High knees
- Butt kicks
- Jump squats
- Jumping lunges
- Sprints
- Battle ropes (si gym_access)
- Kettlebell swings (si hay kettlebell)

---

## 🎨 ESTRUCTURAS DE RUTINA POSIBLES

### Según Días Disponibles:

**1 día/semana**: Cuerpo completo
**2 días/semana**:

- Tren superior / Tren inferior
- Push / Pull + Legs
- Fuerza / Cardio

**3 días/semana**:

- Push / Pull / Legs
- Tren superior / Tren inferior / Cuerpo completo
- Fuerza / Cardio / Fuerza

**4 días/semana**:

- Push / Pull / Legs / Cardio
- Tren superior Push / Tren superior Pull / Tren inferior / Cardio
- Fuerza / Fuerza / Cardio / Fuerza

**5 días/semana**:

- Push / Pull / Legs / Push / Pull
- Tren superior / Tren inferior / Cardio / Tren superior / Tren inferior
- Fuerza / Fuerza / Cardio / Fuerza / Cardio

**6-7 días/semana**:

- Variaciones de las anteriores con días de descanso activo

### Según Objetivos:

**weight_loss**: Más cardio, HIIT, circuitos
**muscle_gain**: Más fuerza, volumen, descansos adecuados
**strength**: Ejercicios compuestos pesados, bajas reps
**endurance**: Más repeticiones, menos peso, más cardio
**flexibility**: Incluir estiramientos y movilidad
**general_fitness**: Balance de todo

### Según Tipo de Actividad:

**cardio**: Principalmente ejercicios cardiovasculares
**strength**: Principalmente ejercicios de fuerza
**sports**: Ejercicios funcionales y específicos del deporte
**yoga**: Estiramientos, movilidad, ejercicios de equilibrio
**hiit**: Circuitos de alta intensidad
**mixed**: Combinación de todo

---

## 📝 FORMATO JSON SUGERIDO PARA CADA EJERCICIO

```json
{
  "name": "Press de banca",
  "category": "fuerza_superior_push",
  "muscles": ["pecho", "tríceps", "hombros"],
  "muscle_zones": ["pecho_medio", "hombros_frontales"],
  "movement_type": "push",
  "exercise_type": "compound",
  "equipment": ["barbell", "bench"],
  "equipment_alternatives": ["dumbbells", "gym_access"],
  "difficulty": "intermediate",
  "fitness_levels": ["intermediate", "advanced"],
  "goals": ["muscle_gain", "strength", "general_fitness"],
  "activity_types": ["strength", "mixed"],
  "name_variations": ["press de pecho", "bench press", "press banca"],
  "instructions": "Acuéstate en el banco, agarra la barra con las manos separadas al ancho de los hombros, baja la barra al pecho y empuja hacia arriba.",
  "tips": [
    "Mantén los pies firmes en el suelo",
    "Arquea ligeramente la espalda",
    "Controla el movimiento en la fase excéntrica"
  ],
  "common_mistakes": [
    "Rebotar la barra en el pecho",
    "Separar demasiado las manos",
    "Arquear excesivamente la espalda"
  ]
}
```

### Ejemplo con diferentes zonas del mismo músculo:

```json
{
  "name": "Press inclinado",
  "category": "fuerza_superior_push",
  "muscles": ["pecho", "hombros", "tríceps"],
  "muscle_zones": ["pecho_superior", "hombros_frontales"],
  "movement_type": "push",
  "exercise_type": "compound"
},
{
  "name": "Press de banca",
  "category": "fuerza_superior_push",
  "muscles": ["pecho", "tríceps"],
  "muscle_zones": ["pecho_medio"],
  "movement_type": "push",
  "exercise_type": "compound"
},
{
  "name": "Press declinado",
  "category": "fuerza_superior_push",
  "muscles": ["pecho", "tríceps"],
  "muscle_zones": ["pecho_inferior"],
  "movement_type": "push",
  "exercise_type": "compound"
}
```

---

## 🔍 CÓMO LA IA BUSCARÁ EJERCICIOS

### Ejemplo 1: Usuario quiere "pecho y bíceps"

```
Buscar: muscles incluye "pecho" Y muscles incluye "bíceps"
Resultado: Ejercicios de pecho (push) + Ejercicios de bíceps (pull)
```

### Ejemplo 2: Usuario quiere estructura "push/pull/legs"

```
Buscar por movement_type:
- Día 1: movement_type = "push"
- Día 2: movement_type = "pull"
- Día 3: movement_type = "legs"
```

### Ejemplo 3: Usuario quiere "un músculo por día"

```
Buscar por músculo principal:
- Día 1: muscles[0] = "pecho"
- Día 2: muscles[0] = "espalda"
- Día 3: muscles[0] = "piernas"
```

### Ejemplo 4: Usuario tiene solo "dumbbells"

```
Filtrar: equipment incluye "dumbbells" O equipment = "none"
```

### Ejemplo 5: Usuario es "beginner" y quiere "weight_loss"

```
Filtrar:
- difficulty = "beginner"
- goals incluye "weight_loss"
- activity_types incluye "cardio" o "hiit"
```

---

## ✅ RECOMENDACIONES FINALES

1. **Mínimo de ejercicios por categoría**: 5-10 ejercicios para tener variedad
2. **Categorías principales**: Priorizar fuerza_superior_push, fuerza_superior_pull, fuerza_inferior, cardio, core
3. **Metadata completa**: Asegurar que cada ejercicio tenga muscles, movement_type, equipment bien definidos
4. **Variaciones de nombres**: Incluir name_variations para mejorar el matching
5. **Niveles de dificultad**: Asignar correctamente beginner/intermediate/advanced
6. **Equipamiento alternativo**: Especificar equipment_alternatives para flexibilidad

---

## 🎯 PRÓXIMOS PASOS

1. Revisar esta lista
2. Decidir qué ejercicios incluir en cada categoría
3. Llenar manualmente los ejercicios con su metadata
4. Implementar el sistema de búsqueda en el prompt de la IA
5. Probar con diferentes combinaciones de onboarding

---

**Nota**: Esta estructura permite máxima flexibilidad. La IA puede crear cualquier tipo de rutina (push/pull, músculo por día, cuerpo completo, etc.) porque busca por músculos y movement_type, no solo por categoría.
