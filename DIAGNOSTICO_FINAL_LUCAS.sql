-- ============================================================================
-- DIAGNOSTICO FINAL: Por qué no aparece Lucas
-- ============================================================================

-- 1. Verificar que Lucas existe en gym_members
SELECT 
  '1. LUCAS EN GYM_MEMBERS' as paso,
  *
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 2. Verificar que eres admin con el user_id correcto
SELECT 
  '2. TU ROL DE ADMIN' as paso,
  *
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
  AND role_type = 'admin'
  AND is_active = true;

-- 3. Verificar si el user_id de Lucas coincide
SELECT 
  '3. COINCIDENCIA DE USER_IDS' as paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM gym_members 
      WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
    ) THEN 'Lucas EXISTE en gym_members'
    ELSE 'Lucas NO EXISTE en gym_members'
  END as lucas_existe,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
        AND role_type = 'admin'
        AND is_active = true
    ) THEN 'Tu ROL de admin EXISTE'
    ELSE 'Tu ROL de admin NO EXISTE'
  END as rol_admin_existe;

-- 4. Ver TODOS los usuarios de gym_members (sin filtrar)
SELECT 
  '4. TODOS LOS GYM_MEMBERS' as paso,
  user_id,
  empresario_id,
  is_active,
  joined_at
FROM gym_members
ORDER BY joined_at DESC;

-- 5. Verificar si user_profiles tiene el user_id de Lucas
SELECT 
  '5. LUCAS EN USER_PROFILES' as paso,
  *
FROM user_profiles
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
LIMIT 1;


