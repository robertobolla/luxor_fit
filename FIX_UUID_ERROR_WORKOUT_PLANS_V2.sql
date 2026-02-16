-- Solución Completa: Cambiar user_id a TEXT y restaurar políticas RLS
-- Este script maneja el error "cannot alter type of a column used in a policy definition"

BEGIN;

-- 1. Eliminar TODAS las políticas existentes que dependen de user_id
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can view their own workout plans" ON public.workout_plans; -- Por si acaso

-- 2. Eliminar índice dependiente
DROP INDEX IF EXISTS idx_workout_plans_user_id;

-- 3. Alterar la columna user_id a TEXT
ALTER TABLE public.workout_plans 
ALTER COLUMN user_id TYPE TEXT;

-- 4. Recrear el índice
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);

-- 5. Recrear las políticas de seguridad (RLS) corregidas para TEXT

-- SELECT: Ver propios planes
CREATE POLICY "Usuarios pueden ver sus propios planes"
  ON public.workout_plans
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- INSERT: Crear propios planes
CREATE POLICY "Usuarios pueden crear sus propios planes"
  ON public.workout_plans
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Actualizar propios planes
CREATE POLICY "Usuarios pueden actualizar sus propios planes"
  ON public.workout_plans
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- DELETE: Eliminar propios planes
CREATE POLICY "Usuarios pueden eliminar sus propios planes"
  ON public.workout_plans
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- 6. Asegurar que RLS está habilitado
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

COMMIT;
