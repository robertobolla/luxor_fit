-- Arreglar restricción de clave foránea para permitir eliminación de planes padre
-- Primero eliminar la restricción existente
ALTER TABLE public.workout_plans 
DROP CONSTRAINT IF EXISTS workout_plans_parent_plan_id_fkey;

-- Recrear la restricción con CASCADE para permitir eliminación
ALTER TABLE public.workout_plans 
ADD CONSTRAINT workout_plans_parent_plan_id_fkey 
FOREIGN KEY (parent_plan_id) REFERENCES public.workout_plans(id) 
ON DELETE SET NULL;

-- Comentario para documentar el cambio
COMMENT ON CONSTRAINT workout_plans_parent_plan_id_fkey ON public.workout_plans 
IS 'Referencia al plan padre. Se establece NULL si el plan padre se elimina.';
