-- Script para actualizar emails de usuarios existentes en gym_members
-- Este script debe ejecutarse DESPUÉS de ejecutar supabase_fix_email_display_gym_members.sql

-- 1. Verificar cuántos usuarios tienen email NULL o vacío en gym_members
SELECT 
  COUNT(*) as total_sin_email,
  COUNT(CASE WHEN up.email IS NOT NULL THEN 1 END) as tienen_perfil_con_email,
  COUNT(CASE WHEN up.email IS NULL THEN 1 END) as sin_perfil_aun
FROM gym_members gm
LEFT JOIN user_profiles up ON gm.user_id = up.user_id
WHERE gm.email IS NULL OR gm.email = '';

-- 2. Actualizar emails de usuarios que ya tienen perfil completo
-- Esto copia el email de user_profiles a gym_members
UPDATE gym_members gm
SET email = up.email
FROM user_profiles up
WHERE gm.user_id = up.user_id 
  AND (gm.email IS NULL OR gm.email = '')
  AND up.email IS NOT NULL
  AND up.email != '';

-- 3. Verificar el resultado de la actualización
SELECT 
  'Usuarios actualizados' as estado,
  COUNT(*) as cantidad
FROM gym_members
WHERE email IS NOT NULL AND email != '';

-- 4. Listar usuarios que aún no tienen email (no han completado onboarding)
-- Estos usuarios aparecerán con "-" hasta que completen su perfil
SELECT 
  gm.user_id,
  gm.empresario_id,
  gm.joined_at,
  'Sin email - Usuario creado desde dashboard pero aún no ha completado onboarding' as observacion
FROM gym_members gm
LEFT JOIN user_profiles up ON gm.user_id = up.user_id
WHERE (gm.email IS NULL OR gm.email = '')
  AND up.email IS NULL
ORDER BY gm.joined_at DESC;

-- 5. (Opcional) Si quieres actualizar manualmente el email de un usuario específico
-- Descomenta y reemplaza los valores:
-- UPDATE gym_members
-- SET email = 'email@ejemplo.com'
-- WHERE user_id = 'clerk_user_id_aqui';

