-- Integridad de planes de entrenamiento
-- 1) Un solo plan activo por usuario (índice único parcial)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_plan_per_user
  ON public.workout_plans (user_id)
  WHERE is_active = true;

-- 2) Relación segura: completados → planes (proteger historial)
ALTER TABLE public.workout_completions
  ADD CONSTRAINT IF NOT EXISTS fk_workout_plan
  FOREIGN KEY (workout_plan_id) REFERENCES public.workout_plans(id)
  ON DELETE RESTRICT;

-- 3) RPC para activar plan de forma atómica (desactiva otros y activa el elegido)
CREATE OR REPLACE FUNCTION public.activate_workout_plan(p_user_id text, p_plan_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Desactivar todos los planes activos del usuario
  UPDATE public.workout_plans
    SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;

  -- Activar el plan seleccionado (del mismo usuario)
  UPDATE public.workout_plans
    SET is_active = true
  WHERE id = p_plan_id
    AND user_id = p_user_id;
END;
$$;

-- Opcional: comentario para documentación
COMMENT ON FUNCTION public.activate_workout_plan(text, text) IS 'Desactiva todos los planes activos del usuario y activa el plan indicado';


