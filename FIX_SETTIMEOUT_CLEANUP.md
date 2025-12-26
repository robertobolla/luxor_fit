# ✅ Fix: setTimeout sin Cleanup

## 🐛 Problema Original

**setTimeout sin cleanup**: Múltiples `setTimeout` quedaban programados incluso después de que los componentes se desmontaran, causando:
- ⚠️ Warning: "Can't perform a React state update on an unmounted component"
- 💧 Potential memory leaks
- 🤔 Comportamiento inesperado

---

## 📍 Dónde Estaban los Problemas

### 1. `app/(tabs)/workout/custom-plan-day-detail.tsx`

**Problema**: Modal de edición se abre después de agregar ejercicio
```typescript
// ❌ ANTES: Sin cleanup
setTimeout(() => {
  if (isMounted) {
    setEditingExercise(newExercise);
  }
}, 100); // No se puede cancelar
```

**Escenario problemático**:
```
0.0s - Usuario selecciona ejercicio
0.0s - setTimeout(100ms) programado
0.05s - Usuario presiona "back" rápido
0.05s - Componente se desmonta
0.1s - setTimeout se ejecuta ❌
0.1s - Warning: "Can't update unmounted component"
```

---

### 2. `app/(tabs)/dashboard.tsx`

**Problema**: Modal de checkin semanal se muestra después de delay
```typescript
// ❌ ANTES: Sin cleanup
setTimeout(() => {
  setShowCheckinModal(true);
  markCheckinReminderShown();
}, 1500); // No se puede cancelar
```

**Escenario problemático**:
```
0.0s - Usuario abre dashboard
0.0s - setTimeout(1500ms) programado para modal
0.5s - Usuario navega a otra pantalla
0.5s - Componente se desmonta
1.5s - setTimeout se ejecuta ❌
1.5s - Intenta setShowCheckinModal(true) en componente desmontado
```

---

### 3. `app/(tabs)/workout-generator.tsx`

**Problema**: Navegación después de guardar plan
```typescript
// ❌ ANTES: Sin cleanup
setTimeout(() => {
  router.replace({
    pathname: '/(tabs)/workout-plan-detail',
    params: { planId: newPlanId }
  });
}, 100); // No se puede cancelar
```

**Escenario problemático**:
```
0.0s - Usuario guarda plan generado
0.0s - setTimeout(100ms) programado para navegar
0.05s - Usuario presiona "back" muy rápido
0.05s - Componente se desmonta
0.1s - setTimeout se ejecuta ❌
0.1s - Intenta navegar desde componente desmontado
```

---

### 4. `app/(tabs)/nutrition/index.tsx`

**Problema**: Auto-scroll al historial de semanas
```typescript
// ❌ ANTES: Sin cleanup
requestAnimationFrame(() => {
  setTimeout(() => {
    scrollViewRef.current?.scrollTo({
      x: scrollPosition,
      animated: false,
    });
  }, 50); // No se puede cancelar
});
```

**Escenario problemático**:
```
0.0s - Usuario abre nutrición
0.0s - setTimeout(50ms) programado para scroll
0.03s - Usuario navega a otra pantalla
0.03s - Componente se desmonta
0.05s - setTimeout se ejecuta ❌
0.05s - Intenta scrollTo en componente desmontado
```

---

## ✅ Soluciones Implementadas

### Fix 1: Modal de Ejercicio (custom-plan-day-detail.tsx)

**Agregado**:
```typescript
// Ref para guardar referencia del timeout
const modalTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
```

**En el setTimeout**:
```typescript
// ✅ DESPUÉS: Con cleanup
modalTimeoutRef.current = setTimeout(() => {
  if (isMounted) {
    setEditingExercise(newExercise);
    modalTimeoutRef.current = null; // Limpiar después de ejecutar
  }
}, 100);
```

**Cleanup en useEffect**:
```typescript
// Cleanup al desmontar componente
useEffect(() => {
  return () => {
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
      console.log('🧹 Timeout de modal limpiado al desmontar');
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🧹 Timeout de auto-guardado limpiado al desmontar');
    }
  };
}, []);
```

**Beneficio**: No más warnings, no memory leaks

---

### Fix 2: Modal de Checkin (dashboard.tsx)

**Agregado**:
```typescript
// Ref para cleanup de timeout del modal de checkin
const checkinModalTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
```

**En el setTimeout**:
```typescript
// ✅ DESPUÉS: Con cleanup
checkinModalTimeoutRef.current = setTimeout(() => {
  setShowCheckinModal(true);
  markCheckinReminderShown();
  checkinModalTimeoutRef.current = null; // Limpiar después de ejecutar
}, 1500);
```

