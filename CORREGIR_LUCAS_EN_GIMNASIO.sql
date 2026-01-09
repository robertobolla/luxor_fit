-- ============================================================================
-- CORREGIR - Asociar Lucas al Gimnasio
-- ============================================================================
-- Este script asegura que Lucas esté correctamente asociado al gimnasio

DO $$
DECLARE
  v_lucas_id TEXT;
  v_empresario_id TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Obtener user_id de Lucas
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE LOWER(email) LIKE '%lucas%' OR LOWER(name) LIKE '%lucas%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Obtener user_id del empresario
  SELECT user_id INTO v_empresario_id
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró usuario Lucas';
    RETURN;
  END IF;

  IF v_empresario_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró empresario activo';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Lucas ID: %', v_lucas_id;
  RAISE NOTICE '✅ Empresario ID: %', v_empresario_id;
  RAISE NOTICE '';

  -- Verificar si ya existe la relación
  SELECT EXISTS (
    SELECT 1 FROM gym_members
    WHERE user_id = v_lucas_id AND empresario_id = v_empresario_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Si existe, actualizar para asegurar que está activo
    UPDATE gym_members
    SET 
      is_active = true,
      subscription_expires_at = CURRENT_DATE + INTERVAL '1 year',
      updated_at = NOW()
    WHERE user_id = v_lucas_id AND empresario_id = v_empresario_id;
    
    RAISE NOTICE '✅ Relación existente actualizada (ahora activa)';
  ELSE
    -- Si no existe, crear la relación
    INSERT INTO gym_members (
      user_id,
      empresario_id,
      is_active,
      joined_at,
      subscription_expires_at,
      created_at,
      updated_at
    ) VALUES (
      v_lucas_id,
      v_empresario_id,
      true,
      NOW(),
      CURRENT_DATE + INTERVAL '1 year',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Nueva relación creada entre Lucas y el gimnasio';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Lucas ahora está correctamente asociado al gimnasio!';
  
END $$;

-- Verificar el resultado
SELECT 
  '🔍 VERIFICACIÓN FINAL' as titulo,
  gm.user_id as lucas_id,
  up.name as lucas_name,
  up.email as lucas_email,
  gm.empresario_id,
  ar.name as empresario_name,
  gm.is_active,
  gm.subscription_expires_at,
  '✅ RELACIÓN ACTIVA' as status
FROM gym_members gm
JOIN user_profiles up ON up.user_id = gm.user_id
JOIN admin_roles ar ON ar.user_id = gm.empresario_id
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
  AND gm.is_active = true;


