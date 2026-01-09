-- Script para verificar y corregir permisos de activate_workout_plan

-- 1. Verificar que la función existe
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'activate_workout_plan';

-- 2. Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, text) TO anon;

-- 3. Verificar que la tabla workout_plans tiene las columnas necesarias
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_plans'
  AND column_name IN ('activated_at', 'times_repeated', 'last_week_monday', 'is_active', 'user_id', 'id');

-- 4. Verificar políticas RLS en workout_plans
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  CASE pol.polpermissive
    WHEN true THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as type,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' 
  AND pc.relname = 'workout_plans';

-- 5. Si no existen políticas adecuadas, crearlas
-- Política para SELECT (lectura)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can view their own workout plans'
  ) THEN
    CREATE POLICY "Users can view their own workout plans"
      ON public.workout_plans
      FOR SELECT
      USING (auth.uid()::text = user_id);
  END IF;
END $$;

-- Política para UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Users can update their own workout plans'
  ) THEN
    CREATE POLICY "Users can update their own workout plans"
      ON public.workout_plans
      FOR UPDATE
      USING (auth.uid()::text = user_id)
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- 6. Asegurarse de que RLS está habilitado
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- 7. Recrear la función con SECURITY DEFINER para bypassear RLS si es necesario
CREATE OR REPLACE FUNCTION public.activate_workout_plan(p_user_id text, p_plan_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Esto permite que la función ejecute con permisos del dueño
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
  
  -- Determinar si debemos incrementar el contador
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
END;
$$;

-- 8. Otorgar permisos nuevamente después de recrear
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_workout_plan(text, text) TO anon;

-- 9. Comentario final
COMMENT ON FUNCTION public.activate_workout_plan(text, text) IS 'Desactiva todos los planes activos del usuario y activa el plan indicado. Usa SECURITY DEFINER para bypassear RLS.';

SELECT '✅ Script de verificación y corrección completado' as status;


