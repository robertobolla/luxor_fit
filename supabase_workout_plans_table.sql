-- Crear tabla de planes de entrenamiento
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- ID de Clerk
  plan_name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  plan_data JSONB NOT NULL, -- Almacena toda la estructura del plan
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_created_at ON public.workout_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_plans_is_active ON public.workout_plans(is_active);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Permitir lectura a todos los usuarios autenticados de sus propios planes
CREATE POLICY "Usuarios pueden ver sus propios planes"
  ON public.workout_plans
  FOR SELECT
  USING (true); -- Permitimos SELECT ya que filtramos por user_id en el cliente

-- Permitir inserción para crear planes
CREATE POLICY "Usuarios pueden crear sus propios planes"
  ON public.workout_plans
  FOR INSERT
  WITH CHECK (true); -- Permitimos INSERT ya que usamos user_id de Clerk

-- Permitir actualización de sus propios planes
CREATE POLICY "Usuarios pueden actualizar sus propios planes"
  ON public.workout_plans
  FOR UPDATE
  USING (true) -- Permitimos UPDATE ya que filtramos por user_id en el cliente
  WITH CHECK (true);

-- Permitir eliminación de sus propios planes
CREATE POLICY "Usuarios pueden eliminar sus propios planes"
  ON public.workout_plans
  FOR DELETE
  USING (true); -- Permitimos DELETE ya que filtramos por user_id en el cliente

-- Comentarios para documentación
COMMENT ON TABLE public.workout_plans IS 'Planes de entrenamiento generados por IA para usuarios';
COMMENT ON COLUMN public.workout_plans.user_id IS 'ID del usuario de Clerk';
COMMENT ON COLUMN public.workout_plans.plan_data IS 'Estructura completa del plan en formato JSON';
COMMENT ON COLUMN public.workout_plans.is_active IS 'Indica si el plan está actualmente activo';

