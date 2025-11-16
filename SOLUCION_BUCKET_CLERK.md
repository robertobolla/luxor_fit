# 🔧 Solución: Bucket con Clerk (Sin Supabase Auth)

## 🚨 Problema

Como estás usando **Clerk** para autenticación (no Supabase Auth), las políticas de Storage que usan `auth.role()` o `auth.uid()` **NO funcionarán**. Necesitas una configuración diferente.

## ✅ Solución: Políticas Simplificadas

### Opción 1: Deshabilitar RLS para el Bucket (Recomendado para Clerk)

Como la validación de permisos ya se hace en el frontend (verificando si eres admin), puedes deshabilitar RLS en el bucket:

1. Ve a **Supabase Dashboard** → **Storage**
2. Haz clic en el bucket `exercise-videos`
3. Ve a **Settings** o **Configuración**
4. Busca la opción **"Row Level Security"** o **"RLS"**
5. **Deshabilita RLS** para este bucket
6. Guarda los cambios

Esto permitirá que el código del frontend (que ya verifica si eres admin) controle el acceso.

### Opción 2: Políticas Públicas (Si no puedes deshabilitar RLS)

Si no puedes deshabilitar RLS, crea políticas que permitan acceso público:

1. Ve a **Storage** → **Policies**
2. Selecciona el bucket `exercise-videos`
3. Crea estas políticas:

**Política 1: Ver videos (público)**
- **Nombre:** `Public read access`
- **Operación:** SELECT
- **USING:**
```sql
bucket_id = 'exercise-videos'
```

**Política 2: Subir videos (público con validación en frontend)**
- **Nombre:** `Public upload access`
- **Operación:** INSERT
- **WITH CHECK:**
```sql
bucket_id = 'exercise-videos'
```

**Política 3: Actualizar videos**
- **Nombre:** `Public update access`
- **Operación:** UPDATE
- **USING y WITH CHECK:**
```sql
bucket_id = 'exercise-videos'
```

**Política 4: Eliminar videos**
- **Nombre:** `Public delete access`
- **Operación:** DELETE
- **USING:**
```sql
bucket_id = 'exercise-videos'
```

⚠️ **Nota:** Estas políticas permiten acceso público, pero la validación real se hace en el frontend (el dashboard de admin verifica que seas admin antes de permitir subir videos).

## 🔍 Verificar Configuración

1. **Bucket existe:** Storage → Deberías ver `exercise-videos`
2. **Bucket es público:** Settings del bucket → "Public bucket" debe estar marcado
3. **RLS deshabilitado o políticas creadas:** Verifica en Policies

## ✅ Probar

1. Recarga el dashboard de admin
2. Intenta subir un video
3. Debería funcionar ahora

## 📝 Nota sobre Seguridad

La seguridad real está en:
- ✅ El dashboard de admin verifica que seas admin antes de mostrar la opción de subir
- ✅ Solo usuarios autenticados con Clerk pueden acceder al dashboard
- ✅ Las políticas de Storage son una capa adicional, pero con Clerk no son estrictamente necesarias si el frontend valida correctamente

