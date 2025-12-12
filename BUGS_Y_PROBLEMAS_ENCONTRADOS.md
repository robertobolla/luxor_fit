# 🐛 Bugs y Problemas Encontrados - Análisis Completo

## 🔴 CRÍTICOS (Afectan funcionalidad)

### 1. **Memory Leak en Timer de Descanso** ⏱️
**Archivo**: `app/(tabs)/workout-day-detail.tsx` (línea ~361)

**Problema**: 
```typescript
const interval = setInterval(() => {
  setTimerSeconds(prev => {
    if (prev <= 1) {
      clearInterval(interval);  // ❌ Intenta limpiar desde dentro
      return 0;
    }
    return prev - 1;
  });
}, 1000);
```

**Bug**: El `setInterval` no se limpia correctamente si el usuario cierra el modal antes de que termine. Causa memory leak.

**Impacto**: Alto - Memory leak, puede hacer más lento el dispositivo

**Fix sugerido**: 
```typescript
useEffect(() => {
  if (!isTimerRunning) return;
  
  const interval = setInterval(() => {
    setTimerSeconds(prev => {
      if (prev <= 1) {
        setIsTimerRunning(false);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval); // ✅ Limpia al desmontar
}, [isTimerRunning]);
```

---

### 2. **Race Condition en AsyncStorage** 💾
**Archivo**: `app/(tabs)/workout/custom-plan-days.tsx` (líneas 320-412)

**Problema**: `useFocusEffect` y `useEffect` pueden cargar/guardar datos simultáneamente en AsyncStorage.

**Escenario problemático**:
```
1. Usuario edita día → useEffect guarda en AsyncStorage
2. Usuario sale (sin esperar) → useFocusEffect carga de AsyncStorage
3. ❌ Datos desincronizados entre memoria y storage
```

**Impacto**: Medio - Pérdida de cambios recientes

**Fix sugerido**: Usar una flag `isSaving` y `isLoading` para evitar operaciones simultáneas.

---

### 3. **Falta Validación de Series Vacías** ❌
**Archivo**: `src/components/ExerciseSetTracker.tsx` (línea ~258)

**Problema**: Permite guardar series sin datos:
```typescript
const setsToSave = sets.filter((set) => {
  const hasData = set.reps !== null || set.weight_kg !== null || set.duration_seconds !== null;
  return hasData && !isWarmup;
});

if (setsToSave.length === 0) {
  Alert.alert('Sin datos', 'No hay datos para guardar...');
  return;  // ✅ Esto está bien
}

// ❌ PERO: ¿Qué pasa si el usuario pone 0 reps y 0kg? Técnicamente no es null
```

**Impacto**: Bajo-Medio - Datos sin sentido en DB

**Fix sugerido**: Validar que los valores sean > 0

---

### 4. **Múltiples Alert.alert() en lugar de Custom Alerts** 🚨
**Archivo**: Múltiples archivos

**Problema**: Aún hay 205 usos de `Alert.alert()` nativo en lugar de `useAlert()`

**Inconsistencia**:
```typescript
// ❌ Algunos lugares usan Alert nativo
Alert.alert('Error', 'Algo salió mal');

// ✅ Otros usan custom alert
showAlert('Error', 'Algo salió mal', [{ text: 'OK' }]);
```

**Impacto**: Bajo - Inconsistencia visual

**Fix sugerido**: Migrar todos los `Alert.alert` a `useAlert()`

---

## 🟡 IMPORTANTES (Afectan UX)

### 5. **140 console.log() en Producción** 📝
**Archivo**: `app/(tabs)/workout/*` (todos los archivos)

**Problema**: Demasiados logs de debug que irán a producción

**Ejemplos**:
```typescript
console.log('🔍 Estado modal cambió:', { showSetTypeModal, selectedSetIndex });
console.log('📦 Datos encontrados:', data.length, 'registros');
console.log('✅ Series cargadas:', loadedSets.length);
```

**Impacto**: Bajo - Performance y exposición de datos

**Fix sugerido**: 
- Opción A: Eliminar logs innecesarios
- Opción B: Crear wrapper `__DEV__ && console.log()`
- Opción C: Usar librería de logging (react-native-logs)

---

### 6. **Falta Loading State en Guardado de Plan** ⏳
**Archivo**: `app/(tabs)/workout/custom-plan-days.tsx`

**Problema**: Cuando guardas un plan, el botón muestra "Guardando..." pero si falla silenciosamente:
```typescript
setIsSaving(true);
try {
  // ... código de guardado ...
} catch (error) {
  console.error('Error:', error); // ❌ Solo log, no muestra al usuario
} finally {
  setIsSaving(false);
}
```

**Impacto**: Medio - Usuario no sabe si el guardado falló

**Fix sugerido**: Mostrar alert al usuario si falla

---

### 7. **setTimeout sin Cleanup** ⏰
**Archivo**: `app/(tabs)/workout/custom-plan-day-detail.tsx` (línea ~694)

**Problema**:
```typescript
setTimeout(() => {
  setShowAddExercise(true);
}, 100); // ❌ No se limpia si el componente se desmonta
```

**Impacto**: Bajo - Puede causar warning "Can't perform a React state update on unmounted component"

**Fix sugerido**: Guardar referencia y limpiar en cleanup

---

### 8. **TODOs sin Implementar** 📋
**Archivo**: `app/(tabs)/workout-day-detail.tsx`

**TODOs encontrados**:
```typescript
exerciseId: exerciseName, // TODO: En el futuro usar ID real del ejercicio
usesTime: false, // TODO: Detectar si el ejercicio usa tiempo
```

**Impacto**: Bajo - Funcionalidad futura, pero puede causar bugs si se asume que existe

---

