
-- ============================================================================
-- SCRIPT DE AUTO-REPARACIÓN
-- ============================================================================

-- IMPORTANTE: Ejecuta esto en el editor SQL de Supabase mientras estás logueado.

-- 1. Forzar la actualización de tu ID de usuario en admin_roles
--    usando tu ID actual de sesión (auth.uid())
UPDATE admin_roles
SET user_id = auth.uid()::text
WHERE email = 'robertobolla9@gmail.com';  -- Asegúrate que este sea tu email exacto

-- 2. Verificar de nuevo si ahora eres admin
SELECT 
    auth.uid() as mi_id_actual,
    is_admin() as ahora_soy_admin;
