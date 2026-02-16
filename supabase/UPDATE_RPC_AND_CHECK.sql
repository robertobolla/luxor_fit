
-- ============================================================================
-- 1. ACTUALIZAR FUNCIÓN MIGRACIÓN (INSENSIBLE A MAYÚSCULAS)
-- ============================================================================
NOTIFY pgrst, 'reload config';

DROP FUNCTION IF EXISTS migrate_user_data(TEXT); 

CREATE OR REPLACE FUNCTION migrate_user_data(p_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_user_id TEXT;
    v_old_user_id TEXT;
    v_email_clean TEXT;
BEGIN
    -- Normalizar email
    v_email_clean := LOWER(TRIM(p_email));

    -- 1. Obtener ID NUEVO (Clerk) desde el token
    v_new_user_id := auth_user_id();
    
    IF v_new_user_id IS NULL THEN
         RETURN json_build_object('success', false, 'error', 'No Auth Token found');
    END IF;

    -- 2. Buscar si existe un "usuario viejo" con ese email y UN ID DIFERENTE
    -- Usamos LOWER() para asegurar que encontramos el email sin importar mayúsculas
    SELECT user_id INTO v_old_user_id
    FROM user_profiles
    WHERE LOWER(email) = v_email_clean 
      AND user_id != v_new_user_id
    LIMIT 1;

    -- Si no está en user_profiles, buscar en admin_roles
    IF v_old_user_id IS NULL THEN
        SELECT user_id INTO v_old_user_id
        FROM admin_roles
        WHERE LOWER(email) = v_email_clean 
          AND user_id != v_new_user_id
        LIMIT 1;
    END IF;

    -- Si no hay usuario viejo, no hacemos nada
    IF v_old_user_id IS NULL THEN
        -- Verificar si YA estamos migrados (para devolver éxito)
        IF EXISTS (SELECT 1 FROM admin_roles WHERE user_id = v_new_user_id) OR
           EXISTS (SELECT 1 FROM user_profiles WHERE user_id = v_new_user_id) THEN
           RETURN json_build_object('success', true, 'message', 'Already migrated', 'new_id', v_new_user_id);
        END IF;

        RETURN json_build_object('success', true, 'message', 'No pending migration found (User not found in old data)', 'new_id', v_new_user_id);
    END IF;

    -- ========================================================================
    -- 3. EJECUTAR MIGRACIÓN (Actualizar todas las tablas)
    -- ========================================================================

    UPDATE admin_roles SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE admin_roles SET referred_by = v_new_user_id WHERE referred_by = v_old_user_id;
    UPDATE user_profiles SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE subscriptions SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE payment_history SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE gym_members SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE gym_members SET empresario_id = v_new_user_id WHERE empresario_id = v_old_user_id;
    UPDATE discount_code_usage SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE discount_code_usage SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE workout_plans SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE partner_payments SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;

    BEGIN
        UPDATE webhook_events SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    EXCEPTION WHEN undefined_column THEN NULL; END;

    IF EXISTS (SELECT 1 FROM partners WHERE id = v_old_user_id) THEN
        UPDATE partners SET id = v_new_user_id WHERE id = v_old_user_id;
    END IF;

    UPDATE partner_offer_campaigns SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE offer_code_redemptions SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE offer_code_redemptions SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE partner_monthly_stats SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE body_measurements SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE body_metrics SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE exercise_sets SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE exercises SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE friendships SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE friendships SET friend_id = v_new_user_id WHERE friend_id = v_old_user_id;
    
    BEGIN
        UPDATE gym_messages SET empresario_id = v_new_user_id WHERE empresario_id = v_old_user_id;
    EXCEPTION WHEN undefined_column THEN NULL; END;

    UPDATE health_data_daily SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE hydration_logs SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE lesson_progress SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE meal_logs SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE meal_plans SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE nutrition_plans SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE nutrition_profiles SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE nutrition_targets SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE personal_records SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE progress_photos SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE trainer_student_relationships SET trainer_id = v_new_user_id WHERE trainer_id = v_old_user_id;
    UPDATE trainer_student_relationships SET student_id = v_new_user_id WHERE student_id = v_old_user_id;
    UPDATE typing_indicators SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE user_notifications SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE user_push_tokens SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    UPDATE workout_completions SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Migration successful', 
        'old_id', v_old_user_id, 
        'new_id', v_new_user_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION migrate_user_data(TEXT) TO authenticated;

-- ============================================================================
-- 2. VERIFICAR ESTADO DEL USUARIO (DIAGNÓSTICO)
-- ============================================================================
SELECT 
    id, 
    user_id, 
    email, 
    role_type,
    CASE 
        WHEN user_id LIKE 'user_%' THEN 'MIGRADO (CLERK ID)'
        ELSE 'NO MIGRADO (UUID)'
    END as status
FROM admin_roles 
WHERE email = 'robertobolla9@gmail.com';
