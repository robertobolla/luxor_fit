# 📊 Sistema de Registro Completo de Series

## ✅ Cambios Implementados

### 1. Base de Datos
- **Nueva tabla `exercise_sets`**: Almacena TODAS las series de cada ejercicio
- **Función SQL `get_last_muscle_workout_sets()`**: Obtiene las series del último entrenamiento del mismo músculo para comparación
- **Políticas RLS**: Seguridad implementada para que los usuarios solo vean sus propias series

### 2. Componente Nuevo: `ExerciseSetTracker`
**Ubicación:** `src/components/ExerciseSetTracker.tsx`

**Características:**
- ✅ Columnas: #, ANTERIOR REPS, ANTERIOR KG, REPS, KG
- ✅ Muestra historial del último entrenamiento del mismo músculo
- ✅ Inputs para registrar peso y repeticiones de cada serie
- ✅ Botón "+ Agregar Serie" para añadir más series
- ✅ Botón de eliminar serie (icono de basurero)
- ✅ Series numeradas (1, 2, 3, 4...)
- ✅ Cantidad de series por defecto según el plan
- ❌ Sin temporizador de descanso (como solicitaste)
- ❌ Sin checkmark (el entrenamiento se marca completado en otro lugar)

### 3. Integración en `workout-day-detail.tsx`
- Reemplazado el botón de trofeo (🏆) con botón de registro (+)
- Al hacer clic, se expande el ejercicio y muestra el `ExerciseSetTracker`
- El tracker se integra inline (no en modal)
- Se mantiene el botón de video (▶️)

---

## 🚀 Instrucciones de Instalación

### Paso 1: Ejecutar Script SQL

1. Ve a **Supabase Dashboard**
2. Navega a **SQL Editor**
3. Abre el archivo `CREAR_TABLA_EXERCISE_SETS.sql`
4. Copia todo el contenido
5. Pégalo en el editor SQL
6. Haz clic en **RUN**

**Verificación:**
```sql
-- Debe mostrar la tabla y sus columnas
SELECT * FROM information_schema.columns 
WHERE table_name = 'exercise_sets';

-- Debe mostrar 4 políticas RLS
SELECT policyname FROM pg_policies 
WHERE tablename = 'exercise_sets';
```

### Paso 2: Verificar Archivos Modificados

Los siguientes archivos fueron modificados:

```
✅ CREAR_TABLA_EXERCISE_SETS.sql (nuevo)
✅ src/components/ExerciseSetTracker.tsx (nuevo)
✅ app/(tabs)/workout-day-detail.tsx (modificado)
```

### Paso 3: Probar la App

1. Abre la app en TestFlight
2. Ve a **Entrenar** → **Mis Planes**
3. Selecciona un plan activo
4. Haz clic en un día
5. En cada ejercicio verás un botón **+** (en lugar del trofeo)
6. Haz clic en **+** para expandir el registro de series

---

## 🎯 Cómo Funciona

### Vista Colapsada
```
┌────────────────────────────────────────┐
│ 1  Press de Banca         [+] [▶️]    │
│    📌 Puntos clave:                    │
│    • Tip 1                             │
│    • Tip 2                             │
└────────────────────────────────────────┘
```

