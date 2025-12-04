# ✨ Feature: Planes Personalizados con Múltiples Semanas

## 🎯 Objetivo

Permitir a los usuarios crear planes de entrenamiento personalizados con **múltiples semanas**, donde cada semana puede tener ejercicios diferentes. Esto es ideal para:
- Programación periodizada (ej: Semana 1 fuerza, Semana 2 hipertrofia)
- Progresión gradual de intensidad
- Variación de ejercicios entre semanas
- Planes de 4, 8, 12+ semanas

---

## 📋 Solicitud del Usuario

> "cuando creas el plan personalizado me gustaria que te permita elegir la cantidad de semanas del plan, agregando un boton que diga, agregar semana y que permita navegar entre las distintas semanas del plan"

---

## 🏗️ Estructura de Datos

### ANTES (Una sola semana):

```typescript
{
  weekly_structure: [
    { day: "Día 1", exercises: [...] },
    { day: "Día 2", exercises: [...] }
  ],
  days_per_week: 4,
  duration_weeks: 1
}
```

**Problema:** Solo se podía definir una semana que se repetía.

---

### AHORA (Múltiples semanas):

```typescript
{
  // Nueva estructura multi-semana
  multi_week_structure: [
    {
      week_number: 1,
      days: [
        { day: "Día 1", exercises: [...] },
        { day: "Día 2", exercises: [...] }
      ]
    },
    {
      week_number: 2,
      days: [
        { day: "Día 1", exercises: [...] },  // Pueden ser diferentes a Semana 1
        { day: "Día 2", exercises: [...] }
      ]
    }
  ],
  // Mantener weekly_structure para compatibilidad (primera semana)
  weekly_structure: [...],
  days_per_week: 4,
  duration_weeks: 2,
  total_weeks: 2
}
```

**Beneficio:** Cada semana puede ser completamente diferente.

---

## 🔧 Cambios Implementados

### 1. **Nueva Estructura de Datos**

**Archivo:** `app/(tabs)/workout/custom-plan-days.tsx`

```typescript
interface DayData {
  dayNumber: number;
  name?: string;
  exercises: any[];
}

// ✨ NUEVO
interface WeekData {
  weekNumber: number;
  days: DayData[];
}
```

**Estado actualizado:**

```typescript
// ANTES:
const [days, setDays] = useState<DayData[]>([]);

// AHORA:
const [weeks, setWeeks] = useState<WeekData[]>([]);
const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
const currentWeekDays = weeks[currentWeekIndex]?.days || [];
```

---

### 2. **Navegación Entre Semanas**

**Tabs horizontales** para navegar entre semanas:

```typescript
{weeks.length > 1 && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {weeks.map((week, index) => (
      <TouchableOpacity
        style={[
          styles.weekTab,
          currentWeekIndex === index && styles.weekTabActive
        ]}
        onPress={() => setCurrentWeekIndex(index)}
      >
        <Text>Semana {week.weekNumber}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}
```

**UI:**

```
┌──────────────────────────────────────┐
│ [Semana 1]  [Semana 2]  [Semana 3]   │  ← Tabs (scroll horizontal)
│     ▼                                │
│ Semana 1                             │
│ Selecciona cada día para agregar...  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Día 1: Pecho/Tríceps           │  │
│ │ 5 ejercicios                   │  │
│ └────────────────────────────────┘  │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Día 2: Espalda/Bíceps          │  │
│ │ 4 ejercicios                   │  │
│ └────────────────────────────────┘  │
│                                      │
│ [➕ Agregar Semana]                 │  ← Botón con borde punteado
│                                      │
│ [✓ Guardar Plan]                    │
└──────────────────────────────────────┘
```

---

### 3. **Botón "Agregar Semana"**

