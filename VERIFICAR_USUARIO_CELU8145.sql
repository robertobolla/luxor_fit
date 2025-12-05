-- Script para verificar el estado del usuario celu8145@gmail.com

-- 1. Verificar si existe en gym_members
SELECT 
  user_id,
  email,
  name,
  empresario_id,
  subscription_expires_at,
  created_at,
  CASE 
    WHEN user_id IS NULL OR user_id = '' THEN '❌ No tiene user_id de Clerk'
    ELSE '✅ Tiene user_id de Clerk'
  END as estado_clerk
FROM gym_members
WHERE email = 'celu8145@gmail.com';

-- 2. Si no aparece nada arriba, el registro no se creó
-- Si aparece pero user_id es NULL, significa que se agregó desde el dashboard
-- pero la edge function no creó el usuario en Clerk

-- 3. SOLUCIÓN: Eliminar el registro incompleto para poder recrearlo
-- (Solo ejecuta esto si user_id es NULL o vacío)
-- DELETE FROM gym_members WHERE email = 'celu8145@gmail.com' AND (user_id IS NULL OR user_id = '');

-- 4. Después de eliminar, vuelve al dashboard y usa "Crear Nuevo Usuario"
-- Esto debería:
-- - Crear el usuario en Clerk
-- - Enviar email de invitación
-- - Crear el registro en gym_members con el user_id correcto

