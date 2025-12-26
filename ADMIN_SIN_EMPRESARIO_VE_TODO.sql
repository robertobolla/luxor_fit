-- ============================================================================
-- ADMIN SIN ROL DE EMPRESARIO - VE TODO
-- ============================================================================

-- PASO 1: Eliminar rol de empresario (mantener solo admin)
DELETE FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
  AND role_type = 'empresario';

-- PASO 2: Verificar que solo queda el rol de admin
SELECT 
  'TUS ROLES' as info,
  user_id,
  role_type,
  email,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
ORDER BY role_type;

-- PASO 3: Verificar que eres admin
SELECT 
  'VERIFICAR ADMIN' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
        AND role_type = 'admin'
        AND is_active = true
    ) THEN 'SI ERES ADMIN ✅'
    ELSE 'NO ERES ADMIN ❌'
  END as resultado;

-- PASO 4: Probar la función (los admins ven TODO)
SELECT 
  '🎉 TODOS LOS USUARIOS (VISTA DE ADMIN)' as info,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');