```typescript
const handleAddWeek = async () => {
  const newWeekNumber = weeks.length + 1;
  const newWeekDays: DayData[] = [];
  
  for (let i = 1; i <= daysPerWeek; i++) {
    newWeekDays.push({
      dayNumber: i,
      exercises: [],
    });
  }
  
  const newWeek: WeekData = {
    weekNumber: newWeekNumber,
    days: newWeekDays,
  };
  
  const updatedWeeks = [...weeks, newWeek];
  setWeeks(updatedWeeks);
  setCurrentWeekIndex(updatedWeeks.length - 1); // Navegar a la nueva semana
  
  await AsyncStorage.setItem('custom_plan_weeks_count', updatedWeeks.length.toString());
};
```

**Comportamiento:**
1. ✅ Crea una nueva semana vacía con los mismos días que las anteriores
2. ✅ Automáticamente cambia a la nueva semana
3. ✅ Guarda el conteo en AsyncStorage

---

### 4. **AsyncStorage Actualizado**

**ANTES (una semana):**
```
day_1_data
day_2_data
day_3_data
```

**AHORA (múltiples semanas):**
```
week_1_day_1_data
week_1_day_2_data
week_1_day_3_data
week_2_day_1_data
week_2_day_2_data
week_2_day_3_data
custom_plan_weeks_count = "2"
```

**Cambios en `custom-plan-day-detail.tsx`:**

```typescript
// ANTES:
await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(data));

// AHORA:
await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(data));
```

---

### 5. **Lógica de Guardado**

**Validación actualizada:**

```typescript
// Contar días completados en todas las semanas
const totalDays = weeks.length * daysPerWeek;
const completedDays = weeks.reduce((count, week) => 
  count + week.days.filter(day => day.exercises.length > 0).length, 0
);

Alert.alert(
  'Plan parcial',
  `Has completado ${completedDays} de ${totalDays} días en ${weeks.length} semanas.`
);
```

**Estructura de guardado:**

```typescript
const planData = {
  // Nueva estructura multi-semana
  multi_week_structure: allWeeksData.map(week => ({
    week_number: week.weekNumber,
    days: week.days.map(day => ({
      day: day.name || `Día ${day.dayNumber}`,
      focus: day.name || `Día ${day.dayNumber}`,
      exercises: day.exercises.map((ex: any) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: 60,
        setTypes: ex.setTypes || [], // Incluir tipos de series
      })),
      duration: 45,
    })),
  })),
  // Mantener weekly_structure para compatibilidad (primera semana)
  weekly_structure: allWeeksData[0]?.days.map(...) || [],
  days_per_week: daysPerWeek,
  equipment: equipment,
  duration_weeks: totalWeeks,
  total_weeks: totalWeeks,
};
```

---

## 🎨 Estilos Agregados

```typescript
weeksNav: {
  marginBottom: 16,
  maxHeight: 50,
},
weeksNavContent: {
  gap: 8,
  paddingHorizontal: 4,
},
weekTab: {
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: '#2a2a2a',
  borderWidth: 1,
  borderColor: '#333',
},
weekTabActive: {
  backgroundColor: '#ffb300',  // 🟡 Amarillo
  borderColor: '#ffb300',
},
weekTabText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#999',
},
weekTabTextActive: {
  color: '#1a1a1a',
},
weekInfo: {
  marginBottom: 16,
},
weekTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#ffffff',
  marginBottom: 8,
},
addWeekButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: '#ffb300',
  borderStyle: 'dashed',  // 📦 Borde punteado
  paddingVertical: 16,
  borderRadius: 16,
  marginTop: 8,
  gap: 8,
},
addWeekButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#ffb300',
},
```

---

## 🔄 Flujo de Usuario

### Caso 1: Crear Plan de 3 Semanas

