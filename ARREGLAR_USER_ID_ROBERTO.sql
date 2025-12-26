-- ============================================================================
-- ARREGLAR USER_ID DE ROBERTO
-- ============================================================================

-- 1. Ver el registro actual de Roberto en admin_roles
SELECT 
  'REGISTRO ACTUAL' as estado,
  id,
  user_id as user_id_actual,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com';

-- 2. Actualizar el user_id de Roberto al que aparece en la URL del dashboard
UPDATE admin_roles
SET 
  user_id = 'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
  updated_at = NOW()
WHERE email = 'robertobolla@gmail.com';

-- 3. Verificar que se actualizó correctamente
SELECT 
  'REGISTRO ACTUALIZADO' as estado,
  id,
  user_id as user_id_nuevo,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com';

-- 4. Probar de nuevo la función RPC con el user_id correcto
SELECT 
  'PRUEBA FINAL' as estado,
  get_student_stats(
    'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
    (CURRENT_DATE - 30)::DATE,
    CURRENT_DATE
  ) as resultado;


