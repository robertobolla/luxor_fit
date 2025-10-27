# 🎯 Mejoras al Sistema de Recalibración Nutricional

## 📋 Resumen de Cambios

Se han implementado mejoras significativas al sistema de seguimiento y recalibración automática de la dieta:

### ✨ Nuevas Funcionalidades

#### 1. **Registro de Composición Corporal** 📊

- Nueva pantalla para registrar peso, grasa corporal y masa muscular
- Campos opcionales que mejoran la precisión del seguimiento
- Acceso desde el botón "+" en la pantalla de Métricas

#### 2. **Explicaciones Educativas Automáticas** 💡

- El sistema ahora genera explicaciones personalizadas cuando ajusta la dieta
- Muestra:
  - ¿Por qué se ajustan las calorías?
  - ¿Qué significa el cambio para tu objetivo?
  - Recomendaciones específicas para tu situación

#### 3. **Análisis Inteligente de Progreso** 🧠

- **Con composición corporal**: Analiza cambios en grasa vs músculo
- **Sin composición**: Analiza velocidad de cambio de peso
- Considera datos de las últimas 2 semanas
- Requiere >=70% de adherencia para ajustar

### 🔧 Cambios Técnicos

#### Archivos Modificados/Creados

1. **`src/services/nutrition.ts`**

   - Agregada función `generateEducationalExplanation()`
   - Actualizado `applyWeeklyAdjustment()` para retornar explicaciones
   - Query actualizado para incluir `body_fat_percentage` y `muscle_percentage`

2. **`src/components/NutritionAdjustmentModal.tsx`** (NUEVO)

   - Modal para mostrar explicaciones educativas
   - Diseño visual atractivo con iconos por tipo de ajuste

3. **`app/(tabs)/register-weight.tsx`** (NUEVO)

   - Pantalla completa para registrar mediciones
   - Campos: peso, grasa corporal, músculo, cintura, notas
   - Validación y guardado en Supabase

4. **`app/(tabs)/nutrition/index.tsx`**

   - Integración del modal educativo
   - Se muestra automáticamente los lunes cuando hay ajustes

5. **`src/types/nutrition.ts`**
   - Actualizado tipo `BodyMetric` con nuevos campos

#### Scripts SQL Nuevos

**`supabase_add_composition_to_body_metrics.sql`**

```sql
ALTER TABLE public.body_metrics
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2);

ALTER TABLE public.body_metrics
ADD COLUMN IF NOT EXISTS muscle_percentage DECIMAL(5,2);
```

## 🚀 Cómo Usar

### Para Usuarios

1. **Registrar Mediciones Semanales**:

   - Ir a la pestaña "Métricas"
   - Tocar el botón "+" (flotante)
   - Registrar peso y composición corporal
   - Guardar

2. **Revisar Ajustes Automáticos**:
   - Los lunes, la app analiza tu progreso
   - Si hay cambios, aparece automáticamente el modal educativo
   - Lee la explicación y entiende el ajuste

### Para Desarrolladores

1. **Ejecutar SQL en Supabase**:

   ```sql
   -- Ejecutar supabase_add_composition_to_body_metrics.sql
   ```

2. **Verificación**:
   ```typescript
   // Verificar que las nuevas columnas existen
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'body_metrics';
   ```

## 📊 Ejemplos de Explicaciones Educativas

### Escenario 1: Pérdida de Peso con Recomposición

```
✅ Excelente! Estás perdiendo grasa (1.2%) y manteniendo/aumentando músculo (+0.3%).

💡 Lo que esto significa:
Tu dieta está funcionando perfectamente. Estás logrando una recomposición corporal:
bajando grasa sin perder músculo. Esto significa que estás en un déficit calórico
moderado que permite mantener masa muscular.
```

### Escenario 2: Pérdida Muy Rápida (Riesgo de Músculo)

```
⚠️ Perdiendo peso muy rápido (1.1 kg/sem).

💡 Lo que esto significa:
Estás perdiendo más de 0.7 kg por semana, lo cual es demasiado rápido y puede
incluir pérdida de músculo. Vamos a aumentar ligeramente las calorías (+150 kcal)
para frenar la pérdida de masa muscular.
```

### Escenario 3: Ganancia con Mucha Grasa

```
⚠️ Estás ganando grasa (0.8%) y músculo (0.5%).

💡 Lo que esto significa:
Estás en un superávit calórico. Aunque ganas músculo, también estás ganando grasa.
Para tu objetivo de perder grasa, necesitamos reducir ligeramente las calorías (-100 kcal).
```

## 🎯 Lógica de Ajustes

### Umbrales por Objetivo

**CUT (Perder grasa)**:

- < -0.7 kg/sem: ⚠️ Aumentar calorías (proteger músculo)
- -0.3 a -0.7 kg/sem: ✅ Mantener
- > -0.3 kg/sem: 🐌 Reducir calorías
- Ganando peso: 📈 Reducir calorías

**BULK (Ganar músculo)**:

- < 0.2 kg/sem: 🐌 Aumentar calorías
- 0.2 a 0.5 kg/sem: ✅ Mantener
- > 0.5 kg/sem: ⚠️ Reducir calorías (bulk más limpio)
- Perdiendo peso: 📉 Aumentar calorías

**RECOMP/MAINTAIN**:

- > 0.1 kg de cambio: Ajustar
- Estable: ✅ Mantener

### Con Datos de Composición Corporal

- **Baja grasa + mantiene/aumenta músculo**: ✅ Perfecto
- **Baja grasa pero pierde músculo**: ⚠️ Aumentar calorías/proteína
- **Gana grasa y músculo en CUT**: ⚠️ Reducir calorías
- **Gana grasa y músculo en BULK**: 📈 Normal, ajustar si es excesivo

## 🔄 Flujo de Funcionamiento

1. **Cada Lunes**: La app analiza el progreso de las últimas 2 semanas
2. **Cálculo**: Compara peso/composición actual vs hace 2 semanas
3. **Adherencia**: Verifica que >=70% de comidas fueron registradas
4. **Ajuste**: Calcula nuevas calorías según tu objetivo y progreso
5. **Notificación**: Muestra modal educativo con explicación
6. **Aplicación**: Actualiza targets de la próxima semana

## 📝 Notas Importantes

- **Campos opcionales**: Solo el peso es requerido. La composición corporal mejora la precisión pero no es obligatoria.
- **Frecuencia**: Se recomienda registrar peso 1-2 veces por semana y composición cada 2 semanas.
- **Adherencia mínima**: El sistema requiere >=70% de adherencia (comidas registradas) para ajustar la dieta.
- **Sin datos suficientes**: Si no hay al menos 2 mediciones de peso en 2 semanas, no se realizará ajuste.

## 🐛 Solución de Problemas

### El modal no aparece

- Verificar que sea lunes
- Verificar que hay al menos 2 mediciones de peso en las últimas 2 semanas
- Verificar que la adherencia sea >=70%

### Las explicaciones no son precisas

- Registrar composición corporal semanalmente
- Registrar todas las comidas (mayor adherencia)
- Verificar que las mediciones sean precisas

## 🎓 Beneficios del Sistema

1. **Educación**: Los usuarios entienden por qué se ajusta la dieta
2. **Motivación**: Feedback positivo cuando van bien
3. **Adaptación**: Ajustes automáticos basados en datos reales
4. **Precisión**: Más datos = mejores ajustes
5. **Autonomía**: El usuario aprende a interpretar su progreso
