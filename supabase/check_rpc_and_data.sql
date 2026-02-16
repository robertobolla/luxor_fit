-- 1. Check if the RPC exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'get_partner_referral_stats';

-- 2. Check the user's data in admin_roles
SELECT * FROM admin_roles WHERE email = 'robertobolla@gmail.com';

-- 3. Check for the test partner code
SELECT * FROM admin_roles WHERE discount_code = 'CODE_B';

-- 4. Check redemptions linked to the user (via UUID)
SELECT count(*) as redemption_count 
FROM offer_code_redemptions 
WHERE partner_id IN (SELECT id FROM admin_roles WHERE email = 'robertobolla@gmail.com');

-- 5. Check what the view returns for this user (using Clerk ID)
-- We need the Clerk ID from step 2
WITH user_info AS (SELECT user_id FROM admin_roles WHERE email = 'robertobolla@gmail.com')
SELECT * FROM partner_referrals WHERE partner_user_id = (SELECT user_id FROM user_info);
