-- Agregar columna email a gym_members para poder mostrar el email del usuario
-- antes de que complete el onboarding
ALTER TABLE gym_members 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Crear índice para búsquedas rápidas por email
CREATE INDEX IF NOT EXISTS idx_gym_members_email ON gym_members(email);

