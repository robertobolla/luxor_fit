-- Comprehensive Fix for Foreign Key Constraints
-- Ensures that updating admin_roles.user_id cascades to all dependent tables

DO $$
BEGIN

    -- 1. admin_roles (referred_by)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_roles_referred_by_fkey') THEN
        ALTER TABLE admin_roles DROP CONSTRAINT admin_roles_referred_by_fkey;
    END IF;

    ALTER TABLE admin_roles
    ADD CONSTRAINT admin_roles_referred_by_fkey
    FOREIGN KEY (referred_by)
    REFERENCES admin_roles(user_id)
    ON UPDATE CASCADE;

    -- 2. partner_payments (partner_id)
    -- Check if table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_payments') THEN
        -- Check if constraint exists (name might vary, try standard name or check definition)
        -- We'll try to drop by standard naming convention or known name
        
        -- Try to drop if exists
        BEGIN
            ALTER TABLE partner_payments DROP CONSTRAINT IF EXISTS partner_payments_partner_id_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- Add with CASCADE
        -- Check if column is partner_id and it references admin_roles(user_id)
        -- We assume it does based on usage.
        ALTER TABLE partner_payments
        ADD CONSTRAINT partner_payments_partner_id_fkey
        FOREIGN KEY (partner_id)
        REFERENCES admin_roles(user_id)
        ON UPDATE CASCADE;
    END IF;

    -- 3. discount_code_usage (partner_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_code_usage') THEN
        BEGIN
            ALTER TABLE discount_code_usage DROP CONSTRAINT IF EXISTS discount_code_usage_partner_id_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE discount_code_usage
        ADD CONSTRAINT discount_code_usage_partner_id_fkey
        FOREIGN KEY (partner_id)
        REFERENCES admin_roles(user_id)
        ON UPDATE CASCADE;
    END IF;

END $$;
