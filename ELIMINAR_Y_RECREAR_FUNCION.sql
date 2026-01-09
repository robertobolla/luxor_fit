-- ============================================================================
-- ELIMINAR COMPLETAMENTE Y RECREAR FUNCION
-- ============================================================================

-- Eliminar TODAS las versiones de la función
DROP FUNCTION IF EXISTS get_empresario_users(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_empresario_users CASCADE;

-- Esperar un momento para asegurar que se eliminó
SELECT pg_sleep(1);

-- Crear la función NUEVA Y SIMPLE
CREATE FUNCTION get_empresario_users(p_empresario_id TEXT)
RETURNS TABLE (
  user_id TEXT,
  name TEXT,
  email TEXT,
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar si el usuario es admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = p_empresario_id
      AND ar.role_type = 'admin'
      AND ar.is_active = true
  ) INTO v_is_admin;

  -- Si es admin, devolver TODOS los usuarios
  IF v_is_admin THEN
    RETURN QUERY
    SELECT 
      gm.user_id::TEXT,
      up.name::TEXT,
      up.email::TEXT,
      gm.subscription_expires_at,
      gm.is_active,
      gm.joined_at
    FROM public.gym_members gm
    LEFT JOIN public.user_profiles up ON up.user_id = gm.user_id
    ORDER BY gm.joined_at DESC;
  ELSE
    -- Si no es admin, solo usuarios de su gimnasio
    RETURN QUERY
    SELECT 
      gm.user_id::TEXT,
      up.name::TEXT,
      up.email::TEXT,
      gm.subscription_expires_at,
      gm.is_active,
      gm.joined_at
    FROM public.gym_members gm
    LEFT JOIN public.user_profiles up ON up.user_id = gm.user_id
    WHERE gm.empresario_id = p_empresario_id
    ORDER BY gm.joined_at DESC;
  END IF;
END;
$$;

-- Verificar
SELECT '✅ FUNCION RECREADA' as estado;

-- Probar
SELECT * FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');


