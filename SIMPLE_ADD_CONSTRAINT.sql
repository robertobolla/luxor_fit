-- Agregar constraint única a body_metrics
-- Copiar y pegar EN UNA SOLA LÍNEA en Supabase SQL Editor

ALTER TABLE public.body_metrics ADD CONSTRAINT body_metrics_user_date_unique UNIQUE (user_id, date);

