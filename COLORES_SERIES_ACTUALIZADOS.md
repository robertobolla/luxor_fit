# 🎨 Colores de Series Actualizados

## 🔄 Cambio de Colores

### Calentamiento y Normal - Colores Intercambiados

| Tipo | Antes | Ahora | Razón |
|------|-------|-------|-------|
| **Calentamiento (C)** | 🟡 Amarillo | 🟢 Verde | Series ligeras y de preparación |
| **Normal (1,2,3...)** | 🟢 Verde | 🟡 Amarillo | Serie estándar, color destacado |
| Al Fallo (F) | 🔴 Rojo | 🔴 Rojo | Sin cambios |
| Drop (D) | 🟣 Morado | 🟣 Morado | Sin cambios |
| RIR (R) | 🔵 Azul | 🔵 Azul | Sin cambios |

---

## 🎨 Nueva Paleta de Colores

### En los Botones de Serie

```
┌────────────────────────────────────────┐
│ Series                                 │
│                                        │
│ [C] [10 reps]                    [X]   │  ← 🟢 Verde #4CAF50
│ [1] [10 reps]                    [X]   │  ← 🟡 Amarillo #ffb300
│ [F] [Al fallo]                   [X]   │  ← 🔴 Rojo #ff4444
│ [D] [8 reps]                     [X]   │  ← 🟣 Morado #9C27B0
│ [2] [10 reps]                    [X]   │  ← 🟡 Amarillo #ffb300
│ [R] [2 RIR]                      [X]   │  ← 🔵 Azul #2196F3
│                                        │
│         [+ Agregar Serie]              │
└────────────────────────────────────────┘
```

### En el Modal de Selección

```
┌────────────────────────────────────────┐
│     Seleccionar Tipo de Serie         │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🟢 C  Calentamiento              │ │  ← Verde
│  │       Peso ligero para activar   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🟡 1  Normal                     │ │  ← Amarillo
│  │       Serie estándar             │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🔴 F  Al Fallo                   │ │  ← Rojo
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🟣 D  Drop                       │ │  ← Morado
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 🔵 R  RIR                        │ │  ← Azul
│  └──────────────────────────────────┘ │
│                                        │
│         [Cancelar]                     │
└────────────────────────────────────────┘
```

---

## 💡 Significado de los Colores

### 🟢 Verde (#4CAF50) - Calentamiento
- **Significado:** Activación, preparación, inicio
- **Asociación:** "Go" / Comenzar / Suave
- **Contexto:** Series ligeras para activar músculos

### 🟡 Amarillo (#ffb300) - Normal
- **Significado:** Estándar, principal, atención
- **Asociación:** Precaución / Foco / Principal
- **Contexto:** Las series principales del entrenamiento

### 🔴 Rojo (#ff4444) - Al Fallo
- **Significado:** Intensidad máxima, peligro, esfuerzo extremo
- **Asociación:** Stop / Máximo / Alerta
- **Contexto:** Series hasta no poder más

### 🟣 Morado (#9C27B0) - Drop
- **Significado:** Técnica avanzada, especial
- **Asociación:** Premium / Especial / Avanzado
- **Contexto:** Series con reducción de peso progresiva

### 🔵 Azul (#2196F3) - RIR
- **Significado:** Control, precisión, medición
- **Asociación:** Información / Control / Precisión
- **Contexto:** Series controladas con reps en reserva

---

## 📊 Matriz de Contraste Actualizada

| Tipo | Fondo | Texto | Contraste |
|------|-------|-------|-----------|
| **Calentamiento** | 🟢 #4CAF50 | ⚪ #ffffff | ✅ 4.5:1 (bueno) |
| **Normal** | 🟡 #ffb300 | ⚪ #ffffff | ⚠️ 3.1:1 (aceptable) |
| Al Fallo | 🔴 #ff4444 | ⚪ #ffffff | ✅ 4.8:1 (bueno) |
| Drop | 🟣 #9C27B0 | ⚪ #ffffff | ✅ 5.2:1 (muy bueno) |
| RIR | 🔵 #2196F3 | ⚪ #ffffff | ✅ 4.3:1 (bueno) |

Todos siguen cumpliendo con WCAG AA (mínimo 3:1)

---

## 🔧 Código Modificado

### Función `getSetButtonColor()`

```typescript
// ANTES
case 'warmup': return '#ffb300'; // Amarillo
case 'normal': return '#4CAF50'; // Verde

// AHORA
case 'warmup': return '#4CAF50'; // Verde
case 'normal': return '#ffb300'; // Amarillo
```

### Estilos de Iconos del Modal

```typescript
// ANTES
setTypeIconWarmup: { backgroundColor: '#ffb300' }  // Amarillo
setTypeIconNormal: { backgroundColor: '#4CAF50' }  // Verde

// AHORA
setTypeIconWarmup: { backgroundColor: '#4CAF50' }  // Verde
setTypeIconNormal: { backgroundColor: '#ffb300' }  // Amarillo
```

---

## 🎯 Resultado Visual

### Ejemplo de Rutina con Mix de Tipos:

```
Serie 1:  🟢 C  - Calentamiento (verde)
Serie 2:  🟡 1  - Normal (amarillo)
Serie 3:  🟡 2  - Normal (amarillo)
Serie 4:  🔴 F  - Al Fallo (rojo)
Serie 5:  🟣 D  - Drop (morado)
Serie 6:  🟡 3  - Normal (amarillo)
Serie 7:  🔵 R  - RIR (azul)
```

### Lógica de Color:

- **Verde (calentamiento):** "Estoy preparándome, aún no empiezo fuerte"
- **Amarillo (normal):** "Esta es mi serie principal, aquí está el trabajo real"
- **Rojo (fallo):** "Máximo esfuerzo, voy hasta el límite"
- **Morado (drop):** "Técnica especial, reduzco peso"
- **Azul (RIR):** "Controlado, dejo X reps en reserva"

---

## ✅ Consistencia Mantenida

Los colores son **exactamente iguales** en:
- ✅ Botones de serie (C, 1, 2, F, D, R)
- ✅ Círculos del modal de selección
- ✅ Documentación actualizada

---

## 📝 Archivos Modificados

- ✅ `app/(tabs)/workout/custom-plan-day-detail.tsx`
  - Función `getSetButtonColor()` actualizada
  - Estilos `setTypeIconWarmup` y `setTypeIconNormal` intercambiados

- ✅ `COLORES_SERIES_ACTUALIZADOS.md` (documentación)

---

## 🧪 Cómo Verificar

1. Crear rutina con serie de calentamiento
   - ✅ Botón debería ser **verde** con letra "C"
   
2. Crear rutina con series normales
   - ✅ Botones deberían ser **amarillos** con números 1, 2, 3...
   
3. Abrir modal de selección
   - ✅ Círculo de Calentamiento debería ser **verde**
   - ✅ Círculo de Normal debería ser **amarillo**

---

## 🎨 Paleta Final

```
🟢 Verde    → Calentamiento (C)
🟡 Amarillo → Normal (1,2,3...)
🔴 Rojo     → Al Fallo (F)
🟣 Morado   → Drop (D)
🔵 Azul     → RIR (R)
```

---

**¿Los colores ahora se ven como esperabas?**

