# 🚀 Checklist Pre-Producción - FitMind

## 📋 **Paso 1: Ejecutar Auditoría de Base de Datos**

```sql
AUDITORIA_PRE_PRODUCCION.sql
```

Este script detecta:
- ✅ Usuarios sin perfil completo
- ✅ Miembros de gimnasio sin empresario válido
- ✅ Empresarios sin configuración completa
- ✅ Empresarios temporales activos
- ✅ Gimnasios duplicados
- ✅ Registros huérfanos
- ✅ Relaciones inválidas
- ✅ Funciones RPC faltantes

---

## 🐛 **Problemas Críticos Detectados**

### **1. Sistema de Roles**

**Problema:** La tabla `admin_roles` tiene constraint único por `user_id`, permitiendo solo un rol por usuario.

**Solución:**
- ✅ Ya implementado: Los usuarios son empresarios O admins O socios
- ⚠️ **Acción requerida:** Documentar que no se pueden tener roles múltiples

**Script:**
```sql
-- Verificar usuarios con roles conflictivos
SELECT user_id, COUNT(*) as roles 
FROM admin_roles 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

---

### **2. Gimnasios Duplicados**

**Problema:** Pueden existir múltiples gimnasios con el mismo nombre.

**Solución:** Agregar constraint único (ya incluido en `CONSOLIDAR_HOCKEY_EMPRESARIO_FIX.sql`)

```sql
CREATE UNIQUE INDEX admin_roles_gym_name_unique 
ON admin_roles (LOWER(gym_name)) 
WHERE role_type = 'empresario' AND is_active = true;
```

**Status:** ✅ Solucionado en el script de consolidación

---

### **3. Push Notifications**

**Pendiente:**
- ⚠️ Edge Function `send-push-notification` debe estar desplegada
- ⚠️ Extensión `http` debe estar habilitada
- ⚠️ Tabla `user_push_tokens` debe existir

**Scripts necesarios:**
1. `CONFIGURAR_PUSH_NOTIFICATIONS.sql`
2. `SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql`
3. Edge Function (ver `PUSH_NOTIFICATIONS_SETUP.md`)

---

### **4. Función get_empresario_users**

**Problema:** Devolvía todos los usuarios si era admin, en lugar de filtrar por empresario.

**Solución:** ✅ Ya corregido en `CORREGIR_CONTEO_USUARIOS_EMPRESARIOS.sql`

**Verificar:**
```sql
-- Debe devolver solo usuarios del empresario especificado
SELECT * FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');
```

---

### **5. Dashboard Empresario**

**Problema:** Función `get_empresario_dashboard_stats` tenía error de GROUP BY.

**Solución:** ✅ Ya corregido en `FUNCIONES_DASHBOARD_EMPRESARIO.sql`

**Verificar:**
```sql
SELECT * FROM get_empresario_dashboard_stats('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');
```

---

## ⚠️ **Problemas Potenciales**

### **1. RLS Policies**

**Verificar que las policies estén correctas:**

```sql
-- Ver todas las policies de gym_members
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'gym_members';

-- Ver policies de user_notifications
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_notifications';
```

**Acción requerida:** Verificar que:
- Empresarios solo ven sus propios miembros
- Admins pueden ver todo
- Usuarios solo ven sus propias notificaciones

---

### **2. Validaciones Faltantes en el Dashboard**

**En `CreateUser.tsx` y `EmpresarioUsers.tsx`:**

```typescript
// ⚠️ Falta validación de email
// Agregar:
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  alert('Email inválido');
  return;
}
```

---

### **3. Error Handling en servicios**

**Problema:** Algunos servicios devuelven `[]` en error en lugar de lanzar excepción.

**Ejemplo en `adminService.ts`:**
```typescript
// ❌ Actual:
} catch (error) {
  console.error('Error:', error);
  return [];
}

