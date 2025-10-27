-- SCRIPT PARA ACTUALIZAR EMAIL MANUALMENTE
-- 
-- Instrucciones:
-- 1. Reemplaza 'TU_USER_ID_AQUI' con tu User ID de Clerk (lo ves en la caja roja)
-- 2. Reemplaza 'tu@email.com' con tu email real
-- 3. Ejecuta este script en Supabase SQL Editor

UPDATE user_profiles
SET email = 'tu@email.com'
WHERE user_id = 'TU_USER_ID_AQUI';

-- Verificar que se actualizó correctamente:
SELECT user_id, name, email FROM user_profiles WHERE user_id = 'TU_USER_ID_AQUI';