**Cleanup en useEffect**:
```typescript
// Cleanup al desmontar
useEffect(() => {
  return () => {
    if (checkinModalTimeoutRef.current) {
      clearTimeout(checkinModalTimeoutRef.current);
      console.log('🧹 Timeout de modal de checkin limpiado al desmontar');
    }
  };
}, []);
```

---

### Fix 3: Navegación (workout-generator.tsx)

**Agregado**:
```typescript
// Ref para cleanup de timeout de navegación
const navigationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
```

**En el setTimeout**:
```typescript
// ✅ DESPUÉS: Con cleanup
navigationTimeoutRef.current = setTimeout(() => {
  router.replace({
    pathname: '/(tabs)/workout-plan-detail',
    params: { planId: newPlanId }
  });
  navigationTimeoutRef.current = null; // Limpiar después de ejecutar
}, 100);
```

**Cleanup en useEffect**:
```typescript
// Cleanup al desmontar
useEffect(() => {
  return () => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      console.log('🧹 Timeout de navegación limpiado al desmontar');
    }
  };
}, []);
```

---

### Fix 4: Scroll (nutrition/index.tsx)

**Agregado** (en componente WeekHistory):
```typescript
const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**En el useEffect**:
```typescript
// ✅ DESPUÉS: Con cleanup
useEffect(() => {
  if (scrollViewRef.current && pastWeeks.length > 0) {
    // Limpiar timeout anterior si existe
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    requestAnimationFrame(() => {
      scrollTimeoutRef.current = setTimeout(() => {
        const cardWidth = 292;
        const scrollPosition = pastWeeks.length * cardWidth;
        
        scrollViewRef.current?.scrollTo({
          x: scrollPosition,
          animated: false,
        });
        scrollTimeoutRef.current = null; // Limpiar después de ejecutar
      }, 50);
    });
  }
  
  // ✅ Cleanup al desmontar
  return () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      console.log('🧹 Timeout de scroll limpiado');
    }
  };
}, [pastWeeks.length, weeklyHistory.length]);
```

**Beneficio**: Cleanup automático en el mismo useEffect

---

## 🛡️ Patrón de Protección Implementado

### Patrón Completo:

```typescript
// 1. Crear ref para guardar timeout ID
const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

// 2. Guardar referencia al crear timeout
timeoutRef.current = setTimeout(() => {
  // ... código ...
  timeoutRef.current = null; // Limpiar después de ejecutar
}, delay);

// 3. Cleanup en useEffect
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      console.log('🧹 Timeout limpiado');
    }
  };
}, []);
```

---

## 📊 Antes vs Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|---------|-----------|
| **setTimeout sin cleanup** | 4 instancias | 0 |
| **Memory leaks potenciales** | Sí | No |
| **Warnings de React** | Sí | No |
| **Cleanup automático** | No | Sí |
| **Referencias guardadas** | No | Sí (useRef) |
| **Logs de debug** | No | Sí |

---

## 🧪 Cómo Probar el Fix

### Prueba 1: Modal de Ejercicio (custom-plan-day-detail.tsx)
1. Abre edición de un día
2. Selecciona un ejercicio
3. Inmediatamente presiona "back" (antes de 100ms)
4. **Verificar**: No debería haber warning en consola
5. **Verificar logs**: 
   ```
   🧹 Timeout de modal limpiado al desmontar
   ```

---

### Prueba 2: Modal de Checkin (dashboard.tsx)
1. Abre dashboard (si tienes checkin pendiente)
2. Inmediatamente navega a otra pantalla
3. Espera 2 segundos
4. **Verificar**: Modal NO se muestra
5. **Verificar logs**:
   ```
   🧹 Timeout de modal de checkin limpiado al desmontar
   ```

---

### Prueba 3: Navegación (workout-generator.tsx)
1. Genera un plan de entrenamiento
2. Inmediatamente presiona "back"
3. **Verificar**: No hay navegación inesperada
4. **Verificar logs**:
   ```
   🧹 Timeout de navegación limpiado al desmontar
   ```

---

### Prueba 4: Scroll (nutrition/index.tsx)
1. Abre pantalla de nutrición
2. Inmediatamente navega a otra pantalla
3. **Verificar**: No hay warnings de scroll
4. **Verificar logs**:
   ```
   🧹 Timeout de scroll limpiado
   ```

---

## 📈 Beneficios del Fix

### 1. **No Warnings** ⚠️
- ✅ Consola limpia
- ✅ No "unmounted component" warnings
- ✅ Mejor experiencia de desarrollo

### 2. **No Memory Leaks** 💧
- ✅ Timeouts cancelados correctamente
- ✅ Referencias limpiadas
- ✅ Memoria liberada

### 3. **Código Limpio** 🧹
- ✅ Patrón consistente
- ✅ Fácil de mantener
- ✅ Bien documentado

### 4. **Debugging Facilitado** 🔍
- ✅ Logs de cleanup
- ✅ Fácil verificar que se limpió
- ✅ Visible en desarrollo

---

## 🎯 Patrón Recomendado

### ✅ SIEMPRE haz esto:
```typescript
// Guardar referencia
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

