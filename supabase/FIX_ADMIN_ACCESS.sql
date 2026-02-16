
-- ============================================================================
-- SOLUCIÓN AUTOMÁTICA DE ACCESO ADMIN
-- ============================================================================

-- 1. Actualizar el user_id en admin_roles si el email coincide con user_profiles
-- Esto sincroniza el ID de Clerk con el rol de Admin
UPDATE admin_roles ar
SET 
  user_id = up.user_id,
  updated_at = NOW()
FROM user_profiles up
WHERE 
  ar.email = up.email 
  AND ar.user_id != up.user_id;

-- 2. Mostrar el resultado de la actualización para confirmar
SELECT 
  ar.email, 
  ar.role_type, 
  ar.user_id as admin_role_user_id, 
  up.user_id as user_profile_user_id,
  CASE WHEN ar.user_id = up.user_id THEN '✅ CORRECTO' ELSE '❌ ERROR' END as status
FROM admin_roles ar
JOIN user_profiles up ON ar.email = up.email
WHERE ar.is_active = true
ORDER BY ar.created_at DESC;

-- 3. Si no existe el admin, insertar uno de emergencia (Opcional - comentar si no se desea)
-- INSERT INTO admin_roles (user_id, email, role_type, is_active)
-- SELECT user_id, email, 'admin', true
-- FROM user_profiles
-- WHERE email = 'prueba@luxorfitnessapp.com'
-- AND NOT EXISTS (SELECT 1 FROM admin_roles WHERE email = 'prueba@luxorfitnessapp.com');
