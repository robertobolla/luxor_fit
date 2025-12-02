# 🧠 Análisis: Generación de Rutinas con IA - Sistema Actual y Mejoras

## 📊 **Sistema Actual de Generación de Rutinas**

### **Criterios que se Usan Actualmente**

El sistema genera rutinas basándose en los siguientes datos del perfil del usuario:

#### 1. **Datos Demográficos y Físicos**
- **Género**: `male`, `female`, `other`
- **Edad**: Años
- **Nivel de fitness**: `beginner`, `intermediate`, `advanced`

#### 2. **Objetivos y Preferencias**
- **Objetivos**: Array de objetivos seleccionados
  - `weight_loss` - Perder peso
  - `muscle_gain` - Ganar músculo
  - `strength` - Aumentar fuerza
  - `endurance` - Mejorar resistencia
  - `flexibility` - Mejorar flexibilidad
  - `general_fitness` - Mantener forma general

- **Tipos de actividad preferidos**: Array
  - `cardio` - Cardio (correr, nadar, bici)
  - `strength` - Fuerza (pesas, calistenia)
  - `sports` - Deportes
  - `yoga` - Yoga/Pilates
  - `hiit` - HIIT
  - `mixed` - Mixto

#### 3. **Restricciones y Disponibilidad**
- **Días disponibles**: 1-7 días por semana
- **Duración de sesión**: 15, 30, 45, 60, 90 minutos
- **Equipamiento disponible**: Array de equipamiento
  - `none`, `dumbbells`, `barbell`, `resistance_bands`, `pull_up_bar`, `bench`, `gym_access`, etc.

---

### **Cómo Funciona el Prompt de IA Actual**

El sistema construye un prompt detallado que incluye:

#### **1. Perfil del Usuario**
```
- Género: Masculino/Femenino
- Edad: X años
- Nivel: principiante/intermedio/avanzado
- Objetivos principales: perder peso, ganar músculo, etc.
- Actividades preferidas: cardio, fuerza, etc.
- Disponibilidad: X días/semana, X min/sesión
- Equipamiento: mancuernas, barra, etc.
```

#### **2. Instrucciones de Selección de Ejercicios**
- Prioriza ejercicios **COMPUESTOS** (sentadilla, peso muerto, press, dominadas, remo)
- Incluye ejercicios **ACCESORIOS** específicos para objetivos
- Nombra ejercicios con **PRECISIÓN** (ej: "Sentadilla con barra alta")
- Varía agarres, ángulos y variaciones
- **Adaptación por nivel**:
  - Principiante: movimientos básicos y técnica
  - Avanzado: variaciones complejas y técnicas avanzadas

#### **3. Adaptación por Género**
- **Masculino**: Equilibrio tren superior/inferior, énfasis en fuerza general
- **Femenino**: Mayor énfasis en tren inferior (piernas, glúteos), core y estabilidad
  - Más variaciones de sentadillas, hip thrust, zancadas, peso muerto rumano
  - Ejercicios específicos para glúteos: hip thrust, patada de glúteo, puente de glúteos

#### **4. Volumen e Intensidad (Basado en Ciencia)**
- **Principiante**:
  - 8-12 series por grupo muscular/semana
  - 3-4 ejercicios por sesión
  - Reps: 8-15 para hipertrofia, 12-20 para resistencia
  - Descansos: 60-90s

- **Intermedio**:
  - 12-18 series por grupo muscular/semana
  - 4-6 ejercicios por sesión
  - Reps: 6-12 para fuerza, 8-15 para hipertrofia
  - Descansos: 90-180s para compuestos, 60-90s para accesorios

- **Avanzado**:
  - 16-25 series por grupo muscular/semana
  - 5-8 ejercicios por sesión
  - Reps: 3-6 para fuerza máxima, 6-12 para hipertrofia, 12-20 para resistencia
  - Descansos: 2-5min para fuerza, 90-120s para hipertrofia

#### **5. Estructura Semanal**
- Distribuye grupos musculares inteligentemente (evita solapamiento)
- Incluye días de recuperación activa si es necesario
- **Adaptación por objetivo**:
  - Perder peso: más frecuencia cardio, déficit calórico
  - Ganar músculo: enfoque en progresión de peso, superávit calórico
  - Fuerza: ejercicios compuestos pesados, bajas reps

#### **6. Progresión**
- Especifica cómo aumentar la carga semana a semana
- Incluye deloads cada 4-6 semanas
- Menciona señales de sobreentrenamiento

#### **7. Principios Científicos**
- Cita principios específicos (sobrecarga progresiva, especificidad, etc.)
- Explica el PORQUÉ de cada decisión
- Referencias a estudios (Schoenfeld, Helms, Nuckols, Israetel)

---

## ❌ **Limitaciones del Sistema Actual**