```
1. Usuario inicia plan personalizado de 4 días/semana
   └─> Se crea automáticamente Semana 1 vacía

2. Usuario configura Semana 1:
   ├─> Día 1: Press Banca, Aperturas
   ├─> Día 2: Dominadas, Remo
   ├─> Día 3: Sentadillas, Prensa
   └─> Día 4: Press Militar, Elevaciones

3. Usuario hace clic en "Agregar Semana"
   └─> Se crea Semana 2 vacía
   └─> Automáticamente cambia a Semana 2

4. Usuario configura Semana 2 (diferente):
   ├─> Día 1: Press Inclinado, Fondos
   ├─> Día 2: Dominadas Agarre Ancho, Remo T
   ├─> Día 3: Sentadillas Frontal, Peso Muerto
   └─> Día 4: Arnold Press, Pájaros

5. Usuario hace clic en "Agregar Semana"
   └─> Se crea Semana 3 vacía

6. Usuario configura Semana 3:
   └─> Carga más pesada, menos reps

7. Usuario hace clic en "Guardar Plan"
   └─> ✅ Plan de 3 semanas guardado
   └─> Descripción: "Plan personalizado de 3 semanas, 4 días por semana"
```

---

### Caso 2: Navegar Entre Semanas

```
┌──────────────────────────────────────┐
│ Tabs: [Semana 1] [Semana 2] [Semana 3] │
│         ▲                            │
│    Usuario hace clic en Semana 2    │
└──────────────────────────────────────┘
                ↓
┌──────────────────────────────────────┐
│ Tabs: [Semana 1] [Semana 2] [Semana 3] │
│                    ▲                 │
│                                      │
│ Semana 2                             │
│ Selecciona cada día...               │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Día 1: Press Inclinado         │  │
│ │ 3 ejercicios                   │  │
│ └────────────────────────────────┘  │
│                                      │
│ ✅ Se muestran los días de Semana 2 │
└──────────────────────────────────────┘
```

---

### Caso 3: Guardar Plan Parcial con Múltiples Semanas

```
Configuración:
- 2 semanas, 4 días por semana = 8 días totales
- Completados: 5 días (Semana 1 completa + 1 día de Semana 2)

Usuario hace clic en "Guardar Plan"
                ↓
┌────────────────────────────────────────┐
│ ⚠️ Plan parcial                         │
│                                        │
│ Has completado 5 de 8 días en 2       │
│ semanas. ¿Quieres guardar el plan     │
│ parcial? Podrás continuar editándolo  │
│ después.                               │
│                                        │
│ [Cancelar]  [Guardar como Borrador]   │
└────────────────────────────────────────┘
                ↓
            [Guardar]
                ↓
✅ Plan guardado con badge "Borrador"
✅ Indicador: "5 de 8 días completados"
✅ Botón "Continuar Editando"
```

---

## 📊 Comparación: Antes vs Ahora

### ANTES (❌ Limitado)

| Característica | Disponible |
|----------------|-----------|
| Múltiples semanas | ❌ No |
| Variación entre semanas | ❌ No (misma semana repetida) |
| Progresión | ❌ No |
| Periodización | ❌ No |

**Limitación:** Solo se podía crear **una** semana que se repetía indefinidamente.

---

### AHORA (✅ Completo)

| Característica | Disponible |
|----------------|-----------|
| Múltiples semanas | ✅ Sí (ilimitadas) |
| Variación entre semanas | ✅ Cada semana diferente |
| Progresión | ✅ Aumentar peso/volumen por semana |
| Periodización | ✅ Fuerza, hipertrofia, resistencia |
| Navegación | ✅ Tabs horizontales |
| Botón agregar | ✅ "+ Agregar Semana" |
| AsyncStorage | ✅ week_N_day_M_data |
| Compatibilidad | ✅ weekly_structure mantenida |

---

## 🧪 Casos de Prueba

### Prueba 1: Crear Plan de 1 Semana

**Pasos:**
1. Crear plan personalizado de 3 días/semana
2. Configurar los 3 días de la Semana 1
3. Guardar plan sin agregar más semanas

**Resultado Esperado:**
- ✅ Plan guardado como "1 semana, 3 días por semana"
- ✅ No se muestran tabs (solo hay 1 semana)
- ✅ Funciona exactamente como antes

