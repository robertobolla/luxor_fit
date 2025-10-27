# 🎯 Sistema de Onboarding y Entrenamientos con IA - FitMind

## 📋 Onboarding Mejorado

### Flujo Completo (8 Pasos)

1. **Bienvenida** 👋

   - Presentación de FitMind
   - Explicación de personalización con IA

2. **Información Personal** 📝

   - Nombre
   - Edad
   - Altura (cm)
   - Peso (kg)

3. **Nivel de Fitness** 💪

   - Principiante (nuevo en fitness)
   - Intermedio (meses de experiencia)
   - Avanzado (años de experiencia)

4. **Objetivos** 🎯

   - Perder peso
   - Ganar músculo
   - Aumentar fuerza
   - Mejorar resistencia
   - Flexibilidad/Movilidad
   - Mantener forma general
   - _Puede seleccionar múltiples_

5. **Tipos de Actividad Preferida** 🏃 (NUEVO)

   - 🏃 Cardio (correr, nadar, bici)
   - 💪 Fuerza (pesas, calistenia)
   - ⚽ Deportes (fútbol, basketball)
   - 🧘 Yoga/Pilates
   - 🔥 HIIT (entrenamiento intenso)
   - 🎯 Mixto (de todo un poco)
   - _Puede seleccionar múltiples_

6. **Disponibilidad** 📅

   - Días por semana (1-7)

7. **Duración de Sesión** ⏱️ (NUEVO)

   - 15 minutos
   - 30 minutos
   - 45 minutos
   - 60 minutos
   - 90 minutos

8. **Equipamiento Disponible** 🏋️

   - Solo peso corporal
   - Mancuernas
   - Barra olímpica
   - Bandas de resistencia
   - Barra de dominadas
   - Banco
   - Acceso a gimnasio
   - _Puede seleccionar múltiples_

9. **Completado** ✅
   - Mensaje de confirmación
   - Redirección al dashboard

---

## 🗄️ Estructura de Datos en Supabase

### Tabla: `user_profiles`

```typescript
interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  fitness_level: "beginner" | "intermediate" | "advanced";
  goals: string[]; // ['weight_loss', 'muscle_gain', etc.]
  activity_types: string[]; // ['cardio', 'strength', 'yoga', etc.] ✨ NUEVO
  available_days: number; // 1-7
  session_duration: number; // 15, 30, 45, 60, 90 ✨ NUEVO
  equipment: string[]; // ['dumbbells', 'gym_access', etc.]
  created_at: string;
  updated_at: string;
}
```

### Script SQL para Actualizar

Ejecutar `supabase_user_profile_update.sql` en Supabase SQL Editor.

---

## 🤖 Sistema de Entrenamientos con IA - Próximos Pasos

### Fase 1: Base de Datos de Ejercicios

- [ ] Crear tabla `exercises` con catálogo de ejercicios
- [ ] Incluir: nombre, descripción, grupo muscular, equipo necesario, dificultad
- [ ] ~100 ejercicios básicos para empezar

### Fase 2: Generación de Rutinas con IA

Usando la información del onboarding, podemos generar rutinas personalizadas:

#### Input para la IA:

```typescript
{
  fitness_level: "intermediate",
  goals: ["muscle_gain", "strength"],
  activity_types: ["strength", "hiit"],
  available_days: 4,
  session_duration: 45,
  equipment: ["dumbbells", "bench"]
}
```

#### Output de la IA:

```typescript
{
  plan_name: "Plan de Fuerza 4 días - 45min",
  description: "Rutina de fuerza con énfasis en ganancia muscular",
  workouts: [
    {
      day: "Lunes",
      name: "Pecho y Tríceps",
      exercises: [
        { name: "Press de banca con mancuernas", sets: 4, reps: 10, rest: 90 },
        { name: "Aperturas con mancuernas", sets: 3, reps: 12, rest: 60 },
        { name: "Flexiones", sets: 3, reps: "al fallo", rest: 60 },
        { name: "Fondos en banco", sets: 3, reps: 12, rest: 60 }
      ],
      estimated_duration: 45
    },
    // ... más días
  ]
}
```

### Fase 3: Integración con IA

#### Opción A: Claude API (Anthropic)

```typescript
const prompt = `
Eres un entrenador personal experto. Crea un plan de entrenamiento semanal personalizado.

