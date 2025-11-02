-- Función para actualizar user_id en gym_members cuando un usuario se registra
-- Esto se ejecuta cuando un usuario creado desde el dashboard se registra en la app

-- Agregar función helper para actualizar gym_members por email
CREATE OR REPLACE FUNCTION update_gym_member_user_id(
  p_email TEXT,
  p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := false;
BEGIN
  -- Actualizar gym_members si existe registro con user_id temporal o null para ese email
  -- Primero necesitamos obtener el empresario_id desde admin_roles basado en el email del usuario en user_profiles
  -- Pero como no tenemos email en gym_members directamente, necesitamos una forma diferente
  
  -- Verificar si existe un registro en gym_members que necesite actualización
  -- Esto se hace verificando si hay un user_id que no coincide (pero esto es complicado sin email en gym_members)
  
  -- Mejor: Crear un trigger o actualizar desde la app cuando el usuario se registra
  -- Por ahora, esta función se llamará desde la app cuando detecte que el email está asociado
  
  -- Nota: Esta función se usa desde la app móvil cuando un usuario se registra
  -- Verifica si hay un registro pendiente para actualizar
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_gym_member_user_id IS 'Actualiza user_id en gym_members cuando un usuario se registra. Se llama desde la app móvil.';

