# ✨ Funcionalidad: Guardar Planes Parciales

## 🎯 Objetivo

Permitir a los usuarios **guardar planes de entrenamiento parciales** para continuar editándolos después, sin la necesidad de completar todos los días antes de guardar.

---

## 📋 Solicitud del Usuario

> "quiero que se pueda ir modificando de forma parcial el plan, me refiero a que si puse un plan personalizado es de dos dias pero solo complete el primero, quiero que permita guardar, para seguir editando luego"

---

## 🔧 Cambios Implementados

### 1. **Validación Flexible al Guardar**

**Archivo:** `app/(tabs)/workout/custom-plan-days.tsx`

#### ANTES (Restrictivo):
```typescript
const handleSavePlan = () => {
  // ❌ No permitía guardar si había días vacíos
  const hasEmptyDays = days.some(day => day.exercises.length === 0);
  if (hasEmptyDays) {
    Alert.alert(
      'Plan incompleto',
      'Todos los días deben tener al menos un ejercicio...'
    );
    return;
  }
  // ...
};
```

#### AHORA (Flexible):
```typescript
const handleSavePlan = () => {
  // ✅ Solo requiere al menos un día con ejercicios
  const hasAnyExercises = days.some(day => day.exercises.length > 0);
  if (!hasAnyExercises) {
    Alert.alert(
      'Plan vacío',
      'Debes agregar al menos un ejercicio a algún día para guardar el plan.'
    );
    return;
  }

  // ✅ Detecta si es un plan parcial
  const hasEmptyDays = days.some(day => day.exercises.length === 0);
  const completedDays = days.filter(day => day.exercises.length > 0).length;
  
  if (hasEmptyDays) {
    // ✅ Opción de guardar como borrador
    Alert.alert(
      'Plan parcial',
      `Has completado ${completedDays} de ${daysPerWeek} días. ¿Quieres guardar el plan parcial? Podrás continuar editándolo después.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar como Borrador', onPress: () => savePlanToDatabase(false) }
      ]
    );
  } else {
    // ✅ Plan completo - preguntar si activar
    Alert.alert(
      '¿Activar este plan?',
      '¿Quieres que este sea tu plan de entrenamiento activo?',
      [
        { text: 'No', style: 'cancel', onPress: () => savePlanToDatabase(false) },
        { text: 'Sí', onPress: () => savePlanToDatabase(true) }
      ]
    );
  }
};
```

---

### 2. **Indicadores Visuales en Lista de Planes**

**Archivo:** `app/(tabs)/workout.tsx`

#### A. **Badge de "Borrador"**

Los planes parciales muestran un badge naranja:

```typescript
// Detectar planes parciales
const totalDays = planData.days_per_week;
const weeklyStructure = planData.weekly_structure || [];
const completedDays = weeklyStructure.filter((day: any) => 
  day.exercises && day.exercises.length > 0
).length;
const isPartialPlan = completedDays < totalDays && completedDays > 0;

// Mostrar badge si es borrador
{isPartialPlan && (
  <View style={styles.draftBadge}>
    <Ionicons name="create-outline" size={10} color="#1a1a1a" />
    <Text style={styles.draftBadgeText}>Borrador</Text>
  </View>
)}
```

**Vista:**
```
┌──────────────────────────────────────┐
│ 🏋️ Mi Rutina            [Borrador]   │
│                                      │
│ Plan personalizado creado por ti     │
│                                      │
│ ⚠️ 2 de 4 días completados           │
│                                      │
│ 📅 4 semanas  🏋️ 4 días/semana       │
│                                      │
│ [📝 Continuar Editando]              │
│ [👁️ Ver Plan]                        │
│                                      │
│ Creado: 4/12/2025                    │
└──────────────────────────────────────┘
```

#### B. **Información de Progreso**

Muestra cuántos días se han completado:

```typescript
{isPartialPlan && (
  <View style={styles.progressInfo}>
    <Ionicons name="information-circle-outline" size={14} color="#ff9800" />
    <Text style={styles.progressText}>
      {completedDays} de {totalDays} días completados
    </Text>
  </View>
)}
```

#### C. **Botón "Continuar Editando"**

Los planes parciales tienen un botón destacado para continuar editando:

```typescript
{isPartialPlan && (
  <TouchableOpacity
    style={styles.continueEditButton}
    onPress={() => router.push({
      pathname: '/(tabs)/workout/custom-plan-days',
      params: {
        planId: plan.id,
        daysPerWeek: totalDays,
        equipment: JSON.stringify([]),
      }
    })}
  >
    <Ionicons name="create-outline" size={16} color="#1a1a1a" />
    <Text style={styles.continueEditButtonText}>Continuar Editando</Text>
  </TouchableOpacity>
)}
```

---

## 🎨 Estilos Agregados

### Nuevos Estilos en `workout.tsx`

```typescript
badgesContainer: {
  flexDirection: 'row',
  gap: 6,
},
draftBadge: {
  backgroundColor: '#ff9800',      // 🟠 Naranja
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
draftBadgeText: {
  color: '#1a1a1a',
  fontSize: 11,
  fontWeight: '600',
},
progressInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: 'rgba(255, 152, 0, 0.1)',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(255, 152, 0, 0.3)',
},
progressText: {
  color: '#ff9800',
  fontSize: 12,
  fontWeight: '500',
},
continueEditButton: {
  backgroundColor: '#ff9800',      // 🟠 Naranja
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  borderRadius: 8,
},
continueEditButtonText: {
  color: '#1a1a1a',
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 6,
},
viewPlanButtonSecondary: {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '#ffb300',
},
viewPlanButtonTextSecondary: {
  color: '#ffb300',
},
```

---

## 📊 Flujo de Usuario

### Escenario 1: Crear Plan de 4 Días (Solo Completa 2)

```
1. Usuario crea plan personalizado de 4 días
   └─> Selecciona "4 días/semana"

