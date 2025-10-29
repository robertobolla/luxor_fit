-- Arreglar tipos en la función RPC activate_workout_plan
-- El problema: user_id es TEXT, no UUID

-- Eliminar la función anterior
DROP FUNCTION IF EXISTS public.activate_workout_plan(uuid, uuid);
DROP FUNCTION IF EXISTS public.activate_workout_plan(text, text);

-- Crear la función con tipos correctos (TEXT para user_id, UUID para plan_id)
CREATE OR REPLACE FUNCTION public.activate_workout_plan(p_user_id text, p_plan_id uuid)
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

COMMENT ON FUNCTION public.activate_workout_plan(text, uuid)
IS 'Desactiva todos los planes activos del usuario y activa el plan indicado';
