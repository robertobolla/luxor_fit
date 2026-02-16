-- Fix "Extension in Public" Warning
-- Moves the 'http' extension to the 'extensions' schema.

-- 1. Create the schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Move the extension
-- Note: This might require superuser privileges.
ALTER EXTENSION http SET SCHEMA extensions;

-- 3. Grant usage on the schema to public (so they can call the functions)
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 4. WARNING: You must update your 'db_extra_search_path' in Supabase Settings -> API 
-- to include 'extensions', otherwise calls to http_get(), etc. might fail unless schema-qualified.
