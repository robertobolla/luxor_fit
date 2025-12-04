# Sistema Avanzado de Tipos de Series

## Descripción General

Sistema completo para gestionar diferentes tipos de series en rutinas personalizadas, permitiendo configurar ejercicios con técnicas avanzadas de entrenamiento.

---

## Tipos de Series Disponibles

### 🔥 C - Serie de Calentamiento
- **Color:** Amarillo (#ffb300)
- **Uso:** Peso ligero para activar músculos antes de series principales
- **Reps:** Editables
- **Ejemplo:** C: 15 reps

### ✅ 1, 2, 3... - Serie Normal
- **Color:** Verde (#4CAF50)
- **Uso:** Serie estándar con repeticiones fijas
- **Reps:** Editables
- **Ejemplo:** 1: 10 reps, 2: 8 reps

### 💪 F - Serie al Fallo (Failure)
- **Color:** Rojo (#ff4444)
- **Uso:** Realizar repeticiones hasta no poder más
- **Reps:** NO editables (se muestra "Al fallo")
- **Ejemplo:** F: al fallo

### 🔻 D - Serie Drop
- **Color:** Morado (#9C27B0)
- **Uso:** Reducir peso y continuar sin descanso
- **Reps:** Editables
- **Ejemplo:** D: 12 reps

### 🎯 R - RIR (Reps In Reserve)
- **Color:** Azul (#2196F3)
- **Uso:** Número indica cuántas reps faltan para llegar al fallo
- **Reps:** Editables (valor = RIR)
- **Ejemplo:** 1: 2 RIR (quedan 2 reps para el fallo)

---

## Cómo Usar

### En la Creación de Rutinas

1. **Agregar Ejercicio:**
   - Tap en "Agregar Ejercicio"
   - Selecciona el ejercicio de la lista

2. **Configurar Series:**
   - Ingresa el número total de series
   - Por defecto, todas son series normales (1, 2, 3...)

3. **Cambiar Tipo de Serie:**
   - Tap en el botón con el número/letra de la serie
   - Se abre un modal con las opciones de tipo
   - Selecciona el tipo deseado

4. **Configurar Repeticiones:**
   - Para series normales, drop, warmup, RIR: Ingresa el número
   - Para series al fallo: El input se deshabilita automáticamente

5. **Eliminar Serie:**
   - Tap en el número/letra de la serie
   - Selecciona "Eliminar Serie" en el modal

### Ejemplo de Configuración

**Press de Banca:**
```
C: 15 reps      (Calentamiento)
1: 10 reps      (Serie normal)
2: 8 reps       (Serie normal)
F: al fallo     (Serie al fallo)
D: 12 reps      (Serie drop)
```

**Sentadilla:**
```
C: 20 reps      (Calentamiento)
1: 3 RIR        (Quedan 3 reps para el fallo)
2: 2 RIR        (Quedan 2 reps para el fallo)
3: 1 RIR        (Queda 1 rep para el fallo)
F: al fallo     (Serie al fallo)
```

---

## Visualización

### En la Lista de Ejercicios
```
Press de Banca
5 series
C: 15 reps
1: 10 reps
2: 8 reps
F: al fallo
D: 12 reps
```

### En el Modal de Configuración
- Botones de colores con la letra/número
- Click abre modal de selección
- Input deshabilitado para series al fallo

---

## Almacenamiento de Datos

### Estructura en la BD

```typescript
interface SetInfo {
  type: 'warmup' | 'normal' | 'failure' | 'drop' | 'rir';
  reps: number | null; // null para series al fallo
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number[];        // Mantener para compatibilidad
  setTypes?: SetInfo[];  // Nuevo campo
}
```

### AsyncStorage
Los datos se guardan en `day_${dayNumber}_data` con la estructura completa de ejercicios incluyendo `setTypes`.

---

## Compatibilidad

- ✅ **Ejercicios Existentes:** Se migran automáticamente a series normales
- ✅ **Campo `reps`:** Se mantiene para compatibilidad con versiones antiguas
- ✅ **Valores por Defecto:** Si no hay `setTypes`, se crean como series normales

---

## Validaciones

1. **Al Guardar:**
   - Mínimo 1 serie
   - Todas las series (excepto al fallo) deben tener reps > 0
   - Series al fallo: reps = null

2. **Al Cambiar a "Al Fallo":**
   - Se limpia el input de reps
   - El input se deshabilita

3. **Al Eliminar Serie:**
   - Se reordenan las series restantes
   - Se actualiza el conteo total

---

## Archivos Modificados

- **`app/(tabs)/workout/custom-plan-day-detail.tsx`**
  - Interfaces actualizadas
  - Lógica de tipos de series
  - Modal de selección
  - Estilos completos

---

## Pendientes

- [ ] Implementar guardado en BD (tabla `exercise_sets`)
- [ ] Integrar con pantalla de registro de entrenamientos
- [ ] Agregar temporizador de descanso diferenciado por tipo
- [ ] Estadísticas por tipo de serie

---

## Notas Técnicas

### Colores por Tipo
```typescript
const colorMap = {
  warmup: '#ffb300',    // Amarillo
  normal: '#4CAF50',    // Verde
  failure: '#ff4444',   // Rojo
  drop: '#9C27B0',      // Morado
  rir: '#2196F3',       // Azul
};
```

### Etiquetas
```typescript
const labelMap = {
  warmup: 'C',          // Calentamiento
  normal: '1,2,3...',   // Número de serie
  failure: 'F',
  drop: 'D',
  rir: '1,2,3...',      // Número de serie + RIR
};
```

