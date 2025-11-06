# 🐛 Bugs y Problemas Encontrados en la App

## 🔴 **CRÍTICOS** (Pueden causar crashes o pérdida de datos)

### 1. **Uso de `.single()` sin manejo de errores cuando no hay datos**

**Ubicaciones:**
- `app/(tabs)/nutrition/index.tsx` - Líneas 372, 392, 418, 567
- `app/(tabs)/home.tsx` - Línea 162
- `app/(tabs)/nutrition/today-detail.tsx` - Línea 61

**Problema:**
```typescript
const { data: targetData } = await supabase
  .from('nutrition_targets')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', today)
  .single(); // ❌ Puede lanzar error si no hay filas

if (!targetData) { // ❌ Nunca se ejecutará si .single() lanza error
  await initializeWeek();
}
```

**Solución:**
Usar `.maybeSingle()` o manejar el error explícitamente:
```typescript
const { data: targetData, error } = await supabase
  .from('nutrition_targets')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', today)
  .maybeSingle();

if (error && error.code !== 'PGRST116') {
  console.error('Error:', error);
  Alert.alert('Error', 'No se pudieron cargar los datos');
  return;
}

if (!targetData) {
  await initializeWeek();
}
```

---

### 2. **Error no manejado en `home.tsx` al cargar nutrición**

**Ubicación:** `app/(tabs)/home.tsx` - Línea 162

**Problema:**
```typescript
const { data: targetData } = await supabase
  .from('nutrition_targets')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', today)
  .single(); // ❌ Si no hay datos, lanza error y crashea

setTodayNutrition(targetData); // ❌ Puede ser null/undefined
```

**Solución:**
```typescript
const { data: targetData, error } = await supabase
  .from('nutrition_targets')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', today)
  .maybeSingle();

if (error && error.code !== 'PGRST116') {
  console.error('Error loading nutrition:', error);
}

setTodayNutrition(targetData || null);
```

---

### 3. **Acceso a propiedades sin validación en `workout-day-detail.tsx`**

**Ubicación:** `app/(tabs)/workout-day-detail.tsx` - Línea 104

**Problema:**
```typescript
exercises_completed: dayData.exercises || [], // ❌ dayData puede ser null
```

**Solución:**
```typescript
exercises_completed: dayData?.exercises || [],
```

---

### 4. **Verificación de completado no verifica fecha en `workout-day-detail.tsx`**

**Ubicación:** `app/(tabs)/workout-day-detail.tsx` - Líneas 58-79

**Problema:**
El código verifica si un día está completado, pero no verifica si fue completado **hoy**. Un usuario podría completar el mismo día múltiples veces en días diferentes.

**Solución:**
```typescript
const today = new Date().toISOString().split('T')[0];
const { data, error } = await supabase
  .from('workout_completions')
  .select('*')
  .eq('user_id', user.id)
  .eq('workout_plan_id', planId)
  .eq('day_name', dayName)
  .gte('completed_at', `${today}T00:00:00`)
  .lte('completed_at', `${today}T23:59:59`)
  .order('completed_at', { ascending: false })
  .limit(1);
```

---

## 🟡 **MEDIA PRIORIDAD** (Afectan UX o funcionalidad)

### 5. **No se maneja el error de `compError` en `home.tsx`**

**Ubicación:** `app/(tabs)/home.tsx` - Línea 107

**Problema:**
```typescript
const { data: completionData, error: compError } = await supabase
  .from('workout_completions')
  .select('id')
  .eq('user_id', user.id)
  .eq('workout_plan_id', activePlan.id)
  .eq('day_name', dayKey)
  .maybeSingle();

console.log(`🔍 ${dayData.day} (${dayKey}) - Completado:`, !!completionData);
// ❌ No se verifica compError
```

**Solución:**
```typescript
if (compError) {
  console.error('Error checking completion:', compError);
  // Continuar pero no marcar como completado
}
```

---

### 6. **Cálculo de lunes incorrecto en nutrición**

**Ubicación:** `app/(tabs)/nutrition/index.tsx` - Líneas 381-385

**Problema:**
```typescript
const dayOfWeek = new Date().getDay();
const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const monday = new Date();
monday.setDate(new Date().getDate() + diff); // ❌ Usa new Date() dos veces
```

**Solución:**
```typescript
const today = new Date();
const dayOfWeek = today.getDay();
const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const monday = new Date(today);
monday.setDate(today.getDate() + diff);
```

---

### 7. **Falta validación de `dayData` antes de acceder a propiedades**

**Ubicación:** `app/(tabs)/workout-day-detail.tsx` - Múltiples lugares

**Problema:**
```typescript
if (!dayData) {
  return (
    <View style={styles.container}>
      <Text>Error: No se encontraron datos del día</Text>
    </View>
  );
}
// ... pero luego se accede a dayData.exercises sin validación
```

**Solución:**
Asegurar que todas las referencias a `dayData` estén dentro del bloque que verifica su existencia.

---

### 8. **Race condition en recálculo de targets**

**Ubicación:** `app/(tabs)/nutrition/index.tsx` - Líneas 597-617

