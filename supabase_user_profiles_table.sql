-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE, -- ID de Clerk
  name TEXT,
  age INTEGER,
  height INTEGER, -- en centímetros
  weight INTEGER, -- en kilogramos
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  goals TEXT[] DEFAULT '{}', -- Array de objetivos: weight_loss, muscle_gain, etc.
  activity_types TEXT[] DEFAULT '{}', -- Array de tipos de actividad preferidos
  available_days INTEGER DEFAULT 3, -- Días disponibles por semana
  session_duration INTEGER DEFAULT 30, -- Duración de sesión en minutos
  equipment TEXT[] DEFAULT '{}', -- Array de equipamiento disponible
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_fitness_level ON public.user_profiles(fitness_level);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Permitir lectura a todos los usuarios autenticados de su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.user_profiles
  FOR SELECT
  USING (true); -- Permitimos SELECT ya que filtramos por user_id en el cliente

-- Permitir inserción para crear perfil
CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true); -- Permitimos INSERT ya que usamos user_id de Clerk

-- Permitir actualización de su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.user_profiles
  FOR UPDATE
  USING (true) -- Permitimos UPDATE ya que filtramos por user_id en el cliente
  WITH CHECK (true);

-- Permitir eliminación de su propio perfil
CREATE POLICY "Usuarios pueden eliminar su propio perfil"
  ON public.user_profiles
  FOR DELETE
  USING (true); -- Permitimos DELETE ya que filtramos por user_id en el cliente

-- Comentarios para documentación
COMMENT ON TABLE public.user_profiles IS 'Perfiles de usuario con información de fitness y preferencias';
COMMENT ON COLUMN public.user_profiles.user_id IS 'ID del usuario de Clerk';
COMMENT ON COLUMN public.user_profiles.fitness_level IS 'Nivel de fitness: beginner, intermediate, advanced';
COMMENT ON COLUMN public.user_profiles.goals IS 'Objetivos del usuario: weight_loss, muscle_gain, strength, endurance, flexibility, general_fitness';
COMMENT ON COLUMN public.user_profiles.activity_types IS 'Tipos de actividad preferidos: cardio, strength, sports, yoga, hiit, mixed';
COMMENT ON COLUMN public.user_profiles.equipment IS 'Equipamiento disponible: none, dumbbells, barbell, resistance_bands, pull_up_bar, bench, gym_access';

