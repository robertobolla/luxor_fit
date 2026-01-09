# 🧪 Guía de Pruebas: Expiración y Renovación de Planes de Entrenamiento

## ⚠️ PREREQUISITO
**Antes de probar**, debes ejecutar el script SQL en Supabase:
1. Ve a tu proyecto Supabase → SQL Editor
2. Copia y pega el contenido de `supabase_workout_plan_tracking.sql`
3. Ejecuta el script
4. Verifica que no haya errores

---

## 📋 Pruebas a Realizar

### Prueba 1: Plan de 1 Semana
**Objetivo:** Verificar que el modal aparezca exactamente después de 1 semana

**Pasos:**
1. Crea o activa un plan de entrenamiento de **1 semana**
2. Anota la fecha de activación (ej: Lunes 23 de Diciembre)
3. **Espera hasta el siguiente lunes** (Lunes 30 de Diciembre)
4. Abre la app y ve a la pestaña "Entrenamientos"

**Resultado Esperado:**
- ✅ Modal de finalización aparece automáticamente
- ✅ Mensaje: "Has completado el plan..."
- ✅ Muestra contador de repeticiones (0 la primera vez)

**Logs en consola:**
```
📅 Verificando expiración de plan "Mi Plan"
   - Duración del plan: 1 semana
   - Activado: 23/12/2024
   - Semanas transcurridas: 1
   - Estado: ❌ EXPIRADO
📅 Plan "Mi Plan" ha finalizado (1 semanas de 1)
   ⚠️ Mostrando modal de finalización...
```

---

### Prueba 2: Plan de 3 Semanas
**Objetivo:** Verificar que el modal aparezca exactamente después de 3 semanas

**Pasos:**
1. Crea o activa un plan de **3 semanas**
2. Anota la fecha (ej: Lunes 23 de Diciembre)
3. Verifica cada semana:
   - **Semana 1** (23-29 Dic): No debe aparecer modal
   - **Semana 2** (30 Dic-5 Ene): No debe aparecer modal
   - **Semana 3** (6-12 Ene): No debe aparecer modal
   - **Lunes 13 Enero**: Debe aparecer modal

**Resultado Esperado:**
- ✅ Modal aparece solo al inicio de la semana 4
- ✅ Durante las 3 primeras semanas: NO modal

**Logs en semana 2:**
```
📅 Verificando expiración de plan "Plan 3 Semanas"
   - Duración del plan: 3 semanas
   - Activado: 23/12/2024
   - Semanas transcurridas: 1
   - Estado: ✅ ACTIVO
```

**Logs en semana 4 (expirado):**
```
📅 Verificando expiración de plan "Plan 3 Semanas"
   - Duración del plan: 3 semanas
   - Activado: 23/12/2024
   - Semanas transcurridas: 3
   - Estado: ❌ EXPIRADO
```

---

### Prueba 3: Editar Plan y Agregar Semanas (ANTES de que finalice)
**Objetivo:** Verificar que la app detecta cambios en `duration_weeks`

**Setup:**
- Plan de 2 semanas activado el Lunes 23 Diciembre
- Actualmente es Lunes 30 Diciembre (Semana 2)
- El plan expiraría el Lunes 6 Enero normalmente

**Pasos:**
1. Abre el plan
2. Toca "Editar Plan"
3. Agrega una **Semana 3**
4. Guarda el plan
5. Vuelve a la pantalla de entrenamientos
6. **Espera hasta el Lunes 6 Enero**
7. Verifica que NO aparezca el modal
8. **Espera hasta el Lunes 13 Enero**
9. Verifica que SÍ aparezca el modal

**Resultado Esperado:**
- ✅ El plan ahora dura 3 semanas (no 2)
- ✅ Modal aparece en Semana 4, no en Semana 3
- ✅ La app detectó automáticamente el cambio en `duration_weeks`

**Logs después de editar (en Semana 2):**
```
📅 Verificando expiración de plan "Mi Plan"
   - Duración del plan: 3 semanas  ← CAMBIÓ de 2 a 3
   - Activado: 23/12/2024
   - Semanas transcurridas: 1
   - Estado: ✅ ACTIVO
```

---

### Prueba 4: Editar Plan y Reducir Semanas
**Objetivo:** Verificar que si reduces duration_weeks, el modal aparezca antes

**Setup:**
- Plan de 4 semanas activado hace 3 semanas
- Actualmente es Semana 3 (todavía tiene 1 semana más)

**Pasos:**
1. Edita el plan
2. Elimina la Semana 4 (ahora es un plan de 3 semanas)
3. Guarda
4. Vuelve a entrenamientos
5. Verifica que el modal aparezca inmediatamente

