-- ============================================================================
-- RESTAURAR ROL DE ADMIN
-- ============================================================================

-- Ver roles actuales
SELECT 
  'ROLES ACTUALES' as info,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
ORDER BY role_type;

-- Insertar rol de admin si no existe
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at,
  updated_at
)
SELECT 
  'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',
  'robertobolla@gmail.com',
  'admin',
  'Roberto Bolla',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles
  WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
    AND role_type = 'admin'
);

-- Verificar que ahora sí eres admin
SELECT 
  'ROLES DESPUES' as info,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
ORDER BY role_type;

-- Probar la función
SELECT 
  '🎉 TODOS LOS USUARIOS' as info,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');


