# ✅ Validación: Prevenir Planes Sin Nombre

## 🎯 Implementado

Sistema de validación para asegurar que todos los planes de entrenamiento tengan un nombre válido antes de guardarse.

---

## 🔒 Validaciones Implementadas

### 1. **Validación al Guardar** (Crítica)

**Archivo**: `app/(tabs)/workout/custom-plan-days.tsx`

**Función**: `savePlanToDatabase()`

```typescript
// Validar que el plan tenga un nombre
if (!planName || planName.trim().length === 0) {
  showAlert(
    'Nombre requerido',
    'Por favor, ingresa un nombre para tu plan de entrenamiento.',
    [{ text: 'OK' }],
    { icon: 'create-outline', iconColor: '#ffb300' }
  );
  return;
}
```

**Comportamiento**:
- ✅ Verifica que `planName` no sea `null`, `undefined` o vacío
- ✅ Trim para ignorar espacios en blanco
- ✅ Muestra alerta personalizada con ícono
- ✅ **BLOQUEA** el guardado hasta que se ingrese un nombre

---

### 2. **Validación en el Input** (UX)

**Archivo**: `app/(tabs)/workout/custom-plan-days.tsx`

**Componente**: `TextInput` del nombre del plan

#### A. Placeholder Actualizado
```typescript
placeholder="Nombre del plan (requerido)"
```

#### B. Validación en `onBlur`
```typescript
onBlur={async () => {
  // Si el nombre está vacío, mostrar alerta
  if (planName.trim().length === 0) {
    showAlert(
      'Nombre requerido',
      'El plan debe tener un nombre. Se usará un nombre por defecto.',
      [{ text: 'OK' }],
      { icon: 'alert-circle', iconColor: '#ffb300' }
    );
    setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
  }
  setIsEditingPlanName(false);
  // ... guardar en AsyncStorage
}}
```

#### C. Validación en `onSubmitEditing`
```typescript
onSubmitEditing={async () => {
  // Si el nombre está vacío, mostrar alerta
  if (planName.trim().length === 0) {
    showAlert(
      'Nombre requerido',
      'El plan debe tener un nombre. Se usará un nombre por defecto.',
      [{ text: 'OK' }],
      { icon: 'alert-circle', iconColor: '#ffb300' }
    );
    setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
  }
  setIsEditingPlanName(false);
  // ... guardar en AsyncStorage
}}
```

**Comportamiento**:
- ✅ Cuando el usuario termina de editar (blur o submit)
- ✅ Si el nombre está vacío, muestra alerta
- ✅ **Auto-asigna** un nombre por defecto: `Plan Personalizado - [fecha]`
- ✅ Garantiza que nunca haya planes sin nombre

---

### 3. **Feedback Visual** (UX Mejorado)

**Archivo**: `app/(tabs)/workout/custom-plan-days.tsx`

#### A. Borde Rojo cuando está Vacío
```typescript
<View style={[
  styles.planNameEditContainer,
  planName.trim().length === 0 && styles.planNameEditContainerEmpty
]}>
```

#### B. Estilos
```typescript
planNameEditContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#2a2a2a',
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ffb300',  // Dorado normal
  gap: 12,
},
planNameEditContainerEmpty: {
  borderColor: '#F44336',  // ❌ Rojo cuando vacío
  borderWidth: 2,
},
```

