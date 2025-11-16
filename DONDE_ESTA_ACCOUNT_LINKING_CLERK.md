# 🔍 Dónde Encontrar Account Linking en Clerk

## 📍 Ubicación

La opción de **Account Linking** en Clerk puede estar en diferentes lugares según la versión:

---

## 🎯 Opción 1: Conexiones SSO (Más Común)

1. **En el Dashboard de Clerk:**
   - Menú lateral izquierdo
   - **Configurar** → **Conexiones SSO** (SSO Connections)
   - Busca la sección de **"Account Linking"** o **"Vinculación de cuentas"**

2. **Configuración:**
   - Habilita: **"Link accounts with same email address"**
   - Esto permite que Clerk unifique automáticamente cuentas con el mismo email

---

## 🎯 Opción 2: Social Connections

1. **En el Dashboard de Clerk:**
   - **Configurar** → **Usuario y autenticación**
   - Pestaña: **"Social Connections"** o **"Conexiones sociales"**
   - Busca la opción de Account Linking en la configuración

---

## 🎯 Opción 3: Puede Estar Habilitado Automáticamente

En algunas versiones de Clerk, **Account Linking funciona automáticamente** cuando:

- ✅ Tienes OAuth providers configurados (Google, TikTok, etc.)
- ✅ El email está verificado en ambas cuentas
- ✅ Un usuario intenta iniciar sesión con un proveedor que tiene el mismo email que una cuenta existente

**Clerk automáticamente vincula las cuentas** sin necesidad de configuración adicional.

---

## 🔧 Pasos Detallados

### Si estás en "Usuario y autenticación":

1. **Ve al menú lateral izquierdo**
2. **Haz clic en "Conexiones SSO"** (está justo debajo de "Usuario y autenticación")
3. **Busca la sección de Account Linking**

### Si no ves "Conexiones SSO":

1. **Busca "Social Connections"** en el menú
2. O ve a: **User & Authentication** → **Social Connections**
3. La opción puede estar en la configuración de cada proveedor OAuth

---

## ⚠️ Si No Encuentras la Opción

**No te preocupes.** Clerk puede vincular cuentas automáticamente si:

1. **El email está verificado:**
   - Ve a: **Usuario y autenticación** → **Correo electrónico**
   - Asegúrate de que la verificación de email esté activa

2. **Los proveedores OAuth están configurados:**
   - Ve a: **Conexiones SSO** o **Social Connections**
   - Asegúrate de que Google, TikTok, etc. estén activos

3. **Clerk vinculará automáticamente** cuando:
   - Un usuario inicia sesión con OAuth
   - El email del OAuth coincide con un email existente en Clerk
   - Ambos emails están verificados

---

## 📞 Alternativa: Verificación Manual

Si no encuentras la opción de Account Linking, puedes:

1. **Asegurar verificación de email:**
   - **Usuario y autenticación** → **Correo electrónico**
   - Activa: "Require email verification"

2. **Clerk vinculará automáticamente** cuando detecte emails coincidentes

---

## ✅ Verificación

Para verificar que funciona:

1. Crea un usuario con email/contraseña
2. Verifica el email
3. Intenta iniciar sesión con Google usando el mismo email
4. Clerk debería vincular automáticamente las cuentas

---

**¿Seguiste estos pasos y aún no encuentras la opción?** Avísame y te ayudo a buscarla en tu versión específica de Clerk.