### **1. No Usa Datos Históricos**
- ❌ No considera entrenamientos completados anteriormente
- ❌ No analiza qué ejercicios le gustan o no al usuario
- ❌ No adapta basado en resultados reales

### **2. No Usa Feedback del Usuario**
- ❌ No considera `difficulty_rating` (1-5) de entrenamientos completados
- ❌ No usa `notes` que el usuario escribe después de entrenar
- ❌ No adapta si el usuario marca ejercicios como "muy fáciles" o "muy difíciles"

### **3. No Usa Datos de Progreso**
- ❌ No considera cambios de peso (`body_metrics`)
- ❌ No usa fotos de progreso para ajustar objetivos
- ❌ No analiza records personales (`personal_records`)
- ❌ No considera composición corporal (grasa, músculo)

### **4. No Usa Datos de Salud**
- ❌ No integra datos de Apple Health (pasos, calorías, frecuencia cardíaca)
- ❌ No considera nivel de actividad diaria
- ❌ No adapta según recuperación (sueño, HRV)

### **5. No Considera Limitaciones**
- ❌ No pregunta por lesiones o limitaciones físicas
- ❌ No adapta ejercicios si el usuario tiene problemas específicos
- ❌ No considera preferencias de ejercicios específicos (ej: "no me gustan las sentadillas")

### **6. No Aprende del Comportamiento**
- ❌ No analiza patrones de entrenamiento (qué días entrena más, a qué hora)
- ❌ No adapta según adherencia (si completa o no los entrenamientos)
- ❌ No ajusta si el usuario siempre salta ciertos ejercicios

### **7. Generación Estática**
- ❌ Genera el plan una vez y no lo adapta
- ❌ No regenera automáticamente después de X semanas
- ❌ No ajusta en tiempo real según progreso

---

## 🚀 **Mejoras Propuestas con IA**

### **1. Sistema de Adaptación Basado en Feedback** ⭐ ALTA PRIORIDAD

#### **Qué Implementar:**
- Analizar `workout_completions` para extraer:
  - `difficulty_rating` promedio
  - Ejercicios que el usuario completa vs salta
  - Notas del usuario sobre ejercicios
  - Duración real vs planificada

#### **Cómo Mejorar el Prompt:**
```typescript
// Agregar al prompt:
HISTORIAL DE ENTRENAMIENTOS:
- Dificultad promedio reportada: ${avgDifficulty}/5
- Ejercicios frecuentemente completados: ${completedExercises}
- Ejercicios frecuentemente saltados: ${skippedExercises}
- Notas del usuario: "${userNotes}"

ADAPTACIÓN REQUERIDA:
- Si dificultad promedio < 2: Aumentar intensidad en 15-20%
- Si dificultad promedio > 4: Reducir volumen o simplificar ejercicios
- Evitar ejercicios que el usuario frecuentemente salta
- Priorizar ejercicios que el usuario completa consistentemente
```

#### **Implementación:**
```typescript
// En buildWorkoutPrompt(), agregar:
async function buildWorkoutPromptWithHistory(
  userData: UserProfile,
  userId: string
): Promise<string> {
  // Obtener historial de entrenamientos
  const { data: completions } = await supabase
    .from('workout_completions')
    .select('difficulty_rating, notes, exercises_completed, duration_minutes')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(10);

  // Analizar feedback
  const avgDifficulty = calculateAverageDifficulty(completions);
  const preferredExercises = extractPreferredExercises(completions);
  const skippedExercises = extractSkippedExercises(completions);
  const userNotes = extractCommonNotes(completions);

  // Agregar al prompt base
  const basePrompt = buildWorkoutPrompt(userData);
  
  return basePrompt + `
  
HISTORIAL Y FEEDBACK:
- Dificultad promedio: ${avgDifficulty}/5
- Ejercicios preferidos: ${preferredExercises.join(', ')}
- Ejercicios a evitar: ${skippedExercises.join(', ')}
- Notas del usuario: "${userNotes}"

ADAPTACIÓN:
${generateAdaptationInstructions(avgDifficulty, preferredExercises, skippedExercises)}
`;
}
```

---

### **2. Adaptación Basada en Progreso Físico** ⭐ ALTA PRIORIDAD

#### **Qué Implementar:**
- Analizar `body_metrics` para ver cambios de peso, grasa, músculo
- Usar `personal_records` para identificar fortalezas y debilidades
- Ajustar objetivos según progreso real

