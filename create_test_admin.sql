-- Script to register the Google Review Test Account as Admin
-- Run this in the Supabase SQL Editor AFTER creating the user in Clerk

INSERT INTO admin_roles (
    email,
    role_type,
    name,
    is_active,
    user_id -- This will be synced automatically on first login thanks to our bypass/sync logic, 
            -- but we can leave it as a placeholder or empty UUID if Clerk ID is unknown.
) VALUES (
    'prueba@luxorfitnessapp.com',
    'admin',
    'Google Reviewer',
    true,
    '00000000-0000-0000-0000-000000000000' -- Placeholder, our code will sync this automatically
)
ON CONFLICT (email) DO UPDATE SET
    role_type = 'admin',
    is_active = true;
