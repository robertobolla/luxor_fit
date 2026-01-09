-- ============================================================================
-- HACER QUE ADMINS TENGAN PERMISOS DE EMPRESARIO
-- ============================================================================

-- PASO 1: Ver roles actuales
SELECT 
  'PASO 1: ROLES ACTUALES' as info,
  id,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
ORDER BY role_type;

-- PASO 2: Eliminar el rol de empresario (mantener solo admin)
DELETE FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
  AND role_type = 'empresario';

-- PASO 3: Verificar que solo queda el rol de admin
SELECT 
  'PASO 3: ROLES DESPUES DE ELIMINAR' as info,
  id,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
ORDER BY role_type;

-- PASO 4: Eliminar la función existente
DROP FUNCTION IF EXISTS get_empresario_users(TEXT);

-- PASO 5: Crear la nueva función para que admins vean TODOS los usuarios
CREATE OR REPLACE FUNCTION get_empresario_users(p_empresario_id TEXT)
RETURNS TABLE (
  user_id TEXT,
  name TEXT,
  email TEXT,
  nivel TEXT,
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar si el usuario es admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = p_empresario_id
      AND role_type = 'admin'
      AND is_active = true
  ) INTO v_is_admin;

  -- Si es admin, devolver TODOS los usuarios de gimnasios
  IF v_is_admin THEN
    RETURN QUERY
    SELECT 
      gm.user_id,
      up.display_name as name,
      up.email,
      COALESCE(up.user_tier, 'free') as nivel,
      gm.subscription_expires_at,
      gm.is_active,
      gm.joined_at
    FROM public.gym_members gm
    LEFT JOIN public.user_profiles up ON up.clerk_user_id = gm.user_id
    ORDER BY gm.joined_at DESC;
  ELSE
    -- Si no es admin, devolver solo usuarios de su gimnasio
    RETURN QUERY
    SELECT 
      gm.user_id,
      up.display_name as name,
      up.email,
      COALESCE(up.user_tier, 'free') as nivel,
      gm.subscription_expires_at,
      gm.is_active,
      gm.joined_at
    FROM public.gym_members gm
    LEFT JOIN public.user_profiles up ON up.clerk_user_id = gm.user_id
    WHERE gm.empresario_id = p_empresario_id
    ORDER BY gm.joined_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: Verificar que la función se actualizó
SELECT 
  '✅ FUNCION ACTUALIZADA' as estado,
  'Los admins ahora pueden ver TODOS los usuarios de gimnasios' as descripcion;

