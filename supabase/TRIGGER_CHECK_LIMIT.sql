-- ============================================================================
-- TRIGGER PARA ENFORZAR LÍMITE DE USUARIOS POR EMPRESARIO
-- ============================================================================

-- 1. Asegurar que la columna max_users existe en admin_roles
ALTER TABLE admin_roles 
ADD COLUMN IF NOT EXISTS max_users INTEGER;

COMMENT ON COLUMN admin_roles.max_users IS 'Cantidad máxima de usuarios activos permitidos. NULL significa sin límite.';

-- 2. Función para verificar el límite antes de insertar en gym_members
CREATE OR REPLACE FUNCTION check_empresario_user_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_max_users INTEGER;
    v_current_count INTEGER;
    v_empresario_name TEXT;
BEGIN
    -- Obtener el límite del empresario
    SELECT max_users, gym_name INTO v_max_users, v_empresario_name
    FROM admin_roles
    WHERE user_id = NEW.empresario_id;

    -- Si max_users es NULL, no hay límite, permitir inserción
    IF v_max_users IS NULL THEN
        RETURN NEW;
    END IF;

    -- Contar usuarios activos actuales del empresario
    -- Nota: No contamos el que se está insertando todavía
    SELECT COUNT(*) INTO v_current_count
    FROM gym_members
    WHERE empresario_id = NEW.empresario_id
      AND is_active = true;

    -- Verificar si se alcanzó el límite
    IF v_current_count >= v_max_users THEN
        RAISE EXCEPTION 'El empresario % ha alcanzado su límite de usuarios permitidos (% users).', v_empresario_name, v_max_users;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el Trigger
DROP TRIGGER IF EXISTS trg_check_empresario_limit ON gym_members;

CREATE TRIGGER trg_check_empresario_limit
BEFORE INSERT ON gym_members
FOR EACH ROW
EXECUTE FUNCTION check_empresario_user_limit();

-- 4. Protección adicional: Trigger para evitar activar usuarios si superan el límite (UPDATE)
CREATE OR REPLACE FUNCTION check_empresario_limit_on_update()
RETURNS TRIGGER AS $$
DECLARE
    v_max_users INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Solo verificar si se está cambiando is_active de false a true
    IF (OLD.is_active = false OR OLD.is_active IS NULL) AND NEW.is_active = true THEN
        
        -- Obtener el límite del empresario
        SELECT max_users INTO v_max_users
        FROM admin_roles
        WHERE user_id = NEW.empresario_id;

        -- Si max_users es NULL, permitir
        IF v_max_users IS NULL THEN
            RETURN NEW;
        END IF;

        -- Contar usuarios activos (excluyendo este registro para evitar doble conteo si ya era activo, aunque aquí filtré por cambio de estado)
        SELECT COUNT(*) INTO v_current_count
        FROM gym_members
        WHERE empresario_id = NEW.empresario_id
          AND is_active = true
          AND user_id != NEW.user_id; -- Excluirse a sí mismo

        -- Verificar límite
        IF v_current_count >= v_max_users THEN
            RAISE EXCEPTION 'No se puede activar el usuario. El empresario ha alcanzado su límite (% users).', v_max_users;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_empresario_limit_update ON gym_members;

CREATE TRIGGER trg_check_empresario_limit_update
BEFORE UPDATE ON gym_members
FOR EACH ROW
EXECUTE FUNCTION check_empresario_limit_on_update();
