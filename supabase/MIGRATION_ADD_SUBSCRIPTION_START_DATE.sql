-- Add subscription_started_at column to admin_roles
ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NOW();

-- Comment on column
COMMENT ON COLUMN admin_roles.subscription_started_at IS 'Fecha de inicio del pack/suscripción actual';
