-- ============================================================================
-- CORREGIR: Lucas debe aparecer como activo en vista de Usuarios
-- ============================================================================

-- Asegurarnos de que Lucas existe en user_profiles con estado correcto
INSERT INTO user_profiles (
  user_id,
  name,
  email,
  created_at,
  updated_at
)
VALUES (
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  'Lucas',
  'lucas@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  name = 'Lucas',
  email = 'lucas@gmail.com',
  updated_at = NOW();

-- Verificar que Lucas está activo en gym_members
UPDATE gym_members
SET is_active = true,
    updated_at = NOW()
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Crear una subscripción activa para Lucas (si no existe)
-- Esto hará que aparezca como activo en la vista de Usuarios
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
  0,  -- Gratis (gimnasio)
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'active',
  current_period_end = (NOW() + INTERVAL '1 year')::timestamptz,
  updated_at = NOW();

-- Verificaciones finales
SELECT '✅ USER_PROFILES' as tabla, user_id, name, email
FROM user_profiles
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

SELECT '✅ GYM_MEMBERS' as tabla, user_id, is_active, subscription_expires_at
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

SELECT '✅ SUBSCRIPTIONS' as tabla, user_id, status, current_period_end
FROM subscriptions
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

