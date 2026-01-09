-- ============================================================================
-- CORREGIR: Crear subscription_status para Lucas
-- ============================================================================

-- 1. Verificar si Lucas está en subscription_status
SELECT 
  '1. LUCAS EN SUBSCRIPTION_STATUS' as verificacion,
  user_id,
  is_active,
  is_gym_member,
  last_checked
FROM subscription_status
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- 2. Insertar o actualizar subscription_status para Lucas
-- Marcar como activo y miembro de gimnasio
INSERT INTO subscription_status (
  user_id,
  is_active,
  is_gym_member,
  last_checked
)
VALUES (
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  true,  -- Activo
  true,  -- Es miembro de gimnasio
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  is_active = true,
  is_gym_member = true,
  last_checked = NOW();

-- 3. Verificar que se creó/actualizó correctamente
SELECT 
  '✅ SUBSCRIPTION_STATUS ACTUALIZADO' as resultado,
  user_id,
  is_active,
  is_gym_member,
  last_checked
FROM subscription_status
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

