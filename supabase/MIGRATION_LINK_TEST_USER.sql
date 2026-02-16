-- Función para vincular los datos de un socio de prueba (ej. CODE_B) a un usuario real (tu email)
-- Esto permite que veas los datos de prueba en tu dashboard personal ("Mis Referidos", "Mis Ganancias")

CREATE OR REPLACE FUNCTION link_test_partner_to_email(target_email TEXT, source_discount_code TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id_text TEXT;
  target_partner_uuid UUID;
  source_partner_id UUID;
  affected_referrals INTEGER;
  affected_usages INTEGER;
  affected_children INTEGER;
BEGIN
  -- 1. Buscar el ID del usuario (Clerk ID o Auth ID)
  SELECT user_id INTO target_user_id_text FROM admin_roles WHERE email = target_email LIMIT 1;
  
  IF target_user_id_text IS NULL THEN
      SELECT id::text INTO target_user_id_text FROM auth.users WHERE email = target_email;
  END IF;

  IF target_user_id_text IS NULL THEN
    RETURN 'Error: No se encontró ningún usuario con el email ' || target_email || ' en admin_roles ni auth.users.';
  END IF;

  -- 2. Obtener ID del socio de prueba (source)
  SELECT id INTO source_partner_id 
  FROM admin_roles 
  WHERE discount_code = source_discount_code 
  LIMIT 1;

  -- Si no encontramos el source, verificamos si el target YA tiene el código (idempotencia)
  IF source_partner_id IS NULL THEN
     PERFORM 1 FROM admin_roles WHERE email = target_email AND discount_code = source_discount_code;
     IF FOUND THEN
        RETURN 'Aviso: El usuario ' || target_email || ' ya tiene el código ' || source_discount_code || ' (Probablemente ya se ejecutó)';
     END IF;
     RETURN 'Error: No se encontró socio de prueba original con código ' || source_discount_code;
  END IF;

  -- 3. Identificar si el target ya existe en admin_roles para obtener su UUID
  SELECT id INTO target_partner_uuid FROM admin_roles WHERE user_id = target_user_id_text;

  -- CRÍTICO: Primero LIBERAMOS el código del socio de prueba para evitar error de UNIQUE constraint
  UPDATE admin_roles 
  SET 
    discount_code = discount_code || '_OLD_' || floor(random()*1000)::text,
    is_active = false
  WHERE id = source_partner_id;

  -- 4. Ahora sí, asignamos el código al usuario real (Target)
  IF target_partner_uuid IS NULL THEN
    -- Crear el rol si no existe
    INSERT INTO admin_roles (user_id, email, role_type, name, is_active, discount_code, commission_per_subscription)
    VALUES (target_user_id_text, target_email, 'socio', 'Usuario Vinculado', true, source_discount_code, 3.00)
    RETURNING id INTO target_partner_uuid;
  ELSE
    -- Si ya existe, actualizamos sus datos
    -- PRESERVAMOS el rol si es 'admin' o 'empresario', solo actualizamos si es 'user' o nuevo
    UPDATE admin_roles
    SET 
      discount_code = source_discount_code,
      role_type = CASE WHEN role_type IN ('admin', 'empresario') THEN role_type ELSE 'socio' END,
      commission_per_subscription = 3.00,
      commission_per_subscription_2nd_level = 1.00,
      is_active = true
    WHERE id = target_partner_uuid;
  END IF;

  -- 5. Transferir Referidos (offer_code_redemptions usa UUID)
  UPDATE offer_code_redemptions
  SET partner_id = target_partner_uuid
  WHERE partner_id = source_partner_id;
  GET DIAGNOSTICS affected_referrals = ROW_COUNT;

  -- 6. Transferir Usos de Código (discount_code_usage usa User ID Text)
  UPDATE discount_code_usage
  SET partner_id = target_user_id_text
  WHERE partner_id = (SELECT user_id FROM admin_roles WHERE id = source_partner_id);
  GET DIAGNOSTICS affected_usages = ROW_COUNT;

  -- 7. Transferir Sub-socios (referred_by usa User ID Text)
  UPDATE admin_roles
  SET referred_by = target_user_id_text
  WHERE referred_by = (SELECT user_id FROM admin_roles WHERE id = source_partner_id);
  GET DIAGNOSTICS affected_children = ROW_COUNT;

  RETURN 'Éxito: Se vincularon ' || affected_referrals || ' referidos y ' || affected_children || ' sub-socios a ' || target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
