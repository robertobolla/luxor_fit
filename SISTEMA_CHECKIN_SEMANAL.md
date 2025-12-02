# Sistema de Check-in Semanal y Ajuste Automático de Dieta

## 📋 Descripción General

Sistema proactivo que detecta el inicio de cada semana y solicita al usuario actualizar sus medidas corporales (peso, grasa, músculo) para ajustar automáticamente el plan de nutrición según el progreso real.

## 🎯 Problema Que Resuelve

**Antes:**
- ❌ La dieta nunca se ajustaba automáticamente
- ❌ Usuario no sabía cuándo actualizar sus datos
- ❌ No había feedback sobre el progreso semanal
- ❌ Sistema reactivo: esperaba que el usuario tomara acción

**Ahora:**
- ✅ Check-in automático cada Lunes
- ✅ Solicita peso, grasa corporal y masa muscular
- ✅ Calcula cambios semanales automáticamente
- ✅ Ajusta calorías según progreso y adherencia
- ✅ Proporciona explicación educativa del ajuste
- ✅ Sistema proactivo: guía al usuario

## 🏗️ Arquitectura

### 1. Base de Datos

**Tabla: `body_measurements`**
```sql
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  
  -- Medidas básicas (peso obligatorio)
  weight_kg DECIMAL(5, 2) NOT NULL,
  body_fat_percentage DECIMAL(4, 2),
  muscle_percentage DECIMAL(4, 2),
  
  -- Medidas opcionales
  chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm
  
  -- Metadata
  notes TEXT,
  source TEXT DEFAULT 'manual'
);
```

**Índices:**
- Por usuario y fecha
- Por semana (para cálculos semanales)

### 2. Servicio: `weeklyCheckinService.ts`

**Funciones principales:**

#### `checkIfNeedsWeeklyCheckin(userId)`
```typescript
// Verifica si el usuario necesita check-in esta semana
// Retorna:
{
  needsCheckin: boolean,
  lastCheckin: BodyMeasurement | null,
  weeksSinceLastCheckin: number,
  currentWeekStart: string
}
```

#### `performWeeklyCheckin(userId, measurement)`
```typescript
// Proceso completo:
// 1. Guarda la medida corporal
// 2. Calcula cambios semanales
// 3. Aplica ajuste de dieta si hay 2+ semanas de datos
// 4. Retorna resultados y explicación
```

#### `calculateWeeklyChanges(userId)`
```typescript
// Compara últimas 2 medidas:
{
  weight_change_kg: number,
  body_fat_change: number | null,
  muscle_change: number | null,
  weeks_tracked: number
}
```

### 3. Componente: `WeeklyCheckinModal.tsx`

**Modal con 2 pantallas:**

#### Pantalla 1: Entrada de Datos
- Muestra última medida como referencia
- Solicita peso (obligatorio)
- Solicita grasa corporal (opcional)
- Solicita masa muscular (opcional)
- Campo de notas

#### Pantalla 2: Resultados
- ✅ Confirmación de check-in completado
- 📊 Cambios semanales con emojis visuales
- 🍽️ Ajuste de dieta (si aplica)
  - Nuevas calorías
  - Cambio respecto a semana anterior
  - Explicación detallada
  - Mensaje educativo
- 💡 Info si no hay suficientes datos (< 2 semanas)

### 4. Integración en Dashboard

**Detección automática:**
```typescript
useFocusEffect(() => {
  checkWeeklyCheckin(); // Verifica al abrir dashboard
});

const checkWeeklyCheckin = async () => {
  const status = await checkIfNeedsWeeklyCheckin(userId);
  
  // Mostrar si:
  // 1. Necesita check-in
  // 2. Estamos viendo "hoy"
  // 3. No se mostró recordatorio esta semana
  if (status.needsCheckin && isViewingToday && shouldShow) {
    setTimeout(() => setShowCheckinModal(true), 1500);
  }
};
```

### 5. Notificaciones

**Recordatorio semanal:**
- 📅 Cada Lunes a las 9:00 AM
- 📱 Notificación push local
- 🔔 Se programa automáticamente al configurar notificaciones

```typescript
scheduleNotificationAsync({
  content: {
    title: '📊 Check-in Semanal',
    body: 'Es hora de registrar tu peso y ajustar tu dieta'
  },
  trigger: {
    weekday: 2, // Lunes
    hour: 9,
    minute: 0,
    repeats: true
  }
});
```

