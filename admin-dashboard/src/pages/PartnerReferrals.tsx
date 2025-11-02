import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import './PartnerReferrals.css';

interface PartnerReferral {
  usage_id: string;
  referred_user_id: string;
  referred_user_name: string | null;
  referred_user_email: string | null;
  is_free_access: boolean;
  discount_amount: number | null;
  used_at: string;
  subscription_status: string | null;
  subscription_created_at: string | null;
}

interface PartnerStats {
  total_referrals: number;
  free_access_referrals: number;
  paid_referrals: number;
  active_subscriptions: number;
  total_revenue: number;
}

export default function PartnerReferrals() {
  const { user } = useUser();
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<{
    discount_code: string | null;
    name: string | null;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      setLoading(true);

      try {
        // Obtener información del socio
        const { data: partnerData, error: partnerError } = await supabase
          .from('admin_roles')
          .select('discount_code, name')
          .eq('user_id', user.id)
          .eq('role_type', 'socio')
          .eq('is_active', true)
          .maybeSingle();

        if (partnerError) {
          console.error('Error obteniendo info de socio:', partnerError);
        } else if (partnerData) {
          setPartnerInfo(partnerData);
        }

        // Obtener referidos
        const { data: referralsData, error: referralsError } = await supabase
          .from('partner_referrals')
          .select('*')
          .eq('partner_user_id', user.id)
          .order('used_at', { ascending: false });

        if (referralsError) {
          console.error('Error obteniendo referidos:', referralsError);
        } else {
          setReferrals(referralsData || []);
        }

        // Obtener estadísticas
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_partner_referral_stats', { partner_user_id: user.id });

        if (statsError) {
          console.error('Error obteniendo estadísticas:', statsError);
        } else {
          setStats(statsData as PartnerStats);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="partner-referrals-page">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="partner-referrals-page">
      <header className="page-header">
        <h1>Mis Referidos</h1>
        {partnerInfo?.discount_code && (
          <div className="partner-code-info">
            <p><strong>Tu código:</strong> <code>{partnerInfo.discount_code}</code></p>
          </div>
        )}
      </header>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_referrals || 0}</div>
            <div className="stat-label">Total Referidos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.free_access_referrals || 0}</div>
            <div className="stat-label">Acceso Gratuito</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.active_subscriptions || 0}</div>
            <div className="stat-label">Suscripciones Activas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">${(stats.total_revenue || 0).toFixed(2)}</div>
            <div className="stat-label">Total Descuentos</div>
          </div>
        </div>
      )}

      <div className="referrals-table-container">
        <h2>Usuarios que usaron tu código</h2>
        {referrals.length === 0 ? (
          <div className="empty-state">
            <p>Aún no hay usuarios que hayan usado tu código de descuento.</p>
          </div>
        ) : (
          <table className="referrals-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Descuento</th>
                <th>Estado Suscripción</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr key={referral.usage_id}>
                  <td>{referral.referred_user_name || 'Sin nombre'}</td>
                  <td>{referral.referred_user_email || 'Sin email'}</td>
                  <td>
                    <span className={`badge badge-${referral.is_free_access ? 'free' : 'paid'}`}>
                      {referral.is_free_access ? 'Gratuito' : 'Pago'}
                    </span>
                  </td>
                  <td>
                    {referral.is_free_access ? (
                      '100%'
                    ) : referral.discount_amount ? (
                      `$${referral.discount_amount.toFixed(2)}`
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {referral.subscription_status ? (
                      <span className={`badge badge-${referral.subscription_status}`}>
                        {referral.subscription_status}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>{new Date(referral.used_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

