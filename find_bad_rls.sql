SELECT 
  schemaname, tablename, policyname, qual, with_check 
FROM pg_policies 
WHERE (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
  AND (qual::text NOT LIKE '%auth.uid()::text%' AND with_check::text NOT LIKE '%auth.uid()::text%');
