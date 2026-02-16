
-- ============================================================================
-- MIGRACIÓN CRÍTICA: CAMBIAR UUID A TEXT (Para compatibilidad con Clerk)
-- ============================================================================

-- Clerk usa IDs de texto (ej: "user_2xyz..."), mientras que Supabase usa UUIDs por defecto.
-- Para que funcione, debemos cambiar el tipo de las columnas user_id a TEXT
-- y eliminar las restricciones que obligan a que sean UUIDs de la tabla auth.users.

BEGIN;

-- 1. admin_roles
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_user_id_fkey;
ALTER TABLE admin_roles ALTER COLUMN user_id TYPE text;

-- 2. user_profiles
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE user_profiles ALTER COLUMN user_id TYPE text;

-- 3. subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions ALTER COLUMN user_id TYPE text;

-- 4. payment_history
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey;
ALTER TABLE payment_history ALTER COLUMN user_id TYPE text;

-- 5. gym_members
ALTER TABLE gym_members DROP CONSTRAINT IF EXISTS gym_members_user_id_fkey;
ALTER TABLE gym_members ALTER COLUMN user_id TYPE text;

-- 6. discount_code_usage
ALTER TABLE discount_code_usage DROP CONSTRAINT IF EXISTS discount_code_usage_user_id_fkey;
ALTER TABLE discount_code_usage ALTER COLUMN user_id TYPE text;
ALTER TABLE discount_code_usage DROP CONSTRAINT IF EXISTS discount_code_usage_partner_id_fkey; -- Si apunta a user_id
ALTER TABLE discount_code_usage ALTER COLUMN partner_id TYPE text;

-- 7. workout_plans
ALTER TABLE workout_plans DROP CONSTRAINT IF EXISTS workout_plans_user_id_fkey;
ALTER TABLE workout_plans ALTER COLUMN user_id TYPE text;

-- 8. partner_payments
ALTER TABLE partner_payments DROP CONSTRAINT IF EXISTS partner_payments_partner_id_fkey;
ALTER TABLE partner_payments ALTER COLUMN partner_id TYPE text;

COMMIT;

-- Nota: Las vistas como user_stats deberían adaptarse automáticamente o requerir recreación si fallan.
-- Si user_stats falla, ejecutar: DROP VIEW user_stats; y luego volver a correr el script de creación de vista.
