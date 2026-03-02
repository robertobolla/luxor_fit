import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import { useTranslation } from 'react-i18next';
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



/* New Interfaces */
interface HierarchyPartner {
  sub_partner_id: string;
  sub_partner_user_id: string;
  sub_partner_name: string;
  sub_partner_email: string;
  joined_at: string;
  total_sales_count: number;
  active_subscriptions_count: number;
}

interface NetworkStats {
  direct_referrals: number;
  indirect_referrals: number;
  earnings_direct: number;
  earnings_indirect: number;
  total_earnings: number;
}

export default function PartnerReferrals() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'sales' | 'team'>('sales');

  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyPartner[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);

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
        // 1. Info Socio
        const { data: partnerData } = await supabase
          .from('admin_roles')
          .select('discount_code, name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (partnerData) setPartnerInfo(partnerData);

        // 2. Mis Ventas (Nivel 1 Referidos)
        const { data: referralsData } = await supabase
          .rpc('get_partner_referral_list', { p_user_id: user.id });
        setReferrals(referralsData || []);

        // 3. Mi Equipo (Nivel 2 Referidos)
        const { data: hierarchyData } = await supabase
          .rpc('get_partner_hierarchy', { p_user_id: user.id });
        setHierarchy(hierarchyData || []);

        // 4. Stats de Red (Earnings Breakdown)
        const { data: statsData } = await supabase
          .rpc('get_partner_network_stats', { target_user_id: user.id });
        setNetworkStats(statsData);

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
        <div className="loading">{t('partner_referrals.loading')}</div>
      </div>
    );
  }

  return (
    <div className="partner-referrals-page">
      <header className="page-header">
        <div>
          <h1>{t('partner_referrals.title')}</h1>
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '-5px', marginBottom: '10px' }}>
            ID: {user?.id}
          </p>
        </div>
        {partnerInfo?.discount_code && (
          <div className="partner-code-info">
            <p><strong>{t('partner_referrals.code_info')}</strong> <code>{partnerInfo.discount_code}</code></p>
          </div>
        )}
      </header>

      {/* STATS CARDS (Updated with Network Data) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{networkStats?.direct_referrals || 0}</div>
          <div className="stat-label">{t('partner_referrals.stats.sales')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{networkStats?.indirect_referrals || 0}</div>
          <div className="stat-label">{t('partner_referrals.stats.team_sales')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${(networkStats?.total_earnings || 0).toFixed(2)}</div>
          <div className="stat-label">{t('partner_referrals.stats.earnings')}</div>

          <div className="stats-breakdown-row">
            <div className="stats-breakdown-col">
              <span className="breakdown-label"><span className="level-indicator level-1"></span>{t('partner_referrals.stats.direct')}</span>
              <span className="breakdown-val">${(networkStats?.earnings_direct || 0).toFixed(2)}</span>
            </div>
            <div className="stats-breakdown-col" style={{ textAlign: 'right' }}>
              <span className="breakdown-label"><span className="level-indicator level-2"></span>{t('partner_referrals.stats.team')}</span>
              <span className="breakdown-val">${(networkStats?.earnings_indirect || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          {t('partner_referrals.tabs.sales')}
        </button>
        <button
          className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          {t('partner_referrals.tabs.team')} ({hierarchy.length})
        </button>
      </div>

      {/* CONTENT */}
      <div className="referrals-table-container">

        {activeTab === 'sales' && (
          <>
            <h2>{t('partner_referrals.sales_tab.title')}</h2>
            {referrals.length === 0 ? (
              <div className="empty-state">
                <p>{t('partner_referrals.sales_tab.empty')}</p>
              </div>
            ) : (
              <table className="referrals-table">
                <thead>
                  <tr>
                    <th>{t('partner_referrals.sales_tab.table.user')}</th>
                    <th>{t('partner_referrals.sales_tab.table.email')}</th>
                    <th>{t('partner_referrals.sales_tab.table.type')}</th>
                    <th>{t('partner_referrals.sales_tab.table.discount')}</th>
                    <th>{t('partner_referrals.sales_tab.table.status')}</th>
                    <th>{t('partner_referrals.sales_tab.table.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.usage_id}>
                      <td>{referral.referred_user_name || 'Sin nombre'}</td>
                      <td>{referral.referred_user_email || 'Sin email'}</td>
                      <td>
                        <span className={`badge badge-${referral.is_free_access ? 'free' : 'paid'}`}>
                          {referral.is_free_access ? t('partner_referrals.sales_tab.free') : t('partner_referrals.sales_tab.paid')}
                        </span>
                      </td>
                      <td>
                        {referral.is_free_access ? '100%' : `$${referral.discount_amount?.toFixed(2)}`}
                      </td>
                      <td>
                        <span className={`badge badge-${referral.subscription_status || 'inactive'}`}>
                          {referral.subscription_status || 'N/A'}
                        </span>
                      </td>
                      <td>{new Date(referral.used_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'team' && (
          <>
            <h2>{t('partner_referrals.team_tab.title')}</h2>
            {hierarchy.length === 0 ? (
              <div className="empty-state">
                <p>{t('partner_referrals.team_tab.empty')}</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  {t('partner_referrals.team_tab.empty_desc')}
                </p>
              </div>
            ) : (
              <table className="referrals-table">
                <thead>
                  <tr>
                    <th>{t('partner_referrals.team_tab.table.partner')}</th>
                    <th>{t('partner_referrals.team_tab.table.email')}</th>
                    <th>{t('partner_referrals.team_tab.table.joined')}</th>
                    <th>{t('partner_referrals.team_tab.table.sales')}</th>
                    <th>{t('partner_referrals.team_tab.table.active')}</th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchy.map((sub) => (
                    <tr key={sub.sub_partner_id}>
                      <td>{sub.sub_partner_name}</td>
                      <td>{sub.sub_partner_email}</td>
                      <td>{new Date(sub.joined_at).toLocaleDateString()}</td>
                      <td>
                        <strong>{sub.total_sales_count}</strong>
                      </td>
                      <td>
                        <span className="badge badge-paid">
                          {sub.active_subscriptions_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

      </div>
    </div>
  );
}

