-- 1. Asegurar que los Admins pueden ver a todos los miembros de gimnasio
-- (Necesario para que la vista de estadísticas muestre números reales para el admin)
DROP POLICY IF EXISTS "Admins can view all gym members" ON public.gym_members;
CREATE POLICY "Admins can view all gym members" 
ON public.gym_members FOR SELECT 
USING ( public.is_admin() );

-- 2. Recrear la vista de estadísticas con los nombres de columna que espera el Frontend
DROP VIEW IF EXISTS public.empresario_stats;

CREATE VIEW public.empresario_stats AS
SELECT 
    ar.user_id as empresario_id,
    ar.email as empresario_email,
    ar.name as empresario_name,
    ar.gym_name,
    ar.gym_address,
    ar.gym_phone,
    ar.is_active,
    ar.monthly_fee,
    ar.annual_fee,
    ar.max_users,
    ar.subscription_expires_at,
    ar.subscription_started_at,
    -- Conteos agregados
    COUNT(DISTINCT gm.user_id) as total_members,
    COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.user_id END) as active_members,
    COUNT(DISTINCT CASE WHEN gm.joined_at >= NOW() - INTERVAL '30 days' THEN gm.user_id END) as new_members_30d,
    COUNT(DISTINCT CASE WHEN vs.is_active = true THEN gm.user_id END) as members_with_active_subscription
FROM 
    public.admin_roles ar
LEFT JOIN 
    public.gym_members gm ON ar.user_id = gm.empresario_id
LEFT JOIN 
    public.v_user_subscription vs ON gm.user_id = vs.user_id
WHERE 
    ar.role_type = 'empresario'
GROUP BY 
    ar.user_id, ar.email, ar.name, ar.gym_name, ar.gym_address, ar.gym_phone, 
    ar.is_active, ar.monthly_fee, ar.annual_fee, ar.max_users, 
    ar.subscription_expires_at, ar.subscription_started_at;

-- IMPORTANTE: Permitir que la vista use las políticas de las tablas base (RLS)
ALTER VIEW public.empresario_stats SET (security_invoker = true);

COMMENT ON VIEW public.empresario_stats IS 'Estadísticas agregadas de empresarios y sus miembros, compatible con el dashboard de administración';
