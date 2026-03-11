-- Script to register the Google Review Test Account as Admin
-- Run this in the Supabase SQL Editor AFTER creating the user in Clerk

-- Borramos si existe para evitar duplicados y errores de constraint
DELETE FROM admin_roles WHERE email = 'prueba@luxorfitnessapp.com';

INSERT INTO admin_roles (
    email,
    role_type,
    name,
    is_active,
    user_id
) VALUES (
    'prueba@luxorfitnessapp.com',
    'admin',
    'Google Reviewer',
    true,
    '00000000-0000-0000-0000-000000000000' -- Se sincronizará solo al entrar
);
