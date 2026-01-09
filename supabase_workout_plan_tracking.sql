-- Agregar campos para rastrear activación y repeticiones de planes de entrenamiento
-- Estos campos permiten detectar cuando un plan ha expirado y cuántas veces se ha repetido

-- 1. activated_at: fecha/hora cuando el plan se activó por última vez
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 2. times_repeated: contador de cuántas veces se ha completado y reactivado el plan
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS times_repeated INTEGER DEFAULT 0;

-- 3. last_week_monday: lunes de la última semana en que se activó (formato YYYY-MM-DD)
-- Esto evita que sume al contador si se desactiva y reactiva en la misma semana
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS last_week_monday DATE;

-- Comentarios para documentación
COMMENT ON COLUMN public.workout_plans.activated_at IS 'Fecha y hora cuando el plan se activó por última vez';
COMMENT ON COLUMN public.workout_plans.times_repeated IS 'Número de veces que el plan se ha completado y reactivado';
COMMENT ON COLUMN public.workout_plans.last_week_monday IS 'Lunes de la última semana en que se activó (para evitar contar reactivaciones en la misma semana)';

-- Actualizar la función activate_workout_plan para incluir activated_at y last_week_monday
-- NOTA: Si existe una versión anterior con diferentes tipos, primero ejecutar supabase_fix_duplicate_function.sql
CREATE OR REPLACE FUNCTION public.activate_workout_plan(
  p_user_id text, 
  p_plan_id uuid  -- UUID es el tipo correcto para los IDs en Supabase
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que la función ejecute con permisos del dueño, bypaseando RLS
SET search_path = public
AS $$
DECLARE
  v_current_monday DATE;
  v_last_week_monday DATE;
  v_should_increment BOOLEAN;
BEGIN
  -- Calcular el lunes de la semana actual
  -- CURRENT_DATE - (día de semana - 1): si es lunes (1), resta 0; si es domingo (0), resta -1 = suma 1
  -- Usamos ISO day of week donde lunes = 1
  v_current_monday := CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER - 1);
  
  -- Obtener el last_week_monday del plan que se está activando
  SELECT last_week_monday INTO v_last_week_monday
  FROM public.workout_plans
  WHERE id = p_plan_id AND user_id = p_user_id;
  
  -- Si no se encontró el plan, lanzar error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan no encontrado para user_id=% y plan_id=%', p_user_id, p_plan_id;
  END IF;
  
  -- Determinar si debemos incrementar el contador
  -- Solo incrementar si:
  -- 1. El plan ya tiene un last_week_monday (no es la primera activación)
  -- 2. El last_week_monday es diferente al lunes de esta semana (no se reactivó en la misma semana)
  v_should_increment := (v_last_week_monday IS NOT NULL AND v_last_week_monday != v_current_monday);
  
  -- Desactivar todos los planes activos del usuario
  UPDATE public.workout_plans
    SET is_active = false
  WHERE user_id = p_user_id
    AND is_active = true;

  -- Activar el plan seleccionado y actualizar campos de tracking
  UPDATE public.workout_plans
    SET 
      is_active = true,
      activated_at = NOW(),
      last_week_monday = v_current_monday,
      times_repeated = CASE 
        WHEN v_should_increment THEN COALESCE(times_repeated, 0) + 1
        ELSE COALESCE(times_repeated, 0)
      END,
      updated_at = NOW()
  WHERE id = p_plan_id
    AND user_id = p_user_id;
    
  -- Verificar que se actualizó correctamente
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo activar el plan para user_id=% y plan_id=%', p_user_id, p_plan_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.activate_workout_plan(text, uuid) IS 'Desactiva todos los planes activos del usuario, activa el plan indicado y actualiza campos de tracking (activated_at, last_week_monday, times_repeated). Parámetros: (user_id text, plan_id uuid)';

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, uuid) TO anon;

