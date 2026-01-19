-- ============================================================================
-- AGREGAR CAMPOS DE DURACIÓN Y EXPIRACIÓN PARA CÓDIGOS DE SOCIOS
-- ============================================================================
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar campos para configurar duración del beneficio y expiración del código
ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS benefit_duration_days INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ DEFAULT NULL;

-- benefit_duration_days:
--   NULL = acceso permanente (sin fecha de expiración)
--   > 0 = número de días que dura el acceso desde que se usa el código

-- code_expires_at:
--   NULL = el código nunca expira y se puede usar siempre
--   fecha = después de esta fecha el código ya no se puede usar

-- 2. Comentarios para documentación
COMMENT ON COLUMN admin_roles.benefit_duration_days IS 'Duración en días del beneficio al usar el código. NULL = permanente';
COMMENT ON COLUMN admin_roles.code_expires_at IS 'Fecha límite para usar el código. NULL = nunca expira';

-- 3. Crear índice para códigos que expiran
CREATE INDEX IF NOT EXISTS idx_admin_roles_code_expires 
ON admin_roles(code_expires_at) 
WHERE code_expires_at IS NOT NULL AND role_type = 'socio';

-- 4. Verificar cambios
SELECT 
  'Campos agregados correctamente' as resultado,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admin_roles'
  AND table_schema = 'public'
  AND column_name IN ('benefit_duration_days', 'code_expires_at')
ORDER BY column_name;
