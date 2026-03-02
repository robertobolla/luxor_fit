-- RPC para verificar membresía de gimnasio de forma segura (Bypass RLS)
-- Y sincronizar el user_id de Clerk si es necesario.

CREATE OR REPLACE FUNCTION public.check_gym_member_v2(
  p_user_id TEXT,
  p_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios de creador (bypass RLS)
SET search_path = public
AS $$
DECLARE
  v_member_record RECORD;
  v_result JSON;
BEGIN
  -- 1. Intentar encontrar por user_id directamente
  SELECT * INTO v_member_record
  FROM gym_members
  WHERE user_id = p_user_id
  LIMIT 1;

  -- 2. Si no se encuentra por user_id, intentar por email
  IF NOT FOUND AND p_email IS NOT NULL AND p_email <> '' THEN
    SELECT * INTO v_member_record
    FROM gym_members
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;

    -- 3. Si se encuentra por email, actualizar el user_id
    IF FOUND THEN
      UPDATE gym_members
      SET 
        user_id = p_user_id,
        updated_at = NOW()
      WHERE id = v_member_record.id; -- Usamos id para ser precisos
      
      -- Recalcular v_member_record con el ID actualizado (opcional pero limpio)
      v_member_record.user_id := p_user_id;
    END IF;
  END IF;

  -- 4. Construir respuesta
  IF v_member_record.user_id IS NOT NULL THEN
    v_result := json_build_object(
      'success', true,
      'is_member', v_member_record.is_active,
      'empresario_id', v_member_record.empresario_id,
      'expires_at', v_member_record.subscription_expires_at,
      'found_by', CASE WHEN v_member_record.user_id = p_user_id THEN 'id' ELSE 'email' END
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'is_member', false,
      'found_by', 'none'
    );
  END IF;

  RETURN v_result;
END;
$$;
