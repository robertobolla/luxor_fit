-- Deploy missing RPC and Views for Admin Dashboard Statistics

-- 1. Create the user_stats view if it doesn't exist
DROP VIEW IF EXISTS user_stats CASCADE;
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    up.user_id,
    up.email,
    up.name,
    up.username,
    up.profile_photo_url,
    up.created_at,
    ar.role_type,
    ar.is_active AS is_admin_active,
    s.status AS subscription_status,
    s.current_period_start AS subscription_start,
    s.current_period_end AS subscription_end,
    s.cancel_at_period_end,
    gm.empresario_id,
    ear.name AS empresario_name,
    pr.partner_id AS partner_id,
    par.name AS partner_name,
    pr.discount_code
FROM user_profiles up
LEFT JOIN admin_roles ar ON up.user_id = ar.user_id
LEFT JOIN subscriptions s ON up.user_id = s.user_id
LEFT JOIN gym_members gm ON up.user_id = gm.user_id AND gm.is_active = true
LEFT JOIN admin_roles ear ON gm.empresario_id = ear.user_id
LEFT JOIN discount_code_usage pr ON up.user_id = pr.user_id
LEFT JOIN admin_roles par ON pr.partner_id = par.user_id;

-- 2. Drop existing function to avoid return type conflicts
DROP FUNCTION IF EXISTS get_admin_dashboard_stats(timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_revenue_period NUMERIC := 0;
    v_new_users_period INT := 0;
    v_users_cancelled_period INT := 0;
    v_churn_rate NUMERIC := 0;
    v_revenue_direct NUMERIC := 0;
    v_revenue_partner NUMERIC := 0;
    
    v_start TIMESTAMP WITH TIME ZONE;
    v_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check permissions
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Set default dates if not provided
    v_start := COALESCE(p_start_date, (NOW() - INTERVAL '30 days'));
    v_end := COALESCE(p_end_date, NOW());

    -- 1. Revenue in period
    SELECT COALESCE(SUM(total_paid), 0)
    INTO v_revenue_period
    FROM payment_history
    WHERE created_at >= v_start AND created_at <= v_end;

    -- 2. New users in period
    SELECT COUNT(user_id)
    INTO v_new_users_period
    FROM user_profiles
    WHERE created_at >= v_start AND created_at <= v_end;

    -- 3. Cancelled subscriptions in period
    SELECT COUNT(id)
    INTO v_users_cancelled_period
    FROM subscriptions
    WHERE status = 'canceled'
      AND updated_at >= v_start
      AND updated_at <= v_end;

    -- 4. Churn rate (simplified: cancelled in period / total active at end of period)
    DECLARE
        v_active_at_end INT;
    BEGIN
        SELECT COUNT(id) INTO v_active_at_end FROM subscriptions WHERE status = 'active';
        IF v_active_at_end > 0 THEN
            v_churn_rate := (v_users_cancelled_period::NUMERIC / v_active_at_end::NUMERIC) * 100;
        ELSE
            v_churn_rate := 0;
        END IF;
    END;

    -- 5. Revenue split (direct vs partner) in period
    -- Direct revenue: subscriptions with NO associated active partner referral for the same user
    SELECT COALESCE(SUM(ph.total_paid), 0)
    INTO v_revenue_direct
    FROM payment_history ph
    WHERE ph.created_at >= v_start AND ph.created_at <= v_end
      AND NOT EXISTS (
          SELECT 1 FROM discount_code_usage pr
          WHERE pr.user_id = ph.user_id
      );

    -- Partner revenue: subscriptions WITH associated active partner referral
    SELECT COALESCE(SUM(ph.total_paid), 0)
    INTO v_revenue_partner
    FROM payment_history ph
    WHERE ph.created_at >= v_start AND ph.created_at <= v_end
      AND EXISTS (
          SELECT 1 FROM discount_code_usage pr
          WHERE pr.user_id = ph.user_id
      );


    RETURN jsonb_build_object(
        'revenue_period', v_revenue_period,
        'new_users_period', v_new_users_period,
        'users_cancelled_period', v_users_cancelled_period,
        'churn_rate', ROUND(v_churn_rate, 2),
        'revenue_split', jsonb_build_object(
            'direct', v_revenue_direct,
            'partner', v_revenue_partner
        )
    );
END;
$$;
