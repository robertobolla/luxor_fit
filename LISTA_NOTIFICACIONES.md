# 🔔 Lista Completa de Notificaciones del Sistema

## 📋 Resumen
Este documento lista todas las notificaciones del sistema, explicando en qué contexto se aplican y por qué se activan.

---

## 🔄 Notificaciones Diarias (Programadas Fijas)

### 1. 💪 Recordatorio de Entrenamiento Diario
**ID:** `workout_reminder`  
**Tipo:** Notificación diaria programada  
**Horario:** 8:00 PM (20:00) todos los días  
**Frecuencia:** Diaria, repetitiva

**Mensaje:**
- Título: `💪 ¿Entrenaste hoy?`
- Cuerpo: `No olvides marcar tu entrenamiento como completado`

**Contexto:**
- Se programa automáticamente cuando el usuario configura sus notificaciones
- Se envía TODOS los días a las 8:00 PM
- Es una notificación genérica que recuerda al usuario registrar su entrenamiento

**Por qué se aplica:**
- Ayuda a mantener el hábito de registrar entrenamientos diariamente
- Evita que el usuario olvide marcar sus entrenamientos como completados
- Es una notificación de rutina que no depende del comportamiento del usuario

**Ubicación en código:** `src/services/notificationService.ts` - `scheduleWorkoutReminderNotification()`

---

### 2. 🍽️ Recordatorio de Almuerzo Diario
**ID:** `lunch_reminder`  
**Tipo:** Notificación diaria programada  
**Horario:** 2:00 PM (14:00) todos los días  
**Frecuencia:** Diaria, repetitiva

**Mensaje:**
- Título: `🍽️ ¿Ya almorzaste?`
- Cuerpo: `Registra tu almuerzo para llevar un mejor control de tu nutrición`

**Contexto:**
- Se programa automáticamente cuando el usuario configura sus notificaciones
- Se envía TODOS los días a las 2:00 PM
- Es una notificación genérica que recuerda al usuario registrar su almuerzo

**Por qué se aplica:**
- Ayuda a mantener el hábito de registrar comidas
- Facilita el seguimiento nutricional diario
- Es una notificación de rutina que no depende del comportamiento del usuario

**Ubicación en código:** `src/services/notificationService.ts` - `scheduleLunchReminderNotification()`

---

## 🧠 Notificaciones Inteligentes (Basadas en Comportamiento)

Estas notificaciones se evalúan y programan dinámicamente basándose en el comportamiento del usuario. Se espacian en el tiempo para evitar spam.

### 3. 💪 Recordatorio por Falta de Adherencia
**ID:** `missed_workout_reminder`  
**Tipo:** Notificación inteligente programada  
**Prioridad:** Media  
**Cooldown:** 24 horas entre notificaciones similares

**Mensaje:**
- Título: `💪 ¡No te rindas!`
- Cuerpo: `Llevas X días sin entrenar. Tu racha de Y días te está esperando.`

**Contexto de activación:**
- Se activa cuando:
  - El usuario tiene una racha activa (`currentStreak > 0`)
  - Han pasado 2 o más días desde el último entrenamiento
  - El usuario tiene un historial de entrenamientos previos

**Por qué se aplica:**
- Motiva a los usuarios que están perdiendo el hábito
- Protege la racha de entrenamiento del usuario
- Solo se activa si el usuario tiene una racha (no para nuevos usuarios)
- Evita que usuarios comprometidos abandonen después de unos días de descanso

**Ejemplo:** Si un usuario tenía una racha de 10 días y no entrena por 2 días, recibe esta notificación para motivarlo a volver.

---

### 4. 🔥 Celebración de Racha
**ID:** `streak_celebration`  
**Tipo:** Notificación inteligente programada  
**Prioridad:** Alta  
**Cooldown:** 12 horas entre notificaciones similares

