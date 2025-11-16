-- ============================================================================
-- AGREGAR CAMPO DE FOTO DE PERFIL
-- ============================================================================

-- Agregar columna profile_photo_url a user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Comentario
COMMENT ON COLUMN user_profiles.profile_photo_url IS 'URL de la foto de perfil del usuario almacenada en Supabase Storage';

-- ============================================================================
-- CONFIGURACIÓN DE STORAGE PARA FOTOS DE PERFIL
-- ============================================================================

-- Crear bucket para fotos de perfil (ejecutar en Supabase Dashboard > Storage)
-- Nombre del bucket: profile-photos
-- Public: SÍ (IMPORTANTE: Debe ser público para que getPublicUrl funcione)
-- 
-- Pasos para crear el bucket:
-- 1. Ir a Supabase Dashboard > Storage
-- 2. Click en "New bucket"
-- 3. Nombre: "profile-photos"
-- 4. Marcar "Public bucket" como SÍ (ON)
-- 5. Click en "Create bucket"

-- Políticas de Storage (ejecutar después de crear el bucket)
-- IMPORTANTE: Como usamos Clerk para autenticación (no Supabase Auth),
-- deshabilitamos RLS para el bucket profile-photos
-- La seguridad se maneja en el código de la app validando el user_id

-- OPCIÓN 1: Deshabilitar RLS completamente para este bucket (RECOMENDADO)
-- Esto permite que cualquier usuario con acceso a la app suba fotos
-- La validación del user_id se hace en el código antes de subir
-- Ejecutar en Supabase Dashboard > Storage > profile-photos > Settings > Disable RLS

-- OPCIÓN 2: Políticas permisivas (si no puedes deshabilitar RLS)
-- Estas políticas permiten operaciones en el bucket sin verificar autenticación
-- ya que Clerk no crea sesiones de Supabase Auth

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Allow upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete profile photos" ON storage.objects;

-- Policy 1: Permitir subir fotos de perfil (sin verificar auth porque usamos Clerk)
CREATE POLICY "Allow upload profile photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos');

-- Policy 2: Permitir ver fotos de perfil (las URLs públicas funcionan de todos modos)
CREATE POLICY "Allow view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Policy 3: Permitir actualizar fotos de perfil
CREATE POLICY "Allow update profile photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos');

-- Policy 4: Permitir eliminar fotos de perfil
CREATE POLICY "Allow delete profile photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos');