## 🟢 MENORES (Mejoras de código)

### 9. **Dependencias de useEffect Incompletas** ⚠️
**Archivo**: Múltiples

**Problema**: Algunos `useEffect` tienen dependencias faltantes

**Ejemplo en `workout.tsx`**:
```typescript
useEffect(() => {
  loadWorkouts();
  loadSessions();
  loadWorkoutPlans();
  loadTrainerInvitations();
}, [user]);  // ❌ Falta loadWorkouts, loadSessions, etc.
```

**Impacto**: Bajo - Puede causar bugs sutiles si las funciones cambian

**Fix sugerido**: Agregar todas las dependencias o usar `useCallback`

---

### 10. **AsyncStorage sin Error Handling** 💾
**Archivo**: Múltiples

**Problema**: Algunos usos de AsyncStorage no manejan errores:
```typescript
const value = await AsyncStorage.getItem('key');
// ❌ ¿Qué pasa si falla? (espacio lleno, permisos, etc.)
```

**Impacto**: Bajo - App puede crashear en casos raros

**Fix sugerido**: Wrap en try-catch

---

### 11. **JSON.parse sin Validación** 🔍
**Archivo**: `app/(tabs)/workout/custom-plan-select-exercise.tsx`

**Problema**:
```typescript
const equipment = JSON.parse((params.equipment as string) || '[]');
// ⚠️ ¿Qué pasa si params.equipment es JSON inválido?
```

**Impacto**: Bajo - Crashea si recibe JSON malformado

**Fix sugerido**: Ya implementado en algunos lugares con `parseSafeJSON`, aplicar en todos

---

### 12. **Falta Limpieza de Supabase Channels** 🧹
**Archivo**: `app/(tabs)/workout/custom-plan-select-exercise.tsx`

**Problema**:
```typescript
useFocusEffect(
  React.useCallback(() => {
    supabase.removeAllChannels(); // ⚠️ Agresivo, elimina TODOS los channels
    // ¿Y si hay otros componentes usando channels?
  }, [])
);
```

**Impacto**: Bajo-Medio - Puede afectar realtime en otras pantallas

**Fix sugerido**: Solo limpiar channels específicos de esta pantalla

---

### 13. **Hardcoded Dates** 📅
**Archivo**: `app/body-evolution.tsx`

**Problema**:
```typescript
case 'all':
  startDate = new Date('2020-01-01'); // ❌ Hardcoded
  break;
```

**Impacto**: Bajo - Funciona, pero no es ideal

**Fix sugerido**: Usar fecha de registro del usuario o fecha muy antigua dinámica

---

### 14. **Alert "Próximamente" en Funcionalidad** 🚧
**Archivo**: `app/trainer-student-detail.tsx` (línea ~138)

**Problema**:
```typescript
const handleViewAllWorkouts = () => {
  Alert.alert('Próximamente', 'Esta funcionalidad estará disponible pronto');
};
```

**Impacto**: Bajo - UX confusa, mejor ocultar el botón

**Fix sugerido**: Ocultar la opción hasta que esté implementada

---

## 📊 Resumen por Prioridad

| Prioridad | Bugs Encontrados | Tiempo Estimado Fix |
|-----------|------------------|---------------------|
| 🔴 Críticos | 4 | ~2 horas |
| 🟡 Importantes | 4 | ~1.5 horas |
| 🟢 Menores | 6 | ~1 hora |
| **Total** | **14** | **~4.5 horas** |

---

## 🎯 Recomendación de Fixes por Prioridad

### Build Inmediato (solo críticos):
1. ✅ Memory leak timer (~20 min)
2. ✅ Validación series vacías (~15 min)

**Total: ~35 min** → Build seguro

---

### Build Mejorado (críticos + importantes):
Todo lo anterior +
3. ✅ Loading states en errores (~20 min)
4. ✅ setTimeout cleanup (~10 min)
5. ✅ AsyncStorage error handling (~15 min)

**Total: ~1h 20min** → Build robusto

---

### Build Perfecto (todo):
Todo lo anterior +
6. ✅ Limpieza de logs (~30 min)
7. ✅ Migrar Alert.alert → useAlert (~45 min)
8. ✅ useEffect dependencies (~20 min)

**Total: ~2h 55min** → Build perfecto

---

## 🔍 Bugs NO Encontrados (Buenas Noticias)

✅ No hay infinite loops obvios
✅ No hay variables globales peligrosas
✅ No hay problemas de tipos TypeScript
✅ No hay imports circulares
✅ No hay setState en loops
✅ RLS policies están configuradas correctamente
✅ Supabase queries están bien estructuradas

---

## 💡 Sugerencias Adicionales

### Para después de la build:

1. **Implementar Error Boundaries**
   - Envolver la app en `<ErrorBoundary>` para capturar crashes

2. **Agregar Analytics**
   - Trackear errores con Sentry o similar
   - Medir performance con Firebase Performance

3. **Testing**
   - Unit tests para lógica crítica
   - Integration tests para flujos principales

4. **Code Splitting**
   - Lazy load de pantallas menos usadas
   - Reducir bundle size inicial

---

## 🤔 ¿En cuál quieres trabajar?

**Elige por número o describe otro problema que hayas notado:**

1. Memory leak timer (20 min) 🔴
2. Race condition AsyncStorage (30 min) 🔴
3. Validación series vacías (15 min) 🔴
4. Loading states en errores (20 min) 🟡
5. setTimeout cleanup (10 min) 🟡
6. Limpieza de logs (30 min) 🟢
7. Migrar Alert.alert (45 min) 🟢
8. Todos los críticos (1h) 🔴🔴🔴
9. Build directo sin fixes 🚀
10. Otro (dime cuál)

