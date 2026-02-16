
-- ============================================================================
-- ARREGLO MANUAL ESPECÍFICO PARA ROBERTO BOLLA
-- ============================================================================

-- El ID que tienes en la base de datos es ANTIGUO (user_34uv...)
-- El ID con el que estás logueado es NUEVO (user_34Ap...)
-- Esto pasa cuando se borra y recrea un usuario en Clerk

-- 1. Actualizar admin_roles con el ID CORRECTO que sale en tu pantalla de error
UPDATE admin_roles
SET 
  user_id = 'user_34Ap3niPCkLyVxhmN7f6yQWdKBe',
  updated_at = NOW()
WHERE 
  email = 'robertobolla9@gmail.com';

-- 2. Verificar el cambio
SELECT user_id, email, role_type, is_active 
FROM admin_roles 
WHERE email = 'robertobolla9@gmail.com';
