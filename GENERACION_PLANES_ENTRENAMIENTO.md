# 🏋️ Generación de Planes de Entrenamiento con IA

## 📋 Descripción

FitMind ahora genera planes de entrenamiento personalizados basados en evidencia científica utilizando IA (ChatGPT) y los datos del onboarding del usuario.

## ✨ Características Implementadas

### 1. Pantalla de Generación (`app/(tabs)/workout-generator.tsx`)

**Funcionalidades:**

- Carga automática del perfil del usuario desde Supabase
- Muestra resumen del perfil (nivel, objetivos, disponibilidad)
- Botón para generar plan con IA
- Loading screen durante la generación (10-20 segundos)
- Visualización completa del plan generado
- Guardado automático del plan en Supabase

**Estados:**

1. **Loading**: Cargando perfil del usuario
2. **Ready**: Listo para generar plan
3. **Generating**: Generando plan con IA
4. **Success**: Plan generado y mostrado
5. **Error**: Manejo de errores con opción de reintentar

### 2. Servicio de IA Actualizado (`src/services/aiService.ts`)

**Nuevas Funciones:**

#### `generateWorkoutPlan(userData)`

- Genera plan completo de entrenamiento
- Usa ChatGPT si hay API key
- Fallback a planes por defecto si no hay API key
- Planes adaptados a 3 niveles: principiante, intermedio, avanzado

#### `buildWorkoutPrompt(userData)`

- Construye prompt optimizado para ChatGPT
- Incluye todos los datos relevantes del usuario
- Solicita formato JSON estructurado

#### `generateDefaultWorkoutPlan(userData)`

- Genera planes por defecto sin IA
- 3 planes predefinidos basados en evidencia científica
- Adaptados al nivel del usuario

### 3. Base de Datos

**Nueva Tabla: `workout_plans`**

```sql
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  plan_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Script SQL:** `supabase_workout_plans_table.sql`

## 🎯 Estructura del Plan Generado

```json
{
  "name": "Plan Intermedio - Desarrollo",
  "description": "Plan de 4 días para aumentar fuerza y masa muscular",
  "duration_weeks": 12,
  "days_per_week": 4,
  "weekly_structure": [
    {
      "day": "Día 1",
      "focus": "Tren superior - Push",
      "duration": 45,
      "exercises": [
        "Press de banca",
        "Press militar",
        "Fondos",
        "Extensiones de tríceps"
      ]
    }
  ],
  "key_principles": [
    "Sobrecarga progresiva",
    "Volumen óptimo: 10-20 series por grupo muscular",
    "Frecuencia: 2 veces por semana por grupo muscular"
  ],
  "progression": "Incrementa peso en 2.5-5% cuando completes todas las series...",
  "recommendations": [
    "Prioriza ejercicios compuestos",
    "Mantén un registro de tus levantamientos",
    "Asegura 7-9 horas de sueño"
  ]
}
```

## 🔬 Principios de Evidencia Científica

Los planes se basan en:

### 1. **Sobrecarga Progresiva**

- Incremento gradual de peso, repeticiones o volumen
- Adaptación específica al estímulo de entrenamiento

### 2. **Periodización**

- Ciclos de entrenamiento estructurados
- Fases de acumulación, intensificación y descarga
- Prevención de sobreentrenamiento

### 3. **Volumen Óptimo**

- **Principiante**: 8-12 series por grupo muscular/semana
- **Intermedio**: 10-20 series por grupo muscular/semana
- **Avanzado**: 15-25 series por grupo muscular/semana

### 4. **Frecuencia de Entrenamiento**

- Mínimo 2 veces por semana por grupo muscular
- Descanso de 48-72 horas entre sesiones del mismo grupo

### 5. **Especificidad**

- Ejercicios alineados con objetivos del usuario
- Adaptación al equipamiento disponible
- Respeto a las limitaciones de tiempo

## 📊 Datos Utilizados del Onboarding

El sistema analiza:

- ✅ **Nivel de fitness** (principiante/intermedio/avanzado)
- ✅ **Objetivos** (perder peso, ganar músculo, fuerza, etc.)
- ✅ **Tipos de actividad preferidos** (cardio, fuerza, HIIT, etc.)
- ✅ **Disponibilidad** (días por semana)
- ✅ **Duración de sesión** (minutos)
- ✅ **Equipamiento disponible** (mancuernas, barra, gimnasio, etc.)
- ✅ **Edad, altura, peso** (para cálculos de intensidad)

## 🎨 Experiencia de Usuario

### Flujo Completo

```
Usuario en pestaña "Entrenamientos"
         ↓
Click en "Crear plan de entrenamiento"
         ↓
Pantalla de generación
         ↓
Muestra resumen del perfil
         ↓
Click en "Generar Mi Plan"
         ↓
Loading: "Generando tu plan personalizado..."
         ↓
Plan generado con IA (o por defecto)
         ↓
Visualización completa del plan:
  - Nombre y descripción
  - Duración y frecuencia
  - Estructura semanal
  - Principios clave
  - Progresión
  - Recomendaciones
         ↓
Click en "Usar este Plan"
         ↓
Plan guardado en Supabase
         ↓
