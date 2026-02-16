import { useEffect, useState } from 'react';
import { getUserStats, supabase, getAdminDashboardStats } from '../services/adminService';
import type { UserStats } from '../services/adminService';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import './Stats.css';

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

interface ExtendedStats {
  userStats: UserStats | null;
  subscriptionStats: {
    active: number;
    canceled: number;
    trialing: number;
    past_due: number;
    total: number;
  };
  revenueStats: {
    monthly_revenue: number;
    total_revenue: number;
  };
  gymStats: {
    total_gyms: number;
    total_gym_members: number;
    active_gym_members: number;
  };
  roleStats: {
    admins: number;
    socios: number;
    empresarios: number;
  };
}

export default function Stats() {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Time Range State
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStart, setCustomStart] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adminStats, setAdminStats] = useState<any | null>(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        // Obtener estadísticas de usuarios
        const userStats = await getUserStats();

        // Obtener estadísticas de suscripciones
        const { data: subscriptionsData } = await supabase
          .from('subscriptions')
          .select('status, monthly_amount');

        const subscriptionStats = {
          active: 0,
          canceled: 0,
          trialing: 0,
          past_due: 0,
          total: subscriptionsData?.length || 0,
        };

        let monthlyRevenue = 0;
        subscriptionsData?.forEach(sub => {
          if (sub.status === 'active') {
            subscriptionStats.active++;
            monthlyRevenue += sub.monthly_amount || 0;
          } else if (sub.status === 'canceled') {
            subscriptionStats.canceled++;
          } else if (sub.status === 'trialing') {
            subscriptionStats.trialing++;
          } else if (sub.status === 'past_due') {
            subscriptionStats.past_due++;
          }
        });

        // Obtener estadísticas de gimnasios
        const { data: empresariosData } = await supabase
          .from('admin_roles')
          .select('user_id')
          .eq('role_type', 'empresario')
          .eq('is_active', true);

        const { data: gymMembersData } = await supabase
          .from('gym_members')
          .select('user_id, is_active');

        const activeGymMembers = gymMembersData?.filter(gm => gm.is_active) || [];

        const gymStats = {
          total_gyms: empresariosData?.length || 0,
          total_gym_members: gymMembersData?.length || 0,
          active_gym_members: activeGymMembers.length,
        };

        // Obtener estadísticas de roles
        const { data: adminsData } = await supabase
          .from('admin_roles')
          .select('user_id')
          .eq('role_type', 'admin')
          .eq('is_active', true);

        const { data: sociosData } = await supabase
          .from('admin_roles')
          .select('user_id')
          .eq('role_type', 'socio')
          .eq('is_active', true);

        const roleStats = {
          admins: adminsData?.length || 0,
          socios: sociosData?.length || 0,
          empresarios: empresariosData?.length || 0,
        };

        // Obtener ingresos totales del historial de pagos
        const { data: paymentHistory } = await supabase
          .from('payment_history')
          .select('total_paid');

        const totalRevenue = paymentHistory?.reduce((sum, p) => sum + (p.total_paid || 0), 0) || 0;

        setStats({
          userStats,
          subscriptionStats,
          revenueStats: {
            monthly_revenue: monthlyRevenue,
            total_revenue: totalRevenue,
          },
          gymStats,
          roleStats,
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    loadAdminStats('30d'); // Initial load for filtered stats
  }, []);

  // Effect to reload admin stats when time range changes
  useEffect(() => {
    if (timeRange === 'custom') {
      if (customStart && customEnd) {
        loadAdminStats('custom');
      }
    } else {
      loadAdminStats(timeRange);
    }
  }, [timeRange, customStart, customEnd]);

  const loadAdminStats = async (range: TimeRange) => {
    let startDate = new Date();
    const endDate = new Date();

    endDate.setHours(23, 59, 59, 999);

    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      case 'custom':
        if (customStart) {
          startDate = new Date(customStart);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          endDate.setTime(end.getTime());
        }
        break;
    }

    const data = await getAdminDashboardStats(startDate, endDate);
    setAdminStats(data);
  };

  if (loading) {
    return (
      <div className="stats-page">
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (!stats || !stats.userStats) {
    return (
      <div className="stats-page">
        <div className="loading-container">
          <p>{loading ? 'Cargando estadísticas...' : 'Error al cargar estadísticas'}</p>
        </div>
      </div>
    );
  }

  const { userStats } = stats;
  const conversionRate = (userStats.total_users || 0) > 0
    ? ((stats.subscriptionStats.active / (userStats.total_users || 1)) * 100).toFixed(1)
    : '0';

  return (
    <div className="stats-page">
      <header className="page-header">
        <div>
          <h1>Estadísticas Generales</h1>
          <p className="subtitle" style={{ color: '#888' }}>Vista detallada del rendimiento</p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="filters-container">
            <div className="time-range-selector">
              <button className={timeRange === '7d' ? 'active' : ''} onClick={() => setTimeRange('7d')}>7D</button>
              <button className={timeRange === '30d' ? 'active' : ''} onClick={() => setTimeRange('30d')}>30D</button>
              <button className={timeRange === '90d' ? 'active' : ''} onClick={() => setTimeRange('90d')}>3M</button>
              <button className={timeRange === '1y' ? 'active' : ''} onClick={() => setTimeRange('1y')}>1A</button>
              <button className={timeRange === 'all' ? 'active' : ''} onClick={() => setTimeRange('all')}>Todo</button>
              <button className={timeRange === 'custom' ? 'active' : ''} onClick={() => setTimeRange('custom')}>📅</button>
            </div>

            {timeRange === 'custom' && (
              <div className="custom-date-inputs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd}
                />
                <span>-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}
          </div>

          <button className="btn-refresh" onClick={() => window.location.reload()} title="Actualizar">
            🔄
          </button>
        </div>
      </header>

      {/* Dynamic Statistics Section (Filtered) */}
      {adminStats && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card stat-card-revenue">
            <div className="stat-card-header">
              <div className="stat-card-icon">💰</div>
              <h3>Ingresos ({timeRange === 'all' ? 'Histórico' : timeRange})</h3>
            </div>
            <div className="stat-card-value">${adminStats.revenue_period?.toFixed(2) || '0.00'}</div>
            <div className="stat-card-details">
              <span>Recaudado en este periodo</span>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-card-header">
              <div className="stat-card-icon">🆕</div>
              <h3>Nuevos Usuarios</h3>
            </div>
            <div className="stat-card-value">{adminStats.new_users_period || 0}</div>
            <div className="stat-card-details">
              <span>Registrados en este periodo</span>
            </div>
          </div>

          <div className="stat-card stat-card-info" style={{ borderTopColor: '#FF5722' }}>
            <div className="stat-card-header">
              <div className="stat-card-icon">📉</div>
              <h3>Tasa de Cancelación</h3>
            </div>
            <div className="stat-card-value">{adminStats.churn_rate?.toFixed(1) || '0.0'}%</div>
            <div className="stat-card-details">
              <span>{adminStats.users_cancelled_period || 0} cancelaciones en periodo</span>
            </div>
          </div>

          {/* Revenue Split Chart */}
          <div className="stat-card" style={{ gridColumn: 'span 1' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '0.8125rem', color: '#aaa', textTransform: 'uppercase' }}>Origen de Ingresos</h3>
            <div style={{ height: '140px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Directo', value: Number(adminStats.revenue_split?.direct || 0), color: '#00D4AA' },
                      { name: 'Referidos', value: Number(adminStats.revenue_split?.partner || 0), color: '#FFD54A' }
                    ].filter(i => i.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: 'Directo', value: Number(adminStats.revenue_split?.direct || 0), color: '#00D4AA' },
                      { name: 'Referidos', value: Number(adminStats.revenue_split?.partner || 0), color: '#FFD54A' }
                    ].filter(i => i.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Static/Global Stats Grid */}

      <div className="stats-grid">
        {/* Tarjetas principales */}
        <div className="stat-card stat-card-primary">
          <div className="stat-card-header">
            <div className="stat-card-icon">👥</div>
            <h3>Total de Usuarios</h3>
          </div>
          <div className="stat-card-value">{(userStats.total_users || 0).toLocaleString()}</div>
          <div className="stat-card-details">
            <span>+{userStats.new_users_7d || 0} últimos 7 días</span>
            <span>+{userStats.new_users_30d || 0} últimos 30 días</span>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-card-header">
            <div className="stat-card-icon">✅</div>
            <h3>Suscripciones Activas</h3>
          </div>
          <div className="stat-card-value">{(stats.subscriptionStats.active || 0).toLocaleString()}</div>
          <div className="stat-card-details">
            <span>Tasa de conversión: {conversionRate}%</span>
          </div>
        </div>

        <div className="stat-card stat-card-revenue">
          <div className="stat-card-header">
            <div className="stat-card-icon">💰</div>
            <h3>Ingresos Mensuales</h3>
          </div>
          <div className="stat-card-value">${(stats.revenueStats.monthly_revenue || 0).toFixed(2)}</div>
          <div className="stat-card-details">
            <span>Total acumulado: ${(stats.revenueStats.total_revenue || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-card-header">
            <div className="stat-card-icon">🏋️</div>
            <h3>Planes Activos</h3>
          </div>
          <div className="stat-card-value">{(userStats.users_with_workout_plans || 0).toLocaleString()}</div>
          <div className="stat-card-details">
            <span>{(userStats.total_users || 0) > 0 ? (((userStats.users_with_workout_plans || 0) / (userStats.total_users || 1)) * 100).toFixed(1) : 0}% de usuarios</span>
          </div>
        </div>

        {/* Secciones detalladas */}
        <section className="stat-section stat-section-full">
          <h2>📊 Estado de Suscripciones</h2>
          <div className="stat-items">
            <StatItem label="Activas" value={stats.subscriptionStats.active || 0} color="#4CAF50" />
            <StatItem label="En prueba" value={stats.subscriptionStats.trialing || 0} color="#FFD54A" />
            <StatItem label="Canceladas" value={stats.subscriptionStats.canceled || 0} color="#f44336" />
            <StatItem label="Vencidas" value={stats.subscriptionStats.past_due || 0} color="#FF9800" />
            <StatItem label="Total" value={stats.subscriptionStats.total || 0} color="#888" />
          </div>
        </section>

        <section className="stat-section stat-section-full">
          <h2>👥 Distribución de Usuarios</h2>
          <div className="stat-items">
            <StatItem label="Usuarios normales" value={(userStats.total_users || 0) - (stats.roleStats.admins || 0) - (stats.roleStats.socios || 0) - (stats.roleStats.empresarios || 0)} color="#888" />
            <StatItem label="Administradores" value={stats.roleStats.admins || 0} color="#f44336" />
            <StatItem label="Socios" value={stats.roleStats.socios || 0} color="#FFD54A" />
            <StatItem label="Empresarios" value={stats.roleStats.empresarios || 0} color="#4CAF50" />
          </div>
        </section>

        <section className="stat-section stat-section-full">
          <h2>🏢 Gimnasios</h2>
          <div className="stat-items">
            <StatItem label="Total de gimnasios" value={stats.gymStats.total_gyms || 0} color="#4CAF50" />
            <StatItem label="Miembros totales" value={stats.gymStats.total_gym_members || 0} color="#888" />
            <StatItem label="Miembros activos" value={stats.gymStats.active_gym_members || 0} color="#00D4AA" />
          </div>
        </section>

        <section className="stat-section stat-section-full">
          <h2>🎯 Niveles de Fitness</h2>
          <div className="fitness-levels">
            <LevelBar level="Principiante" count={userStats.beginners || 0} total={userStats.total_users || 0} color="#4CAF50" />
            <LevelBar level="Intermedio" count={userStats.intermediate || 0} total={userStats.total_users || 0} color="#FFD54A" />
            <LevelBar level="Avanzado" count={userStats.advanced || 0} total={userStats.total_users || 0} color="#FF5722" />
          </div>
        </section>

        <section className="stat-section stat-section-full">
          <h2>📈 Demografía</h2>
          <div className="stat-items">
            <StatItem label="Edad promedio" value={userStats.avg_age ? `${Math.round(userStats.avg_age)} años` : 'N/A'} color="#888" />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="stat-item">
      <span className="stat-item-label">{label}</span>
      <span className="stat-item-value" style={color ? { color } : {}}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

function LevelBar({ level, count, total, color }: {
  level: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="level-bar-container">
      <div className="level-bar-header">
        <span className="level-bar-label">{level}</span>
        <span className="level-bar-count">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="level-bar">
        <div
          className="level-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

