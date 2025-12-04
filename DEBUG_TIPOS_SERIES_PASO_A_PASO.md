# Guía de Debug - Tipos de Series Paso a Paso

## 🎯 Objetivo

Diagnosticar por qué el botón de tipo de serie no responde cuando se hace clic.

---

## 📱 Cómo Probar (Paso a Paso)

### Paso 1: Abrir Creación de Rutina
1. Ir a la pestaña **"Entrenar"**
2. Tap en **"Crear Rutina Personalizada"**
3. Completar nombre y días por semana
4. Tap en **"Siguiente"**

### Paso 2: Configurar un Día
1. Selecciona **"Día 1"**
2. Tap en **"Agregar Ejercicio"**
3. Selecciona un ejercicio (ej: "Flexiones")
4. El ejercicio aparece en la lista
5. Tap en el ícono **⚙️ (configuración)** del ejercicio

### Paso 3: Abrir Modal de Configuración
Deberías ver un modal con:
- **Título:** "Configurar Flexiones"
- **Campo:** "Número de series" (ej: 3)
- **Botones amarillos:** 1, 2, 3

### Paso 4: Tocar el Botón
1. Tap en el botón amarillo **"1"**
2. **ESPERADO:** Debería aparecer un modal desde abajo con opciones
3. **SI NO APARECE:** Revisa los logs en la consola

---

## 🔍 Logs Esperados

Si todo funciona correctamente, al tocar el botón **"1"**, deberías ver en la consola:

```
👆 Tocando botón serie 0
📊 setTypes length: 3
📊 setTypes[index]: {type: "normal", reps: null}
📊 Abriendo modal...
🔘 Click en botón de tipo de serie, índice: 0
✅ Modal de tipo de serie mostrado
📊 Índice seleccionado: 0
📊 Visible: true
```

---

## ❌ Diagnóstico de Problemas

### Caso 1: NO Ves NINGÚN Log
**Problema:** El evento táctil no se está disparando

**Posibles causas:**
- El botón está detrás de otro elemento
- El ScrollView está capturando el evento
- El modal está bloqueando la interacción

**Solución:** Ya implementada con `hitSlop` y `keyboardShouldPersistTaps="always"`

---

### Caso 2: Ves "👆 Tocando botón" pero NO "🔘 Click en botón"
**Problema:** El handler `onPress` se ejecuta pero `handleSetTypeClick` no

**Posibles causas:**
- Error en la función antes de llegar al console.log
- Estado no actualizado

**Solución:** Los logs adicionales en `handleSetTypeClick` ayudarán a identificar

---

### Caso 3: Ves "🔘 Click" pero NO "✅ Modal mostrado"
**Problema:** El estado `showSetTypeModal` se actualiza pero el modal no se muestra

**Posibles causas:**
- Conflicto con otro modal abierto
- Estado del modal no se propaga

**Solución:** Verificar que `editingExercise !== null` (el modal de configuración está abierto)

---

### Caso 4: El Modal se Abre pero NO Cambia el Tipo
**Problema:** Al seleccionar una opción, el botón no cambia

**Verifica los logs:**
```
🟡 Seleccionado: Calentamiento
🔄 Cambiando tipo de serie: {selectedSetIndex: 0, newType: "warmup"}
✅ Nuevo array de setTypes: [{type: "warmup", reps: null}, ...]
```

---

## 🛠️ Fixes Implementados

### 1. Estructura Modal Mejorada
**Antes:**
```
KeyboardAvoidingView (modalOverlay)
  └─ TouchableOpacity (modalOverlay)
      └─ TouchableOpacity (modalContent)
```

**Ahora:**
```
TouchableOpacity (modalOverlay - cierre)
  └─ KeyboardAvoidingView
      └─ TouchableOpacity (modalContent)
```

### 2. Inicialización Robusta
```typescript
// Verificar que existe setType para cada índice
if (!setTypes[idx]) {
  const tempSetTypes = [...setTypes];
  tempSetTypes[idx] = { type: 'normal', reps: null };
  setSetTypes(tempSetTypes);
}

const setType = setTypes[idx] || { type: 'normal', reps: null };
```

### 3. Eventos Mejorados
- `activeOpacity={0.7}` en todos los botones
- `hitSlop` para área táctil más grande
- `keyboardShouldPersistTaps="always"`
- `nestedScrollEnabled={true}`

### 4. Animación Cambiada
- **Antes:** `animationType="fade"`
- **Ahora:** `animationType="slide"`
- **Razón:** Más visible y debug más fácil

---

## 📊 Estados a Verificar

### Estado 1: setTypes
```typescript
console.log('setTypes:', setTypes);
// Esperado: [{type: "normal", reps: null}, {type: "normal", reps: null}, ...]
```

### Estado 2: showSetTypeModal
```typescript
console.log('showSetTypeModal:', showSetTypeModal);
// Esperado: false (cerrado) o true (abierto)
```

### Estado 3: selectedSetIndex
```typescript
console.log('selectedSetIndex:', selectedSetIndex);
// Esperado: -1 (ninguno) o 0,1,2... (índice de serie)
```

---

## ⚡ Próximos Pasos

### Si los Logs Aparecen Correctamente:
✅ El código funciona, solo necesitas un nuevo build

### Si NO Aparecen Logs:
❌ Hay un problema de evento, necesitamos más investigación

### Para Probar Ahora Mismo:
1. Estos cambios están en el código
2. NO están en TestFlight build 19
3. Necesitas un nuevo build para probarlos en TestFlight

---

## 🔄 Cómo Aplicar los Cambios

### Opción 1: Desarrollo Local
```bash
npm start
# Escanear QR con Expo Go
```

### Opción 2: Development Build
```bash
eas build --profile development --platform ios
```

### Opción 3: TestFlight (Producción)
```bash
eas build --profile production --platform ios
eas submit --platform ios --latest
```

---

## 📝 Resumen de Commits

```
✅ feat: Sistema avanzado de tipos de series
✅ fix: Cambiar W por C en serie de calentamiento  
✅ fix: Mejorar UI y tactilidad del modal
✅ fix: Arreglar detección de clicks en botones
```

---

## 🆘 Si Persiste el Problema

**Comparte estos datos:**
1. ¿Aparecen los logs cuando tocas el botón?
2. ¿Qué logs ves exactamente?
3. ¿El botón tiene feedback visual (se oscurece)?
4. ¿Estás probando en TestFlight o en desarrollo?
5. ¿Qué versión de iOS tienes?

Con esta información podremos identificar exactamente dónde está el problema.

