# 💪 Mejoras Profesionales para Entrenamientos con IA

## 🎯 **Problema Identificado**

El sistema actual genera entrenamientos con:
- ❌ Repeticiones fijas (ej: 10, 10, 10) en todas las series
- ❌ No incluye series de aproximación/calentamiento
- ❌ No usa RIR (Reps In Reserve) o RPE (Rate of Perceived Exertion)
- ❌ No hay progresión dentro de la sesión (piramidal, inversa, etc.)

---

## 🏋️ **Conceptos Profesionales que Debería Usar**

### **1. RIR (Reps In Reserve) / RPE (Rate of Perceived Exertion)**

**RIR (Reps In Reserve)**: Cuántas repeticiones más podrías hacer al finalizar la serie
- **RIR 0**: Fallo muscular (no recomendado para principiantes)
- **RIR 1-2**: Muy cerca del fallo (avanzados, última serie)
- **RIR 2-3**: Intensidad alta pero controlada (intermedios)
- **RIR 3-4**: Intensidad moderada (principiantes, series de volumen)

**RPE (Rate of Perceived Exertion)**: Escala 1-10 de esfuerzo percibido
- **RPE 10**: Fallo absoluto
- **RPE 9**: 1 rep en reserva
- **RPE 8**: 2 reps en reserva
- **RPE 7**: 3 reps en reserva
- **RPE 6-7**: Intensidad moderada (series de volumen)

### **2. Series de Aproximación/Calentamiento**

**Estructura profesional:**
- **Series de calentamiento**: 1-3 series con peso ligero (40-60% 1RM) para activar músculos
- **Series de aproximación**: 1-2 series progresivas (70-85% 1RM) antes de series de trabajo
- **Series de trabajo**: Series principales con peso objetivo y RIR específico

**Ejemplo:**
```
Sentadilla con barra:
- Calentamiento: 1x10 @ 60kg (RIR 4-5)
- Aproximación: 1x5 @ 80kg (RIR 3)
- Trabajo: 3x5 @ 100kg (RIR 2)
```

### **3. Progresión Dentro de la Sesión**

**Tipos de progresión:**
- **Piramidal**: Aumenta peso, reduce reps (ej: 60kgx10, 70kgx8, 80kgx6)
- **Inversa**: Reduce peso, aumenta reps (ej: 80kgx6, 70kgx8, 60kgx10)
- **Ascendente**: Aumenta peso progresivamente (ej: 60kgx8, 65kgx8, 70kgx8)
- **Descendente**: Reduce peso progresivamente (ej: 70kgx8, 65kgx8, 60kgx8)
- **Constante**: Mismo peso y reps (ej: 70kgx8, 70kgx8, 70kgx8) - solo para principiantes

### **4. Rangos de Repeticiones con RIR**

**Formato profesional:**
- En lugar de: `"reps": "10"` (fijo)
- Usar: `"reps": "8-10 @ RIR 2"` o `"reps": "6-8 @ RPE 8"`

**Ejemplo de serie profesional:**
```json
{
  "name": "Sentadilla con barra",
  "warmup_sets": [
    { "reps": 10, "weight_percentage": 50, "rir": 4 },
    { "reps": 5, "weight_percentage": 70, "rir": 3 }
  ],
  "working_sets": [
    { "reps": "6-8", "rir": 2, "rest": "3min" },
    { "reps": "6-8", "rir": 2, "rest": "3min" },
    { "reps": "6-8", "rir": 1, "rest": "3min" }
  ]
}
```

---

## 📋 **Lógica Profesional por Nivel**

### **Principiante:**
- **RIR**: 3-4 (intensidad moderada, enfocado en técnica)
- **Series de calentamiento**: 1-2 series ligeras
- **Progresión**: Constante o ascendente ligera
- **Formato**: `"reps": "10-12 @ RIR 3"`