**Mensaje:**
- Título: `🔥 ¡Racha increíble!`
- Cuerpo: Varía según la racha:
  - 3 días: `¡3 días consecutivos! Estás construyendo un hábito sólido.`
  - 7 días: `¡Una semana completa! Tu disciplina es admirable.`
  - 14 días: `¡2 semanas seguidas! Eres una máquina de consistencia.`
  - 30 días: `¡¡¡UN MES COMPLETO!!! Eres una inspiración.`
  - Múltiplos de 30: `¡X días consecutivos! Tu dedicación es extraordinaria.`

**Contexto de activación:**
- Se activa cuando el usuario alcanza hitos específicos en su racha:
  - Exactamente 3 días consecutivos
  - Exactamente 7 días consecutivos
  - Exactamente 14 días consecutivos
  - Cualquier múltiplo de 30 días (30, 60, 90, etc.)

**Por qué se aplica:**
- Reconoce y celebra los logros del usuario
- Refuerza positivamente el comportamiento consistente
- Motiva a mantener la racha activa
- Solo se activa en hitos específicos para evitar spam

**Ejemplo:** Si un usuario completa su día 7 consecutivo, recibe una notificación celebrando su primera semana completa.

---

### 5. 📊 Recordatorio de Meta Semanal
**ID:** `weekly_goal_reminder`  
**Tipo:** Notificación inteligente programada  
**Prioridad:** Media  
**Cooldown:** 48 horas entre notificaciones similares

**Mensaje:**
- Título: `📊 Meta semanal`
- Cuerpo: `Te faltan X entrenamientos para cumplir tu meta semanal. ¡Tú puedes!`

**Contexto de activación:**
- Se activa cuando:
  - Es fin de semana (sábado o domingo)
  - El usuario ha completado AL MENOS 1 entrenamiento esta semana (`weeklyCompleted > 0`)
  - El progreso semanal es menor al 80% (`weeklyProgress < 0.8`)
  - Ejemplo: Si la meta es 4 entrenamientos y solo ha completado 2, el progreso es 50% < 80%

**Por qué se aplica:**
- Recordatorio oportuno antes de que termine la semana
- Solo se activa en fin de semana cuando aún hay tiempo de recuperar
- No se activa si el usuario no ha entrenado nada (evita presión excesiva)
- Motiva a completar la meta semanal antes del final de la semana

**Ejemplo:** Usuario con meta de 4 entrenamientos/semana. El sábado solo ha completado 2 (50%), recibe recordatorio para completar los 2 faltantes.

---

### 6. ⏰ Sugerencia de Horario Óptimo
**ID:** `optimal_timing_suggestion`  
**Tipo:** Notificación inteligente programada  
**Prioridad:** Baja  
**Cooldown:** 6 horas entre notificaciones similares

**Mensaje:**
- Título: `⏰ Momento perfecto`
- Cuerpo: `Es tu hora favorita para entrenar. ¿Listo para mantener tu racha de X días?`

**Contexto de activación:**
- Se activa cuando:
  - El usuario tiene un horario promedio de entrenamiento calculado (`averageWorkoutTime` existe)
  - La hora actual está dentro de 1 hora antes de su horario promedio típico
  - El usuario tiene una racha activa (`currentStreak > 0`)

**Por qué se aplica:**
- Aprovecha el momento en que el usuario típicamente entrena
- Se basa en el comportamiento histórico del usuario
- Sugiere entrenar en el momento más natural para el usuario
- Solo se activa si el usuario tiene una racha (indica compromiso)

**Ejemplo:** Si un usuario típicamente entrena a las 7:00 PM, recibirá una notificación alrededor de las 6:00 PM sugiriendo que es momento de entrenar.

---

### 7. 🚀 Motivación para Nuevos Usuarios
**ID:** `new_user_motivation`  
**Tipo:** Notificación inteligente programada  
**Prioridad:** Alta  
**Cooldown:** 24 horas entre notificaciones similares