**Resultado Esperado:**
- ✅ Modal aparece porque weeksPassed (3) >= duration_weeks (3)

---

### Prueba 5: Repetir Plan
**Objetivo:** Verificar que el contador de repeticiones incrementa correctamente

**Pasos:**
1. Plan de 1 semana expira
2. En el modal, toca "Repetir este plan"
3. Verifica que el plan se reactiva
4. Verifica que en la tarjeta del plan aparezca "🔄 1 repetición"
5. Espera 1 semana más
6. Verifica que aparezca el modal nuevamente
7. Repite de nuevo
8. Verifica que ahora diga "🔄 2 repeticiones"

**Resultado Esperado:**
- ✅ Contador incrementa cada vez que repites en una nueva semana
- ✅ Si desactivas y reactivas en la misma semana: NO incrementa

---

### Prueba 6: Semana Actual Automática (Plan Multi-Semana)
**Objetivo:** Verificar que al abrir el plan, muestra la semana correcta

**Setup:**
- Plan de 4 semanas activado hace 2 semanas

**Pasos:**
1. Abre la pantalla de detalle del plan
2. Verifica qué semana se muestra por defecto

**Resultado Esperado:**
- ✅ Muestra automáticamente **Semana 2**
- ✅ Indicador dice "✓ Semana actual"
- ✅ Puedes navegar a Semana 1 (dirá "✓ Completada")
- ✅ Puedes navegar a Semana 3 (dirá "⏳ Próxima")

**Logs:**
```
📅 Semana actual calculada: 2 de 4
```

---

## 🔄 Flujo Completo

### Semana 1 (Activación):
```
Plan de 3 semanas activado
└─ activated_at = "2024-12-23T10:00:00Z"
└─ last_week_monday = "2024-12-23"
└─ times_repeated = 0
```

### Semana 2:
```
Usuario abre app
└─ weeksPassed = 1
└─ 1 < 3 ✅ Activo
└─ Vista de plan: muestra "Semana 2" automáticamente
```

### Semana 3:
```
Usuario abre app
└─ weeksPassed = 2
└─ 2 < 3 ✅ Activo
└─ Vista de plan: muestra "Semana 3" automáticamente
```

### Semana 4 (Expiración):
```
Usuario abre app
└─ weeksPassed = 3
└─ 3 >= 3 ❌ Expirado
└─ Modal de finalización aparece
```

### Usuario elige "Repetir":
```
Plan reactivado
└─ activated_at = "2025-01-13T08:00:00Z" (nueva fecha)
└─ last_week_monday = "2025-01-13"
└─ times_repeated = 1 (incrementado)
```

---

## 🐛 Cómo Simular Expiración (Para Pruebas Rápidas)

Si no quieres esperar semanas reales, puedes simular en Supabase:

### Opción 1: Cambiar `activated_at` en el pasado
```sql
UPDATE workout_plans
SET activated_at = NOW() - INTERVAL '3 weeks'
WHERE id = 'TU_PLAN_ID';
```

### Opción 2: Cambiar `duration_weeks` a 0
```sql
UPDATE workout_plans
SET duration_weeks = 0
WHERE id = 'TU_PLAN_ID';
```

Después de hacer esto, recarga la app y el modal debería aparecer.

---

## ✅ Checklist Final

Antes de dar por completada la funcionalidad, verifica:

- [ ] Script SQL ejecutado en Supabase
- [ ] Plan de 1 semana muestra modal después de 1 semana
- [ ] Plan de 3 semanas muestra modal después de 3 semanas
- [ ] Editar plan y agregar semanas: modal se retrasa
- [ ] Editar plan y reducir semanas: modal aparece antes
- [ ] Contador de repeticiones incrementa correctamente
- [ ] Desactivar/activar en misma semana NO incrementa contador
- [ ] Vista de plan multi-semana muestra semana actual automáticamente
- [ ] Navegación entre semanas funciona con flechas
- [ ] Indicadores de estado ("actual", "completada", "próxima") correctos

---

## 📝 Notas Importantes

1. **Las semanas comienzan el lunes a las 00:00** y terminan el domingo a las 23:59
2. **Si activas un plan un miércoles**, la primera semana se cuenta desde ese miércoles hasta el domingo. El lunes siguiente es la Semana 2.
3. **Los cambios en `duration_weeks`** se detectan automáticamente cuando regresas a la pantalla de entrenamientos
4. **El modal solo aparece una vez** hasta que lo cierres eligiendo una opción
5. **Todos los logs** empiezan con 📅 para fácil búsqueda en consola



