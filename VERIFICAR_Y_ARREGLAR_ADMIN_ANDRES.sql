-- ==================================================================
-- VERIFICAR Y ARREGLAR ACCESO DE ADMIN: andresgonzalezgandolfo@gmail.com
-- ==================================================================

-- 1. Verificar si el usuario existe en user_profiles
SELECT 
  'user_profiles' as tabla,
  id,
  user_id,
  email,
  name
FROM user_profiles
WHERE LOWER(email) = 'andresgonzalezgandolfo@gmail.com';

-- 2. Verificar si el usuario está en admin_roles
SELECT 
  'admin_roles' as tabla,
  id,
  user_id,
  email,
  role_type,
  is_active,
  created_at,
  updated_at
FROM admin_roles
WHERE LOWER(email) = 'andresgonzalezgandolfo@gmail.com';

-- 3. Verificar suscripciones actuales del usuario
SELECT 
  'v_user_subscription' as tabla,
  user_id,
  is_active,
  status,
  trial_start,
  trial_end
FROM v_user_subscription
WHERE user_id IN (
  SELECT user_id FROM user_profiles WHERE LOWER(email) = 'andresgonzalezgandolfo@gmail.com'
);

-- ==================================================================
-- SOLUCIÓN: Asegurar que el admin esté correctamente configurado
-- ==================================================================

-- 4. Agregar o actualizar el usuario en admin_roles
-- Primero intentamos actualizar si ya existe
DO $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Obtener el user_id de Clerk desde user_profiles
  SELECT user_id INTO v_user_id
  FROM user_profiles
  WHERE LOWER(email) = 'andresgonzalezgandolfo@gmail.com';
  
  -- Si encontramos el user_id
  IF v_user_id IS NOT NULL THEN
    -- Intentar actualizar primero (si ya existe en admin_roles)
    UPDATE admin_roles
    SET 
      is_active = true,
      role_type = 'admin',
      updated_at = NOW()
    WHERE LOWER(email) = 'andresgonzalezgandolfo@gmail.com';
    
    -- Si no se actualizó ninguna fila, entonces insertar
    IF NOT FOUND THEN
      INSERT INTO admin_roles (user_id, email, role_type, is_active)
      VALUES (v_user_id, 'andresgonzalezgandolfo@gmail.com', 'admin', true)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        role_type = 'admin',
        is_active = true,
        updated_at = NOW();
    END IF;
    
    RAISE NOTICE '✅ Usuario agregado/actualizado correctamente en admin_roles';
  ELSE
    RAISE NOTICE '❌ No se encontró el usuario en user_profiles';
  END IF;
END $$;

-- 5. Actualizar el user_id en user_profiles si es necesario
-- (Esto asegura que el user_id de Clerk esté sincronizado)
-- Nota: user_profiles no tiene columna 'role', el rol se maneja en admin_roles

-- ==================================================================
-- VERIFICACIÓN FINAL
-- ==================================================================

-- 6. Verificar que todo esté correcto
SELECT 
  'VERIFICACIÓN FINAL' as status,
  up.id,
  up.user_id,
  up.email,
  up.name,
  ar.role_type as role_en_admin_roles,
  ar.is_active as admin_activo,
  CASE 
    WHEN ar.is_active = true AND ar.role_type = 'admin' THEN '✅ ADMIN CORRECTO'
    ELSE '❌ NO ES ADMIN O INACTIVO'
  END as resultado
FROM user_profiles up
LEFT JOIN admin_roles ar ON LOWER(ar.email) = LOWER(up.email)
WHERE LOWER(up.email) = 'andresgonzalezgandolfo@gmail.com';

-- ==================================================================
-- NOTAS IMPORTANTES
-- ==================================================================
-- 
-- ¿POR QUÉ LE APARECE EL PAYWALL SI ES ADMIN?
-- 
-- La verificación de admin se hace en este orden:
-- 1. Busca en admin_roles por user_id
-- 2. Si no encuentra, busca por email
-- 3. Si encuentra por email, actualiza el user_id automáticamente
-- 
-- POSIBLES PROBLEMAS:
-- 
-- A) No está en admin_roles
--    Solución: El script anterior lo agrega
-- 
-- B) El is_active está en false
--    Solución: El script lo pone en true
-- 
-- C) El user_id no coincide
--    Solución: La app lo actualiza automáticamente al hacer login
-- 
-- D) Problemas de caché en la app
--    Solución: Pedir al usuario que cierre la app completamente y la vuelva a abrir
-- 
-- ==================================================================

-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 
-- 1. El usuario debería poder acceder sin problemas
-- 2. Si aún no funciona, pídele que:
--    a) Cierre la app completamente (swipe up en iOS/Android)
--    b) Vuelva a abrirla
--    c) Haga login nuevamente
-- 
-- 3. Si el problema persiste, puede usar el botón de debug en desarrollo:
--    - En la pantalla de paywall hay un botón "🔄 Refrescar Suscripción (Debug)"
--    - Ese botón fuerza una recarga del estado de suscripción
-- 
-- ==================================================================

