-- Agregar columna de email a user_profiles como respaldo
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Comentario
COMMENT ON COLUMN user_profiles.email IS 'Email del usuario (respaldo de Clerk)';

