-- Fix for "Security Definer View" warnings in Supabase Security Advisor
-- This script changes the views to use SECURITY INVOKER, which means they will
-- respect the Row Level Security (RLS) policies of the user running the query,
-- rather than running with the privileges of the view owner.

-- Fix for "Security Definer View" warnings in Supabase Security Advisor
-- This script changes the views to use SECURITY INVOKER, which means they will
-- respect the Row Level Security (RLS) policies of the user running the query,
-- rather than running with the privileges of the view owner.

DO $$ 
BEGIN
  -- 1. Partner Payments Summary
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'partner_payments_summary' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.partner_payments_summary SET (security_invoker = true);';
  END IF;

  -- 2. Partner Stats
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_partner_stats' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.v_partner_stats SET (security_invoker = true);';
  END IF;

  -- 3. Empresario Stats
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'empresario_stats' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.empresario_stats SET (security_invoker = true);';
  END IF;

  -- 4. User Subscription
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_user_subscription' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.v_user_subscription SET (security_invoker = true);';
  END IF;

  -- 5. Recent Redemptions
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_recent_redemptions' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.v_recent_redemptions SET (security_invoker = true);';
  END IF;

  -- 6. User Stats
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'user_stats' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.user_stats SET (security_invoker = true);';
  END IF;

  -- 7. Partner Referrals
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'partner_referrals' AND schemaname = 'public') THEN
    EXECUTE 'ALTER VIEW public.partner_referrals SET (security_invoker = true);';
  END IF;
END $$;