// ✅ Debería ser:
} catch (error) {
  console.error('Error:', error);
  throw error; // O manejar el error apropiadamente
}
```

---

### **4. Manejo de Fechas**

**Problema:** Inconsistencia entre formatos de fecha.

**Acción requerida:**
- Verificar que todas las fechas usen ISO 8601
- Verificar timezone en `subscription_expires_at`
- Agregar validación de fechas futuras

```typescript
// Helper para validar fechas
function isValidFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date > new Date();
}
```

---

## 📱 **App Móvil**

### **1. Push Notifications Setup**

**Pendiente:**
1. ✅ Código implementado en `app/_layout.tsx`
2. ⚠️ Instalar dependencias:
   ```bash
   npx expo install expo-notifications expo-device expo-constants
   ```
3. ⚠️ Configurar `app.json` con projectId
4. ⚠️ Build con EAS

---

### **2. Notificaciones en la App**

**Verificar:**
- Icono 🔔 aparece en Home screen
- Modal de notificaciones funciona
- Push notifications llegan correctamente
- Badge count se actualiza

---

## 🔐 **Seguridad**

### **1. Variables de Entorno**

**Verificar que estén configuradas:**

**Dashboard Web:**
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Supabase Edge Functions:**
- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**App Móvil:**
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

### **2. CORS**

**Verificar configuración en Edge Functions:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 📊 **Performance**

### **1. Índices Faltantes**

```sql
-- Verificar índices importantes
SELECT 
  schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN (
  'user_profiles',
  'gym_members',
  'admin_roles',
  'workout_plans',
  'subscriptions'
)
ORDER BY tablename, indexname;
```

**Índices recomendados:**
```sql
-- Si no existen, crear:
CREATE INDEX IF NOT EXISTS idx_gym_members_empresario_id ON gym_members(empresario_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_user_id ON gym_members(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_email ON admin_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
```

---

### **2. Queries Lentas**

**Verificar planes de ejecución para:**
- `get_empresario_dashboard_stats`
- `get_student_stats`
- `empresario_stats` view

```sql
EXPLAIN ANALYZE 
SELECT * FROM empresario_stats;
```

---

## ✅ **Checklist Final Pre-Deploy**

### **Base de Datos:**
- [ ] Ejecutar `AUDITORIA_PRE_PRODUCCION.sql`
- [ ] Ejecutar `CONSOLIDAR_HOCKEY_EMPRESARIO_FIX.sql`
- [ ] Ejecutar `CORREGIR_CONTEO_USUARIOS_EMPRESARIOS.sql`
- [ ] Ejecutar `SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql`
- [ ] Ejecutar `CONFIGURAR_PUSH_NOTIFICATIONS.sql`
- [ ] Habilitar extensión `http`: `CREATE EXTENSION IF NOT EXISTS http;`
- [ ] Verificar que no hay registros huérfanos
- [ ] Verificar constraint único para gym_name

### **Edge Functions:**
- [ ] Desplegar `send-push-notification`
- [ ] Desplegar `create-gym-user`
- [ ] Configurar secrets (CLERK_SECRET_KEY, etc.)
- [ ] Probar Edge Functions con invoke

### **Dashboard Web:**
- [ ] Variables de entorno configuradas
- [ ] Build de producción: `npm run build`
- [ ] Verificar que no hay console.errors
- [ ] Probar flujo completo de empresario
- [ ] Probar sistema de mensajería
- [ ] Verificar navegación admin/empresario

### **App Móvil:**
- [ ] Instalar dependencias de notificaciones
- [ ] Configurar app.json con projectId
- [ ] Build con EAS: `eas build --profile production`
- [ ] Probar push notifications en dispositivo real
- [ ] Probar icono de notificaciones
- [ ] Verificar que lucas aparece en stats

### **Testing:**
- [ ] Crear usuario empresario nuevo
- [ ] Agregar usuario a gimnasio
- [ ] Enviar mensaje desde empresario
- [ ] Verificar notificación en app
- [ ] Ver stats de usuario
- [ ] Probar dashboard empresario
- [ ] Cambiar roles (admin → empresario)

---

## 🚨 **Problemas Conocidos (No Críticos)**

1. **Empresarios temporales:** Pueden quedar activos si se crea desde admin panel. **Solución:** Desactivar manualmente o ejecutar cleanup.

2. **Nombres duplicados:** Gym_name puede tener mayúsculas/minúsculas diferentes. **Solución:** Usar LOWER() en el constraint único.

3. **Edge Functions timeout:** En la primera llamada puede tardar (cold start). **Solución:** Normal, la segunda llamada será rápida.

4. **Email obligatorio:** En gym_members el email es nullable. **Solución:** Validar en frontend que email no esté vacío.

---

## 📞 **Contacto de Emergencia**

Si encuentras errores críticos en producción:

1. Verificar logs de Supabase Dashboard → Logs
2. Verificar logs de Edge Functions
3. Verificar console de navegador (F12)
4. Ejecutar script de auditoría para diagnóstico
5. Hacer rollback si es necesario

---

## ✅ **¡Listo para Producción!**

Una vez completado este checklist:
- ✅ Base de datos limpia y consistente
- ✅ Todas las funciones RPC funcionando
- ✅ Sistema de notificaciones operativo
- ✅ Dashboard web funcional
- ✅ App móvil con push notifications

**Última verificación:** Ejecutar `AUDITORIA_PRE_PRODUCCION.sql` y confirmar que no hay problemas críticos.