**Mensaje:**
- Título: `🚀 ¡Comienza tu viaje!`
- Cuerpo: `Tu primer entrenamiento te está esperando. Cada gran viaje comienza con un solo paso.`

**Contexto de activación:**
- Se activa cuando:
  - El usuario NO tiene racha activa (`currentStreak === 0`)
  - El usuario NO ha completado ningún entrenamiento esta semana (`weeklyCompleted === 0`)

**Por qué se aplica:**
- Ayuda a usuarios completamente nuevos a comenzar
- Motiva a dar el primer paso
- Es de alta prioridad porque es crucial para la retención de nuevos usuarios
- No se activa si el usuario ya ha comenzado (evita condescendencia)

**Ejemplo:** Usuario recién registrado que aún no ha completado ningún entrenamiento recibe esta notificación para motivarlo a comenzar.

---

### 8. 🏆 Recordatorio de Records Personales
**ID:** `pr_reminder`  
**Tipo:** Notificación inteligente programada  
**Prioridad:** Baja  
**Cooldown:** 12 horas entre notificaciones similares

**Mensaje:**
- Título: `🏆 ¡Es hora de superarte!`
- Cuerpo: `Tu próximo entrenamiento podría ser el de tu nuevo record personal. ¡Vamos!`

**Contexto de activación:**
- Se activa cuando:
  - Han pasado entre 1 y 3 días desde el último entrenamiento
  - El usuario tiene un historial de entrenamientos previos

**Por qué se aplica:**
- Motiva a entrenar después de un breve descanso
- Enfoca la motivación en superar records personales
- Solo se activa en un rango de tiempo específico (1-3 días) para evitar spam
- Ideal para usuarios que entrenan regularmente pero tienen días de descanso

**Ejemplo:** Usuario que entrenó hace 2 días recibe esta notificación para motivarlo a volver y superar su mejor marca.

---

## ⚡ Notificaciones Inmediatas (Respuesta a Acciones)

Estas notificaciones se envían inmediatamente después de que el usuario realiza una acción específica.

### 9. 🎉 Entrenamiento Completado
**ID:** `workout_completed` (immediate)  
**Tipo:** Notificación inmediata  
**Disparador:** Cuando el usuario marca un entrenamiento como completado

**Mensaje:**
- Título: `🎉 ¡Entrenamiento completado!`
- Cuerpo: `Excelente trabajo. Tu cuerpo te lo agradecerá.`
- Acción: `view_progress` (abre la pantalla de progreso)

**Contexto:**
- Se envía inmediatamente después de que el usuario guarda un entrenamiento completado
- No se programa, se envía al instante

**Por qué se aplica:**
- Refuerzo positivo inmediato después de completar un entrenamiento
- Celebra la acción del usuario en el momento
- Motiva a continuar con el hábito

**Ubicación en código:** 
- Activado en: `app/(tabs)/workout-day-detail.tsx` - `handleSaveCompletion()`
- Servicio: `src/services/smartNotifications.ts` - `sendImmediateNotification('workout_completed')`

---

### 10. 🏆 Nuevo Record Personal (PR)
**ID:** `pr_achieved` (immediate)  
**Tipo:** Notificación inmediata  
**Disparador:** Cuando el usuario registra un nuevo record personal

**Mensaje:**
- Título: `🏆 ¡Nuevo record personal!`
- Cuerpo: `¡Increíble! Has superado tu mejor marca en [nombre del ejercicio].`
- Acción: `pr` (abre detalles del record)

**Contexto:**
- Se envía inmediatamente después de que el usuario guarda un nuevo record personal
- Solo se envía si el record guardado es realmente un PR (no solo un record más)
- Incluye el nombre del ejercicio en el mensaje

**Por qué se aplica:**
- Celebra un logro importante del usuario
- Refuerzo positivo para superarse a sí mismo
- Motiva a seguir mejorando

