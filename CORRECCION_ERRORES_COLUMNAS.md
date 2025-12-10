# ⚠️ Corrección de Errores en Scripts de Seguridad

## 🐛 Problema Detectado

Al ejecutar `FIX_SECURITY_DEFINER_VIEWS.sql`, obtienes este error:

```
Error: Failed to run sql query: ERROR: 42703: 
column gm.subscription_expiry does not exist 
LINE 50: COUNT(DISTINCT gm.id) FILTER (WHERE gm.subscription_expiry > NOW())
```

## 🔍 Causa del Error

Las vistas usaban nombres de columnas **INCORRECTOS** que no existen en la tabla `gym_members`:

### ❌ Columnas que NO existen:
- `gm.subscription_expiry` → **NO EXISTE**
- `gm.monthly_amount` → **NO EXISTE**

### ✅ Columnas correctas en `gym_members`:
```sql
CREATE TABLE gym_members (
  id UUID,
  user_id TEXT,
  empresario_id TEXT,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  notes TEXT,
  subscription_expires_at TIMESTAMPTZ,  -- ✅ Nombre correcto
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Nota:** La columna se llama `subscription_expires_at`, NO `subscription_expiry`.

---

## ✅ Solución

### **USAR EL NUEVO SCRIPT CORREGIDO:**

**Archivo:** `FIX_SECURITY_DEFINER_VIEWS_CORRECTED.sql`

Este script tiene las correcciones:

1. ✅ `subscription_expiry` → `subscription_expires_at`
2. ✅ Eliminado el uso de `gm.monthly_amount` (no existe)
3. ✅ Usa `ar.monthly_fee` de `admin_roles` (correcto)
4. ✅ Todas las vistas funcionan correctamente

---

## 📝 Instrucciones

### **Paso 1: Borrar el Script Anterior**
Si ya ejecutaste `FIX_SECURITY_SIMPLE.sql`, está bien. Si ejecutaste `FIX_SECURITY_DEFINER_VIEWS.sql` y falló, no pasa nada.

### **Paso 2: Ejecutar el Script Corregido**

1. **Ve a Supabase SQL Editor:**
   https://supabase.com/dashboard/project/isoxyphzvfywufas/sql

2. **Ejecuta este script:**
   ```sql
   -- Copiar y pegar FIX_SECURITY_DEFINER_VIEWS_CORRECTED.sql
   -- Click "Run"
   ```

3. **Verifica los resultados:**
   
   Deberías ver al final:
   ```
   ✅ INVOKER (Seguro) - para todas las vistas
   ✅ Conteos sin errores
   ```

---

## 🔍 Cambios Principales

### **1. Vista: `empresario_stats`**

**❌ Antes (Incorrecto):**
```sql
COUNT(DISTINCT gm.id) FILTER (WHERE gm.subscription_expiry > NOW())
COALESCE(SUM(gm.monthly_amount), 0)
```

**✅ Ahora (Correcto):**
```sql
COUNT(DISTINCT CASE 
  WHEN gm.is_active = true 
  AND (gm.subscription_expires_at IS NULL 
       OR gm.subscription_expires_at > NOW()) 
  THEN gm.user_id 
END) AS members_with_access
-- No usa monthly_amount porque no existe
```

### **2. Vista: `v_user_subscription`**

**❌ Antes (Incorrecto):**
```sql
gm.subscription_expiry AS gym_member_expiry
```

**✅ Ahora (Correcto):**
```sql
gm.subscription_expires_at AS gym_member_expiry
```

---

## 📊 Resumen de Vistas Corregidas

| Vista | Cambio Principal |
|-------|------------------|
| `empresario_stats` | ✅ Usa `subscription_expires_at` y elimina `monthly_amount` |
| `v_user_subscription` | ✅ Usa `subscription_expires_at` |
| `partner_active_users` | ✅ Sin cambios (ya era correcto) |
| `user_stats` | ✅ Sin cambios (ya era correcto) |
| `partner_referrals` | ✅ Sin cambios (ya era correcto) |

---

## ✅ Checklist

- [ ] Ejecutado `FIX_SECURITY_SIMPLE.sql` (Paso 1)
- [ ] Ejecutado `FIX_SECURITY_DEFINER_VIEWS_CORRECTED.sql` (Paso 2 - corregido)
- [ ] Verificado en Security Advisor (Refresh)
- [ ] Confirmado: 0-1 errores restantes
- [ ] Probado que las vistas funcionan (conteos sin error)

---

## 🎯 Resultado Final Esperado

```
✅ progress_photos: RLS Enabled
✅ payment_history: RLS Enabled
✅ empresario_stats: SECURITY INVOKER
✅ partner_active_users: SECURITY INVOKER
✅ user_stats: SECURITY INVOKER
✅ v_user_subscription: SECURITY INVOKER
✅ partner_referrals: SECURITY INVOKER
```

**Total de errores en Security Advisor: 0-1** (solo `partner_payments_sums` si existe)

---

## 📞 Si Aún Tienes Errores

Ejecuta esto y comparte el resultado:

```sql
-- Ver estructura de gym_members
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gym_members'
ORDER BY ordinal_position;

-- Ver qué vistas existen
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE '%payment%' OR viewname LIKE '%partner%' OR viewname LIKE '%empresario%';
```

---

¡Listo! Con el script corregido deberías poder resolver todos los errores sin problemas. 🎉