2. Usuario configura Día 1 (Pecho/Tríceps)
   ├─> Agrega Press Banca
   ├─> Agrega Press Inclinado
   └─> Agrega Extensiones de Tríceps

3. Usuario configura Día 2 (Espalda/Bíceps)
   ├─> Agrega Dominadas
   ├─> Agrega Remo con Barra
   └─> Agrega Curl con Barra

4. Usuario hace clic en "Guardar Plan"
   └─> ⚠️ ALERTA: "Plan parcial - Has completado 2 de 4 días.
                   ¿Quieres guardar el plan parcial?
                   Podrás continuar editándolo después."
       ├─> [Cancelar] → Vuelve a edición
       └─> [Guardar como Borrador] → ✅ Guarda plan parcial

5. Plan guardado con indicadores:
   ┌─────────────────────────────────┐
   │ 🏋️ Mi Rutina     [Borrador]     │
   │                                 │
   │ ⚠️ 2 de 4 días completados      │
   │                                 │
   │ [📝 Continuar Editando]         │
   └─────────────────────────────────┘

6. Usuario hace clic en "Continuar Editando"
   └─> Vuelve a pantalla de edición con días 1 y 2 completos
       └─> Puede agregar Día 3 y Día 4

7. Completa Día 3 (Piernas)
   └─> Agrega Sentadillas
   └─> Agrega Peso Muerto

8. Completa Día 4 (Hombros/Abdominales)
   └─> Agrega Press Militar
   └─> Agrega Elevaciones Laterales

9. Guarda nuevamente
   └─> ✅ ALERTA: "¿Activar este plan?
                   ¿Quieres que este sea tu plan activo?"
       ├─> [No] → Guarda sin activar
       └─> [Sí] → ✅ Guarda y activa el plan

10. Plan completo - Badge "Borrador" desaparece
    ┌─────────────────────────────────┐
    │ 🏋️ Mi Rutina     [Activo]       │
    │                                 │
    │ 📅 4 semanas  🏋️ 4 días/semana  │
    │                                 │
    │ [👁️ Ver Plan Completo]          │
    └─────────────────────────────────┘
```

---

### Escenario 2: Crear Plan de 3 Días (Completa 1)

```
1. Usuario crea plan de 3 días
   └─> Día 1: Torso Superior (4 ejercicios)
   └─> Día 2: (vacío)
   └─> Día 3: (vacío)

2. Guarda el plan
   └─> ⚠️ "Has completado 1 de 3 días"
   └─> Guardado como borrador

3. Vista en lista:
   ┌─────────────────────────────────┐
   │ 🏋️ Rutina Torso  [Borrador]     │
   │                                 │
   │ ⚠️ 1 de 3 días completados      │
   │                                 │
   │ [📝 Continuar Editando]         │
   └─────────────────────────────────┘

4. Días después, continúa editando
   └─> Completa Día 2 y Día 3
   └─> Guarda plan completo
   └─> Badge "Borrador" removido ✅
