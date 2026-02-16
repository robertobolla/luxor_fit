-- Corrige la restricción de clave foránea en offer_code_redemptions
-- Anteriormente apuntaba a una tabla 'partners' que ya no se usa o no existe.
-- Ahora debe apuntar a la tabla 'admin_roles'.

DO $$
BEGIN
    -- Intentar eliminar la restricción anterior si existe
    BEGIN
        ALTER TABLE offer_code_redemptions DROP CONSTRAINT IF EXISTS offer_code_redemptions_partner_id_fkey;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Agregar la nueva restricción apuntando a admin_roles(id)
    -- Asegurarse de que admin_roles tenga la columna id como UUID (lo cual es cierto en el esquema actual)
    ALTER TABLE offer_code_redemptions 
    ADD CONSTRAINT offer_code_redemptions_partner_id_fkey 
    FOREIGN KEY (partner_id) 
    REFERENCES admin_roles(id) 
    ON DELETE SET NULL;
END $$;