#### **Cómo Mejorar el Prompt:**
```typescript
PROGRESO DEL USUARIO:
- Cambio de peso: ${weightChange} kg en los últimos 30 días
- Cambio de grasa corporal: ${bodyFatChange}%
- Cambio de músculo: ${muscleChange}%
- Records personales: ${personalRecords}

ADAPTACIÓN:
- Si está perdiendo peso muy rápido (>1kg/semana): Reducir déficit, más proteína
- Si está ganando músculo: Aumentar volumen de entrenamiento
- Si está estancado: Cambiar estímulo, variar ejercicios
- Fortalezas: ${strongMuscleGroups} - Mantener o aumentar volumen
- Debilidades: ${weakMuscleGroups} - Priorizar en el plan
```

#### **Implementación:**
```typescript
async function getProgressData(userId: string) {
  // Obtener métricas corporales recientes
  const { data: metrics } = await supabase
    .from('body_metrics')
    .select('weight_kg, body_fat_percentage, muscle_percentage, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  // Obtener records personales
  const { data: records } = await supabase
    .from('personal_records')
    .select('exercise_name, weight_kg, reps')
    .eq('user_id', userId);

  // Calcular cambios
  const weightChange = calculateWeightChange(metrics);
  const bodyFatChange = calculateBodyFatChange(metrics);
  const strongMuscleGroups = identifyStrongMuscleGroups(records);
  const weakMuscleGroups = identifyWeakMuscleGroups(records);

  return {
    weightChange,
    bodyFatChange,
    strongMuscleGroups,
    weakMuscleGroups,
  };
}
```

---

### **3. Integración con Datos de Salud** ⭐ MEDIA PRIORIDAD

#### **Qué Implementar:**
- Usar datos de Apple Health/Google Fit
- Analizar nivel de actividad diaria
- Considerar recuperación (sueño, frecuencia cardíaca)

#### **Cómo Mejorar el Prompt:**
```typescript
DATOS DE SALUD (últimos 7 días):
- Pasos promedio diarios: ${avgSteps}
- Calorías quemadas promedio: ${avgCalories} kcal/día
- Horas de sueño promedio: ${avgSleep} horas
- Frecuencia cardíaca en reposo: ${restingHR} bpm

ADAPTACIÓN:
- Si pasos < 5000/día: Aumentar cardio, más actividad diaria
- Si sueño < 7 horas: Reducir volumen, más recuperación
- Si HR en reposo alta: Reducir intensidad, más descanso
- Si muy activo (>10000 pasos): Puede manejar más volumen
```

---

### **4. Sistema de Aprendizaje de Preferencias** ⭐ MEDIA PRIORIDAD

#### **Qué Implementar:**
- Trackear qué ejercicios el usuario marca como favoritos
- Analizar patrones de entrenamiento (días, horarios)
- Aprender qué tipos de entrenamiento prefiere

#### **Cómo Mejorar:**
```typescript
PREFERENCIAS APRENDIDAS:
- Días preferidos para entrenar: ${preferredDays}
- Horario preferido: ${preferredTime}
- Ejercicios favoritos: ${favoriteExercises}
- Tipos de entrenamiento preferidos: ${preferredWorkoutTypes}

ADAPTACIÓN:
- Programar entrenamientos más intensos en días preferidos
- Ajustar duración según horario preferido
- Incluir más ejercicios favoritos
- Priorizar tipos de entrenamiento preferidos
```

---

### **5. Adaptación Dinámica Semanal** ⭐ ALTA PRIORIDAD

#### **Qué Implementar:**
- Regenerar o ajustar el plan cada 4-6 semanas automáticamente
- Ajustar en tiempo real si el usuario reporta problemas
- Adaptar según adherencia (si completa o no entrenamientos)

#### **Implementación:**
```typescript
// Función para regenerar plan adaptado
async function regenerateAdaptedPlan(
  userId: string,
  currentPlanId: string
): Promise<any> {
  // 1. Obtener perfil base
  const userProfile = await getUserProfile(userId);
  
  // 2. Obtener historial y feedback
  const history = await getWorkoutHistory(userId, currentPlanId);
  
  // 3. Obtener progreso
  const progress = await getProgressData(userId);
  
  // 4. Obtener datos de salud
  const healthData = await getHealthDataForLastWeek(userId);
  
  // 5. Construir prompt mejorado
  const enhancedPrompt = await buildEnhancedWorkoutPrompt(
    userProfile,
    history,
    progress,
    healthData
  );
  
  // 6. Generar nuevo plan
  return await generateWorkoutPlanWithEnhancedPrompt(enhancedPrompt);
}
```

---

### **6. Consideración de Lesiones y Limitaciones** ⭐ MEDIA PRIORIDAD

#### **Qué Implementar:**
- Permitir al usuario marcar lesiones o limitaciones
- Adaptar ejercicios automáticamente
- Sugerir alternativas

#### **Cómo Mejorar:**
```typescript
LIMITACIONES FÍSICAS:
- Lesiones activas: ${activeInjuries}
- Limitaciones: ${limitations}
- Ejercicios a evitar: ${exercisesToAvoid}

ADAPTACIÓN:
- Reemplazar ejercicios problemáticos con alternativas seguras
- Reducir rango de movimiento si es necesario
- Priorizar ejercicios de rehabilitación/prevención
- Evitar completamente ejercicios marcados como problemáticos
```