Perfil del usuario:
- Nivel: ${profile.fitness_level}
- Objetivos: ${profile.goals.join(", ")}
- Actividades preferidas: ${profile.activity_types.join(", ")}
- Días disponibles: ${profile.available_days}
- Duración por sesión: ${profile.session_duration} minutos
- Equipamiento: ${profile.equipment.join(", ")}

Genera un plan de ${profile.available_days} días con ejercicios específicos.
Formato JSON con: día, nombre del entrenamiento, ejercicios (nombre, series, repeticiones, descanso).
`;
```

#### Opción B: GPT-4 API (OpenAI)

Similar al anterior, usando la API de OpenAI.

### Fase 4: Pantalla de Entrenamientos

#### Vista Principal (`workout.tsx`):

```
📱 Pantalla de Entrenamientos
├─ 🎯 Plan Activo
│  └─ "Plan de Fuerza 4 días - 45min"
├─ 📅 Entrenamientos de la Semana
│  ├─ Lunes: Pecho y Tríceps ✅
│  ├─ Martes: Descanso
│  ├─ Miércoles: Espalda y Bíceps 🔵 (Hoy)
│  └─ ...
├─ 🔄 Botón: "Generar Nuevo Plan"
└─ 📚 Biblioteca de Entrenamientos
```

#### Pantalla de Entrenamiento Activo:

```
🏋️ Pecho y Tríceps
├─ ⏱️ Temporizador: 0:00 / 45:00
├─ Ejercicio 1/5: Press de banca
│  ├─ Serie 1/4: 10 reps ✅
│  ├─ Serie 2/4: 10 reps ✅
│  ├─ Serie 3/4: [ Iniciar ]
│  └─ Descanso: 1:30
├─ [ Siguiente Ejercicio ]
└─ [ Terminar Entrenamiento ]
```

### Fase 5: Adaptación Inteligente

- Registrar RPE (Rate of Perceived Exertion) después de cada ejercicio
- Si usuario no completa → próxima sesión más fácil
- Si completa fácilmente → aumentar dificultad
- IA ajusta automáticamente el plan cada semana

---

## 🚀 Implementación Recomendada

### Sprint 1 (Ya completado ✅):

- [x] Onboarding mejorado con todos los campos
- [x] Actualización de tipos TypeScript
- [x] Script SQL para Supabase

### Sprint 2 (Próximo):

1. Crear tabla `exercises` en Supabase
2. Agregar ~50 ejercicios básicos
3. Crear servicio de IA (Claude o GPT)
4. Implementar generación de rutinas

### Sprint 3:

1. Pantalla principal de entrenamientos
2. Vista de entrenamiento activo con temporizador
3. Sistema de registro de ejercicios completados

### Sprint 4:

1. Sistema de adaptación inteligente
2. Gráficos de progreso por ejercicio
3. Historial de entrenamientos

---

## 💡 Ideas Adicionales

### Funcionalidades Premium:

- 🎥 Videos demostrativos de ejercicios
- 🎧 Integración con música
- 👥 Entrenamientos en grupo/retos
- 📊 Análisis avanzado de progreso
- 🏆 Sistema de logros y badges
- 🤖 Chat con entrenador virtual (IA)

### Integraciones:

- Apple Health / Google Fit
- Spotify para música
- Strava para actividades outdoor
- MyFitnessPal para nutrición

---

## 📞 Próximos Pasos Inmediatos

1. **Ejecutar SQL en Supabase:**

   ```bash
   # Ir a Supabase Dashboard > SQL Editor
   # Ejecutar: supabase_user_profile_update.sql
   ```

2. **Probar Onboarding:**

   - Crear nueva cuenta
   - Completar todos los pasos
   - Verificar que datos se guarden correctamente

3. **Decidir estrategia de IA:**

   - ¿Claude API o GPT-4?
   - ¿Budget disponible para llamadas API?
   - ¿Alternativamente, usar reglas hardcodeadas al inicio?

4. **Empezar con ejercicios:**
   - Crear tabla en Supabase
   - Poblar con ejercicios básicos
   - Crear servicio para consultar ejercicios

---

## ❓ Preguntas para Discutir

1. ¿Preferencias sobre qué IA usar? (Claude vs GPT-4 vs hardcoded)
2. ¿Quieres videos de ejercicios desde el inicio o después?
3. ¿Prioridad: muchos ejercicios o pocos pero muy bien hechos?
4. ¿El plan debe regenerarse automáticamente cada X semanas?
5. ¿Incluir notificaciones push para recordar entrenar?

**¡Listo para continuar con la siguiente fase! 💪🚀**