Redirige a pestaña "Entrenamientos"
```

## 💰 Costos de IA

### Con ChatGPT (GPT-3.5-Turbo)

- **Costo por plan**: ~$0.003 (0.3 centavos)
- **Tokens por plan**: ~1,500 tokens
- **Tiempo de generación**: 10-20 segundos

### Sin API Key

- **Costo**: $0 (gratis)
- **Tiempo**: Instantáneo
- **Calidad**: Planes predefinidos de alta calidad

## 🔧 Configuración

### Paso 1: Crear Tabla en Supabase

1. Ve a Supabase SQL Editor
2. Ejecuta `supabase_workout_plans_table.sql`
3. Verifica que la tabla `workout_plans` existe

### Paso 2: API Key de OpenAI (Opcional)

```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-tu-clave-aqui
```

**Nota:** Sin API key, usa planes por defecto de alta calidad.

### Paso 3: Reiniciar Servidor

```bash
npx expo start --clear
```

## 📱 Planes por Defecto

### Plan Principiante - Fundamentos

**Duración:** 8 semanas  
**Frecuencia:** 3 días/semana  
**Enfoque:** Técnica correcta y construcción de base

**Estructura:**

- Día 1: Cuerpo completo - Fuerza
- Día 2: Cardio moderado
- Día 3: Cuerpo completo - Resistencia

**Ejercicios:**

- Sentadillas, flexiones, remo con banda
- Caminata rápida, jumping jacks
- Zancadas, plancha, bicicleta abdominal

### Plan Intermedio - Desarrollo

**Duración:** 12 semanas  
**Frecuencia:** 4 días/semana  
**Enfoque:** Hipertrofia y fuerza

**Estructura:**

- Día 1: Tren superior - Push
- Día 2: Tren inferior - Fuerza
- Día 3: Tren superior - Pull
- Día 4: HIIT / Cardio

**Ejercicios:**

- Press de banca, press militar, fondos
- Sentadillas, peso muerto rumano
- Dominadas, remo con barra
- Burpees, sprints, box jumps

### Plan Avanzado - Optimización

**Duración:** 16 semanas  
**Frecuencia:** 5 días/semana  
**Enfoque:** Periodización y máximos resultados

**Estructura:**

- Día 1: Fuerza - Tren inferior
- Día 2: Hipertrofia - Tren superior Push
- Día 3: Potencia / Pliometría
- Día 4: Hipertrofia - Tren superior Pull
- Día 5: Accesorios / Core

**Ejercicios:**

- Sentadilla con barra, peso muerto, hip thrust
- Press inclinado, press militar, aperturas
- Power cleans, box jumps, med ball slams
- Dominadas lastradas, remo pendlay
- Plancha con peso, pallof press, farmer walks

## 🎓 Prompt Engineering

### Sistema Prompt

```
Eres un entrenador personal certificado y experto en ciencias del ejercicio.
Creas planes de entrenamiento personalizados basados en evidencia científica,
principios de periodización, sobrecarga progresiva y adaptación individual.
Tus planes son específicos, realistas y seguros.
```

### Requisitos del Prompt

1. Plan específico para el nivel del usuario
2. Alineado con objetivos principales
3. Respeta disponibilidad de tiempo
4. Usa solo equipamiento disponible
5. Incluye progresión gradual y segura
6. Basado en evidencia científica
7. Ejercicios específicos con nombres claros
8. Recomendaciones prácticas

## 🚀 Próximas Mejoras

### Fase 2: Seguimiento de Planes

- [ ] Marcar días completados
- [ ] Registro de peso/repeticiones
- [ ] Gráficos de progreso
- [ ] Ajuste automático de dificultad

### Fase 3: Planes Adaptativos

- [ ] Ajuste basado en feedback del usuario
- [ ] Modificación de ejercicios según lesiones
- [ ] Integración con métricas de salud
- [ ] Sugerencias de descanso/recuperación

### Fase 4: Biblioteca de Ejercicios

- [ ] Videos demostrativos
- [ ] Instrucciones detalladas
- [ ] Variaciones de ejercicios
- [ ] Sustituciones por equipamiento

## 🐛 Troubleshooting

### Error: "No se pudo cargar tu perfil"

**Solución:** Completa el onboarding primero

### Error: "No se pudo generar el plan"

**Solución:** Se usa automáticamente el plan por defecto

### Plan no se guarda

**Solución:** Verifica que la tabla `workout_plans` existe en Supabase

### Generación muy lenta

**Solución:** Normal con ChatGPT (10-20 seg). Considera usar planes por defecto.

## 📚 Referencias Científicas

1. **Schoenfeld, B. J. (2010)**. The mechanisms of muscle hypertrophy and their application to resistance training. _Journal of Strength and Conditioning Research_.

2. **Krieger, J. W. (2010)**. Single vs. multiple sets of resistance exercise for muscle hypertrophy: a meta-analysis. _Journal of Strength and Conditioning Research_.

3. **Rhea, M. R., et al. (2003)**. A meta-analysis to determine the dose response for strength development. _Medicine & Science in Sports & Exercise_.

4. **American College of Sports Medicine (2009)**. Progression models in resistance training for healthy adults. _Medicine & Science in Sports & Exercise_.

## 🎉 Conclusión

El sistema de generación de planes de entrenamiento con IA está completamente implementado y funcional. Los usuarios ahora pueden:

✅ Generar planes personalizados basados en su perfil  
✅ Ver planes estructurados con ejercicios específicos  
✅ Recibir recomendaciones basadas en evidencia  
✅ Guardar y acceder a sus planes  
✅ Usar la app sin API key (planes por defecto)

**El sistema combina lo mejor de la IA con planes predefinidos de alta calidad para ofrecer una experiencia completa y profesional.**
