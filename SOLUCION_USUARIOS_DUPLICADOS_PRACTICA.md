# ✅ Solución Práctica: Usuarios Duplicados

## 🚨 Situación Actual

Clerk **NO tiene una opción explícita de "Account Linking"** en todas las versiones. Esto significa que cuando un usuario se autentica con TikTok y luego con Gmail (mismo email), Clerk crea **dos usuarios diferentes**.

---

## ✅ Solución Implementada

Ya tenemos **detección automática** en el código que:

1. **Detecta duplicados** antes de crear un nuevo perfil
2. **Muestra una alerta** al usuario
3. **Permite continuar o cancelar**

---

## 🔧 Pasos para Resolver los Duplicados Existentes

### Paso 1: Identificar Duplicados

Ejecuta en **Supabase SQL Editor**:

```sql
SELECT 
  email,
  COUNT(*) as cantidad_usuarios,
  STRING_AGG(user_id::text, ', ') as user_ids,
  STRING_AGG(created_at::text, ', ') as fechas_creacion
FROM user_profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY cantidad_usuarios DESC;
```

Esto te mostrará todos los emails que tienen múltiples usuarios.

---

### Paso 2: Ver Detalles de Cada Duplicado

Para cada email duplicado, ejecuta:

```sql
SELECT 
  id,
  user_id,
  email,
  name,
  created_at,
  updated_at
FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ Reemplaza con el email duplicado
ORDER BY created_at ASC;
```

**Decide cuál `user_id` mantener:**
- Generalmente el **más antiguo** (created_at más antiguo)
- O el que tiene **más datos completos**

---

### Paso 3: Unificar Usuarios

Usa el script: `supabase_unificar_usuarios_duplicados.sql`

**Pasos:**
1. Abre el archivo `supabase_unificar_usuarios_duplicados.sql`
2. Reemplaza `TU_EMAIL_AQUI` con el email duplicado
3. Reemplaza `USER_ID_PRINCIPAL_AQUI` con el `user_id` que quieres mantener
4. Ejecuta los pasos en orden (1-8)

---

## 🛡️ Prevención Futura

### Ya Implementado en el Código ✅

El código ahora **detecta automáticamente** duplicados cuando:
- Un usuario intenta crear un perfil
- El email ya existe con otro `user_id`
- Muestra una alerta al usuario

### Configuración Recomendada en Clerk

Aunque no hay opción explícita de Account Linking, puedes:

1. **Habilitar verificación de email:**
   - **Usuario y autenticación** → **Correo electrónico**
   - Activa: "Require email verification"
   - Esto ayuda a que Clerk identifique mejor los usuarios

2. **Configurar OAuth providers:**
   - **Conexiones SSO** → Activa Google, TikTok, etc.
   - Asegúrate de que estén correctamente configurados

---

## 📋 Resumen de la Solución

### Para Usuarios Existentes (Duplicados):
- ✅ Usa el script SQL para unificar manualmente
- ✅ Sigue los pasos en `supabase_unificar_usuarios_duplicados.sql`

### Para Usuarios Nuevos:
- ✅ El código detecta duplicados automáticamente
- ✅ Muestra alerta al usuario
- ✅ Previene creación de nuevos duplicados

---

## 🎯 Próximos Pasos

1. **Identifica los duplicados** con el SQL del Paso 1
2. **Para cada email duplicado:**
   - Decide cuál `user_id` mantener
   - Ejecuta el script de unificación
3. **Verifica** que quedó un solo usuario por email

---

## 💡 Nota Importante

**Clerk no tiene Account Linking automático** en todas las versiones, pero:
- ✅ Nuestro código previene nuevos duplicados
- ✅ El script SQL resuelve los existentes
- ✅ Es una solución práctica y funcional

---

**¿Necesitas ayuda ejecutando el script?** Avísame y te guío paso a paso para unificar tus usuarios duplicados.

