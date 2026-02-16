-- ==========================================
-- SCRIPT DE GENERACIÓN DE DATOS DE PRUEBA
-- ==========================================
-- Este script crea funciones para generar usuarios, suscripciones y pagos ficticios.
-- Todos los datos generados usarán el dominio '@test.fitmind.com' para facilitar su eliminación.

-- 0. CORRECCIÓN DE ESQUEMA (Necesaria para permitir pagos exitosos)
-- La tabla payment_history tenía una restricción que impedía pagos 'succeeded'.
DO $$
BEGIN
    -- Intentar borrar la restricción anterior si existe
    BEGIN
        ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_status_check;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorar errores si no existe
    END;
    
    -- Crear la restricción actualizada permitiendo 'succeeded' y 'paid'
    ALTER TABLE payment_history 
    ADD CONSTRAINT payment_history_status_check 
    CHECK (status IN ('succeeded', 'paid', 'canceled', 'deleted', 'expired', 'refunded', 'failed'));
END $$;

-- 1. Función para limpiar datos de prueba anteriores
CREATE OR REPLACE FUNCTION clean_test_data()
RETURNS void AS $$
BEGIN
    -- Eliminar datos en orden de dependencia
    DELETE FROM payment_history WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM discount_code_usage WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM gym_members WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM admin_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.fitmind.com');
    
    -- Finalmente eliminar de auth.users (requiere permisos de superusuario o rol de servicio)
    -- Nota: Si esto falla por permisos, los usuarios quedarán en auth pero sin perfil.
    DELETE FROM auth.users WHERE email LIKE '%@test.fitmind.com';
    
    RAISE NOTICE 'Datos de prueba eliminados correctamente.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para generar datos de prueba
CREATE OR REPLACE FUNCTION generate_test_data(p_user_count INT DEFAULT 50)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_created_at TIMESTAMP;
    v_i INT;
    v_j INT;
    v_plan_amount DECIMAL;
    v_status TEXT;
    v_partner_id UUID;
BEGIN
    -- Crear un Partner de prueba para referidos (si no existe)
    SELECT id INTO v_partner_id FROM auth.users WHERE email = 'partner_test@test.fitmind.com';
    
    IF v_partner_id IS NULL THEN
        INSERT INTO auth.users (id, email, created_at)
        VALUES (gen_random_uuid(), 'partner_test@test.fitmind.com', NOW() - INTERVAL '6 months')
        RETURNING id INTO v_partner_id;

        INSERT INTO admin_roles (user_id, email, role_type, name, is_active)
        VALUES (v_partner_id, 'partner_test@test.fitmind.com', 'empresario', 'Partner Test Gym', true);
    END IF;

    FOR v_i IN 1..p_user_count LOOP
        v_email := 'test_user_' || v_i || '@test.fitmind.com';
        -- Fecha aleatoria en los últimos 90 días
        v_created_at := NOW() - (floor(random() * 90) || ' days')::interval;
        
        -- Insertar usuario en auth.users (simulado)
        BEGIN
            INSERT INTO auth.users (id, email, email_confirmed_at, created_at)
            VALUES (gen_random_uuid(), v_email, v_created_at, v_created_at)
            RETURNING id INTO v_user_id;

            -- Insertar perfil
            INSERT INTO user_profiles (user_id, email, name, created_at, updated_at)
            VALUES (v_user_id, v_email, 'Test User ' || v_i, v_created_at, v_created_at);

            -- Decidir si tiene suscripción (80% probabilidad)
            IF random() < 0.8 THEN
                v_plan_amount := CASE WHEN random() < 0.5 THEN 9.99 ELSE 29.99 END;
                
                -- Estado aleatorio
                IF random() < 0.1 THEN v_status := 'canceled';
                ELSIF random() < 0.1 THEN v_status := 'past_due';
                ELSE v_status := 'active';
                END IF;

                INSERT INTO subscriptions (user_id, status, monthly_amount, created_at, updated_at, current_period_end)
                VALUES (
                    v_user_id, 
                    v_status, 
                    v_plan_amount, 
                    v_created_at, 
                    v_created_at,
                    v_created_at + INTERVAL '1 month'
                );

                -- Generar historial de pagos (1 a 3 pagos)
                FOR v_j IN 1..(floor(random() * 3) + 1) LOOP
                    INSERT INTO payment_history (user_id, total_paid, monthly_amount, created_at, status)
                    VALUES (
                        v_user_id,  
                        v_plan_amount,
                        v_plan_amount,
                        v_created_at + ((v_j-1) || ' months')::interval, 
                        'succeeded'
                    );
                END LOOP;

                -- 30% de probabilidad de ser referido
                IF random() < 0.3 THEN
                    INSERT INTO discount_code_usage (user_id, discount_code, partner_id, created_at)
                    VALUES (v_user_id, 'TESTCODE', v_partner_id, v_created_at);
                END IF;
            END IF;
        EXCEPTION WHEN unique_violation THEN
            -- Ignorar si ya existe
            RAISE NOTICE 'Usuario % ya existe, saltando.', v_email;
        END;
    END LOOP;

    RAISE NOTICE 'Generados % usuarios de prueba.', p_user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
