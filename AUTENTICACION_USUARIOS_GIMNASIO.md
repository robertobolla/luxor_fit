# 🔐 Autenticación de Usuarios Creados desde Dashboard

## 📋 Flujo de Autenticación

Cuando se crea un usuario desde el dashboard de empresarios, ese usuario puede iniciar sesión de **dos formas diferentes**:

### Opción 1: Email y Contraseña 📧

1. **Usuario recibe email de invitación**
   - Clerk envía un email automáticamente al correo registrado
   - El email contiene un link para establecer su contraseña

2. **Usuario establece contraseña**
   - Hace clic en el link del email
   - Establece su contraseña
   - Luego puede iniciar sesión en la app con email/contraseña

3. **Usuario inicia sesión**
   - Abre la app móvil
   - Ingresa email y contraseña
   - ✅ Ya tiene acceso gratuito (vinculado al gimnasio)

### Opción 2: Google OAuth 🔵

1. **Usuario NO necesita recibir email**
   - Puede usar Google OAuth directamente sin necesidad del email de invitación

2. **Usuario inicia sesión con Google**
   - Abre la app móvil
   - Hace clic en "Iniciar sesión con Google"
   - Selecciona su cuenta de Google (debe ser el mismo email registrado)

3. **Clerk vincula automáticamente**
   - Si el email de Google coincide con el email del usuario creado desde el dashboard
   - Clerk automáticamente vincula la cuenta OAuth con el usuario existente
   - ✅ Ya tiene acceso gratuito (vinculado al gimnasio)

---

## ✅ Cómo Funciona Técnicamente

### Cuando se crea el usuario desde el dashboard:

1. **Edge Function crea usuario en Clerk:**
   ```typescript
   {
     email_addresses: [email],
     skip_password_requirement: true,
     // ... metadata
   }
   ```

2. **Clerk crea el usuario sin contraseña**
   - El usuario existe en Clerk con ese email
   - Puede establecer contraseña O usar OAuth

3. **Usuario se registra en la app:**
   - Si usa **email/contraseña**: establece contraseña desde el email
   - Si usa **Google OAuth**: Clerk vincula automáticamente por email

4. **Onboarding detecta membresía:**
   - El código en `app/onboarding.tsx` verifica si el `user_id` está en `gym_members`
   - Si está, el usuario ya tiene acceso gratuito ✅

---

## 🎯 Casos de Uso

### Caso 1: Usuario prefiere email/contraseña
1. Admin crea usuario desde dashboard
2. Usuario recibe email de Clerk
3. Usuario establece contraseña
4. Usuario inicia sesión con email/contraseña
5. ✅ Acceso gratuito activado

### Caso 2: Usuario prefiere Google OAuth
1. Admin crea usuario desde dashboard
2. Usuario **ignora el email** (no lo necesita)
3. Usuario abre la app móvil
4. Usuario hace clic en "Iniciar sesión con Google"
5. Selecciona cuenta de Google (mismo email)
6. ✅ Clerk vincula automáticamente
7. ✅ Acceso gratuito activado

### Caso 3: Usuario ya tiene cuenta de Google vinculada
- Si el email de Google ya está registrado en Clerk con OAuth
- Clerk mostrará el mismo usuario
- ✅ Funciona sin problemas

---

## ⚠️ Importante

- ✅ El usuario **puede elegir** cómo iniciar sesión (email/contraseña O Google OAuth)
- ✅ **No necesita** establecer contraseña si prefiere usar Google OAuth
- ✅ El email de invitación **no es obligatorio** para usar Google OAuth
- ✅ Clerk vincula automáticamente por email cuando coincide

---

## 🔧 Configuración Requerida

### En Clerk Dashboard:

1. **Email debe estar habilitado:**
   - User & Authentication → Email, Phone, Username
   - Email debe estar activo ✅

2. **Google OAuth debe estar habilitado:**
   - User & Authentication → Social Connections
   - Google debe estar activo ✅
   - Configurado con Client ID y Secret

3. **Ambos métodos pueden estar activos simultáneamente** ✅

---

## 📝 Mensajes para el Usuario

### Desde el Dashboard:
- "El usuario recibirá un email de invitación y podrá iniciar sesión con email/contraseña o con Google OAuth."

### En la App (cuando el usuario inicia sesión):
- Puede elegir entre:
  - Email/Contraseña
  - Google OAuth
  - TikTok OAuth (si está configurado)

Todos los métodos funcionan si el email coincide con el usuario creado desde el dashboard.

---

¡El sistema es flexible y permite que cada usuario elija su método de autenticación preferido! 🎉