**Problema:**
Se borran targets y se recalculan en un loop, pero no se espera a que termine cada operación antes de continuar.

**Solución:**
```typescript
for (let i = 0; i < 7; i++) {
  const date = new Date(monday);
  date.setDate(monday.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  
  const { error: deleteError } = await supabase
    .from('nutrition_targets')
    .delete()
    .eq('user_id', user.id)
    .eq('date', dateStr);
  
  if (deleteError) {
    console.error(`Error borrando target ${dateStr}:`, deleteError);
    continue; // Saltar este día si falla
  }
  
  const result = await computeAndSaveTargets(user.id, dateStr);
  if (!result.success) {
    console.error(`Error recalculando ${dateStr}:`, result.error);
  }
}
```

---

### 9. **No se verifica si `activePlan` existe antes de acceder a propiedades**

**Ubicación:** `app/(tabs)/home.tsx` - Línea 86

**Problema:**
```typescript
if (activePlan && activePlan.plan_data) {
  const planData = activePlan.plan_data;
  // ✅ Verifica activePlan
  const schedule = planData.weekly_structure || planData.weekly_schedule || [];
  // ❌ Pero planData puede ser null/undefined
}
```

**Solución:**
```typescript
if (activePlan?.plan_data) {
  const planData = activePlan.plan_data;
  if (!planData || typeof planData !== 'object') {
    console.warn('plan_data is invalid');
    return;
  }
  const schedule = planData.weekly_structure || planData.weekly_schedule || [];
}
```

---

### 10. **Mensaje de error incorrecto en adherencia**

**Ubicación:** `src/services/nutrition.ts` - Línea 490

**Problema:**
```typescript
educationalMessage += ` Nota: Tu adherencia a la dieta es del ${Math.round(adherence)}%. Para obtener los mejores resultados, intenta registrar al menos el ${Math.round(adherence)}% de tus comidas.`;
// ❌ Dice "al menos el X%" donde X es la adherencia actual (baja), debería ser 70%
```

**Solución:**
```typescript
educationalMessage += ` Nota: Tu adherencia a la dieta es del ${Math.round(adherence)}%. Para obtener los mejores resultados, intenta registrar al menos el 70% de tus comidas.`;
```

---

## 🟢 **BAJA PRIORIDAD** (Mejoras de código)

### 11. **Código de debug no removido**

**Ubicaciones:**
- `app/(tabs)/home.tsx` - Línea 32, 84, 95
- `app/paywall.tsx` - Línea 79, 95

**Solución:**
Remover variables y código de debug antes de producción.

---

### 12. **Catch blocks vacíos**

**Ubicación:** `app/(tabs)/workout-plan-detail.tsx` - Líneas 69, 74

**Problema:**
```typescript
try {
  // código
} catch {} // ❌ Catch vacío oculta errores
```

**Solución:**
```typescript
try {
  // código
} catch (e) {
  console.warn('Error in diagnostic logs:', e);
  // No crítico, solo logs
}
```

---

### 13. **Validación de tipos débil en nutrición**

**Ubicación:** `src/services/nutrition.ts` - Líneas 1104-1128

**Problema:**
El código valida `food_id` y `grams`, pero no valida otros campos potencialmente problemáticos.

**Solución:**
Agregar validación más exhaustiva o usar un esquema de validación (Zod, Yup).

---

### 14. **Falta timeout en operaciones de red**

**Ubicación:** Múltiples archivos

**Problema:**
Las llamadas a Supabase no tienen timeout, pueden colgar la app si hay problemas de red.

**Solución:**
Agregar timeout a operaciones críticas:
```typescript
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 10000)
);

const result = await Promise.race([
  supabase.from('table').select(),
  timeoutPromise
]);
```

---

### 15. **No hay retry logic en operaciones críticas**

**Ubicación:** Múltiples archivos

**Problema:**
Si falla una operación de red, no se reintenta automáticamente.

**Solución:**
Implementar retry logic para operaciones críticas (guardar datos, cargar planes, etc.).

---

## 📋 Resumen de Prioridades

### 🔴 **URGENTE - Corregir antes de producción:**
1. Reemplazar todos los `.single()` por `.maybeSingle()` o manejo de errores
2. Validar `dayData` antes de acceder a propiedades
3. Verificar fecha en completado de entrenamientos

### 🟡 **IMPORTANTE - Corregir pronto:**
4. Manejar errores de `compError`
5. Corregir cálculo de lunes
6. Agregar validación de `activePlan?.plan_data`
7. Corregir mensaje de adherencia

### 🟢 **MEJORAS - Puede esperar:**
8. Remover código de debug
9. Reemplazar catch vacíos
10. Agregar timeouts y retry logic

---

## 🛠️ Scripts de Verificación

Para verificar estos problemas:

```bash
# Buscar todos los .single() sin manejo de errores
grep -r "\.single()" app/ --include="*.tsx" --include="*.ts"

# Buscar catch vacíos
grep -r "catch {}" app/ --include="*.tsx" --include="*.ts"

# Buscar accesos sin validación
grep -r "dayData\." app/ --include="*.tsx"
```

---

¿Quieres que corrija alguno de estos bugs ahora?

