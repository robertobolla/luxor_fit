
SELECT 
    r.routine_name,
    r.routine_schema,
    p.parameter_name,
    p.data_type,
    p.ordinal_position
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
    ON r.specific_name = p.specific_name
WHERE r.routine_name = 'migrate_user_data';
