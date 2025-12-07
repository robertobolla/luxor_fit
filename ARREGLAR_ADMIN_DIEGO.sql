-- ==================================================================
-- ARREGLAR ADMIN: diegomatiassuarez.dmsr.us@gmail.com
-- ==================================================================
-- Este usuario fue creado con el bug del user_id temporal
-- Vamos a actualizarlo con su user_id real de Clerk
-- ==================================================================

-- 1. Ver el estado actual en admin_roles
SELECT 
  'Estado en admin_roles' as info,
  id,
  user_id,
  email,
  role_type,
  is_active,
  created_at
FROM admin_roles
WHERE LOWER(email) = 'diegomatiassuarez.dmsr.us@gmail.com';

-- 2. Ver si el usuario se registró en la app (user_profiles)
SELECT 
  'Estado en user_profiles' as info,
  id,
  user_id,
  email,
  name,
  created_at
FROM user_profiles
WHERE LOWER(email) = 'diegomatiassuarez.dmsr.us@gmail.com';

-- ==================================================================
-- SOLUCIÓN
-- ==================================================================

-- 3. Actualizar admin_roles con el user_id correcto de Clerk
DO $$
DECLARE
  v_real_user_id TEXT;
  v_admin_id UUID;
  v_temp_user_id TEXT;
BEGIN
  -- Buscar el user_id REAL de Clerk desde user_profiles
  SELECT user_id INTO v_real_user_id
  FROM user_profiles
  WHERE LOWER(email) = 'diegomatiassuarez.dmsr.us@gmail.com';
  
  -- Buscar el registro en admin_roles
  SELECT id, user_id INTO v_admin_id, v_temp_user_id
  FROM admin_roles
  WHERE LOWER(email) = 'diegomatiassuarez.dmsr.us@gmail.com';
  
  -- Verificar resultados
  IF v_real_user_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: El usuario NO se ha registrado en la app todavía.';
    RAISE NOTICE 'El usuario debe:';
    RAISE NOTICE '1. Descargar la app';
    RAISE NOTICE '2. Registrarse con el email: diegomatiassuarez.dmsr.us@gmail.com';
    RAISE NOTICE '3. Luego ejecutar este script nuevamente';
  ELSIF v_admin_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: El usuario NO está en admin_roles.';
    RAISE NOTICE 'Crear el registro manualmente desde el dashboard primero.';
  ELSE
    -- Verificar si ya tiene el user_id correcto
    IF v_temp_user_id = v_real_user_id THEN
      RAISE NOTICE '✅ El user_id ya es correcto: %', v_real_user_id;
      RAISE NOTICE 'El problema debe ser otro. Verificar:';
      RAISE NOTICE '- is_active debe ser true';
      RAISE NOTICE '- role_type debe ser admin';
    ELSE
      -- Actualizar con el user_id correcto
      RAISE NOTICE '🔄 Actualizando user_id...';
      RAISE NOTICE 'Anterior (temporal): %', v_temp_user_id;
      RAISE NOTICE 'Nuevo (real): %', v_real_user_id;
      
      UPDATE admin_roles
      SET 
        user_id = v_real_user_id,
        is_active = true,
        role_type = 'admin',
        updated_at = NOW()
      WHERE id = v_admin_id;
      
      RAISE NOTICE '✅ Usuario actualizado correctamente!';
      RAISE NOTICE 'Diego debe cerrar y volver a abrir la app para tener acceso.';
    END IF;
  END IF;
END $$;

-- 4. Verificación final
SELECT 
  '✅ VERIFICACIÓN FINAL' as status,
  up.email,
  up.name,
  up.user_id as user_id_en_profiles,
  ar.user_id as user_id_en_admin_roles,
  ar.role_type,
  ar.is_active,
  CASE 
    WHEN up.user_id = ar.user_id AND ar.is_active = true AND ar.role_type = 'admin' 
    THEN '✅ TODO CORRECTO - Usuario debe cerrar y abrir app'
    WHEN up.user_id != ar.user_id 
    THEN '❌ user_id no coincide'
    WHEN ar.is_active = false 
    THEN '❌ Admin inactivo'
    WHEN ar.role_type != 'admin' 
    THEN '❌ Rol incorrecto'
    ELSE '❌ Otro problema'
  END as diagnostico
FROM user_profiles up
LEFT JOIN admin_roles ar ON LOWER(ar.email) = LOWER(up.email)
WHERE LOWER(up.email) = 'diegomatiassuarez.dmsr.us@gmail.com';

-- ==================================================================
-- NOTAS
-- ==================================================================
-- 
-- ¿POR QUÉ PASÓ ESTO?
-- 
-- Este usuario fue creado desde el dashboard ANTES de arreglar el bug
-- en Settings.tsx que generaba user_id temporales.
-- 
-- SÍNTOMAS:
-- - Usuario creado en admin_roles con user_id temporal (temp_xxx)
-- - Usuario se registró en la app con su email
-- - Clerk le asignó su user_id real (user_xxx)
-- - App busca en admin_roles por user_id real
-- - No coincide con el temporal → Ve paywall
-- 
-- SOLUCIÓN:
-- - Este script actualiza el user_id temporal por el real
-- - Usuario debe cerrar y abrir la app
-- - Tendrá acceso inmediato
-- 
-- PREVENCIÓN FUTURA:
-- - El bug ya está arreglado en el código
-- - Nuevos admins se crearán con user_id correcto
-- - Este problema no volverá a pasar
-- 
-- ==================================================================

