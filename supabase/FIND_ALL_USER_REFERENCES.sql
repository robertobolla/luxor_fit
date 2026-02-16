
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('user_id', 'id', 'partner_id', 'trainer_id', 'student_id', 'empresario_id', 'friend_id', 'referred_by')
ORDER BY table_name;
