# 🔐 Crear Políticas de Storage - Paso a Paso

## 📍 Ubicación de las Políticas

En Supabase, las políticas de Storage se crean desde una ubicación específica:

### Paso 1: Ir a Storage Policies

1. Ve a **Supabase Dashboard**
2. En el menú lateral, haz clic en **Storage**
3. En la parte superior, busca la pestaña **"Policies"** (puede estar junto a "Files" o "Buckets")
4. O haz clic directamente en el bucket `exercise-videos` y busca la sección "Policies"

### Paso 2: Crear Políticas

Una vez en Policies, deberías ver una lista de políticas existentes (probablemente vacía). Haz clic en **"New Policy"** o **"Create Policy"**.

## 🎯 Políticas Necesarias (Para Clerk)

Como estás usando Clerk, necesitas políticas que permitan acceso sin verificar `auth.role()`. Crea estas políticas:

### Política 1: Lectura Pública

1. Haz clic en **"New Policy"**
2. Configura:
   - **Policy name:** `Public read exercise videos`
   - **Allowed operations:** Marca solo ✅ **SELECT**
   - **Target roles:** `public` (o déjalo vacío)
   - **USING expression:**
   ```sql
   bucket_id = 'exercise-videos'
   ```
3. Haz clic en **"Save"**

### Política 2: Subida (Sin verificación de auth)

1. Haz clic en **"New Policy"**
2. Configura:
   - **Policy name:** `Public upload exercise videos`
   - **Allowed operations:** Marca solo ✅ **INSERT**
   - **Target roles:** `public` (o déjalo vacío)
   - **WITH CHECK expression:**
   ```sql
   bucket_id = 'exercise-videos'
   ```
3. Haz clic en **"Save"**

### Política 3: Actualización

1. Haz clic en **"New Policy"**
2. Configura:
   - **Policy name:** `Public update exercise videos`
   - **Allowed operations:** Marca solo ✅ **UPDATE**
   - **Target roles:** `public` (o déjalo vacío)
   - **USING expression:**
   ```sql
   bucket_id = 'exercise-videos'
   ```
   - **WITH CHECK expression:**
   ```sql
   bucket_id = 'exercise-videos'
   ```
3. Haz clic en **"Save"**

### Política 4: Eliminación

1. Haz clic en **"New Policy"**
2. Configura:
   - **Policy name:** `Public delete exercise videos`
   - **Allowed operations:** Marca solo ✅ **DELETE**
   - **Target roles:** `public` (o déjalo vacío)
   - **USING expression:**
   ```sql
   bucket_id = 'exercise-videos'
   ```
3. Haz clic en **"Save"**

## 🔍 Si No Encuentras la Opción de Policies

Si no ves la opción de "Policies" en Storage, puede ser que:

1. **Necesites permisos de administrador:** Asegúrate de estar logueado como el dueño del proyecto
2. **Esté en otra ubicación:** Busca en:
   - Storage → Buckets → `exercise-videos` → Pestaña "Policies"
   - O directamente en Storage → Policies (pestaña superior)

## ✅ Alternativa: Sin Políticas (Solo si el bucket es público)

Si el bucket ya está marcado como **público** (como veo en tu imagen), y no puedes crear políticas, puedes intentar:

1. **Guardar la configuración actual** del bucket (haz clic en "Save")
2. **Probar subir un video** directamente desde el dashboard de admin
3. Si funciona, significa que el bucket público no requiere políticas adicionales

## 🎯 Verificación Final

Después de crear las políticas (o si el bucket público funciona sin ellas):

1. Ve al dashboard de admin → Ejercicios
2. Intenta subir un video
3. Debería funcionar sin el error "Bucket not found"

## 📝 Nota Importante

La seguridad real está en:
- ✅ El frontend verifica que seas admin antes de permitir subir
- ✅ Solo usuarios autenticados con Clerk pueden acceder al dashboard
- ✅ Las políticas de Storage son una capa adicional de seguridad

