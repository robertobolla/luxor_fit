-- ============================================================================
-- SISTEMA DE ROLES PARA ADMINISTRADORES Y SOCIOS
-- ============================================================================

-- Tabla para almacenar roles de administradores y socios
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ID del usuario en Clerk
  user_id TEXT NOT NULL UNIQUE,
  
  -- Email del usuario (para identificar más fácilmente)
  email TEXT,
  
  -- Tipo de rol: 'admin' (administrador completo) o 'socio' (acceso limitado)
  role_type TEXT NOT NULL CHECK (role_type IN ('admin', 'socio')),
  
  -- Permisos específicos (JSONB para flexibilidad)
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Nombre o descripción del usuario
  name TEXT,
  
  -- Si el rol está activo
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- ID del admin que creó este rol
  notes TEXT -- Notas adicionales sobre este usuario
);

-- Índices
CREATE INDEX IF NOT EXISTS admin_roles_user_id_idx ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS admin_roles_role_type_idx ON admin_roles(role_type);
CREATE INDEX IF NOT EXISTS admin_roles_email_idx ON admin_roles(email);
CREATE INDEX IF NOT EXISTS admin_roles_is_active_idx ON admin_roles(is_active);

-- Función para verificar si un usuario es admin o socio
CREATE OR REPLACE FUNCTION is_admin_or_socio(check_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_roles 
    WHERE user_id = check_user_id 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el rol de un usuario
CREATE OR REPLACE FUNCTION get_user_role(check_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role_type INTO user_role
  FROM admin_roles 
  WHERE user_id = check_user_id 
    AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql;

-- Vista para estadísticas de usuarios (accesible por admins)
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(DISTINCT up.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN up.user_id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN up.user_id END) as new_users_30d,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  COUNT(DISTINCT CASE WHEN wp.is_active = true THEN wp.user_id END) as users_with_workout_plans,
  AVG(up.age) as avg_age,
  COUNT(DISTINCT CASE WHEN up.fitness_level = 'beginner' THEN up.user_id END) as beginners,
  COUNT(DISTINCT CASE WHEN up.fitness_level = 'intermediate' THEN up.user_id END) as intermediate,
  COUNT(DISTINCT CASE WHEN up.fitness_level = 'advanced' THEN up.user_id END) as advanced
FROM user_profiles up
LEFT JOIN subscriptions s ON up.user_id = s.user_id
LEFT JOIN workout_plans wp ON up.user_id = wp.user_id AND wp.is_active = true;

-- Habilitar RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admins pueden ver/modificar roles
CREATE POLICY "Admins can view all roles"
  ON admin_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND ar.role_type = 'admin'
        AND ar.is_active = true
    )
    OR user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Admins can insert roles"
  ON admin_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND ar.role_type = 'admin'
        AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can update roles"
  ON admin_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND ar.role_type = 'admin'
        AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can delete roles"
  ON admin_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND ar.role_type = 'admin'
        AND ar.is_active = true
    )
  );

-- Nota: Como usas Clerk, estas políticas necesitan ajustarse
-- Las políticas de arriba asumen Supabase Auth, pero podemos cambiarlas a:
-- USING (true) y verificar roles en el cliente

-- Comentarios
COMMENT ON TABLE admin_roles IS 'Roles de administradores y socios para acceso al dashboard';
COMMENT ON COLUMN admin_roles.role_type IS 'Tipo de rol: admin (acceso completo) o socio (acceso limitado)';
COMMENT ON FUNCTION is_admin_or_socio IS 'Verifica si un usuario tiene rol de admin o socio';
COMMENT ON FUNCTION get_user_role IS 'Obtiene el rol de un usuario (admin, socio, o user)';
COMMENT ON VIEW user_stats IS 'Estadísticas agregadas de usuarios para el dashboard';

-- Ejemplo de inserción (ajustar con tu user_id de Clerk)
-- INSERT INTO admin_roles (user_id, email, role_type, name, created_by)
-- VALUES 
--   ('user_tu_id_aqui', 'admin@fitmind.com', 'admin', 'Administrador Principal', NULL),
--   ('user_socio_id', 'socio@fitmind.com', 'socio', 'Socio de la App', 'user_tu_id_aqui');