**Comportamiento**:
- ✅ Borde dorado (#ffb300) cuando tiene contenido
- ✅ Borde rojo (#F44336) cuando está vacío
- ✅ Feedback visual inmediato

---

## 🔄 Flujo Completo

### Caso 1: Usuario deja el nombre vacío y guarda

```
1. Usuario crea plan
2. Usuario no ingresa nombre (o lo borra)
3. Usuario hace clic en "Guardar Plan"
4. ❌ savePlanToDatabase() detecta nombre vacío
5. 🚨 Muestra alerta: "Nombre requerido"
6. ⏸️ NO guarda el plan
7. Usuario debe ingresar un nombre
```

**Resultado**: ✅ Plan NO se guarda sin nombre

---

### Caso 2: Usuario edita nombre, lo deja vacío y sale

```
1. Usuario hace clic en el nombre del plan
2. Usuario borra todo el texto
3. Usuario hace clic fuera (onBlur) o presiona Enter (onSubmitEditing)
4. 🚨 Muestra alerta: "Nombre requerido. Se usará nombre por defecto"
5. ✅ Auto-asigna: "Plan Personalizado - 12/12/2025"
6. ✅ Cierra modo edición
```

**Resultado**: ✅ Siempre hay un nombre válido

---

### Caso 3: Usuario edita nombre mientras está vacío

```
1. Usuario hace clic en el nombre del plan
2. El campo queda vacío
3. 🔴 Borde se pone rojo (feedback visual)
4. Usuario empieza a escribir: "Mi Plan"
5. 🟡 Borde vuelve a dorado
6. Usuario guarda
7. ✅ Se guarda con "Mi Plan"
```

**Resultado**: ✅ Feedback visual inmediato

---

## 📊 Casos Cubiertos

| Escenario | Validación | Comportamiento |
|-----------|-----------|----------------|
| Guardar con nombre vacío | ✅ Crítica | Bloquea guardado |
| Editar y dejar vacío (blur) | ✅ UX | Auto-asigna nombre |
| Editar y dejar vacío (enter) | ✅ UX | Auto-asigna nombre |
| Campo vacío (visual) | ✅ UX | Borde rojo |
| Campo con texto (visual) | ✅ UX | Borde dorado |
| Solo espacios en blanco | ✅ Crítica | Tratado como vacío |

---

## 🎨 Mensajes de Usuario

### Mensaje 1: Al intentar guardar sin nombre
```
Título: "Nombre requerido"
Mensaje: "Por favor, ingresa un nombre para tu plan de entrenamiento."
Ícono: create-outline (lápiz)
Color: #ffb300 (dorado)
```

### Mensaje 2: Al salir del input vacío
```
Título: "Nombre requerido"
Mensaje: "El plan debe tener un nombre. Se usará un nombre por defecto."
Ícono: alert-circle
Color: #ffb300 (dorado)
```

---

## 🧪 Pruebas

### Prueba 1: Guardar sin nombre
1. Crear un plan nuevo
2. NO ingresar nombre
3. Hacer clic en "Guardar Plan"
4. **Verificar**: Se muestra alerta
5. **Verificar**: Plan NO se guarda

### Prueba 2: Borrar nombre y salir
1. Editar un plan
2. Hacer clic en el nombre
3. Borrar todo el texto
4. Hacer clic fuera
5. **Verificar**: Se muestra alerta
6. **Verificar**: Se asigna nombre por defecto

### Prueba 3: Feedback visual
1. Editar un plan
2. Hacer clic en el nombre
3. Borrar todo el texto
4. **Verificar**: Borde se pone rojo
5. Escribir algo
6. **Verificar**: Borde vuelve a dorado

### Prueba 4: Solo espacios
1. Crear un plan
2. Ingresar solo espacios: "   "
3. Intentar guardar
4. **Verificar**: Tratado como vacío, muestra alerta

---

## 🔧 Configuración

### Nombre por Defecto
```typescript
const defaultName = `Plan Personalizado - ${new Date().toLocaleDateString()}`;
```

**Formato**: "Plan Personalizado - 12/12/2025"

**Modificar**: Cambia esta línea si quieres otro formato

---

## ✅ Beneficios

1. **Prevención de Errores**
   - ✅ No se pueden crear planes sin nombre
   - ✅ Evita confusión en la lista de planes

2. **UX Mejorada**
   - ✅ Feedback visual inmediato (borde rojo/dorado)
   - ✅ Alertas claras y amigables
   - ✅ Auto-corrección con nombre por defecto

3. **Consistencia de Datos**
   - ✅ Todos los planes tienen nombre válido
   - ✅ No hay strings vacíos en la base de datos
   - ✅ Mejor organización

4. **Experiencia Sin Fricción**
   - ✅ Usuario nunca se queda bloqueado
   - ✅ Siempre hay una solución (nombre por defecto)
   - ✅ Mensajes claros sobre qué hacer

---

## 📝 Archivos Modificados

### `app/(tabs)/workout/custom-plan-days.tsx`

**Cambios**:
1. Validación en `savePlanToDatabase()` (línea ~766)
2. Validación en `onBlur` del TextInput (línea ~1105)
3. Validación en `onSubmitEditing` del TextInput (línea ~1121)
4. Estilo condicional en View del TextInput (línea ~1089)
5. Nuevo estilo `planNameEditContainerEmpty` (línea ~1575)

---

## 🚀 Estado

- [x] Validación crítica al guardar
- [x] Validación en input (blur/submit)
- [x] Feedback visual (borde rojo)
- [x] Nombre por defecto automático
- [x] Alertas personalizadas
- [x] Trim de espacios en blanco
- [x] Linter sin errores

**✅ LISTO PARA BUILD**

---

## 💡 Mejoras Futuras (Opcional)

### 1. Contador de caracteres
```typescript
<Text style={styles.characterCount}>
  {planName.length}/50 caracteres
</Text>
```

### 2. Sugerencias de nombres
```typescript
const suggestions = [
  "Plan de Fuerza",
  "Plan de Hipertrofia",
  "Plan de Definición",
  "Plan Full Body"
];
```

### 3. Validación de duplicados
```typescript
// Verificar si ya existe un plan con ese nombre
const { data: existing } = await supabase
  .from('workout_plans')
  .select('id')
  .eq('user_id', user.id)
  .eq('plan_name', planName.trim())
  .maybeSingle();

if (existing && existing.id !== editingPlanId) {
  showAlert('Nombre duplicado', 'Ya tienes un plan con ese nombre');
}
```

---

## 🎯 Siguiente

**¿Qué hacer ahora?**

1. ✅ **SQL ejecutado**
2. ✅ **Validación de nombres implementada**
3. ⏳ **Siguiente**: ¿Validación de series vacías?



