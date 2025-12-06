# ⚠️ Problema: Admin ve Paywall

## 👤 Usuario Afectado

**andresgonzalezgandolfo@gmail.com**

---

## 🔍 El Problema

El usuario tiene rol de admin en el dashboard pero la app le pide pagar.

---

## ✅ Solución Rápida

### **Paso 1: Abre Supabase SQL Editor**

1. Ve a https://supabase.com
2. Abre tu proyecto **FitMind**
3. Click en "**SQL Editor**" (menú lateral)

### **Paso 2: Ejecuta Este Script**

Copia y pega el archivo `VERIFICAR_Y_ARREGLAR_ADMIN_ANDRES.sql` completo en el editor y haz click en **"Run"**.

### **Paso 3: Verifica el Resultado**

Deberías ver al final:

```
✅ ADMIN CORRECTO
```

---

## 🔄 Después de Ejecutar el Script

Pídele a Andrés que:

1. **Cierre la app completamente**

   - iOS: Swipe up desde abajo y swipe up la app
   - Android: Recientes y swipe up la app

2. **Vuelva a abrir la app**

3. **Haga login nuevamente** (si se cerró la sesión)

---

## 🛠️ Si Aún No Funciona

### **Opción A: Usar el Botón de Debug (Solo en Dev)**

Si tienes la app en modo desarrollo:

1. En la pantalla de paywall hay un botón: **"🔄 Refrescar Suscripción (Debug)"**
2. Click en ese botón
3. Debería refrescar el estado y dar acceso

### **Opción B: Verificar Manualmente**

Ejecuta este query en Supabase para ver el estado:

```sql
SELECT
  up.email,
  up.name,
  ar.role_type as role_en_admin_roles,
  ar.is_active as admin_activo,
  ar.user_id
FROM user_profiles up
LEFT JOIN admin_roles ar ON LOWER(ar.email) = LOWER(up.email)
WHERE LOWER(up.email) = 'andresgonzalezgandolfo@gmail.com';
```

**Debe mostrar:**

- `role_en_admin_roles`: `admin`
- `admin_activo`: `true`
- `user_id`: Debería tener un valor (el ID de Clerk)

Si `user_id` está vacío o `null`, ese es el problema.

---

## 📝 ¿Qué Hace el Script?

1. **Verifica** si el usuario está en `admin_roles`
2. **Agrega** el usuario si no está
3. **Activa** el rol admin si está inactivo
4. **Sincroniza** el `user_id` de Clerk
5. **Verifica** que todo esté correcto

---

## 🔍 ¿Por Qué Pasó Esto?

El sistema verifica en este orden:

1. ¿El usuario está en `admin_roles` con su `user_id`?
2. Si no, ¿está en `admin_roles` con su `email`?
3. Si está por email, actualiza el `user_id` automáticamente

**Problema posible:**

- El usuario no estaba en `admin_roles` cuando hizo login
- O el `user_id` no coincidía con el de Clerk

---

## ✅ Después de Arreglarlo

El usuario debe ver:

- ✅ Acceso completo a la app
- ❌ Sin pantalla de pago
- ✅ Todas las funcionalidades disponibles

---

## 📊 Logs de Debug

Si quieres ver qué está pasando, busca en los logs de la app:

```
🔍 checkAdminAccess: Verificando admin para user_id: ...
📧 Email del usuario: andresgonzalezgandolfo@gmail.com
✅ Admin encontrado por email: ...
```

Si ves:

```
❌ No se encontró admin con email: andresgonzalezgandolfo@gmail.com
```

Entonces el usuario **NO** está en `admin_roles`, y el script lo arreglará.

---

**¿Necesitas más ayuda?** Avísame si el problema persiste.
