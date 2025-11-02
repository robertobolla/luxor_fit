# 🏋️ Configurar Creación de Usuarios desde Dashboard

## 📋 Resumen

Ahora puedes crear usuarios directamente desde el dashboard de empresarios. Cuando se crea un usuario:
1. Se crea automáticamente en Clerk
2. Se asocia al gimnasio con acceso gratuito
3. Se envía un email de invitación para establecer contraseña
4. Al iniciar sesión por primera vez, ya tiene acceso sin pagar

---

## 🚀 Paso 1: Configurar Edge Function

### 1.1 Desplegar la Edge Function

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Haz clic en **"Create a new function"**
3. Nombre: `create-gym-user`
4. Copia el contenido de `supabase_edge_functions_create-gym-user/index.ts`
5. Pega en el editor y despliega

### 1.2 Configurar Variables de Entorno

En Supabase Dashboard → **Edge Functions** → **Settings** → **Secrets**, agrega:

- `CLERK_SECRET_KEY`: Tu clave secreta de Clerk (obténla desde [Clerk Dashboard](https://dashboard.clerk.com) → **API Keys** → **Secret key**)

**IMPORTANTE:** Esta es la clave **SECRET**, no la pública. Empieza con `sk_test_` o `sk_live_`.

Las otras variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) ya deberían estar configuradas.

---

## 🎯 Paso 2: Cómo Funciona

### Flujo Completo:

1. **Admin/Empresario crea usuario:**
   - Va a "Empresarios" → Selecciona gimnasio → "Agregar Usuario"
   - Selecciona "Crear Nuevo Usuario"
   - Ingresa email y nombre (opcional)
   - Selecciona período (1 mes o 1 año)
   - Clic en "Crear Usuario"

2. **Sistema automático:**
   - Edge Function crea usuario en Clerk
   - Crea registro en `gym_members` con fecha de expiración
   - Clerk envía email de invitación al usuario

3. **Usuario recibe email:**
   - Abre el email de Clerk
   - Establece su contraseña
   - Inicia sesión en la app móvil

4. **Usuario en la app:**
   - Al iniciar sesión, ya tiene acceso gratuito
   - Completa onboarding
   - Tiene acceso completo sin suscripción

---

## ✅ Ventajas

- ✅ **Sin pasos manuales**: Todo es automático
- ✅ **Acceso inmediato**: Usuario tiene acceso desde el primer inicio de sesión
- ✅ **Gestión centralizada**: Admin controla quién tiene acceso
- ✅ **Fechas de expiración**: Control de cuándo expira el acceso

---

## ⚠️ Notas Importantes

1. **Email único**: Si el email ya existe en Clerk, el sistema lo asociará al gimnasio en lugar de crear uno nuevo.

2. **Invitación de Clerk**: Clerk enviará automáticamente un email de invitación. El usuario debe establecer su contraseña desde ese email.

3. **Variables de entorno**: Asegúrate de tener `CLERK_SECRET_KEY` configurada en Supabase Edge Functions.

---

## 🧪 Probar

1. Ve al dashboard → Empresarios → Selecciona un gimnasio
2. Clic en "Agregar Usuario"
3. Selecciona "Crear Nuevo Usuario"
4. Ingresa un email de prueba
5. Selecciona período (1 mes o 1 año)
6. Clic en "Crear Usuario"
7. Verifica que aparezca en la lista de usuarios del gimnasio
8. El usuario recibirá un email de Clerk para establecer contraseña

---

¿Necesitas ayuda con algún paso?

