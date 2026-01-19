-- =============================================================================
-- CREAR BUCKET PARA IMÁGENES DE ALIMENTOS
-- =============================================================================
-- Ejecutar en el SQL Editor de Supabase

-- 1. Crear el bucket (esto se hace desde el Dashboard de Supabase > Storage)
-- Nombre: food-images
-- Public: YES (para que las imágenes sean accesibles públicamente)

-- 2. Configurar políticas RLS para el bucket
-- Permitir que cualquiera pueda ver las imágenes (público)
CREATE POLICY "Imágenes de alimentos son públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

-- Permitir que usuarios autenticados suban imágenes
CREATE POLICY "Usuarios autenticados pueden subir imágenes de alimentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-images');

-- Permitir que usuarios autenticados actualicen imágenes
CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de alimentos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'food-images');

-- Permitir que usuarios autenticados eliminen imágenes
CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de alimentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-images');

-- =============================================================================
-- INSTRUCCIONES MANUALES EN SUPABASE DASHBOARD:
-- =============================================================================
-- 1. Ir a Storage en el menú lateral
-- 2. Click en "New bucket"
-- 3. Nombre: food-images
-- 4. Marcar "Public bucket" = ON
-- 5. Click en "Create bucket"
-- 6. Luego ejecutar las políticas SQL de arriba
-- =============================================================================
