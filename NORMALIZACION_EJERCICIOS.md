# 📝 Normalización de Nombres de Ejercicios

Este documento explica cómo normalizar los nombres de ejercicios para que todos empiecen con letra mayúscula de manera consistente.

---

## 🎯 Objetivo

Asegurar que todos los nombres de ejercicios tengan un formato consistente:
- ✅ **"Press Banca Plano"** en lugar de "press banca plano"
- ✅ **"Curl De Bíceps"** en lugar de "curl de bíceps"
- ✅ **"Dominadas Pronas"** en lugar de "DOMINADAS PRONAS"

---

## 📊 Dos Enfoques

### 1️⃣ **Base de Datos (SQL)** - Normalizar datos existentes
### 2️⃣ **Código (TypeScript)** - Garantizar formato en la UI

---

## 🗄️ 1. Normalización en Base de Datos

### **Archivo:** `NORMALIZAR_NOMBRES_EJERCICIOS.sql`

Este script SQL normaliza:
- ✅ Nombres canónicos en `exercise_videos`
- ✅ Variaciones de nombres en `exercise_videos`
- ✅ Ejercicios en planes guardados (`workout_plans`)

### **Cómo Ejecutar:**

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en https://supabase.com
   - Click en "SQL Editor" en el menú lateral

2. **Crea una nueva query**
   - Click en "+ New query"

3. **Copia y pega el contenido de `NORMALIZAR_NOMBRES_EJERCICIOS.sql`**

4. **IMPORTANTE: Haz un backup primero**
   ```sql
   -- Crear tabla de respaldo de exercise_videos
   CREATE TABLE exercise_videos_backup AS 
   SELECT * FROM exercise_videos;
   
   -- Crear tabla de respaldo de workout_plans
   CREATE TABLE workout_plans_backup AS 
   SELECT * FROM workout_plans;
   ```

5. **Ejecuta el script**
   - Click en "Run" o presiona `Ctrl+Enter`

6. **Verifica los resultados**
   ```sql
   SELECT canonical_name FROM exercise_videos
   ORDER BY canonical_name
   LIMIT 20;
   ```

---

## 💻 2. Normalización en Código

### **Archivo:** `src/utils/textFormatters.ts`

Proporciona funciones helper para garantizar formato consistente en la UI.

### **Funciones Disponibles:**

#### `capitalizeWords(text: string)`
Capitaliza la primera letra de cada palabra.

```typescript
import { capitalizeWords } from '@/utils/textFormatters';

capitalizeWords("press banca plano")
// → "Press Banca Plano"
```

#### `normalizeExerciseName(exerciseName: string)`
Normaliza específicamente nombres de ejercicios con casos especiales.

```typescript
import { normalizeExerciseName } from '@/utils/textFormatters';

normalizeExerciseName("curl de bíceps con barra z")
// → "Curl De Bíceps Con Barra Z"
```

#### `formatMuscleName(muscleName: string)`
Formatea nombres de músculos.

```typescript
import { formatMuscleName } from '@/utils/textFormatters';

formatMuscleName("pecho y bíceps")
// → "Pecho Y Bíceps"
```

---

## 🔧 Cómo Usar en Componentes

### **Ejemplo: Mostrar nombre de ejercicio**

**Antes:**
```typescript
<Text>{exercise.name}</Text>
```

**Después:**
```typescript
import { normalizeExerciseName } from '@/utils/textFormatters';

<Text>{normalizeExerciseName(exercise.name)}</Text>
```

### **Ejemplo: En workout-plan-detail.tsx**

```typescript
import { normalizeExerciseName } from '@/utils/textFormatters';

// En el renderizado
{safeDay.exercises?.map((exercise: any, idx: number) => {
  const isOldFormat = typeof exercise === 'string';
  const exerciseName = isOldFormat ? exercise : exercise.name;

  return (
    <View key={idx} style={styles.exercisePreviewItem}>
      <Ionicons name="checkmark-circle" size={14} color="#ffb300" />
      <Text style={styles.exercisePreviewText}>
        {normalizeExerciseName(exerciseName)}
      </Text>
    </View>
  );
})}
```

