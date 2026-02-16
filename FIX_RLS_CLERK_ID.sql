-- FIX PARA IDs DE CLERK (FIX_RLS_CLERK_ID.sql)
-- El problema es que `auth.uid()` intenta castear el token a UUID, pero los IDs de Clerk NO son UUIDs.
-- Solución: Usar `(auth.jwt() ->> 'sub')` en lugar de `auth.uid()`.

BEGIN;

-- 1. Eliminar Políticas existentes que usan auth.uid()
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios completions" ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_select_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_insert_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_update_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_delete_policy ON public.workout_completions;

-- 2. Crear Políticas usando auth.jwt() ->> 'sub' (TEXTO DIRECTO)

-- WORKOUT PLANS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios planes"
  ON public.workout_plans FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Usuarios pueden crear sus propios planes"
  ON public.workout_plans FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios planes"
  ON public.workout_plans FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios planes"
  ON public.workout_plans FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- WORKOUT COMPLETIONS (Usando la misma lógica por seguridad, o true si prefieres)
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

-- Nota: Si user_id en workout_completions es NULLABLE, esto podría fallar si user_id es null.
-- Asumimos que user_id siempre tiene valor.
CREATE POLICY "Usuarios pueden ver sus propios completions"
  ON public.workout_completions FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Usuarios pueden crear sus propios completions"
  ON public.workout_completions FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios completions"
  ON public.workout_completions FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios completions"
  ON public.workout_completions FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

COMMIT;