## 📊 Flujo de Usuario

### Semana 1 (Primera vez)
```
Usuario abre app (Lunes) 
  → Modal de check-in aparece automáticamente
  → Usuario ingresa: Peso: 75kg, Grasa: 18%, Músculo: 42%
  → Sistema guarda datos
  → ⚠️ "Necesitas 2 semanas de datos para ajuste automático"
  → Usuario continúa con plan actual
```

### Semana 2+ (Con datos históricos)
```
Usuario abre app (Lunes)
  → Modal de check-in aparece
  → Usuario ingresa: Peso: 74.2kg, Grasa: 17.5%, Músculo: 42.3%
  
Sistema calcula cambios:
  📉 Peso: -0.8 kg
  📉 Grasa: -0.5%
  📈 Músculo: +0.3%

Sistema analiza adherencia y progreso:
  ✅ Adherencia: 85%
  ✅ Pérdida de peso dentro del objetivo (-0.3 a -0.7 kg/sem)
  ✅ Composición corporal mejorando

Resultado:
  → Calorías MANTENIDAS: 2000 kcal
  → Explicación: "Estás progresando perfectamente..."
  → Mensaje educativo: "La pérdida gradual preserva masa muscular..."
```

### Si progreso muy lento/rápido
```
Progreso muy lento:
  → Calorías REDUCIDAS -5% (ej: 2000 → 1900)
  → "Reducimos 100 kcal para acelerar pérdida de grasa..."

Progreso muy rápido:
  → Calorías AUMENTADAS +5% (ej: 2000 → 2100)
  → "Aumentamos 100 kcal para evitar pérdida de músculo..."
```

## 🔧 Implementación

### Paso 1: Ejecutar SQL en Supabase
```bash
# Ejecutar en SQL Editor de Supabase:
./CREAR_TABLA_BODY_MEASUREMENTS.sql
```

### Paso 2: Código ya integrado
- ✅ Servicio creado: `src/services/weeklyCheckinService.ts`
- ✅ Modal creado: `src/components/WeeklyCheckinModal.tsx`
- ✅ Dashboard actualizado: `app/(tabs)/dashboard.tsx`
- ✅ Notificaciones: `src/services/notificationService.ts`

### Paso 3: Verificar funcionamiento

#### Test manual:
```typescript
// En consola de la app:
import { checkIfNeedsWeeklyCheckin } from '@/services/weeklyCheckinService';
const status = await checkIfNeedsWeeklyCheckin(userId);
console.log(status); // Ver si necesita check-in
```

## 📱 Experiencia de Usuario

### Primera Semana
1. Usuario completa onboarding (peso inicial registrado)
2. Lunes siguiente: aparece modal de check-in
3. Usuario ingresa peso actual
4. Sistema: "Registrado. Semana próxima podremos ajustar tu dieta"

### Segunda Semana
1. Lunes: modal de check-in
2. Usuario ve su peso anterior como referencia
3. Ingresa nuevo peso
4. Sistema muestra:
   - Cambio de peso (-0.8 kg) con emoji 📉
   - Cambio de grasa (-0.5%) con emoji 📉
   - Cambio de músculo (+0.3%) con emoji 📈
   - Nuevas calorías con explicación

### Notificaciones
- Lunes 9:00 AM: "📊 Check-in Semanal - Es hora de registrar tu peso"
- Si usuario no abre app: recordatorio persiste
- Al abrir app: modal aparece automáticamente

## 🎓 Educación al Usuario

### Mensajes contextuales según objetivo:

**Cut (Pérdida de grasa):**
```
"Para perder grasa de forma sostenible, buscamos -0.3 a -0.7 kg/semana.
Pérdida más rápida puede provocar pérdida de músculo.
Tu progreso de -0.5 kg es ideal para mantener músculo mientras pierdes grasa."
```

**Bulk (Ganancia muscular):**
```
"Para maximizar ganancia de músculo con mínima grasa, buscamos +0.2 a +0.5 kg/semana.
Ganancia más rápida suele ser principalmente grasa.
Tu progreso de +0.3 kg es perfecto para ganar músculo limpio."
```