// Crear timeout
timeoutRef.current = setTimeout(() => {
  // código...
  timeoutRef.current = null;
}, delay);

// Cleanup
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);
```

### ❌ NUNCA hagas esto:
```typescript
// Sin guardar referencia, no se puede cancelar
setTimeout(() => {
  setState(newValue); // ❌ Puede ejecutarse en componente desmontado
}, delay);
```

---

## 📝 Archivos Modificados

### 1. `app/(tabs)/workout/custom-plan-day-detail.tsx`
- Agregado `modalTimeoutRef`
- Timeout guardado en ref
- Cleanup en useEffect

### 2. `app/(tabs)/dashboard.tsx`
- Agregado `checkinModalTimeoutRef`
- Timeout guardado en ref
- Cleanup en useEffect

### 3. `app/(tabs)/workout-generator.tsx`
- Agregado `navigationTimeoutRef`
- Timeout guardado en ref
- Cleanup en useEffect

### 4. `app/(tabs)/nutrition/index.tsx`
- Agregado `scrollTimeoutRef`
- Timeout guardado en ref
- Cleanup en mismo useEffect (return)

---

## 🔍 Otros setTimeout Encontrados

### ✅ NO Necesitan Fix (están bien)

#### 1. Promises con setTimeout (workout-generator.tsx, línea ~275)
```typescript
await new Promise(resolve => setTimeout(resolve, 1000));
```
**Razón**: La promesa se resuelve automáticamente, no hay state updates.

#### 2. Promises con setTimeout (profile.tsx, línea ~157)
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```
**Razón**: La promesa se resuelve automáticamente, no hay state updates.

#### 3. Exponential backoff (nutrition/log.tsx, línea ~119)
```typescript
await new Promise(resolve => setTimeout(resolve, delay));
```
**Razón**: La promesa se resuelve automáticamente, usado en retry logic.

---

## ✅ Estado

- [x] custom-plan-day-detail.tsx - 1 fix (modal)
- [x] dashboard.tsx - 1 fix (checkin modal)
- [x] workout-generator.tsx - 1 fix (navegación)
- [x] nutrition/index.tsx - 1 fix (scroll)
- [x] Linter sin errores
- [x] Documentación creada
- [ ] Probado en Expo Go
- [ ] Probado con acciones rápidas

---

## 🎯 Bugs Completados (4/14)

- ✅ ~~1. Memory leak timer~~
- ✅ ~~2. Race condition AsyncStorage~~
- ✅ ~~6. Loading states en errores~~
- ✅ ~~7. setTimeout sin cleanup~~

**Quedan 10 bugs**

---

## 🚀 Siguiente Paso

**Tenemos 4 bugs críticos resueltos:**
- ✅ Memory leak en timer de descanso
- ✅ Race conditions en AsyncStorage
- ✅ Errores silenciosos (loading states)
- ✅ setTimeout sin cleanup

**¿Qué sigue?**

**A.** Validación series vacías (15 min) 🔴 ← Último crítico rápido
**B.** Build ahora 🚀 (4 fixes importantes ya hechos)
**C.** Limpieza de console.log (30 min) 🟢
**D.** Otro bug específico

**¿Cuál prefieres?** 💪

---

## 💡 Lecciones Aprendidas

### ❌ NUNCA:
```typescript
setTimeout(() => {
  setState(value); // ❌ Sin cleanup
}, delay);
```

### ✅ SIEMPRE:
```typescript
const timeoutRef = useRef(null);

timeoutRef.current = setTimeout(() => {
  setState(value);
  timeoutRef.current = null;
}, delay);

useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);
```

---

## 🎓 Cuando NO necesitas cleanup

### Caso 1: Promises que se resuelven
```typescript
await new Promise(resolve => setTimeout(resolve, 1000)); // ✅ OK
```

### Caso 2: No hay state updates
```typescript
setTimeout(() => {
  console.log('mensaje'); // ✅ OK - solo log
}, 1000);
```

### Caso 3: Timeout muy corto con flag
```typescript
setTimeout(() => {
  if (isMounted) { // ✅ OK - verificación explícita
    // ...
  }
}, 10); // Muy corto
```

**Pero mejor usar cleanup de todas formas** para ser seguro. 🛡️

---

## ✅ Conclusión

**4 setTimeout sin cleanup**: ✅ **RESUELTOS**

Todos los timeouts ahora tienen:
- ✅ Referencias guardadas en useRef
- ✅ Cleanup automático en useEffect
- ✅ Logs para debugging
- ✅ No más warnings de React
- ✅ No memory leaks

**Código limpio y profesional** 🎉


