-- Agregar columnas para planes adaptados con IA
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS adaptation_prompt TEXT,
ADD COLUMN IF NOT EXISTS parent_plan_id UUID REFERENCES public.workout_plans(id);

-- Crear índice para mejorar consultas de planes adaptados
CREATE INDEX IF NOT EXISTS idx_workout_plans_parent_plan_id 
ON public.workout_plans(parent_plan_id);

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN public.workout_plans.adaptation_prompt IS 'Prompt usado para adaptar este plan con IA';
COMMENT ON COLUMN public.workout_plans.parent_plan_id IS 'ID del plan original del cual se adaptó este plan';
