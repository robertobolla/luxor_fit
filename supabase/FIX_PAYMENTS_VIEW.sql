-- CORRECCIÓN: La vista partner_payments_summary solo mostraba 'socio'.
-- Esto impide que los ADMINS vean sus propias ganancias si actúan como socios.
-- Vamos a ampliar el filtro para incluir a cualquiera que esté activo.

CREATE OR REPLACE VIEW partner_payments_summary AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code, 
  ar.commission_per_subscription,
  ar.commission_type,
  ar.referred_by, 
  ar.last_payment_date,
  
  -- Extraer del JSON usando la función
  (stats.data->>'total_earnings')::numeric as total_earnings, -- Valor total del portfolio
  (stats.data->>'direct_active_monthly')::int + (stats.data->>'direct_active_annual')::int + (stats.data->>'indirect_active_monthly')::int + (stats.data->>'indirect_active_annual')::int as active_subscriptions,
  
  -- Pagos
  COALESCE((SELECT SUM(amount) FROM partner_payments WHERE partner_id = ar.user_id AND status = 'paid'), 0) as total_paid,
  COALESCE((SELECT SUM(amount) FROM partner_payments WHERE partner_id = ar.user_id AND status = 'pending'), 0) as pending_payments

FROM admin_roles ar
CROSS JOIN LATERAL (
  SELECT get_partner_network_stats(ar.user_id) as data
) stats
-- ANTES: WHERE ar.role_type = 'socio' AND ar.is_active = true;
-- AHORA: Quitamos filtro de rol, solo que esté activo.
WHERE ar.is_active = true;

GRANT SELECT ON partner_payments_summary TO authenticated;
GRANT SELECT ON partner_payments_summary TO anon;
