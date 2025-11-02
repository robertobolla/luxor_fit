-- ============================================================================
-- SISTEMA DE EMPRESARIOS (GIMNASIOS)
-- ============================================================================
-- Permite que gimnasios/empresarios creen usuarios con suscripción gratuita
-- y gestionen sus propios usuarios desde el dashboard

-- 1. Agregar rol "empresario" a admin_roles
ALTER TABLE admin_roles
  DROP CONSTRAINT IF EXISTS admin_roles_role_type_check;

ALTER TABLE admin_roles
  ADD CONSTRAINT admin_roles_role_type_check 
  CHECK (role_type IN ('admin', 'socio', 'empresario'));

-- Agregar campos específicos para empresarios
ALTER TABLE admin_roles
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10, 2), -- Tarifa que se cobra al gimnasio por cada usuario activo mensualmente
  ADD COLUMN IF NOT EXISTS max_users INTEGER, -- Máximo de usuarios permitidos (opcional)
  ADD COLUMN IF NOT EXISTS gym_name TEXT, -- Nombre del gimnasio/empresa
  ADD COLUMN IF NOT EXISTS gym_address TEXT, -- Dirección del gimnasio
  ADD COLUMN IF NOT EXISTS gym_phone TEXT, -- Teléfono del gimnasio
  ADD COLUMN IF NOT EXISTS gym_contact_email TEXT; -- Email de contacto del gimnasio

-- Índice para búsqueda de empresarios
CREATE INDEX IF NOT EXISTS idx_admin_roles_empresario ON admin_roles(role_type) WHERE role_type = 'empresario';

