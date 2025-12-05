-- ============================================================================
-- DAR ACCESO DE ADMIN A: andresgonzalezgandolfo@gmail.com
-- ============================================================================
-- Ejecuta este script en Supabase SQL Editor para dar acceso de admin
-- ============================================================================

-- PASO 1: Verificar si ya existe
SELECT
  id,
  user_id,
  email,
  role_type,
  is_active,
  name,
  created_at
FROM admin_roles
WHERE email = 'andresgonzalezgandolfo@gmail.com';

-- PASO 2: Crear o actualizar el registro de admin
-- Esto funcionará incluso si el usuario aún no se ha registrado en la app
-- El user_id se actualizará automáticamente cuando inicie sesión

-- Actualizar si ya existe
UPDATE admin_roles
SET
  role_type = 'admin',  
  is_active = true,
  name = COALESCE(name, 'Andrés González'),
  updated_at = NOW()
WHERE email = 'andresgonzalezgandolfo@gmail.com';

-- Crear si no existe
INSERT INTO admin_roles (user_id, email, role_type, is_active, name, free_access)
SELECT
  'temp_' || gen_random_uuid()::text, -- user_id temporal (se actualizará al iniciar sesión)
  'andresgonzalezgandolfo@gmail.com',
  'admin',
  true,
  'Andrés González',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles WHERE email = 'andresgonzalezgandolfo@gmail.com'
);

-- PASO 3: Verificar que se creó/actualizó correctamente
SELECT
  id,
  user_id,
  email,
  role_type,
  is_active,
  name,
  free_access,
  created_at,
  updated_at
FROM admin_roles
WHERE email = 'andresgonzalezgandolfo@gmail.com';

-- ============================================================================
-- ✅ LISTO! Ahora tiene acceso de admin
-- ============================================================================
-- Cuando inicie sesión en la app con Google OAuth (andresgonzalezgandolfo@gmail.com),
-- el sistema detectará automáticamente que es admin y tendrá acceso completo.
-- ============================================================================

-- PASO 4 (OPCIONAL): Si necesita sincronizar el user_id de Clerk manualmente
-- Primero obtén el user_id de Clerk del usuario:
-- 1. Ve a Clerk Dashboard → Users
-- 2. Busca andresgonzalezgandolfo@gmail.com
-- 3. Copia el User ID (empieza con "user_...")
-- 4. Ejecuta este UPDATE (reemplaza 'USER_ID_DE_CLERK' con el ID real):

-- UPDATE admin_roles
-- SET user_id = 'USER_ID_DE_CLERK',
--     updated_at = NOW()
-- WHERE email = 'andresgonzalezgandolfo@gmail.com';

-- PASO 5: Verificar políticas RLS de admin_roles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'admin_roles';

-- Debe haber una política tipo "Allow all operations for Clerk" con USING (true)
-- Si no existe, ejecutar:

-- ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Allow all operations for Clerk" ON admin_roles;
-- 
-- CREATE POLICY "Allow all operations for Clerk"
--   ON admin_roles
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- ============================================================================
-- 🔍 DEBUG: Si el usuario sigue sin poder entrar
-- ============================================================================

-- 1. Verificar que el usuario existe en admin_roles:
SELECT * FROM admin_roles WHERE email = 'andresgonzalezgandolfo@gmail.com';

-- 2. Verificar que Clerk le asignó un user_id:
-- Ve a Clerk Dashboard y busca el usuario por email

-- 3. Si Clerk tiene un user_id pero Supabase no:
-- Ejecuta el UPDATE del PASO 4 con el user_id correcto

-- 4. Verificar políticas RLS:
-- Ejecuta el SELECT del PASO 5 y asegúrate que existe la política

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- - El usuario DEBE usar el mismo email en Google que el registrado en el dashboard
-- - Si usa un email diferente de Google, no funcionará
-- - Clerk vincula automáticamente por email coincidente
-- - Si el problema persiste, puede haber un issue en Clerk
-- ============================================================================


