-- ============================================================================
-- CORREGIR CONTEO DE USUARIOS EN EMPRESARIOS
-- ============================================================================
-- Problema: Cuando admin entra a "Empresarios" -> "Ver Usuarios" de un 
-- gimnasio específico, la función devuelve TODOS los usuarios en lugar de
-- solo los del gimnasio seleccionado.
-- ============================================================================

-- Eliminar la función existente
DROP FUNCTION IF EXISTS get_empresario_users(TEXT) CASCADE;

-- Crear la función corregida
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
BEGIN
  -- SIEMPRE filtrar por el empresario_id proporcionado
  -- No importa si quien llama es admin o no, se debe mostrar
  -- solo los usuarios del empresario especificado
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
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_empresario_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresario_users(TEXT) TO anon;

-- Verificar
SELECT 
  '✅ FUNCION CORREGIDA' as estado,
  'Ahora siempre filtra por el empresario_id proporcionado' as descripcion;

-- Comentario
COMMENT ON FUNCTION get_empresario_users(TEXT) IS 'Obtiene los usuarios de un empresario específico. Siempre filtra por el empresario_id proporcionado, sin importar quién hace la consulta (admin o empresario).';

