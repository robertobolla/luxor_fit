# 🔧 Fix: Numeración Correcta en Vista del Día

## 🔴 Problema Reportado

Al guardar un ejercicio con diferentes tipos de series y verlo en la lista del día, las series normales **no se renumeraban correctamente**.

### Ejemplo del Problema:

**Configuración del ejercicio:**
- Serie 0: C (Calentamiento)
- Serie 1: Normal → Debería mostrar "1"
- Serie 2: Normal → Debería mostrar "2"  
- Serie 3: Normal → Debería mostrar "3"

**Lo que se mostraba (INCORRECTO):**
```
Flexiones
3 series
Serie C: 10 reps
Serie 2: 10 reps  ← INCORRECTO (debería ser "1")
Serie 3: 10 reps  ← INCORRECTO (debería ser "2")
Serie 4: 10 reps  ← INCORRECTO (debería ser "3")
```

**Lo que debería mostrar (CORRECTO):**
```
Flexiones
4 series
Serie C: 10 reps
Serie 1: 10 reps  ← CORRECTO
Serie 2: 10 reps  ← CORRECTO
Serie 3: 10 reps  ← CORRECTO
```

---

## 🔍 Causa Raíz

En la vista de lista de ejercicios, el código usaba `${idx + 1}` directamente:

```typescript
// CÓDIGO PROBLEMÁTICO (línea 642)
{(exercise.setTypes || []).map((setInfo, idx) => {
  const label = (() => {
    switch (setInfo.type) {
      case 'warmup': return 'C';
      case 'failure': return 'F';
      case 'drop': return 'D';
      case 'rir': return `${idx + 1} RIR`;
      default: return `${idx + 1}`;  // ← PROBLEMA: idx + 1 no cuenta correctamente
    }
  })();
  // ...
})}
```

**El problema:** `idx + 1` usa el índice del array directamente (0, 1, 2, 3...), no cuenta solo las series normales.

---

## ✅ Solución Implementada

Apliqué la **misma lógica de renumeración** que existe en el modal de edición:

```typescript
{(exercise.setTypes || []).map((setInfo, idx) => {
  const label = (() => {
    switch (setInfo.type) {
      case 'warmup': return 'C';
      case 'failure': return 'F';
      case 'drop': return 'D';
      case 'rir': return 'R';
      case 'normal':
      default:
        // ✅ SOLUCIÓN: Contar solo series normales anteriores
        let normalCount = 0;
        for (let i = 0; i <= idx; i++) {
          const type = (exercise.setTypes || [])[i]?.type || 'normal';
          if (type === 'normal') {
            normalCount++;
          }
        }
        return `${normalCount}`;
    }
  })();
  // ...
})}
```

---

## 🔢 Lógica de Renumeración

### Algoritmo:

```
Para cada serie en el índice idx:
  1. Si es warmup → devolver 'C'
  2. Si es failure → devolver 'F'
  3. Si es drop → devolver 'D'
  4. Si es rir → devolver 'R'
  5. Si es normal:
     a. Contar cuántas series normales hay desde 0 hasta idx
     b. Devolver ese contador (1, 2, 3...)
```

### Ejemplo de Conteo:

```
Índice | Tipo      | Contador Normal | Label
-------|-----------|----------------|-------
  0    | warmup    | -              | C
  1    | normal    | 1              | 1
  2    | failure   | -              | F
  3    | normal    | 2              | 2
  4    | drop      | -              | D
  5    | normal    | 3              | 3
```

---

## 📊 Casos de Prueba

### Caso 1: Solo Normales
```
Input:
[normal, normal, normal, normal]

Output:
Serie 1: 10 reps
Serie 2: 10 reps
Serie 3: 10 reps
Serie 4: 10 reps
```

### Caso 2: Con Calentamiento
```
Input:
[warmup, normal, normal, normal]

Output:
Serie C: 10 reps
Serie 1: 10 reps  ← Empieza en 1
Serie 2: 10 reps
Serie 3: 10 reps
```

### Caso 3: Mix Completo
```
Input:
[warmup, normal, failure, normal, drop, normal]

Output:
Serie C: 10 reps
Serie 1: 10 reps
Serie F: Al fallo
Serie 2: 10 reps  ← Continúa en 2 (no 3)
Serie D: 8 reps
Serie 3: 10 reps  ← Continúa en 3 (no 5)
```

### Caso 4: Múltiples Especiales
```
Input:
[warmup, warmup, normal, failure, drop, normal, normal]

Output:
Serie C: 10 reps   ← Primera C
Serie C: 10 reps   ← Segunda C (se repite la letra)
Serie 1: 10 reps
Serie F: Al fallo
Serie D: 8 reps
Serie 2: 10 reps
Serie 3: 10 reps
```

---

## 🔄 Consistencia Lograda

Ahora la renumeración es **exactamente igual** en:
1. ✅ **Modal de edición** (cuando configuras el ejercicio)
2. ✅ **Vista de lista** (cuando ves el ejercicio en el día)
3. ✅ **Durante la ejecución** (cuando entrenas)

**Resultado:** No importa dónde veas el ejercicio, los números siempre serán los mismos.

---

## 🔧 Cambios Adicionales

### Icono de Eliminar Cambiado

**ANTES:** `close-circle` (círculo con X)
```
[1] [10 reps]  ⭕
```

**AHORA:** `trash-outline` (basurero)
```
[1] [10 reps]  🗑️
```

**Consistencia:** Mismo icono que se usa para eliminar ejercicios.

**Tamaño:** Reducido de 24px a 20px (más apropiado)

---

## 📝 Cambios en Archivos

### `app/(tabs)/workout/custom-plan-day-detail.tsx`

**Cambio 1: Renumeración en Vista de Lista (línea ~636)**
```typescript
// ANTES
default: return `${idx + 1}`;

// AHORA
default:
  let normalCount = 0;
  for (let i = 0; i <= idx; i++) {
    const type = (exercise.setTypes || [])[i]?.type || 'normal';
    if (type === 'normal') {
      normalCount++;
    }
  }
  return `${normalCount}`;
```

**Cambio 2: Icono de Eliminar (línea ~752)**
```typescript
// ANTES
<Ionicons name="close-circle" size={24} color="#ff4444" />

// AHORA
<Ionicons name="trash-outline" size={20} color="#ff4444" />
```

**Cambio 3: RIR Label Simplificado**
```typescript
// ANTES
case 'rir': return `${idx + 1} RIR`;

// AHORA
case 'rir': return 'R';
```

---

## ✅ Resultado

Ahora cuando guardas un ejercicio y lo ves en el día:
- ✅ Las series normales se numeran **consecutivamente** (1, 2, 3...)
- ✅ Los números **coinciden** con el modal de edición
- ✅ No hay **espacios vacíos** en la numeración
- ✅ El icono de eliminar es **consistente** (basurero)

---

## 🧪 Cómo Verificar

1. **Configurar ejercicio:**
   - Serie C (Calentamiento)
   - Serie 1 (Normal)
   - Serie F (Al Fallo)
   - Serie 2 (Normal)

2. **Guardar y cerrar modal**

3. **Ver en la lista del día:**
   - Debería mostrar: "Serie C: 10 reps, Serie 1: 10 reps, Serie F: Al fallo, Serie 2: 10 reps"
   - ✅ Los números deben ser 1 y 2 (no 2 y 4)

4. **Editar nuevamente:**
   - Los números en el modal deben ser iguales a los de la lista

---

## 🎉 Problema Resuelto

- ✅ Numeración correcta en **todos lados**
- ✅ Consistencia 100%
- ✅ Icono de basurero unificado
- ✅ Sin errores de compilación

