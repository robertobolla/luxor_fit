-- Script para verificar y activar el empresario lucasfarhat99@gmail.com

-- 1. VERIFICAR si el empresario existe y está activo
SELECT 
  id,
  user_id,
  email,
  name,
  role_type,
  is_active,
  created_at
FROM public.admin_roles
WHERE email ILIKE 'lucasfarhat99@gmail.com'
  AND role_type = 'empresario';

-- 2. Si existe pero está inactivo, ACTIVARLO
UPDATE public.admin_roles
SET 
  is_active = true,
  updated_at = NOW()
WHERE email ILIKE 'lucasfarhat99@gmail.com'
  AND role_type = 'empresario'
  AND is_active = false;

-- 3. VERIFICAR el resultado final
SELECT 
  id,
  user_id,
  email,
  name,
  role_type,
  is_active,
  created_at,
  updated_at
FROM public.admin_roles
WHERE email ILIKE 'lucasfarhat99@gmail.com'
  AND role_type = 'empresario';

-- Mensaje de resultado
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE email ILIKE 'lucasfarhat99@gmail.com' 
        AND role_type = 'empresario' 
        AND is_active = true
    )
    THEN '✅ Empresario lucasfarhat99@gmail.com está activo y tiene acceso'
    ELSE '❌ No se encontró el empresario o está inactivo'
  END as status;

