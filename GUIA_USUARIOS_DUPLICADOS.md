# 🔄 Guía: Usuarios Duplicados por Email

## 🚨 Problema

Cuando un usuario se autentica con diferentes proveedores OAuth (TikTok, Gmail, etc.) usando el mismo email, Clerk crea **usuarios diferentes** porque cada proveedor genera un `user_id` único.

**Resultado:** Dos o más registros en `user_profiles` con el mismo email pero diferentes `user_id`.

---

## 🔍 Cómo Identificar el Problema

### En Supabase:

```sql
-- Ver usuarios duplicados
SELECT 
  email,
  COUNT(*) as cantidad,
  STRING_AGG(user_id::text, ', ') as user_ids
FROM user_profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

### Síntomas:

- Usuario ve datos diferentes según cómo inició sesión
- Datos de nutrición, entrenamientos o progreso están separados
- El usuario tiene que completar el onboarding múltiples veces

---

## ✅ Solución: Unificar Usuarios

### Opción 1: Script SQL Manual (Recomendado)

1. **Ejecuta el script:** `supabase_unificar_usuarios_duplicados.sql`
2. **Sigue los pasos** en orden
3. **Revisa los resultados** antes de eliminar

### Opción 2: Automático en el Código

Podemos agregar lógica en el onboarding para detectar duplicados automáticamente.

---

## 🛡️ Prevención Futura

### ⚠️ Importante: Clerk NO tiene Account Linking explícito

**Clerk no ofrece una opción explícita de "Account Linking"** en todas las versiones. Por eso implementamos detección en el código.

### Solución Implementada en el Código ✅

El código ahora **detecta automáticamente** duplicados cuando:
- Un usuario intenta crear un perfil
- El email ya existe con otro `user_id`
- Muestra una alerta al usuario antes de crear el duplicado

### Configuración Recomendada en Clerk (Opcional)

Aunque no hay Account Linking explícito, puedes:

1. **Habilitar verificación de email:**
   - **Usuario y autenticación** → **Correo electrónico**
   - Activa: "Require email verification"
   - Esto ayuda a identificar mejor los usuarios

2. **Configurar OAuth providers:**
   - **Conexiones SSO** → Activa Google, TikTok, etc.
   - Asegúrate de que estén correctamente configurados

### En el Código:

Agregar verificación antes de crear perfil:

```typescript
// En onboarding.tsx, antes de guardar el perfil
const existingProfile = await supabase
  .from('user_profiles')
  .select('user_id, email')
  .eq('email', userEmail)
  .maybeSingle();

if (existingProfile && existingProfile.user_id !== user.id) {
  // Usuario duplicado detectado
  Alert.alert(
    'Cuenta existente',
    'Ya existe una cuenta con este email. ¿Deseas unificar las cuentas?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Unificar',
        onPress: async () => {
          // Llamar a función de unificación
          await unifyUserAccounts(user.id, existingProfile.user_id);
        }
      }
    ]
  );
}
```

---

## 📋 Pasos para Resolver Ahora

### 1. Identificar duplicados:

```sql
SELECT email, COUNT(*) 
FROM user_profiles 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;
```

### 2. Para cada email duplicado:

1. Ver qué datos tiene cada perfil
2. Decidir cuál `user_id` mantener (generalmente el más antiguo)
3. Actualizar todas las referencias en otras tablas
4. Eliminar los perfiles duplicados

### 3. Ejecutar el script:

- Abre `supabase_unificar_usuarios_duplicados.sql`
- Sigue los pasos en orden
- Reemplaza los valores marcados con ⚠️

---

## ⚠️ Importante

- **NO elimines** perfiles sin actualizar las referencias primero
- **Haz backup** de la base de datos antes de hacer cambios
- **Revisa** qué datos tiene cada perfil antes de decidir cuál mantener
- **Comunica** al usuario que sus cuentas se unificaron

---

## 🔧 Configuración Recomendada en Clerk

### Opción 1: Desde Conexiones SSO (Recomendado)

1. Ve a: https://dashboard.clerk.com
2. En el menú lateral: **Configurar** → **Conexiones SSO** (SSO Connections)
3. Busca la sección de **"Account Linking"** o **"Vinculación de cuentas"**
4. Habilita: **"Link accounts with same email address"**
5. Esto previene futuros duplicados automáticamente

### Opción 2: Desde Social Connections

1. Ve a: https://dashboard.clerk.com
2. **Configurar** → **Usuario y autenticación** → Pestaña **"Social Connections"**
3. O busca directamente: **User & Authentication** → **Social Connections**
4. Busca la opción de Account Linking en la configuración de cada proveedor OAuth

### Si no encuentras la opción:

**Clerk puede vincular automáticamente cuentas cuando:**
- El email está verificado en ambas cuentas (OAuth y Clerk)
- El usuario inicia sesión con un proveedor OAuth que tiene el mismo email que una cuenta existente

**Para asegurar que funcione:**
1. Habilita verificación de email: **Usuario y autenticación** → **Correo electrónico** → Activa verificación
2. Configura los proveedores OAuth: **Conexiones SSO** → Activa Google, TikTok, etc.
3. Clerk debería vincular automáticamente cuando el email coincide

---

## 📞 ¿Necesitas Ayuda?

Si tienes dudas sobre qué `user_id` mantener o cómo unificar los datos, avísame y te ayudo paso a paso.