**Ubicación en código:**
- Activado en: `src/components/PersonalRecordModal.tsx` - `handleSaveRecord()`
- Servicio: `src/services/smartNotifications.ts` - `sendImmediateNotification('pr_achieved', { exercise })`

---

### 11. 🎯 Meta Alcanzada
**ID:** `goal_reached` (immediate)  
**Tipo:** Notificación inmediata  
**Disparador:** Cuando el usuario alcanza una meta específica

**Mensaje:**
- Título: `🎯 ¡Meta alcanzada!`
- Cuerpo: `¡Felicidades! Has cumplido tu meta de [nombre de la meta].`
- Acción: `goal` (abre detalles de la meta)

**Contexto:**
- Se envía cuando el usuario alcanza una meta predefinida
- Actualmente está preparado pero puede no estar activamente usado en todas las metas

**Por qué se aplica:**
- Celebra el logro de objetivos del usuario
- Refuerzo positivo para la planificación y cumplimiento de metas
- Motiva a establecer nuevas metas

**Ubicación en código:**
- Servicio: `src/services/smartNotifications.ts` - `sendImmediateNotification('goal_reached', { goal })`

---

## 📝 Notas Importantes

### Sistema de Espaciado
- Las notificaciones inteligentes se programan con espaciado de días (hoy, mañana, pasado mañana, etc.)
- Cada notificación se programa para un día diferente hasta un máximo de 7 días
- Horarios calculados basados en el comportamiento del usuario o por defecto (6:00 PM)
- Variación de ±30 minutos en el horario para evitar precisión exacta

### Cooldown y Protección
- Cada tipo de notificación tiene un cooldown específico (horas entre notificaciones similares)
- El sistema no reprograma notificaciones si ya se programaron hace menos de 24 horas
- Verifica si hay notificaciones válidas pendientes antes de reprogramar
- Solo cancela notificaciones inteligentes, preserva las notificaciones diarias programadas

### Prioridades
- **Alta:** Celebración de racha, Motivación para nuevos usuarios
- **Media:** Recordatorio por falta de adherencia, Recordatorio de meta semanal
- **Baja:** Sugerencia de horario óptimo, Recordatorio de PR

### Notificaciones Diarias vs Inteligentes
- **Diarias:** Se envían siempre a la misma hora, todos los días (workout_reminder, lunch_reminder)
- **Inteligentes:** Se evalúan y programan dinámicamente basadas en el comportamiento del usuario
- **Inmediatas:** Se envían al instante como respuesta a acciones del usuario

---

## 📊 Resumen de Contextos

| Notificación | Tipo | Se activa cuando... |
|-------------|------|-------------------|
| Recordatorio Diario Entrenamiento | Diaria | Todos los días a las 8:00 PM |
| Recordatorio Diario Almuerzo | Diaria | Todos los días a las 2:00 PM |
| Falta de Adherencia | Inteligente | 2+ días sin entrenar + racha activa |
| Celebración Racha | Inteligente | Racha = 3, 7, 14, o múltiplo de 30 |
| Meta Semanal | Inteligente | Fin de semana + progreso < 80% |
| Horario Óptimo | Inteligente | Hora actual ≈ hora típica de entrenamiento - 1h |
| Nuevo Usuario | Inteligente | Sin racha + sin entrenamientos esta semana |
| Recordatorio PR | Inteligente | 1-3 días desde último entrenamiento |
| Entrenamiento Completado | Inmediata | Usuario marca entrenamiento como completado |
| Nuevo PR | Inmediata | Usuario registra un nuevo record personal |
| Meta Alcanzada | Inmediata | Usuario alcanza una meta específica |

---

## 🔧 Configuración

Las notificaciones se configuran automáticamente cuando el usuario inicia sesión por primera vez. El usuario puede ajustar las preferencias en la pantalla de configuración de notificaciones (`app/notification-settings.tsx`).

