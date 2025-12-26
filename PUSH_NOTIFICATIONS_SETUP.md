# 📱 Configuración de Push Notifications

Esta guía te ayudará a configurar el sistema completo de notificaciones push para que los miembros del gimnasio reciban mensajes desde la app móvil.

---

## ✅ **Lo que ya está hecho:**

- ✅ Componente `NotificationBell` en la app móvil
- ✅ Icono de notificaciones en Home screen (al lado de mensajes directos)
- ✅ Modal de notificaciones con lista, contador, y marcar como leído
- ✅ Sistema de mensajería en el dashboard web para empresarios
- ✅ Tablas SQL (`gym_messages`, `user_notifications`)
- ✅ Servicio de push notifications (`pushNotificationService.ts`)

---

## 📋 **Pasos para Activar Push Notifications:**

### **1️⃣ Ejecutar el Script SQL**

En Supabase SQL Editor, ejecuta:

```sql
CONFIGURAR_PUSH_NOTIFICATIONS.sql
```

Esto creará:

- Tabla `user_push_tokens` (para almacenar tokens de dispositivos)
- Función `get_push_tokens_for_users` (para obtener tokens)
- Políticas RLS para seguridad

---

### **2️⃣ Instalar Dependencias (si no están instaladas)**

En tu proyecto React Native:

```bash
npx expo install expo-notifications expo-device expo-constants
```

---

### **3️⃣ Configurar `app.json`**

Asegúrate de que tu `app.json` tenga la configuración de notificaciones:

```json
{
  "expo": {
    "name": "FitMind",
    "slug": "fitmind",
    "version": "1.0.0",
    "extra": {
      "eas": {
        "projectId": "TU_PROJECT_ID_AQUI"
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#F7931E",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#F7931E",
      "androidMode": "default",
      "androidCollapsedTitle": "Nuevo mensaje"
    },
    "android": {
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

---

### **4️⃣ Obtener el Project ID de EAS**

Si aún no tienes un Project ID:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Crear proyecto (si no existe)
eas init

# Obtener el projectId
eas project:info
```

Copia el `projectId` y agrégalo a `app.json` en `extra.eas.projectId`.

---

### **5️⃣ Registrar el Dispositivo al Iniciar Sesión**

En tu componente de autenticación o `App.tsx`, agrega:

```typescript
import { useUser } from "@clerk/clerk-expo";
import { registerForPushNotificationsAsync } from "@/services/pushNotificationService";
import { useEffect } from "react";

function App() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user?.id) {
      // Registrar para push notifications
      registerForPushNotificationsAsync(user.id);
    }
  }, [isSignedIn, user?.id]);

  // ... resto de tu código
}
```

---

### **6️⃣ Crear Edge Function para Enviar Push Notifications**

Crea una Edge Function en Supabase:

**Archivo:** `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const { userIds, title, body, data } = await req.json();

    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obtener push tokens de los usuarios
    const { data: tokens, error } = await supabaseClient.rpc(
      "get_push_tokens_for_users",
      { p_user_ids: userIds }
    );

    if (error) throw error;

    // Preparar mensajes para Expo
    const messages = tokens.map((token: any) => ({
      to: token.push_token,
      sound: "default",
      title: title,
      body: body,
      data: data || {},
      badge: 1,
      priority: "high",
      channelId: "default",
    }));

    // Enviar notificaciones a Expo
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
```

**Desplegar la Edge Function:**

```bash
supabase functions deploy send-push-notification
```

---

### **7️⃣ Modificar la Función `send_gym_message` para Llamar a la Edge Function**

Agrega al final de la función SQL `send_gym_message`:

```sql
-- Llamar a la Edge Function para enviar push notifications
PERFORM http_post(
  url := 'https://TU_SUPABASE_PROJECT_ID.supabase.co/functions/v1/send-push-notification',
  headers := json_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'token'
  ),
  body := json_build_object(
    'userIds', v_recipient_list,
    'title', p_message_title,
    'body', p_message_body,
    'data', json_build_object('type', 'gym_message', 'messageId', v_message_id)
  )::text
);
```

---

### **8️⃣ Habilitar HTTP Extension en Supabase**

En Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS http;
```

Esto permite que las funciones SQL llamen a Edge Functions.

---

### **9️⃣ Agregar Listeners en la App**

En `App.tsx` o en un hook global:

```typescript
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from "@/services/pushNotificationService";

useEffect(() => {
  // Listener cuando se recibe una notificación (app abierta)
  const receivedSubscription = addNotificationReceivedListener(
    (notification) => {
      console.log("Notificación recibida:", notification);
      // Aquí puedes mostrar una alerta o actualizar el badge
    }
  );

  // Listener cuando el usuario toca la notificación
  const responseSubscription = addNotificationResponseReceivedListener(
    (response) => {
      console.log("Notificación tocada:", response);
      const data = response.notification.request.content.data;

      // Navegar a la pantalla de notificaciones
      if (data.type === "gym_message") {
        router.push("/home"); // O la ruta que prefieras
      }
    }
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}, []);
```

---

### **🔟 Probar el Sistema**

1. **Ejecuta el script SQL** `CONFIGURAR_PUSH_NOTIFICATIONS.sql`
2. **Instala la app** en un dispositivo físico (no funciona en emulador)
3. **Inicia sesión** como usuario miembro de un gimnasio
4. **Desde el dashboard web**, como empresario:
   - Ve a la pestaña **"Mensajería"**
   - Envía un mensaje a todos o a usuarios seleccionados
5. **En la app móvil**, deberías:
   - Recibir una **push notification**
   - Ver el badge en el icono 🔔
   - Poder abrir el modal y ver la notificación

---

## 🎯 **Flujo Completo:**

1. **Empresario** (dashboard web) → Envía mensaje desde "Mensajería"
2. **Backend** (SQL) → Guarda en `gym_messages` y `user_notifications`
3. **Edge Function** → Envía push notifications a Expo
4. **Expo** → Envía notificaciones a dispositivos iOS/Android
5. **Usuario** (app móvil) → Recibe push notification
6. **App** → Muestra badge en icono 🔔
7. **Usuario** → Toca icono, ve modal con notificaciones

---

## 🔧 **Solución de Problemas:**

### **No se reciben notificaciones:**

- Verifica que estés en un dispositivo físico (no emulador)
- Asegúrate de que los permisos de notificación estén concedidos
- Revisa que el `projectId` en `app.json` sea correcto
- Verifica que la Edge Function esté desplegada

### **Token no se guarda:**

- Revisa las políticas RLS de `user_push_tokens`
- Verifica que el `user_id` exista en `user_profiles`

### **Edge Function falla:**

- Revisa los logs en Supabase Dashboard → Edge Functions
- Verifica que `http` extension esté habilitada

---

## 📚 **Recursos:**

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [EAS CLI Documentation](https://docs.expo.dev/build/setup/)

---

¡Listo! Con estos pasos tu sistema de notificaciones push estará completamente funcional. 🚀
