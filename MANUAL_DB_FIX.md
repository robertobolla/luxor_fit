# Arreglo Manual en la Base de Datos (Supabase Dashboard)

Si los scripts SQL automatizados están fallando, por favor sigue estos pasos manualmente en el panel de control de Supabase.

## Pasos

1.  **Abre tu proyecto en Supabase**.
2.  Ve al **Editor SQL** (SQL Editor) en la barra lateral izquierda.
3.  Crea una **Nueva Consulta** (New Query).
4.  Copia y pega el siguiente código SQL (es la versión simplificada y directa):

```sql
-- Detener RLS temporalmente para evitar bloqueos
ALTER TABLE public.workout_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions DISABLE ROW LEVEL SECURITY;

-- 1. Eliminar dependencias que bloquean el cambio
DROP VIEW IF EXISTS public.user_stats CASCADE;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;

-- 2. Cambiar la columna a TEXT (Esto es lo crítico)
-- Usamos USING para convertir cualquier dato existente
ALTER TABLE public.workout_plans 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE public.workout_completions 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 3. Restaurar RLS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

-- 4. Recrear Políticas RLS Esenciales
CREATE POLICY "Usuarios pueden ver sus propios planes"
  ON public.workout_plans FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden crear sus propios planes"
  ON public.workout_plans FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios planes"
  ON public.workout_plans FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios planes"
  ON public.workout_plans FOR DELETE
  USING (auth.uid()::text = user_id);
```

5.  Haz clic en **RUN** (Ejecutar).
6.  Verifica que en la parte inferior diga "Success" o "No rows returned".
    *   Si dice "Error", por favor toma una captura de pantalla o copia el mensaje de error exacto.

## Verificación Visual

1.  Ve al **Editor de Tablas** (Table Editor) en la barra lateral.
2.  Selecciona la tabla `workout_plans`.
3.  Busca la columna `user_id`.
4.  El icono a la izquierda del nombre debe decir `text` (o `abc`), **NO** `uuid`.

Si logras ver `text` en la columna, el problema estará resuelto. Recarga la app y debería funcionar.