---

### **7. Sistema de Periodización Inteligente** ⭐ ALTA PRIORIDAD

#### **Qué Implementar:**
- Planificar periodización automática (acumulación, intensificación, realización, descarga)
- Ajustar según fase del plan
- Predecir cuándo necesitará deload

#### **Cómo Mejorar:**
```typescript
PERIODIZACIÓN:
- Semana actual del plan: ${currentWeek}/${totalWeeks}
- Fase actual: ${currentPhase} (acumulación/intensificación/realización/descarga)
- Próximo deload: Semana ${nextDeloadWeek}

ADAPTACIÓN:
- Si fase = acumulación: Alto volumen, moderada intensidad
- Si fase = intensificación: Alta intensidad, volumen reducido
- Si fase = realización: Máxima intensidad, volumen mínimo
- Si fase = descarga: 50% volumen, 50% intensidad, más recuperación
```

---

## 📋 **Plan de Implementación Recomendado**

### **Fase 1: Feedback Básico** (2-3 horas)
1. ✅ Agregar análisis de `difficulty_rating` al prompt
2. ✅ Identificar ejercicios completados vs saltados
3. ✅ Adaptar intensidad según feedback

### **Fase 2: Progreso Físico** (3-4 horas)
1. ✅ Integrar datos de `body_metrics`
2. ✅ Usar `personal_records` para identificar fortalezas/debilidades
3. ✅ Ajustar objetivos según progreso real

### **Fase 3: Datos de Salud** (2-3 horas)
1. ✅ Integrar Apple Health/Google Fit
2. ✅ Analizar nivel de actividad
3. ✅ Considerar recuperación

### **Fase 4: Aprendizaje Avanzado** (4-5 horas)
1. ✅ Sistema de preferencias aprendidas
2. ✅ Adaptación dinámica semanal
3. ✅ Periodización inteligente

---

## 🎯 **Ejemplo de Prompt Mejorado**

```typescript
// Prompt actual: ~500 palabras
// Prompt mejorado: ~1200 palabras con contexto completo

Eres un entrenador personal certificado con 10+ años de experiencia...

PERFIL DEL USUARIO:
[datos actuales...]

HISTORIAL DE ENTRENAMIENTOS (últimos 10):
- Dificultad promedio: 3.2/5 (ligeramente fácil, aumentar intensidad)
- Ejercicios completados consistentemente: Sentadillas, Press de banca, Remo
- Ejercicios frecuentemente saltados: Peso muerto, Pull-ups
- Notas comunes: "Muy cansado después de peso muerto", "Me gustan las sentadillas"

PROGRESO FÍSICO (últimos 30 días):
- Cambio de peso: -2.1 kg (perdiendo peso a buen ritmo)
- Cambio de grasa: -1.5% (excelente)
- Cambio de músculo: +0.3% (ganando músculo mientras pierde grasa)
- Records personales: Sentadilla 100kg x 5, Press 60kg x 8
- Fortalezas: Tren inferior (sentadillas), Empuje horizontal (press)
- Debilidades: Tren posterior (peso muerto), Tracción vertical (pull-ups)

DATOS DE SALUD (últimos 7 días):
- Pasos promedio: 8,500/día (activo)
- Calorías quemadas: 2,200 kcal/día
- Sueño promedio: 7.2 horas (adecuado)
- HR en reposo: 58 bpm (excelente recuperación)

ADAPTACIONES REQUERIDAS:
1. Aumentar intensidad general en 15% (dificultad promedio baja)
2. Priorizar ejercicios de tracción vertical y peso muerto (debilidades)
3. Mantener sentadillas y press (fortalezas y preferencias)
4. Reducir frecuencia de peso muerto o usar variaciones más ligeras
5. Aumentar volumen de pull-ups o usar alternativas más accesibles
6. Mantener déficit calórico moderado (está funcionando bien)
7. Puede manejar más volumen (buena recuperación, sueño adecuado)

[resto del prompt...]
```

---

## 💡 **Beneficios Esperados**

1. **Mayor Personalización**: Rutinas que realmente se adaptan al usuario
2. **Mejor Adherencia**: Ejercicios que el usuario disfruta y completa
3. **Mejores Resultados**: Adaptación basada en progreso real
4. **Menos Abandono**: Planes que evolucionan con el usuario
5. **Mayor Engagement**: Usuario ve que el sistema "aprende" de él

---

¿Quieres que implemente alguna de estas mejoras? Recomiendo empezar con **Fase 1: Feedback Básico** ya que es rápida y tiene alto impacto.

