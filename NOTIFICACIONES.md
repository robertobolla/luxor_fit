# 🔔 Sistema de Notificaciones Push

## ✅ Implementado

### **Notificaciones Programadas:**

1. **💪 Recordatorio de Entrenamiento**

   - **Hora**: 8:00 PM (20:00)
   - **Frecuencia**: Diaria
   - **Mensaje**: "¿Entrenaste hoy? No olvides marcar tu entrenamiento como completado"
   - **Acción**: Al hacer clic → Va a pestaña Entrenar

2. **🍽️ Recordatorio de Almuerzo**
   - **Hora**: 2:00 PM (14:00)
   - **Frecuencia**: Diaria
   - **Mensaje**: "¿Ya almorzaste? Registra tu almuerzo para llevar un mejor control"
   - **Acción**: Al hacer clic → Va a Registrar Comida

### **Sistema Inteligente:**

Las notificaciones verifican si ya realizaste la acción:

- ✅ Si ya entrenaste → NO envía notificación
- ✅ Si ya registraste almuerzo → NO envía notificación
- ❌ Si NO lo hiciste → Envía recordatorio

### **Logros (Preparado para futuro):**

Función lista para enviar notificaciones de logros:

```typescript
sendAchievementNotification(
  "Primera Semana Completada",
  "¡Felicitaciones! Has completado tu primera semana de entrenamiento",
  "achievement_week_1"
);
```

---

## 📱 Cómo Funciona

### **Configuración Automática:**

1. Cuando el usuario inicia sesión, se solicitan permisos de notificaciones
2. Se programan automáticamente los recordatorios diarios
3. Los listeners están siempre escuchando para manejar clics

### **Personalización de Horarios:**

Para cambiar los horarios, edita en `src/services/notificationService.ts`:

```typescript
// Entrenamiento (línea ~75)
const trigger: Notifications.DailyNotificationTrigger = {
  hour: 20, // <-- Cambiar hora (0-23)
  minute: 0, // <-- Cambiar minuto (0-59)
  repeats: true,
};

// Almuerzo (línea ~103)
const trigger: Notifications.DailyNotificationTrigger = {
  hour: 14, // <-- Cambiar hora
  minute: 0, // <-- Cambiar minuto
  repeats: true,
};
```

---

## 🚀 Próximos Pasos (Sistema de Logros)

### Logros Sugeridos:

1. **🔥 Rachas**

   - 3 días consecutivos
   - 7 días consecutivos
   - 30 días consecutivos

2. **💪 Entrenamientos**

   - Primer entrenamiento
   - 10 entrenamientos completados
   - 50 entrenamientos completados
   - Completar una semana entera

3. **🥗 Nutrición**

   - Registrar 7 días consecutivos
   - Alcanzar meta de proteína 10 veces
   - Registrar 100 comidas

4. **📊 Progreso**
   - Subir primera foto
   - Perder primeros 5kg
   - Ganar primeros 5kg
   - Alcanzar peso objetivo

### Cómo Implementar:

1. Crear tabla `achievements` en Supabase
2. Crear tabla `user_achievements` (logros desbloqueados)
3. Verificar condiciones después de cada acción
4. Llamar `sendAchievementNotification()` cuando se desbloquee

---

## 🧪 Pruebas

### **Probar Notificaciones:**

```typescript
// En cualquier componente:
import { sendAchievementNotification } from "@/services/notificationService";

// Enviar notificación de prueba
await sendAchievementNotification(
  "Prueba",
  "Esta es una notificación de prueba",
  "test_123"
);
```

### **Ver Notificaciones Programadas:**

```typescript
import * as Notifications from "expo-notifications";

const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log("📅 Notificaciones programadas:", scheduled);
```

### **Cancelar Todas:**

```typescript
import { cancelAllNotifications } from "@/services/notificationService";

await cancelAllNotifications();
```

---

## ⚠️ Notas Importantes

1. **Simulador iOS**: Las notificaciones push NO funcionan en el simulador de iOS, solo en dispositivos físicos.

2. **Permisos**: La app solicita permisos automáticamente al iniciar sesión.

3. **Horarios**: Las notificaciones usan la hora local del dispositivo.

4. **Testing**: Para probar en desarrollo, puedes cambiar los horarios a minutos futuros.

5. **Build**: Para que funcionen en producción, necesitas hacer un build con EAS:
   ```bash
   npx eas build --platform android
   npx eas build --platform ios
   ```

---

## 🎯 Características NO Implementadas (por tu solicitud)

- ❌ Recordatorio de hidratación (explícitamente excluido)
- ❌ Mensajes motivacionales genéricos (esperando sistema de logros)

---

## 📝 Funciones Disponibles

```typescript
// Configurar todas las notificaciones del usuario
setupUserNotifications(userId: string)

// Programar recordatorio de entrenamiento
scheduleWorkoutReminderNotification(userId: string)

// Programar recordatorio de almuerzo
scheduleLunchReminderNotification(userId: string)

// Verificar y enviar recordatorios inteligentes
checkAndSendSmartReminders(userId: string)

// Enviar notificación de logro
sendAchievementNotification(title: string, body: string, achievementId: string)

// Cancelar todas las notificaciones
cancelAllNotifications()

// Solicitar permisos
registerForPushNotificationsAsync()
```

---

## 🔧 Troubleshooting

**Problema**: No aparecen notificaciones

- ✅ Verificar permisos en configuración del teléfono
- ✅ Verificar que estás en dispositivo físico (no simulador)
- ✅ Verificar logs para errores

**Problema**: Notificaciones no se programan

- ✅ Verificar que el usuario esté autenticado
- ✅ Ver logs en consola para errores
- ✅ Verificar formato de hora (0-23)

**Problema**: Al hacer clic no navega

- ✅ Verificar que la app esté abierta
- ✅ Verificar logs del listener
- ✅ Verificar rutas en `_layout.tsx`
