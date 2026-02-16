-- FIX: Allow updating user_id in admin_roles by cascading changes to gym_members

-- The issue is that gym_members references admin_roles(user_id) via empresario_id.
-- When adminService tries to update the user_id (e.g. user re-registered), it fails because of the FK.
-- We need ON UPDATE CASCADE to allow this update and propagate the new user_id to gym_members.

-- 1. Drop the existing strict constraint
ALTER TABLE gym_members
DROP CONSTRAINT IF EXISTS gym_members_empresario_id_fkey;

-- 2. Add the constraint back with ON UPDATE CASCADE
-- Note: We assume empresario_id references user_id because the error occurred during user_id update.
ALTER TABLE gym_members
ADD CONSTRAINT gym_members_empresario_id_fkey
FOREIGN KEY (empresario_id)
REFERENCES admin_roles (user_id)
ON UPDATE CASCADE;