### Vista Expandida
```
┌────────────────────────────────────────────────────────────┐
│ 1  Press de Banca                    [^] [▶️]             │
├────────────────────────────────────────────────────────────┤
│ Press de Banca                               3 series      │
├───┬──────────┬──────────┬──────┬─────┬────┐               │
│ # │ ANTERIOR │ ANTERIOR │ REPS │  KG │    │               │
│   │   REPS   │    KG    │      │     │    │               │
├───┼──────────┼──────────┼──────┼─────┼────┤               │
│ 1 │    10    │   60.0   │ [12] │[65] │ 🗑️ │               │
│ 2 │    10    │   60.0   │ [10] │[65] │ 🗑️ │               │
│ 3 │    10    │   60.0   │ [8]  │[65] │ 🗑️ │               │
└───┴──────────┴──────────┴──────┴─────┴────┘               │
│                                                             │
│        [+ Agregar Serie]                                   │
│                                                             │
│    📌 Puntos clave:                                        │
│    • Tip 1                                                 │
│    • Tip 2                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### Al Abrir un Ejercicio:
1. Usuario hace clic en botón **+**
2. Componente `ExerciseSetTracker` se carga
3. Ejecuta función SQL `get_last_muscle_workout_sets()`
4. Carga las series del último entrenamiento del mismo músculo
5. Muestra las series con datos previos en columnas "ANTERIOR"

### Al Registrar Series:
1. Usuario ingresa peso y reps en los inputs
2. Los datos se guardan en el estado local
3. Al completar el entrenamiento, se guardan en `exercise_sets` table

---

## 📊 Estructura de Datos

### Tabla `exercise_sets`
```typescript
{
  id: UUID
  user_id: string
  workout_session_id: UUID (opcional)
  exercise_id: UUID
  set_number: number  // 1, 2, 3, 4...
  reps: number | null
  weight_kg: number | null
  duration_seconds: number | null  // Para ejercicios de tiempo
  notes: string | null
  created_at: timestamp
}
```

### Ejemplo de Datos
```json
[
  {
    "user_id": "user_xxx",
    "exercise_id": "press-de-banca",
    "set_number": 1,
    "reps": 12,
    "weight_kg": 65.0
  },
  {
    "user_id": "user_xxx",
    "exercise_id": "press-de-banca",
    "set_number": 2,
    "reps": 10,
    "weight_kg": 65.0
  }
]
```

---

## 🔧 Próximos Pasos (TODO)

### 1. Guardar Series al Completar Entrenamiento
Actualmente las series se capturan pero NO se guardan en la base de datos.

**Ubicación para modificar:** `workout-day-detail.tsx` → función `handleComplete()`

```typescript
const handleComplete = async () => {
  // ... código existente ...
  
  // AGREGAR: Guardar todas las series
  for (const [exerciseName, sets] of Object.entries(exerciseSets)) {
    for (const set of sets) {
      if (set.reps && set.weight_kg) {
        await supabase.from('exercise_sets').insert({
          user_id: user.id,
          workout_session_id: sessionId, // Crear si no existe
          exercise_id: exerciseName, // TODO: Usar ID real
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
        });
      }
    }
  }
};
```

### 2. Obtener ID Real del Ejercicio
Actualmente usamos el nombre del ejercicio como ID. Debemos:
- Buscar el ejercicio en `exercise_videos` por nombre
- Usar su `id` real en lugar del nombre

### 3. Detectar Ejercicios que Usan Tiempo
Algunos ejercicios (plancha, cardio) usan tiempo en lugar de repeticiones.
- Agregar campo `usesTime` a la data del plan
- O consultar `exercise_videos.uses_time`

### 4. Crear/Vincular Workout Session
Actualmente no se crea un `workout_session_id`.
- Crear sesión al iniciar el día de entrenamiento
- Vincular todas las series a esa sesión

---

## 🎨 Personalización

### Cambiar Colores
**Archivo:** `src/components/ExerciseSetTracker.tsx`

```typescript
// Línea ~350+
const styles = StyleSheet.create({
  // Cambiar color principal
  headerCell: {
    color: '#ffb300', // <- Cambiar aquí
  },
  // Cambiar color de inputs
  input: {
    borderColor: '#333', // <- Cambiar aquí
  },
});
```

### Cambiar Cantidad de Series por Defecto
**Archivo:** `app/(tabs)/workout-day-detail.tsx`

```typescript
// Línea ~560
<ExerciseSetTracker
  defaultSets={sets || 3}  // <- Cambiar el 3
/>
```

---

## 🐛 Troubleshooting

### No se Cargan las Series Anteriores
1. Verificar que la función SQL existe:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'get_last_muscle_workout_sets';
```

2. Verificar permisos de la función:
```sql
-- Debe devolver 'SECURITY DEFINER'
SELECT security_type FROM information_schema.routines
WHERE routine_name = 'get_last_muscle_workout_sets';
```

### Error al Expandir Ejercicio
1. Verificar logs en consola
2. Verificar que `user.id` existe
3. Verificar que el componente está importado correctamente

### No se Ven los Datos Anteriores
1. Debe haber al menos UN entrenamiento completado anteriormente
2. El entrenamiento debe tener `completed_at` no nulo
3. El ejercicio debe tener el mismo nombre

---

## 📝 Notas Importantes

1. **Migración de Datos**: Los PRs antiguos (tabla `personal_records`) NO se migran automáticamente
2. **Compatibilidad**: El sistema antiguo de PRs sigue funcionando como backup
3. **Performance**: La función SQL está optimizada con índices
4. **Seguridad**: RLS implementado para proteger datos de usuarios

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs de consola
2. Verifica que el script SQL se ejecutó correctamente
3. Confirma que la app se recompiló después de los cambios

