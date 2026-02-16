
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND column_name = 'partner_id' 
    AND data_type = 'uuid';