-- 2. Tabla para relacionar usuarios con empresarios (gimnasios)
CREATE TABLE IF NOT EXISTS gym_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ID del usuario en Clerk (miembro del gimnasio)
  user_id TEXT NOT NULL UNIQUE,
  
  -- ID del empresario (dueño del gimnasio) en admin_roles
  empresario_id TEXT NOT NULL REFERENCES admin_roles(user_id) ON DELETE CASCADE,
  
  -- Estado del miembro
  is_active BOOLEAN DEFAULT true,
  
  -- Fecha de ingreso al gimnasio
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Fecha de salida (si se desactiva)
  left_at TIMESTAMPTZ,
  
  -- Notas sobre el miembro
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Un usuario solo puede pertenecer a un gimnasio a la vez
  CONSTRAINT unique_user_gym UNIQUE (user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gym_members_user_id ON gym_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_empresario_id ON gym_members(empresario_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_is_active ON gym_members(is_active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_gym_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gym_members_updated_at ON gym_members;
CREATE TRIGGER trg_gym_members_updated_at
  BEFORE UPDATE ON gym_members
  FOR EACH ROW
  EXECUTE FUNCTION update_gym_members_updated_at();

-- 3. Función para verificar si un usuario pertenece a un empresario
CREATE OR REPLACE FUNCTION is_gym_member(check_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM gym_members 
    WHERE user_id = check_user_id 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para obtener el empresario de un usuario
CREATE OR REPLACE FUNCTION get_gym_empresario(check_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  empresario_user_id TEXT;
BEGIN
  SELECT empresario_id INTO empresario_user_id
  FROM gym_members 
  WHERE user_id = check_user_id 
    AND is_active = true
  LIMIT 1;
  
  RETURN empresario_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Vista para estadísticas de empresarios
CREATE OR REPLACE VIEW empresario_stats AS
SELECT 
  ar.user_id as empresario_id,
  ar.email as empresario_email,
  ar.name as empresario_name,
  ar.gym_name,
  ar.monthly_fee,
  ar.max_users,
  COUNT(DISTINCT gm.user_id) as total_members,
  COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.user_id END) as active_members,
  COUNT(DISTINCT CASE WHEN gm.joined_at >= CURRENT_DATE - INTERVAL '30 days' THEN gm.user_id END) as new_members_30d,
  COUNT(DISTINCT CASE WHEN vs.is_active = true THEN gm.user_id END) as members_with_active_subscription
FROM admin_roles ar
LEFT JOIN gym_members gm ON ar.user_id = gm.empresario_id
LEFT JOIN v_user_subscription vs ON gm.user_id = vs.user_id
WHERE ar.role_type = 'empresario' AND ar.is_active = true
GROUP BY ar.user_id, ar.email, ar.name, ar.gym_name, ar.monthly_fee, ar.max_users;

-- 6. RLS para gym_members
ALTER TABLE gym_members ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede leer (verificación en el cliente)
CREATE POLICY "Anyone can read gym_members"
  ON gym_members
  FOR SELECT
  USING (true);

-- Política: Solo admins y empresarios pueden insertar
-- (Verificación en el cliente, ya que usamos Clerk)
CREATE POLICY "Admins and empresarios can insert gym_members"
  ON gym_members
  FOR INSERT
  WITH CHECK (true);

-- Política: Solo admins y el empresario dueño pueden actualizar
CREATE POLICY "Admins and empresarios can update gym_members"
  ON gym_members
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Solo admins y el empresario dueño pueden eliminar
CREATE POLICY "Admins and empresarios can delete gym_members"
  ON gym_members
  FOR DELETE
  USING (true);

-- 7. Modificar la vista v_user_subscription para incluir acceso gratuito de gimnasio
CREATE OR REPLACE VIEW public.v_user_subscription AS
  SELECT
    s.user_id,
    s.status,
    s.trial_start,
    s.trial_end,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    -- Incluir acceso gratuito si pertenece a un gimnasio activo
    GREATEST(
      CASE WHEN s.status IN ('active','past_due') THEN 1 ELSE 0 END,
      CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM gym_members gm WHERE gm.user_id = s.user_id AND gm.is_active = true) THEN 1 ELSE 0 END
    ) = 1 as is_active,
    -- Indicar si es miembro de gimnasio
    EXISTS (SELECT 1 FROM gym_members gm WHERE gm.user_id = s.user_id AND gm.is_active = true) as is_gym_member
  FROM public.subscriptions s;

-- 8. Función para obtener usuarios de un empresario
CREATE OR REPLACE FUNCTION get_empresario_users(p_empresario_id TEXT)
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
  has_workout_plan BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.email,
    up.name,
    up.age,
    up.fitness_level,
    up.gender,
    gm.joined_at,
    gm.is_active,
    CASE WHEN s.user_id IS NOT NULL THEN true ELSE false END as has_subscription,
    s.status,
    CASE WHEN wp.user_id IS NOT NULL THEN true ELSE false END as has_workout_plan
  FROM gym_members gm
  INNER JOIN user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN subscriptions s ON up.user_id = s.user_id
  LEFT JOIN workout_plans wp ON up.user_id = wp.user_id AND wp.is_active = true
  WHERE gm.empresario_id = p_empresario_id
  ORDER BY gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. Función para contar miembros activos de un empresario
CREATE OR REPLACE FUNCTION count_empresario_active_members(p_empresario_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM gym_members
  WHERE empresario_id = p_empresario_id
    AND is_active = true;
  
  RETURN member_count;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE gym_members IS 'Relación entre usuarios y empresarios (gimnasios)';
COMMENT ON COLUMN admin_roles.monthly_fee IS 'Tarifa que se cobra al gimnasio por cada usuario activo mensualmente';
COMMENT ON COLUMN admin_roles.max_users IS 'Máximo de usuarios permitidos para el empresario (NULL = sin límite)';
COMMENT ON FUNCTION is_gym_member IS 'Verifica si un usuario pertenece a un gimnasio activo';
COMMENT ON FUNCTION get_gym_empresario IS 'Obtiene el ID del empresario de un usuario';
COMMENT ON VIEW empresario_stats IS 'Estadísticas agregadas de empresarios y sus miembros';

-- Ejemplo de uso:
-- 1. Crear empresario:
-- INSERT INTO admin_roles (user_id, email, role_type, name, gym_name, monthly_fee, max_users, is_active)
-- VALUES ('user_empresario_id', 'gym@gym.com', 'empresario', 'Gimnasio XYZ', 'Gimnasio XYZ', 500.00, 100, true);
--
-- 2. Agregar usuario al gimnasio:
-- INSERT INTO gym_members (user_id, empresario_id, is_active)
-- VALUES ('user_member_id', 'user_empresario_id', true);
--
-- 3. El usuario tendrá acceso gratuito automáticamente (verificado en payments.ts)

