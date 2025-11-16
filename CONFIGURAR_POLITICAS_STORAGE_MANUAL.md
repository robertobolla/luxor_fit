# 🔐 Configurar Políticas de Storage Manualmente

## 🚨 Error: "must be owner of relation objects"

Este error ocurre porque no tienes permisos para crear políticas directamente en `storage.objects` desde SQL Editor. Necesitas crearlas desde el Dashboard de Supabase.

## ✅ Solución: Crear Políticas desde el Dashboard

### Paso 1: Ir a Storage Policies

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Storage** en el menú lateral
4. Haz clic en **Policies** (o busca la pestaña de políticas)

### Paso 2: Seleccionar el Bucket

1. En la lista de buckets, encuentra `exercise-videos`
2. Haz clic en el bucket o en el ícono de políticas junto a él
3. Deberías ver una sección de "Policies" o "Políticas"

### Paso 3: Crear las Políticas

Crea las siguientes políticas una por una:

#### Política 1: Ver videos (público)

1. Haz clic en **"New Policy"** o **"Nueva Política"**
2. Configura:
   - **Policy name:** `Anyone can view exercise videos`
   - **Allowed operations:** ✅ SELECT
   - **Policy definition (USING):**
   ```sql
   bucket_id = 'exercise-videos'
   ```
3. Haz clic en **"Save"** o **"Guardar"**

#### Política 2: Subir videos (autenticados)

1. Haz clic en **"New Policy"** o **"Nueva Política"**
2. Configura:
   - **Policy name:** `Authenticated users can upload exercise videos`
   - **Allowed operations:** ✅ INSERT
   - **Policy definition (WITH CHECK):**
   ```sql
   bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
   ```
3. Haz clic en **"Save"** o **"Guardar"**

#### Política 3: Actualizar videos (autenticados)

1. Haz clic en **"New Policy"** o **"Nueva Política"**
2. Configura:
   - **Policy name:** `Authenticated users can update exercise videos`
   - **Allowed operations:** ✅ UPDATE
   - **Policy definition (USING):**
   ```sql
   bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
   ```
   - **Policy definition (WITH CHECK):**
   ```sql
   bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
   ```
3. Haz clic en **"Save"** o **"Guardar"**

#### Política 4: Eliminar videos (autenticados)

1. Haz clic en **"New Policy"** o **"Nueva Política"**
2. Configura:
   - **Policy name:** `Authenticated users can delete exercise videos`
   - **Allowed operations:** ✅ DELETE
   - **Policy definition (USING):**
   ```sql
   bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
   ```
3. Haz clic en **"Save"** o **"Guardar"**

## 🔄 Alternativa: Deshabilitar RLS Temporalmente

Si tienes problemas creando las políticas, puedes temporalmente deshabilitar RLS para el bucket (solo para testing):

1. Ve a **Storage** → **Policies**
2. Busca el bucket `exercise-videos`
3. Busca la opción para deshabilitar RLS (esto puede estar en Settings del bucket)

⚠️ **Nota:** Deshabilitar RLS no es recomendado para producción, pero puede funcionar para testing.

## ✅ Verificar que Funciona

Después de crear las políticas:

1. Recarga el dashboard de admin
2. Intenta subir un video
3. Debería funcionar correctamente

## 📝 Notas Importantes

- **Bucket público:** Asegúrate de que el bucket `exercise-videos` esté marcado como público en sus configuraciones
- **Políticas activas:** Verifica que todas las políticas estén activas (no deshabilitadas)
- **Permisos:** Si sigues teniendo problemas, verifica que tu usuario tenga permisos de administrador en Supabase

