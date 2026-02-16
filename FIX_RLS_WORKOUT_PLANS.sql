-- Fix RLS: Permitir a los usuarios ver sus propios planes de entrenamiento
-- Error actual: "new row violates row-level security policy for table "workout_plans""

-- Esto ocurre porque al insertar y retornar el ID (select), se requiere permiso de SELECT.
-- Actualmente solo existen políticas para INSERT, UPDATE y DELETE.

-- 1. Eliminar política de SELECT si existe (para evitar duplicados o conflictos)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can view their own workout plans" ON public.workout_plans;

-- 2. Crear la política de SELECT correcta
CREATE POLICY "Usuarios pueden ver sus propios planes" 
ON public.workout_plans 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- 3. Asegurar que RLS está habilitado (ya debería estarlo, pero por seguridad)
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- 4. Verificar permisos (opcional, para debug)
-- SELECT * FROM public.workout_plans WHERE user_id = auth.uid()::text;
