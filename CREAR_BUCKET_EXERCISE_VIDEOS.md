# 🎥 Crear Bucket para Videos de Ejercicios

## 🚨 Problema: "Bucket not found"

Si ves el error "Bucket not found" al intentar subir un video, significa que el bucket `exercise-videos` no existe en Supabase Storage.

## ✅ Solución: Crear el Bucket

### Paso 1: Ir a Supabase Storage

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **Storage**

### Paso 2: Crear el Bucket

1. Haz clic en el botón **"New bucket"** o **"Create bucket"**
2. Configura el bucket:
   - **Nombre del bucket:** `exercise-videos` (exactamente así, con guión)
   - **Public bucket:** ✅ **SÍ** (marca esta opción para que los videos sean accesibles públicamente)
   - **File size limit:** Puedes dejarlo en el valor por defecto o aumentarlo si subes videos grandes
   - **Allowed MIME types:** Opcional, puedes dejarlo vacío o agregar `video/mp4`, `video/webm`, etc.
3. Haz clic en **"Create bucket"** o **"Crear bucket"**

### Paso 3: Configurar Políticas de Storage

Después de crear el bucket, necesitas configurar las políticas para permitir subir y ver videos.

#### Opción A: Desde el Dashboard (Más Fácil)

1. Ve a **Storage** → **Policies**
2. Selecciona el bucket `exercise-videos`
3. Haz clic en **"New Policy"** o **"Nueva Política"**
4. Crea las siguientes políticas:

**Política 1: Ver videos (público)**
- **Policy name:** `Anyone can view exercise videos`
- **Allowed operations:** SELECT
- **Policy definition:**
```sql
bucket_id = 'exercise-videos'
```

**Política 2: Subir videos (autenticados)**
- **Policy name:** `Authenticated users can upload exercise videos`
- **Allowed operations:** INSERT
- **Policy definition:**
```sql
bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
```

**Política 3: Actualizar videos (autenticados)**
- **Policy name:** `Authenticated users can update exercise videos`
- **Allowed operations:** UPDATE
- **Policy definition:**
```sql
bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
```

**Política 4: Eliminar videos (autenticados)**
- **Policy name:** `Authenticated users can delete exercise videos`
- **Allowed operations:** DELETE
- **Policy definition:**
```sql
bucket_id = 'exercise-videos' AND auth.role() = 'authenticated'
```

#### Opción B: Desde SQL Editor (Más Rápido)

1. Ve a **SQL Editor** en Supabase
2. Copia y pega el contenido del archivo `supabase_exercise_videos_storage.sql`
3. Ejecuta el script completo
4. Esto creará todas las políticas automáticamente

### Paso 4: Verificar que Funciona

1. Ve al dashboard de admin → **Ejercicios**
2. Intenta subir un video
3. Debería funcionar sin el error "Bucket not found"

## 🔍 Verificar que el Bucket Existe

Si quieres verificar que el bucket se creó correctamente:

1. Ve a **Storage** en Supabase Dashboard
2. Deberías ver el bucket `exercise-videos` en la lista
3. Si haces clic en él, deberías poder ver su contenido (aunque esté vacío al principio)

## ⚠️ Notas Importantes

- **Nombre exacto:** El bucket debe llamarse exactamente `exercise-videos` (con guión, sin espacios)
- **Bucket público:** Es importante que el bucket sea público para que los videos se puedan reproducir en la app
- **Políticas:** Asegúrate de que las políticas estén configuradas correctamente, especialmente la de INSERT para poder subir videos

## 🐛 Si Sigue Sin Funcionar

1. **Verifica el nombre del bucket:** Debe ser exactamente `exercise-videos`
2. **Verifica que sea público:** En Storage → `exercise-videos` → Settings → debe estar marcado como "Public"
3. **Verifica las políticas:** Asegúrate de que las políticas estén activas
4. **Revisa la consola del navegador:** Puede haber más detalles del error en la consola (F12)

## 📝 Script SQL Completo

Si prefieres ejecutar todo desde SQL, usa el archivo `supabase_exercise_videos_storage.sql` que ya está en el proyecto.

