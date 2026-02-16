-- Fix "Function Search Path Mutable" warnings (Excluding Extensions)
-- This updated script avoids touching functions owned by extensions (like http)
-- to prevent permission errors (ERROR: 42501).

DO $$
DECLARE
    func_record RECORD;
    func_sig TEXT;
BEGIN
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        -- Join with pg_depend to find if the function belongs to an extension
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = 'public'
        AND d.objid IS NULL -- Only select functions that are NOT extensions
    LOOP
        func_sig := format('%I.%I(%s)', func_record.schema_name, func_record.function_name, func_record.args);
        
        -- RAISE NOTICE 'Fixing function: %', func_sig;
        
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, temp;', func_sig);
    END LOOP;
END $$;