### **Intermedio:**
- **RIR**: 2-3 (intensidad alta pero controlada)
- **Series de calentamiento**: 2 series
- **Series de aproximación**: 1 serie
- **Progresión**: Piramidal o ascendente
- **Formato**: `"reps": "8-10 @ RIR 2"` o `"reps": "6-8 @ RPE 8"`

### **Avanzado:**
- **RIR**: 1-2 (muy cerca del fallo en series finales)
- **Series de calentamiento**: 2-3 series
- **Series de aproximación**: 1-2 series
- **Progresión**: Piramidal, inversa, o técnicas avanzadas (cluster sets, rest-pause)
- **Formato**: `"reps": "3-5 @ RIR 1"` o `"reps": "6-8 @ RPE 9"`

---

## 🎯 **Mejoras Propuestas al Prompt**

### **1. Agregar Instrucciones sobre RIR/RPE**

```
6. INTENSIDAD Y PROXIMIDAD AL FALLO (RIR/RPE):
   - USA SIEMPRE RIR (Reps In Reserve) o RPE (Rate of Perceived Exertion)
   - NUNCA uses números fijos de repeticiones sin RIR
   - Formato: "8-10 @ RIR 2" significa 8-10 repeticiones dejando 2 en reserva
   
   RIR por nivel:
   - Principiante: RIR 3-4 (intensidad moderada, enfoque en técnica)
   - Intermedio: RIR 2-3 (intensidad alta pero controlada)
   - Avanzado: RIR 1-2 (muy cerca del fallo, solo en series finales)
   
   IMPORTANTE:
   - RIR 0 (fallo) solo para avanzados y solo en última serie de último ejercicio
   - RIR 1-2 para series principales de ejercicios compuestos
   - RIR 3-4 para ejercicios accesorios y series de volumen
```

### **2. Agregar Series de Aproximación**

```
7. ESTRUCTURA DE SERIES (OBLIGATORIO):
   Para ejercicios compuestos principales (sentadilla, peso muerto, press):
   - Series de calentamiento: 1-2 series con 40-60% del peso de trabajo
   - Series de aproximación: 1 serie con 70-85% del peso de trabajo
   - Series de trabajo: 3-5 series con peso objetivo y RIR específico
   
   Para ejercicios accesorios:
   - Pueden empezar directamente con series de trabajo
   - O 1 serie de calentamiento ligera
```

### **3. Mejorar Formato JSON**

```json
{
  "exercises": [
    {
      "name": "Sentadilla con barra",
      "warmup_sets": [
        { "reps": 10, "weight_note": "50% peso de trabajo", "rir": 4 },
        { "reps": 5, "weight_note": "70% peso de trabajo", "rir": 3 }
      ],
      "working_sets": [
        { "reps": "6-8", "rir": 2, "rest": "3min", "notes": "Primera serie de trabajo" },
        { "reps": "6-8", "rir": 2, "rest": "3min" },
        { "reps": "6-8", "rir": 1, "rest": "3min", "notes": "Última serie, puede acercarse más al fallo" }
      ],
      "progression_type": "piramidal" // o "constante", "ascendente", "inversa"
    }
  ]
}
```

### **4. Progresión Dentro de la Sesión**

```
8. PROGRESIÓN DENTRO DE LA SESIÓN:
   - Piramidal: Aumenta peso, reduce reps (ej: 60kgx10, 70kgx8, 80kgx6)
   - Ascendente: Aumenta peso progresivamente (ej: 60kgx8, 65kgx8, 70kgx8)
   - Constante: Mismo peso y reps (solo principiantes)
   - Inversa: Reduce peso, aumenta reps (avanzados, para fatiga)
   
   Regla general:
   - Principiantes: Constante o ascendente ligera
   - Intermedios: Piramidal o ascendente
   - Avanzados: Piramidal, inversa, o técnicas avanzadas
```

---

## 🔧 **Implementación**

Voy a actualizar el prompt para incluir estas mejoras profesionales.

