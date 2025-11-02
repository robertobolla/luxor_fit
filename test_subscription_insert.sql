-- Script para insertar una suscripción de prueba
-- Reemplaza 'user_34nXvYybkoFMlYnfqCVQAoc4xLX' con tu user_id real de Clerk

INSERT INTO public.subscriptions (
  user_id,
  status,
  trial_start,
  trial_end,
  current_period_start,
  current_period_end
) VALUES (
  'user_34nXvYybkoFMlYnfqCVQAoc4xLX', -- Tu user_id de Clerk
  'trialing',
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'trialing',
  trial_start = NOW(),
  trial_end = NOW() + INTERVAL '7 days',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- Verificar que se creó
SELECT * FROM v_user_subscription WHERE user_id = 'user_34nXvYybkoFMlYnfqCVQAoc4xLX';