---

## 📋 Archivos a Actualizar

Para aplicar la normalización en toda la app, actualiza estos componentes:

### **Alta Prioridad:**
1. ✅ `app/(tabs)/workout-plan-detail.tsx` - Vista de plan
2. ✅ `app/(tabs)/workout-day-detail.tsx` - Vista de día de entrenamiento
3. ✅ `app/(tabs)/workout/custom-plan-day-detail.tsx` - Edición de día personalizado
4. ✅ `app/(tabs)/workout/custom-plan-days.tsx` - Lista de días
5. ✅ `src/components/ExerciseSetTracker.tsx` - Tracking de ejercicios

### **Media Prioridad:**
6. ✅ `app/(tabs)/workout/custom-plan-select-exercise.tsx` - Selector de ejercicios
7. ✅ `app/(tabs)/exercise-detail.tsx` - Detalle de ejercicio

---

## ✅ Checklist de Implementación

### **Fase 1: Base de Datos** 🗄️
- [ ] Hacer backup de `exercise_videos` y `workout_plans`
- [ ] Ejecutar `NORMALIZAR_NOMBRES_EJERCICIOS.sql` en Supabase
- [ ] Verificar que los nombres se normalizaron correctamente
- [ ] Si hay problemas, restaurar desde backup

### **Fase 2: Código** 💻
- [ ] Importar `normalizeExerciseName` en componentes clave
- [ ] Actualizar `workout-plan-detail.tsx`
- [ ] Actualizar `workout-day-detail.tsx`
- [ ] Actualizar `custom-plan-day-detail.tsx`
- [ ] Actualizar `custom-plan-days.tsx`
- [ ] Actualizar `ExerciseSetTracker.tsx`

### **Fase 3: Pruebas** 🧪
- [ ] Crear plan personalizado y verificar nombres
- [ ] Generar plan con IA y verificar nombres
- [ ] Editar plan existente y verificar nombres
- [ ] Tracking de ejercicios y verificar nombres
- [ ] Visualizar detalles de plan y verificar nombres

---

## 🚨 Consideraciones Importantes

1. **Backup Primero**
   - ⚠️ Siempre haz backup antes de ejecutar scripts SQL que modifiquen datos

2. **Casos Especiales**
   - La función `normalizeExerciseName()` maneja acrónimos como RIR, HIIT
   - Si hay otros casos especiales, agrégalos al objeto `specialCases`

3. **Performance**
   - La normalización SQL puede tardar si tienes muchos planes
   - Ejecuta en horas de bajo tráfico

4. **Consistencia**
   - Una vez normalizado en BD, el código garantiza que nuevos datos también lo estén

---

## 📊 Comparación: Antes vs Después

### **Antes:**
```
press banca plano
CURL DE BÍCEPS
dominadas Pronas
sentaDILLA con Barra
```

### **Después:**
```
Press Banca Plano
Curl De Bíceps
Dominadas Pronas
Sentadilla Con Barra
```

---

## 🎯 Resultado Final

- ✅ **Consistencia visual** en toda la app
- ✅ **Profesionalismo** en la presentación
- ✅ **Fácil mantenimiento** con funciones centralizadas
- ✅ **Datos limpios** en la base de datos

---

## 🆘 Soporte

Si algo sale mal:

1. **Restaurar desde backup:**
   ```sql
   DROP TABLE exercise_videos;
   ALTER TABLE exercise_videos_backup RENAME TO exercise_videos;
   
   DROP TABLE workout_plans;
   ALTER TABLE workout_plans_backup RENAME TO workout_plans;
   ```

2. **Reportar el problema** con detalles de qué salió mal

---

**Última actualización:** Diciembre 2025

