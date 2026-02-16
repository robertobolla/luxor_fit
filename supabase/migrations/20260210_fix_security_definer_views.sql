-- Fix for "Security Definer View" warnings in Supabase Security Advisor
-- This script changes the views to use SECURITY INVOKER, which means they will
-- respect the Row Level Security (RLS) policies of the user running the query,
-- rather than running with the privileges of the view owner.

-- 1. Partner Payments Summary
ALTER VIEW public.partner_payments_summary SET (security_invoker = true);

-- 2. Partner Stats
ALTER VIEW public.v_partner_stats SET (security_invoker = true);

-- 3. Empresario Stats
ALTER VIEW public.empresario_stats SET (security_invoker = true);

-- 4. User Subscription
ALTER VIEW public.v_user_subscription SET (security_invoker = true);

-- 5. Recent Redemptions
ALTER VIEW public.v_recent_redemptions SET (security_invoker = true);

-- 6. User Stats
ALTER VIEW public.user_stats SET (security_invoker = true);

-- 7. Partner Referrals
ALTER VIEW public.partner_referrals SET (security_invoker = true);
