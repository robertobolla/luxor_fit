# Troubleshooting - Tipos de Series

## Problema: El botón de tipo de serie no responde

### Síntomas
- Al hacer clic en el botón amarillo con el número/letra de la serie
- No se abre el modal de selección de tipo
- El botón no muestra feedback visual

---

## Soluciones Implementadas

### ✅ 1. Modal Más Ancho
**Cambio:** `maxWidth: 400 → 500`
**Resultado:** El modal ocupa más espacio y se ve mejor

### ✅ 2. Área Táctil Ampliada
**Cambio:** Agregado `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`
**Resultado:** El área de toque es más grande que el botón visual

### ✅ 3. Scroll Mejorado
**Cambio:** `keyboardShouldPersistTaps: "handled" → "always"`
**Resultado:** Los botones dentro del scroll responden mejor

### ✅ 4. Scroll Anidado
**Cambio:** Agregado `nestedScrollEnabled={true}`
**Resultado:** Mejor compatibilidad con modales dentro de scrolls

### ✅ 5. Feedback Visual
**Cambio:** Agregado `activeOpacity={0.7}`
**Resultado:** El botón se oscurece ligeramente al tocarlo

### ✅ 6. Botones Más Grandes
**Cambio:** 
- Padding: `10 → 12`
- MinWidth: `50 → 55`
**Resultado:** Botones más fáciles de tocar

### ✅ 7. Spacing Mejorado
**Cambio:** Gap entre elementos: `8 → 12`
**Resultado:** Mejor distribución visual

### ✅ 8. Logs de Debug
**Agregados:**
```javascript
console.log('👆 Tocando botón serie', idx);
console.log('🔘 Click en botón de tipo de serie, índice:', index);
console.log('✅ Modal de tipo de serie mostrado, índice:', selectedSetIndex);
console.log('⛔ Cerrando modal de tipo de serie');
```

---

## Cómo Verificar si Funciona

### Paso 1: Abrir el Modal de Configuración
1. Ir a creación de rutina personalizada
2. Agregar un ejercicio
3. Hacer clic en el ícono de configuración (⚙️)

### Paso 2: Probar el Botón
1. En "Repeticiones por serie", ver los botones amarillos
2. Hacer clic en cualquier botón (1, 2, 3, C, F, D)
3. Debería aparecer un modal desde abajo con las opciones

### Paso 3: Verificar Logs (opcional)
1. En desarrollo, abrir la consola
2. Al tocar el botón, deberías ver:
   ```
   👆 Tocando botón serie 0
   🔘 Click en botón de tipo de serie, índice: 0
   ✅ Modal de tipo de serie mostrado, índice: 0
   ```

---

## Si Aún No Funciona

### Verificar 1: Versión del Código
Asegúrate de tener la última versión:
```bash
git pull origin feature/muscle-zones-exercises
```

### Verificar 2: Estado de los Sets
El botón solo funciona si hay series configuradas. Verifica que:
- El campo "Número de series" tenga un valor > 0
- Aparezcan los botones de series en la lista

### Verificar 3: Reiniciar la App
A veces es necesario:
1. Cerrar completamente la app
2. Volver a abrirla
3. Probar de nuevo

### Verificar 4: Build
Si estás en TestFlight, necesitas:
1. Esperar el nuevo build con estos cambios
2. El build actual (19) NO incluye estas mejoras
3. El próximo build incluirá todas las fixes

---

## Comportamiento Esperado

### Al Tocar el Botón:
1. **Feedback Visual:** El botón se oscurece ligeramente
2. **Modal Aparece:** Desde abajo con animación fade
3. **5 Opciones Visibles:**
   - 🟡 C - Serie de Calentamiento
   - 🟢 1 - Serie Normal
   - 🔴 F - Serie al Fallo
   - 🟣 D - Serie Drop
   - 🔵 R - RIR
   - 🗑️ Eliminar Serie

### Al Seleccionar un Tipo:
1. El modal se cierra
2. El botón cambia su letra/número según el tipo
3. Si es "Al Fallo", el input de reps se deshabilita

---

## Información Técnica

### Estructura de Componentes
```
Modal (Configurar Ejercicio)
  └─ KeyboardAvoidingView
      └─ TouchableOpacity (cerrar)
          └─ TouchableOpacity (contenido - stopPropagation)
              └─ ScrollView (keyboardShouldPersistTaps="always")
                  └─ View (repInputRow)
                      └─ TouchableOpacity (setTypeButton) ← ESTE ES EL BOTÓN
                          └─ Text (setLabel)
```

### Props del Botón
```typescript
<TouchableOpacity
  style={styles.setTypeButton}
  onPress={() => handleSetTypeClick(idx)}
  activeOpacity={0.7}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
```

### Estilos del Botón
```typescript
setTypeButton: {
  backgroundColor: '#ffb300',
  paddingHorizontal: 18,
  paddingVertical: 12,
  borderRadius: 8,
  minWidth: 55,
  alignItems: 'center',
  justifyContent: 'center',
}
```

---

## Archivos Modificados

- `app/(tabs)/workout/custom-plan-day-detail.tsx`
  - Líneas 174-177: handleSetTypeClick con log
  - Líneas 667-671: ScrollView con keyboardShouldPersistTaps="always"
  - Líneas 697-707: TouchableOpacity del botón con mejoras
  - Líneas 752-757: Modal con onShow log
  - Líneas 1078-1086: Estilos del botón mejorados
  - Línea 1037: Gap aumentado en repInputRow

---

## Contacto

Si después de aplicar estas soluciones el problema persiste:
1. Verifica los logs en la consola
2. Comparte los logs con el equipo de desarrollo
3. Indica en qué dispositivo y versión de iOS estás probando