---

### Prueba 2: Agregar 3 Semanas

**Pasos:**
1. Crear plan de 4 días/semana
2. Configurar Semana 1
3. Hacer clic en "Agregar Semana" → Semana 2 creada
4. Configurar Semana 2
5. Hacer clic en "Agregar Semana" → Semana 3 creada
6. Configurar Semana 3
7. Guardar plan

**Resultado Esperado:**
- ✅ Plan con 3 semanas, 4 días cada una = 12 días totales
- ✅ Tabs muestran "Semana 1", "Semana 2", "Semana 3"
- ✅ Cada semana puede tener ejercicios diferentes
- ✅ Descripción: "3 semanas, 4 días por semana"

---

### Prueba 3: Navegar Entre Semanas

**Pasos:**
1. Crear plan con 2 semanas
2. Configurar Semana 1
3. Hacer clic en tab "Semana 2"
4. Configurar Semana 2
5. Hacer clic en tab "Semana 1"

**Resultado Esperado:**
- ✅ Al cambiar de tab, se muestran los días de la semana seleccionada
- ✅ Tab activo tiene fondo amarillo (#ffb300)
- ✅ Los cambios en cada semana se guardan correctamente

---

### Prueba 4: Guardar Plan Parcial Multi-Semana

**Setup:**
- 2 semanas, 3 días por semana = 6 días totales
- Solo completar 4 días (Semana 1 completa + 1 día de Semana 2)

**Acción:** Guardar plan

**Resultado Esperado:**
- ✅ Alerta: "Has completado 4 de 6 días en 2 semanas"
- ✅ Opción "Guardar como Borrador"
- ✅ Plan guardado con badge "Borrador"
- ✅ Indicador "4 de 6 días completados"

---

### Prueba 5: Editar Plan Guardado con Múltiples Semanas

**Setup:**
- Plan guardado con 2 semanas

**Pasos:**
1. Ir a "Mis planes de entrenamiento"
2. Hacer clic en "Continuar Editando"

**Resultado Esperado:**
- ✅ Se cargan las 2 semanas con todos sus datos
- ✅ Tabs muestran ambas semanas
- ✅ Puede agregar una Semana 3
- ✅ Puede editar cualquier día de cualquier semana

---

## 🔀 Compatibilidad con Planes Existentes

### Planes Antiguos (Una Semana)

```typescript
{
  weekly_structure: [...],
  days_per_week: 4,
  duration_weeks: 4
}
```

**Comportamiento:** Se carga como **una sola semana** que se repite 4 veces.

---

### Planes Nuevos (Múltiples Semanas)

```typescript
{
  multi_week_structure: [
    { week_number: 1, days: [...] },
    { week_number: 2, days: [...] }
  ],
  weekly_structure: [...],  // Primera semana (compatibilidad)
  days_per_week: 4,
  total_weeks: 2
}
```

**Comportamiento:** Se cargan **todas las semanas** individualmente.

---

## 📝 Archivos Modificados

### 1. **`app/(tabs)/workout/custom-plan-days.tsx`**

**Cambios principales:**
- ✅ Nuevo interface `WeekData`
- ✅ Estado `weeks` en lugar de `days`
- ✅ Estado `currentWeekIndex` para navegación
- ✅ Función `handleAddWeek()` para agregar semanas
- ✅ AsyncStorage actualizado: `week_N_day_M_data`
- ✅ Lógica de guardado con `multi_week_structure`
- ✅ UI con tabs de navegación
- ✅ Botón "Agregar Semana"
- ✅ Validación para planes parciales multi-semana

---

### 2. **`app/(tabs)/workout/custom-plan-day-detail.tsx`**

**Cambios principales:**
- ✅ Recibe `weekNumber` en params
- ✅ AsyncStorage: `week_${weekNumber}_day_${dayNumber}_data`
- ✅ Guarda datos con semana incluida

---

## ✅ Resultado Final

### Funcionalidades Implementadas:

1. ✅ **Estructura de datos para múltiples semanas**
   - `WeekData` interface
   - `multi_week_structure` en plan_data

2. ✅ **Navegación entre semanas**
   - Tabs horizontales con scroll
   - Tab activo destacado en amarillo

3. ✅ **Botón "Agregar Semana"**
   - Estilo con borde punteado
   - Automáticamente navega a la nueva semana

4. ✅ **AsyncStorage actualizado**
   - `week_N_day_M_data`
   - `custom_plan_weeks_count`

5. ✅ **Lógica de guardado**
   - `multi_week_structure` en base de datos
   - Compatibilidad con `weekly_structure`
   - Descripción incluye número de semanas

6. ✅ **Validaciones**
   - Conteo de días completados en todas las semanas
   - Alertas con información multi-semana

7. ✅ **UI/UX**
   - Tabs para navegar
   - Indicador de semana actual
   - Botón agregar con estilo claro

---

## 🎯 Beneficios

### Para Usuarios:

1. ✅ **Periodización completa**: Pueden programar mesociclos de 4-12 semanas
2. ✅ **Variación**: Cada semana puede ser diferente (fuerza, hipertrofia, resistencia)
3. ✅ **Progresión**: Aumentar peso/volumen gradualmente semana a semana
4. ✅ **Planes profesionales**: Similar a lo que hacen entrenadores personales
5. ✅ **Flexibilidad**: Pueden guardar parcialmente y continuar después

### Para la App:

1. ✅ **Diferenciación**: Pocas apps de fitness permiten esto
2. ✅ **Valor agregado**: Funcionalidad avanzada
3. ✅ **Escalabilidad**: Base sólida para futuros features
4. ✅ **Compatibilidad**: Los planes viejos siguen funcionando

---

## 🚀 Ejemplos de Uso Real

### Ejemplo 1: Plan de Fuerza Periodizado (4 Semanas)

```
Semana 1 (Adaptación):
- Día 1: Sentadillas 4x8@70%
- Día 2: Press Banca 4x8@70%
- Día 3: Peso Muerto 4x8@70%

Semana 2 (Acumulación):
- Día 1: Sentadillas 4x6@75%
- Día 2: Press Banca 4x6@75%
- Día 3: Peso Muerto 4x6@75%

Semana 3 (Intensificación):
- Día 1: Sentadillas 5x5@80%
- Día 2: Press Banca 5x5@80%
- Día 3: Peso Muerto 5x5@80%

Semana 4 (Descarga):
- Día 1: Sentadillas 3x8@60%
- Día 2: Press Banca 3x8@60%
- Día 3: Peso Muerto 3x8@60%
```

---

### Ejemplo 2: Plan de Hipertrofia con Variación (3 Semanas)

```
Semana 1 (Volumen Alto):
- Día 1 Pecho: 6 ejercicios, 4 series cada uno
- Día 2 Espalda: 6 ejercicios, 4 series cada uno

Semana 2 (Volumen Medio, Intensidad Alta):
- Día 1 Pecho: 4 ejercicios, 5 series cada uno (más peso)
- Día 2 Espalda: 4 ejercicios, 5 series cada uno

Semana 3 (Deload + Técnica):
- Día 1 Pecho: 3 ejercicios, 3 series (tempo lento)
- Día 2 Espalda: 3 ejercicios, 3 series (tempo lento)
```

---

## 🎉 Problema Resuelto

> ✅ "cuando creas el plan personalizado me gustaria que te permita elegir la cantidad de semanas del plan, agregando un boton que diga, agregar semana y que permita navegar entre las distintas semanas del plan"

**COMPLETAMENTE IMPLEMENTADO:**
- ✅ Botón "Agregar Semana" funcional
- ✅ Navegación con tabs entre semanas
- ✅ Cada semana independiente y personalizable
- ✅ Sin límite de semanas (1, 2, 4, 8, 12+)
- ✅ UI intuitiva y clara

