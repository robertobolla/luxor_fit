
SET search_path = public, temp;

DROP TABLE IF EXISTS public.partner_payments CASCADE;

CREATE TABLE public.partner_payments (
  id uuid NOT NULL,
  partner_id text NOT NULL,
  partner_name text,
  payment_date timestamp with time zone,
  amount numeric NOT NULL,
  PRIMARY KEY (id)
);

CREATE OR REPLACE FUNCTION public.get_partner_payment_history(partner_user_id text, limit_count integer DEFAULT 100)
 RETURNS SETOF partner_payments
 LANGUAGE plpgsql
 SET search_path TO 'public', 'temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM partner_payments
  WHERE partner_id = partner_user_id
  LIMIT limit_count;
END;
$function$;
