-- ============================================================================
-- CORREGIR: Crear subscripción para Lucas (usuario de gimnasio)
-- ============================================================================

-- Crear una subscripción activa para Lucas
-- Los usuarios de gimnasio tienen subscripción gratis/activa
INSERT INTO subscriptions (
  user_id,
  status,
  current_period_end,
  monthly_amount,
  created_at,
  updated_at
)
VALUES (
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  'active',
  (NOW() + INTERVAL '1 year')::timestamptz,  -- Activo por 1 año
  0,  -- Gratis (usuario de gimnasio)
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'active',
  current_period_end = (NOW() + INTERVAL '1 year')::timestamptz,
  updated_at = NOW();

-- Verificar que se creó correctamente
SELECT 
  '✅ SUBSCRIPCIÓN CREADA' as resultado,
  user_id,
  status,
  current_period_end,
  monthly_amount,
  created_at
FROM subscriptions
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

