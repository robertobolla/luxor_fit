# 👨👩 Género en Planes de Entrenamiento

## 📋 Cambios Implementados

### 1. **Nuevo Campo: Género**

Se agregó el campo `gender` al perfil del usuario para personalizar mejor los planes de entrenamiento.

#### **Opciones:**

- 👨 **Masculino** (`male`)
- 👩 **Femenino** (`female`)
- ⚧️ **Otro/Prefiero no decir** (`other`)

### 2. **Actualización de Tipos**

**Archivo:** `src/types/index.ts`

```typescript
export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export interface UserProfile {
  // ... otros campos
  gender: Gender; // ← NUEVO
  // ... otros campos
}
```

### 3. **Onboarding Actualizado**

**Archivo:** `app/onboarding.tsx`

- Se agregó un nuevo paso: **"gender"**
- Aparece después de "personal_info" y antes de "fitness_level"
- Pregunta: "¿Cuál es tu género?"
- Subtítulo: "Esto nos ayuda a personalizar mejor tu plan"

**Total de pasos:** 9 (antes eran 8)

### 4. **Base de Datos**

**Script SQL:** `supabase_add_gender_column.sql`

```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
```

**Instrucciones:**

1. Ve a Supabase → SQL Editor
2. Copia y pega el contenido de `supabase_add_gender_column.sql`
3. Ejecuta el script
4. Verifica que la columna se creó correctamente

### 5. **IA Mejorada con Adaptación por Género**

**Archivo:** `src/services/aiService.ts`

El prompt de IA ahora incluye instrucciones específicas por género:

#### **Para Masculino:**

- Equilibrio entre tren superior e inferior
- Énfasis en fuerza general
- Desarrollo balanceado

#### **Para Femenino:**

- **Mayor énfasis en tren inferior** (piernas y glúteos)
- Core y estabilidad
- Ejercicios específicos:
  - Más variaciones de sentadillas
  - Hip thrust y variaciones
  - Zancadas (múltiples variantes)
  - Peso muerto rumano
  - Patada de glúteo
  - Puente de glúteos
- Tren superior con enfoque funcional (mantiene fuerza pero no es el foco principal)

#### **Para Otro:**

- Plan balanceado
- Adaptado a objetivos específicos
- Sin sesgo hacia ningún grupo muscular

## 🎯 Diferencias en Planes

### Plan Masculino Típico:

```
Día 1: Tren superior - Push
- Press de banca
- Press militar
- Fondos
- Extensiones de tríceps

Día 2: Tren inferior
- Sentadillas
- Peso muerto
- Zancadas
- Gemelos

Día 3: Tren superior - Pull
- Dominadas
- Remo con barra
- Curl de bíceps
- Face pulls
```

### Plan Femenino Típico:

```
Día 1: Tren inferior - Glúteos y piernas
- Sentadilla con barra
- Hip thrust con barra
- Zancadas búlgaras
- Peso muerto rumano
- Patada de glúteo en polea

Día 2: Tren superior y core
- Press de banca con mancuernas
- Remo con mancuernas
- Press militar
- Plancha con variaciones

Día 3: Tren inferior - Énfasis en glúteos
- Hip thrust pesado
- Sentadilla sumo
- Puente de glúteos unilateral
- Abducción de cadera
- Extensiones de cuádriceps
```

## 📊 Distribución de Volumen

### Masculino:

- Tren superior: 50%
- Tren inferior: 50%

### Femenino:

- Tren inferior (piernas/glúteos): 60-70%
- Tren superior: 30-40%
- Mayor variedad de ejercicios de glúteos

## 🔬 Fundamento Científico

### Diferencias Fisiológicas:

1. **Distribución de Fuerza:**

   - Hombres: Mayor fuerza relativa en tren superior
   - Mujeres: Mayor fuerza relativa en tren inferior

2. **Composición Muscular:**

   - Hombres: Mayor masa muscular en tren superior
   - Mujeres: Mayor proporción de masa muscular en piernas

3. **Objetivos Comunes:**

   - Hombres: Pecho, hombros, brazos, espalda
   - Mujeres: Glúteos, piernas, core, tonificación

4. **Respuesta al Entrenamiento:**
   - Ambos responden bien a entrenamiento de fuerza
   - Mujeres pueden entrenar con mayor frecuencia (recuperación más rápida en tren inferior)
   - Hombres necesitan más descanso entre sesiones de tren superior pesado

## 💡 Recomendaciones

### Para Mujeres:

- **Frecuencia tren inferior:** 3-4 veces/semana
- **Frecuencia tren superior:** 2 veces/semana
- **Ejercicios clave:**
  - Hip thrust (3-4 veces/semana)
  - Sentadillas (2-3 veces/semana)
  - Peso muerto rumano (2 veces/semana)
  - Zancadas (2-3 veces/semana)

### Para Hombres:

- **Frecuencia tren superior:** 3-4 veces/semana
- **Frecuencia tren inferior:** 2-3 veces/semana
- **Ejercicios clave:**
  - Press de banca (2 veces/semana)
  - Dominadas (2-3 veces/semana)
  - Sentadillas (2 veces/semana)
  - Peso muerto (1-2 veces/semana)

## 🔄 Cómo Probar

### Para Nuevos Usuarios:

1. Completa el onboarding
2. Selecciona tu género en el paso 3
3. Continúa con el resto del onboarding
4. Genera tu plan de entrenamiento
5. ¡Verás un plan adaptado a tu género!

### Para Usuarios Existentes:

1. **Ejecuta el script SQL** en Supabase
2. Ve a **Perfil** → **"Completar perfil"**
3. Vuelve a hacer el onboarding (se actualizará tu perfil)
4. **Elimina tu plan actual** (si tienes uno)
5. Genera un **nuevo plan**
6. ¡El nuevo plan estará adaptado a tu género!

## 📈 Resultados Esperados

### Antes (sin género):

- Planes genéricos
- Misma distribución para todos
- No considera preferencias anatómicas

### Ahora (con género):

- ✅ Planes específicos por género
- ✅ Distribución inteligente de volumen
- ✅ Ejercicios adaptados a objetivos comunes
- ✅ Mayor satisfacción del usuario
- ✅ Mejores resultados

## 🎉 Beneficios

1. **Personalización Mejorada:**

   - Planes que se alinean con objetivos típicos por género
   - Ejercicios más relevantes

2. **Mejores Resultados:**

   - Enfoque en áreas de interés
   - Mayor motivación
   - Adherencia al plan

3. **Inclusividad:**

   - Opción "Otro" para quienes no se identifican con binario
   - Respeto a todas las identidades

4. **Ciencia Aplicada:**
   - Basado en diferencias fisiológicas reales
   - Optimizado para cada perfil

## 📚 Referencias

- Schoenfeld, B. J., et al. (2016). Effects of resistance training frequency on measures of muscle hypertrophy: A systematic review and meta-analysis.
- Contreras, B., et al. (2015). A comparison of gluteus maximus, biceps femoris, and vastus lateralis EMG activity in the back squat and barbell hip thrust exercises.
- Staron, R. S., et al. (2000). Fiber type composition of the vastus lateralis muscle of young men and women.

---

## ✨ Conclusión

La inclusión del género permite crear planes de entrenamiento **mucho más personalizados y efectivos**, respetando las diferencias fisiológicas y los objetivos típicos de cada persona.

**¡Genera un nuevo plan y experimenta la diferencia!** 💪
