-- Script para eliminar funciones duplicadas y crear la versión correcta

-- 1. ELIMINAR TODAS las versiones de activate_workout_plan
DROP FUNCTION IF EXISTS public.activate_workout_plan(text, text);
DROP FUNCTION IF EXISTS public.activate_workout_plan(text, uuid);

-- 2. CREAR LA FUNCIÓN CORRECTA con UUID (tipo nativo de IDs en Supabase)
CREATE OR REPLACE FUNCTION public.activate_workout_plan(
  p_user_id text, 
  p_plan_id uuid  -- UUID es el tipo correcto para los IDs
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
  -- Calcular el lunes de la semana actual usando ISODOW (lunes = 1)
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

-- 3. OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, uuid) TO anon;

-- 4. COMENTARIO
COMMENT ON FUNCTION public.activate_workout_plan(text, uuid) IS 'Desactiva todos los planes activos del usuario y activa el plan indicado. Usa SECURITY DEFINER para bypassear RLS. Parámetros: (user_id text, plan_id uuid)';

-- 5. VERIFICAR que solo existe una versión
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'activate_workout_plan';

SELECT '✅ Función activate_workout_plan recreada correctamente con UUID' as status;


