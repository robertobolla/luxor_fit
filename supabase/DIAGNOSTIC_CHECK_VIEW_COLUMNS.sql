-- CHECK COLUMNS OF v_user_subscription
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'v_user_subscription';