```

---

## 🔍 Validaciones

### ✅ Casos Permitidos:

1. **Plan con 1 día completo (de 4)**: ✅ Se puede guardar
2. **Plan con 2 días completos (de 3)**: ✅ Se puede guardar
3. **Plan con 3 días completos (de 5)**: ✅ Se puede guardar

### ❌ Casos NO Permitidos:

1. **Plan sin ningún día con ejercicios**: ❌ No se puede guardar
   ```
   ⚠️ "Plan vacío - Debes agregar al menos un ejercicio a algún día"
   ```

2. **Plan con días que tienen nombre pero sin ejercicios**: ❌ Tratado como día vacío

---

## 🎯 Beneficios

1. **Mayor Flexibilidad**: Los usuarios no necesitan completar todo de una vez
2. **Mejor UX**: Permite sesiones de edición más cortas y distribuidas
3. **Menos Frustración**: No se pierde progreso si el usuario sale de la app
4. **Indicadores Claros**: El usuario siempre sabe qué planes están completos y cuáles no
5. **Fácil Continuación**: Botón dedicado para volver a editar

---

## 🧪 Casos de Prueba

### Prueba 1: Guardar Plan de 2 Días (Solo 1 Completado)

**Setup:**
1. Crear plan personalizado de 2 días
2. Agregar 3 ejercicios al Día 1
3. Dejar Día 2 vacío

**Acción:** Hacer clic en "Guardar Plan"

**Resultado Esperado:**
- ✅ Alerta: "Has completado 1 de 2 días. ¿Guardar como borrador?"
- ✅ Plan guardado en base de datos
- ✅ Badge "Borrador" visible en lista
- ✅ Mensaje "1 de 2 días completados"
- ✅ Botón "Continuar Editando" presente

---

### Prueba 2: Continuar Editando Plan Parcial

**Setup:**
1. Tener un plan parcial guardado (2 de 4 días)

**Acción:** Hacer clic en "Continuar Editando"

**Resultado Esperado:**
- ✅ Navega a pantalla de edición
- ✅ Días 1 y 2 muestran ejercicios guardados
- ✅ Días 3 y 4 están vacíos y editables
- ✅ Puede agregar ejercicios a Días 3 y 4

---

### Prueba 3: Completar Plan Parcial

**Setup:**
1. Tener un plan parcial (2 de 3 días)
2. Hacer clic en "Continuar Editando"
3. Agregar ejercicios al Día 3

**Acción:** Guardar plan nuevamente

**Resultado Esperado:**
- ✅ Alerta: "¿Activar este plan?" (ya no dice "plan parcial")
- ✅ Opciones: "No" / "Sí"
- ✅ Después de guardar, badge "Borrador" desaparece
- ✅ Botón "Continuar Editando" desaparece
- ✅ Solo queda botón "Ver Plan Completo"

---

### Prueba 4: Intentar Guardar Plan Vacío

**Setup:**
1. Crear plan de 3 días
2. No agregar ningún ejercicio a ningún día

**Acción:** Hacer clic en "Guardar Plan"

**Resultado Esperado:**
- ✅ Alerta de error: "Plan vacío - Debes agregar al menos un ejercicio a algún día"
- ✅ Plan NO se guarda
- ✅ Usuario permanece en pantalla de edición

---

### Prueba 5: Plan Completo Desde el Inicio

**Setup:**
1. Crear plan de 2 días
2. Agregar ejercicios a ambos días

**Acción:** Hacer clic en "Guardar Plan"

**Resultado Esperado:**
- ✅ Alerta: "¿Activar este plan?" (NO menciona "plan parcial")
- ✅ Opciones: "No" / "Sí"
- ✅ Después de guardar, NO hay badge "Borrador"
- ✅ NO hay mensaje de "X de Y días completados"
- ✅ NO hay botón "Continuar Editando"

---

## 📝 Archivos Modificados

1. **`app/(tabs)/workout/custom-plan-days.tsx`**
   - Función `handleSavePlan`: Validación flexible
   - Permite guardar con días vacíos (mínimo 1 día con ejercicios)

2. **`app/(tabs)/workout.tsx`**
   - Detección de planes parciales
   - Badge "Borrador"
   - Mensaje de progreso ("X de Y días completados")
   - Botón "Continuar Editando"
   - Estilos para todos los nuevos elementos

---

## ✅ Resultado Final

**Los usuarios ahora pueden:**

1. ✅ Guardar planes con días vacíos (mínimo 1 día con ejercicios)
2. ✅ Ver claramente qué planes están incompletos
3. ✅ Continuar editando planes parciales fácilmente
4. ✅ Completar planes en múltiples sesiones
5. ✅ Tener varios planes en borrador simultáneamente

**Flujo perfecto para usuarios que:**
- Quieren diseñar su rutina gradualmente
- Necesitan investigar ejercicios antes de agregar más días
- Prefieren trabajar en sesiones cortas
- Quieren probar un día antes de completar el plan completo

---

## 🎉 Problema Resuelto

> ✅ "si puse un plan personalizado es de dos dias pero solo complete el primero, quiero que permita guardar, para seguir editando luego"

**RESUELTO:** Los planes parciales ahora se pueden guardar y continuar editando después, con indicadores visuales claros de su estado.