**Recomp (Recomposición):**
```
"En recomposición, tu peso se mantiene mientras cambias composición corporal.
El músculo pesa más que la grasa, así que el peso puede subir aunque te veas más delgado.
Tu grasa bajó -1% y músculo subió +0.5%, ¡excelente progreso!"
```

## 🔄 Mantenimiento

### Agregar nuevas medidas
Si quieres trackear más métricas (ej: circunferencias):

1. Ya están en la tabla: `chest_cm`, `waist_cm`, `hips_cm`, etc.
2. Agregar campos al modal: `WeeklyCheckinModal.tsx`
3. Incluir en cálculo de progreso: `weeklyCheckinService.ts`

### Cambiar frecuencia de check-in
Actualmente: semanal (cada Lunes)

Para cambiar a quincenal:
```typescript
// En weeklyCheckinService.ts > checkIfNeedsWeeklyCheckin
const weeksDiff = Math.floor(...);
const needsCheckin = weeksDiff >= 2; // Cambiar a 2 para quincenal
```

### Personalizar notificaciones
```typescript
// En notificationService.ts > scheduleWeeklyCheckinNotification
trigger: {
  weekday: 2,    // Cambiar día (1=Dom, 2=Lun, ...)
  hour: 9,       // Cambiar hora
  minute: 0,
  repeats: true
}
```

## 📈 Métricas de Éxito

### Indicadores clave:
- ✅ % de usuarios que completan check-in semanal
- ✅ Promedio de semanas con datos completos
- ✅ % de usuarios con ajuste automático activo (2+ semanas)
- ✅ Satisfacción con ajustes automáticos

### Queries útiles:
```sql
-- Adherencia a check-ins
SELECT 
  user_id,
  COUNT(*) as total_checkins,
  MAX(measured_at) as last_checkin
FROM body_measurements
WHERE measured_at >= NOW() - INTERVAL '8 weeks'
GROUP BY user_id;

-- Usuarios con suficientes datos para ajuste
SELECT COUNT(DISTINCT user_id)
FROM (
  SELECT user_id, COUNT(*) as checkins
  FROM body_measurements
  GROUP BY user_id
  HAVING COUNT(*) >= 2
) subq;
```

## 🚀 Próximas Mejoras

### Corto plazo:
- [ ] Gráfico de progreso (peso/grasa/músculo)
- [ ] Comparación con objetivos
- [ ] Fotos de progreso integradas

### Mediano plazo:
- [ ] Integración con básculas inteligentes (Withings, Fitbit)
- [ ] Predicción de progreso basada en IA
- [ ] Recomendaciones personalizadas de ajuste

### Largo plazo:
- [ ] Check-ins adaptivos (más frecuentes si necesario)
- [ ] Análisis de tendencias avanzado
- [ ] Alertas proactivas de estancamiento

## 🐛 Troubleshooting

### Usuario no ve modal de check-in
**Verificar:**
1. ¿Es Lunes o inicio de semana?
2. ¿Ya hizo check-in esta semana?
3. ¿Tiene AsyncStorage limpio? (revisar `CHECKIN_REMINDER_SHOWN_KEY`)

**Solución:**
```typescript
// Forzar check-in en desarrollo:
await AsyncStorage.removeItem('checkin_reminder_shown_this_week');
setShowCheckinModal(true);
```

### Dieta no se ajusta
**Verificar:**
1. ¿Tiene al menos 2 semanas de datos?
2. ¿La adherencia es >= 70%?
3. ¿El cambio de peso está fuera del rango objetivo?

**Debug:**
```typescript
const changes = await calculateWeeklyChanges(userId);
console.log('Cambios:', changes);

const adjustment = await applyWeeklyAdjustment(userId);
console.log('Ajuste:', adjustment);
```

### Notificaciones no llegan
**Verificar:**
1. Permisos de notificaciones otorgados
2. Notificación programada: `Notifications.getAllScheduledNotificationsAsync()`
3. Hora/día correcto según timezone del usuario

## 📚 Referencias

- `CREAR_TABLA_BODY_MEASUREMENTS.sql` - Schema de base de datos
- `src/services/weeklyCheckinService.ts` - Lógica de negocio
- `src/components/WeeklyCheckinModal.tsx` - UI del check-in
- `src/services/nutrition.ts` - `applyWeeklyAdjustment()` - Algoritmo de ajuste
- `app/(tabs)/dashboard.tsx` - Integración en dashboard

