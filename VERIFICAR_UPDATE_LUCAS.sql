-- ============================================================================
-- VERIFICAR SI EL UPDATE FUNCIONÓ
-- ============================================================================

-- Ver el estado actual de Lucas
SELECT 
  'ESTADO DE LUCAS' as info,
  user_id,
  empresario_id,
  is_active,
  joined_at
FROM gym_members
WHERE user_id LIKE '%36j%'
ORDER BY user_id;

-- Ver si existe en user_profiles
SELECT 
  'LUCAS EN USER_PROFILES' as info,
  user_id,
  name,
  email
FROM user_profiles
WHERE user_id LIKE '%36j%';

-- Hacer un JOIN manual para ver qué pasa
SELECT 
  'JOIN MANUAL' as info,
  gm.user_id,
  gm.empresario_id,
  up.name,
  up.email,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
WHERE gm.user_id LIKE '%36j%';


