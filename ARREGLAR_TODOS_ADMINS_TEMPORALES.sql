-- ==================================================================
-- ARREGLAR TODOS LOS ADMINS CON USER_ID TEMPORAL
-- ==================================================================
-- Este script encuentra y arregla TODOS los usuarios en admin_roles
-- que tienen user_id temporal (temp_, pending_) y los actualiza
-- con su user_id real de Clerk si ya se registraron
-- ==================================================================

-- 1. Ver todos los admins con user_id temporal
SELECT 
  '⚠️ Admins con user_id temporal' as info,
  id,
  user_id,
  email,
  role_type,
  is_active,
  CASE 
    WHEN user_id LIKE 'temp_%' THEN '❌ TEMPORAL (temp_)'
    WHEN user_id LIKE 'pending_%' THEN '❌ TEMPORAL (pending_)'
    ELSE '✅ Correcto'
  END as estado
FROM admin_roles
WHERE user_id LIKE 'temp_%' OR user_id LIKE 'pending_%'
ORDER BY created_at DESC;

-- 2. Ver si estos usuarios se han registrado en la app
SELECT 
  'Usuarios registrados que necesitan actualización' as info,
  ar.email,
  ar.user_id as user_id_temporal_en_admin_roles,
  up.user_id as user_id_real_en_profiles,
  ar.role_type,
  CASE 
    WHEN up.user_id IS NOT NULL THEN '✅ Registrado - SE PUEDE ARREGLAR'
    ELSE '❌ NO registrado - Esperar a que se registre'
  END as estado
FROM admin_roles ar
LEFT JOIN user_profiles up ON LOWER(ar.email) = LOWER(up.email)
WHERE ar.user_id LIKE 'temp_%' OR ar.user_id LIKE 'pending_%'
ORDER BY estado DESC;

-- ==================================================================
-- SOLUCIÓN AUTOMÁTICA: Actualizar TODOS los que se puedan
-- ==================================================================

-- 3. Actualizar todos los que ya tienen user_id real
DO $$
DECLARE
  admin_record RECORD;
  v_real_user_id TEXT;
  updated_count INTEGER := 0;
  pending_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando actualización masiva de admins...';
  RAISE NOTICE '';
  
  -- Iterar sobre todos los admin_roles con user_id temporal
  FOR admin_record IN 
    SELECT id, user_id, email, role_type
    FROM admin_roles
    WHERE user_id LIKE 'temp_%' OR user_id LIKE 'pending_%'
  LOOP
    -- Buscar el user_id real desde user_profiles
    SELECT user_id INTO v_real_user_id
    FROM user_profiles
    WHERE LOWER(email) = LOWER(admin_record.email);
    
    IF v_real_user_id IS NOT NULL THEN
      -- Usuario se registró - actualizar
      UPDATE admin_roles
      SET 
        user_id = v_real_user_id,
        is_active = true,
        updated_at = NOW()
      WHERE id = admin_record.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE '✅ Actualizado: % → %', admin_record.email, v_real_user_id;
    ELSE
      -- Usuario NO se ha registrado todavía
      pending_count := pending_count + 1;
      RAISE NOTICE '⏳ Pendiente: % (aún no registrado)', admin_record.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '✅ Actualizados: %', updated_count;
  RAISE NOTICE '⏳ Pendientes: %', pending_count;
  RAISE NOTICE '';
  
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Los usuarios actualizados deben cerrar y volver a abrir la app.';
  END IF;
  
  IF pending_count > 0 THEN
    RAISE NOTICE '⏳ Los usuarios pendientes deben registrarse en la app primero.';
  END IF;
END $$;

-- 4. Verificación final - Listar todos los admins activos
SELECT 
  '✅ ADMINS ACTIVOS' as info,
  email,
  name,
  user_id,
  role_type,
  is_active,
  CASE 
    WHEN user_id LIKE 'temp_%' OR user_id LIKE 'pending_%' 
    THEN '⏳ Pendiente de registro'
    ELSE '✅ Activo'
  END as estado,
  created_at
FROM admin_roles
WHERE role_type = 'admin' AND is_active = true
ORDER BY created_at DESC;

-- ==================================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT
-- ==================================================================
-- 
-- ✅ USUARIOS ACTUALIZADOS:
-- Deben cerrar la app completamente y volverla a abrir
-- Tendrán acceso inmediato sin paywall
-- 
-- ⏳ USUARIOS PENDIENTES:
-- Deben registrarse en la app con el email que se les asignó
-- Una vez registrados, ejecutar este script nuevamente
-- 
-- 🔍 VERIFICAR MANUALMENTE UN USUARIO:
-- SELECT ar.user_id, ar.email, up.user_id as real_user_id
-- FROM admin_roles ar
-- LEFT JOIN user_profiles up ON LOWER(ar.email) = LOWER(up.email)
-- WHERE LOWER(ar.email) = 'email@ejemplo.com';
-- 
-- Si ar.user_id != up.user_id → Necesita actualización
-- Si up.user_id IS NULL → Usuario no se ha registrado
-- 
-- ==================================================================


