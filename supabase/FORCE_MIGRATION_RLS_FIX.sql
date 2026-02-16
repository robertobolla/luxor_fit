
-- ============================================================================
-- MIGRACIÓN FORZADA v14: FIX RLS & AUTH.UID() -> AUTH_USER_ID()
-- ============================================================================

BEGIN;

-- 1. CREAR FUNCIÓN SEGURA PARA OBTENER ID DE USUARIO (TEXTO)
-- auth.uid() fuerza UUID y falla con Clerk. Esta función extrae el 'sub' del JWT como TEXTO.
DROP FUNCTION IF EXISTS auth_user_id() CASCADE;
CREATE OR REPLACE FUNCTION auth_user_id() 
RETURNS text 
LANGUAGE sql 
STABLE 
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;

-- 2. REDEFINIR FUNCIONES DE HELPER PARA USAR auth_user_id()

-- is_admin()
DROP FUNCTION IF EXISTS is_admin() CASCADE;
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_roles 
    WHERE user_id = auth_user_id() 
      AND role_type = 'admin'
  );
END;
$$;

-- is_gym_member() - Opcional, pero bueno tenerla segura
DROP FUNCTION IF EXISTS is_gym_member(text) CASCADE;
CREATE OR REPLACE FUNCTION is_gym_member(p_user_id text) 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.gym_members 
    WHERE user_id = p_user_id 
      AND is_active = true
  );
END;
$$;


-- 3. ACTUALIZAR POLÍTICAS RLS (Reemplazar auth.uid()::text por auth_user_id())

-- admin_roles
DROP POLICY IF EXISTS "Public read for auth check" ON admin_roles;
CREATE POLICY "Public read for auth check" ON admin_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage everything" ON admin_roles;
CREATE POLICY "Admins manage everything" ON admin_roles USING (is_admin());

-- user_profiles
DROP POLICY IF EXISTS "Users view own" ON user_profiles;
CREATE POLICY "Users view own" ON user_profiles FOR SELECT USING (user_id = auth_user_id());

DROP POLICY IF EXISTS "Users update own" ON user_profiles;
CREATE POLICY "Users update own" ON user_profiles FOR UPDATE USING (user_id = auth_user_id());

DROP POLICY IF EXISTS "Admins view all" ON user_profiles;
CREATE POLICY "Admins view all" ON user_profiles FOR SELECT USING (is_admin());

-- subscriptions
DROP POLICY IF EXISTS "Users view own subs" ON subscriptions;
CREATE POLICY "Users view own subs" ON subscriptions FOR SELECT USING (user_id = auth_user_id());

DROP POLICY IF EXISTS "Admins view all subs" ON subscriptions;
CREATE POLICY "Admins view all subs" ON subscriptions FOR SELECT USING (is_admin());

-- gym_members
DROP POLICY IF EXISTS "Users view own gym membership" ON gym_members;
CREATE POLICY "Users view own gym membership" ON gym_members FOR SELECT USING (user_id = auth_user_id());

DROP POLICY IF EXISTS "Admins manage gym members" ON gym_members;
CREATE POLICY "Admins manage gym members" ON gym_members USING (is_admin());

-- discount_code_usage
DROP POLICY IF EXISTS "Anyone can read discount code usage" ON discount_code_usage;
CREATE POLICY "Anyone can read discount code usage" ON discount_code_usage FOR SELECT USING (true); -- O restringir si es necesario

-- webhook_events
DROP POLICY IF EXISTS "Admins manage webhooks" ON webhook_events;
CREATE POLICY "Admins manage webhooks" ON webhook_events USING (is_admin());

-- partners
DROP POLICY IF EXISTS "Admins manage partners" ON partners;
CREATE POLICY "Admins manage partners" ON partners USING (is_admin());

DROP POLICY IF EXISTS "Public read partners" ON partners;
CREATE POLICY "Public read partners" ON partners FOR SELECT USING (true);

-- offer_code_redemptions
DROP POLICY IF EXISTS "Admins view redemptions" ON offer_code_redemptions;
CREATE POLICY "Admins view redemptions" ON offer_code_redemptions USING (is_admin());

-- partner_payments
DROP POLICY IF EXISTS "Admins manage partner payments" ON partner_payments;
CREATE POLICY "Admins manage partner payments" ON partner_payments USING (is_admin());

-- workout_plans
DROP POLICY IF EXISTS "Users view own plans" ON workout_plans;
CREATE POLICY "Users view own plans" ON workout_plans FOR SELECT USING (user_id = auth_user_id());

DROP POLICY IF EXISTS "Admins manage plans" ON workout_plans;
CREATE POLICY "Admins manage plans" ON workout_plans USING (is_admin());


-- 4. ACTUALIZAR VISTAS QUE USEN auth.uid() (Si las hay)
-- v_user_subscription usa is_gym_member, que ya actualizamos. 
-- Pero revisemos v_user_subscription por si acaso usa auth.uid() explícitamente.
-- (En el script v13 no usaba auth.uid(), solo joins. Así que debería estar bien si las tablas subyacentes están bien).

COMMIT;
