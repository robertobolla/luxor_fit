-- Fix: "invalid input syntax for type uuid"
-- El error indica que la columna user_id en workout_plans es de tipo UUID,
-- pero se está intentando usar con IDs de Clerk (que son texto, ej: "user_2...").

-- Solución: Cambiar el tipo de la columna user_id a TEXT.

BEGIN;

  -- 1. Alterar la columna user_id a TEXT
  -- Esto convertirá cualquier UUID existente a su representación en texto.
  ALTER TABLE public.workout_plans 
  ALTER COLUMN user_id TYPE TEXT;

  -- 2. Asegurarse de que el índice también soporte texto (si existe)
  -- Postgres maneja esto automáticamente, pero reconstruimos por si acaso.
  DROP INDEX IF EXISTS idx_workout_plans_user_id;
  CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);

  -- 3. Verificar si otras tablas relacionadas tienen el mismo problema
  -- (Opcional, pero recomendado)
  -- ALTER TABLE public.workout_completions ALTER COLUMN user_id TYPE TEXT;

COMMIT;
