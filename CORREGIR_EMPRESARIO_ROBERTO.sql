-- ============================================================================
-- CORREGIR EMPRESARIO - Roberto Bolla
-- ============================================================================

-- Paso 1: Ver el estado actual
SELECT 
  'PASO 1: VERIFICACION ACTUAL' as seccion,
  ar.id,
  ar.user_id,
  ar.email,
  ar.role_type,
  ar.name,
  ar.is_active
FROM admin_roles ar
WHERE ar.email = 'robertobolla9@gmail.com'
   OR ar.user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
ORDER BY ar.created_at DESC;

-- Paso 2: Corregir o crear el registro de empresario
DO $$
DECLARE
  v_exists BOOLEAN;
  v_correct_user_id TEXT := 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';
  v_email TEXT := 'robertobolla9@gmail.com';
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRIGIENDO EMPRESARIO: Roberto Bolla';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', v_correct_user_id;
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE '';

  -- Verificar si existe con el user_id correcto
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = v_correct_user_id
      AND role_type = 'empresario'
      AND is_active = true
  ) INTO v_exists;

  IF v_exists THEN
    RAISE NOTICE '✅ Ya existe correctamente como empresario';
  ELSE
    RAISE NOTICE '🔄 No existe o está incorrecto, corrigiendo...';
    
    -- Primero, desactivar cualquier registro antiguo con este email
    UPDATE admin_roles
    SET is_active = false, updated_at = NOW()
    WHERE email = v_email
      AND (user_id != v_correct_user_id OR role_type != 'empresario');
    
    RAISE NOTICE '✅ Registros antiguos desactivados';
    
    -- Insertar o actualizar el registro correcto
    INSERT INTO admin_roles (
      user_id,
      email,
      role_type,
      name,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      v_correct_user_id,
      v_email,
      'empresario',
      'Roberto Bolla',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, role_type) 
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Registro de empresario creado/actualizado correctamente';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Corrección completada!';
  RAISE NOTICE '';
END $$;

-- Paso 3: Verificar el resultado final
SELECT 
  'PASO 3: VERIFICACION FINAL' as seccion,
  ar.id,
  ar.user_id,
  ar.email,
  ar.role_type,
  ar.name,
  ar.is_active,
  '✅ CORRECTO' as status
FROM admin_roles ar
WHERE ar.user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
  AND ar.role_type = 'empresario'
  AND ar.is_active = true;

-- Paso 4: Verificar que admin también esté presente
SELECT 
  'PASO 4: VERIFICAR ROL ADMIN' as seccion,
  ar.id,
  ar.user_id,
  ar.email,
  ar.role_type,
  ar.name,
  ar.is_active
FROM admin_roles ar
WHERE ar.email = 'robertobolla9@gmail.com'
  AND ar.role_type = 'admin'
  AND ar.is_active = true;

-- Paso 5: Si NO tienes el rol admin, agregarlo también
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',
  'robertobolla9@gmail.com',
  'admin',
  'Roberto Bolla',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, role_type) 
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- Verificación final de ambos roles
SELECT 
  'RESUMEN FINAL: ROLES DE ROBERTO' as titulo,
  role_type,
  is_active,
  '✅ CONFIGURADO' as status
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
  AND is_active = true
ORDER BY role_type;


