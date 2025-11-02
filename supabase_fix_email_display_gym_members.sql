-- Script para asegurar que el email se muestre correctamente en la tabla de usuarios de empresarios
-- Este script debe ejecutarse en Supabase SQL Editor

-- 1. Agregar columna email a gym_members si no existe
ALTER TABLE gym_members 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Crear índice para búsquedas rápidas por email
CREATE INDEX IF NOT EXISTS idx_gym_members_email ON gym_members(email);

-- 3. Actualizar la función get_empresario_users para usar LEFT JOIN y mostrar el email
DROP FUNCTION IF EXISTS get_empresario_users(TEXT);

CREATE FUNCTION get_empresario_users(p_empresario_id TEXT)
RETURNS TABLE (
  user_id TEXT,
  email TEXT,
  name TEXT,
  age INTEGER,
  fitness_level TEXT,
  gender TEXT,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN,
  has_subscription BOOLEAN,
  subscription_status TEXT,
  has_workout_plan BOOLEAN,
  subscription_expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.user_id,
    COALESCE(up.email, gm.email) as email, -- Usar email del perfil si existe, sino del gym_members
    COALESCE(up.name, NULL) as name, -- Usar nombre del perfil si existe
    up.age,
    up.fitness_level,
    up.gender,
    gm.joined_at,
    gm.is_active,
    CASE WHEN s.user_id IS NOT NULL THEN true ELSE false END as has_subscription,
    s.status,
    CASE WHEN wp.user_id IS NOT NULL THEN true ELSE false END as has_workout_plan,
    gm.subscription_expires_at
  FROM gym_members gm
  LEFT JOIN user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN subscriptions s ON gm.user_id = s.user_id
  LEFT JOIN workout_plans wp ON gm.user_id = wp.user_id AND wp.is_active = true
  WHERE gm.empresario_id = p_empresario_id
  ORDER BY gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Comentario explicativo
COMMENT ON FUNCTION get_empresario_users(TEXT) IS 'Obtiene los usuarios de un empresario, mostrando el email del gym_members si el usuario aún no ha completado su perfil';

