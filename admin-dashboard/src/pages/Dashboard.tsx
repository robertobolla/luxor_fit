import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  getUserStats,
  getMonthlyGrowthData,
  getMonthlyRevenueData,
  getMonthComparison,
  getDashboardAlerts,
  getAdminDashboardStats,
  checkDataConsistency,
  getUserRole,
  type UserStats,
  type MonthlyGrowthData,
  type MonthlyRevenueData,
  type MonthComparison,
  type DashboardAlert
} from '../services/adminService';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import './Dashboard.css';

import './Dashboard.css';

export default function Dashboard() {
  const { user } = useUser();
  const [userRole, setUserRole] = useState<'admin' | 'socio' | 'empresario' | 'user' | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [consistencyReport, setConsistencyReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<MonthlyGrowthData[]>([]);
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [checkingConsistency, setCheckingConsistency] = useState(false);

  useEffect(() => {
    async function loadAllData() {
      if (!user) return;

      setLoading(true);
      setLoadingCharts(true);

      try {
        // 1. Determine Role
        const role = await getUserRole(user.id, user.primaryEmailAddress?.emailAddress);
        setUserRole(role);

        // 2. Base Data (For everyone)
        const [statsData, growthDataRes, revenueDataRes, comparisonRes, alertsRes] = await Promise.all([
          getUserStats(),
          getMonthlyGrowthData(6),
          getMonthlyRevenueData(6),
          getMonthComparison(),
          getDashboardAlerts(),
        ]);

        setStats(statsData);
        setGrowthData(growthDataRes);
        setRevenueData(revenueDataRes);
        setComparison(comparisonRes);
        setAlerts(alertsRes);

        // 3. Admin Only Data
        if (role === 'admin') {
          // Default to 30 days for dashboard view
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 30);
          const adminStatsData = await getAdminDashboardStats(start, end);
          setAdminStats(adminStatsData);
        }

      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoading(false);
        setLoadingCharts(false);
      }
    }

    loadAllData();
  }, [user]);



  const handleRunConsistencyCheck = async () => {
    setCheckingConsistency(true);
    try {
      const report = await checkDataConsistency();
      setConsistencyReport(report);
    } catch (error) {
      console.error('Error checking consistency:', error);
      alert('Error ejecutando verificación.');
    } finally {
      setCheckingConsistency(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  // Debug logs
  console.log('User Role:', userRole);
  console.log('Admin Stats:', adminStats);

  const revenueSplitData = adminStats?.revenue_split
    ? [
      { name: 'Ventas Directas', value: Number(adminStats.revenue_split.direct || 0), color: '#00D4AA' },
      { name: 'Referidos (Socios)', value: Number(adminStats.revenue_split.partner || 0), color: '#FFD54A' }
    ].filter(item => item.value > 0) // Filter out zero values to avoid empty pie segments
    : [];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Resumen general de Luxor Fitness</p>
        </div>

        <div className="header-actions">


          {userRole === 'admin' && (
            <div className="admin-badge">
              🛡️ Modo Administrador
            </div>
          )}
        </div>
      </header>

      {/* ADMIN SPECIFIC METRICS */}
      {userRole === 'admin' && adminStats && (
        <div className="admin-kpi-section">
          <h2>📊 Métricas Clave (Admin)</h2>
          <div className="stats-grid">
            <StatCard
              title="Ingresos Hoy"
              value={`$${adminStats.revenue_today?.toFixed(2) || '0.00'}`}
              icon="💰"
              color="#00D4AA"
            />
            <StatCard
              title="Socios Activos"
              value={adminStats.active_partners || 0}
              icon="🤝"
              color="#FFD54A"
            />
            <StatCard
              title="Tasa de Cancelación (Mes)"
              value={`${adminStats.churn_rate?.toFixed(1) || '0.0'}%`}
              icon="📉"
              color="#FF5722"
            />
          </div>
        </div>
      )}

      {/* Alertas y Notificaciones */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>📢 Alertas y Notificaciones</h2>
          <div className="alerts-grid">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert alert-${alert.type}`}>
                <div className="alert-icon">
                  {alert.type === 'warning' && '⚠️'}
                  {alert.type === 'error' && '❌'}
                  {alert.type === 'info' && 'ℹ️'}
                  {alert.type === 'success' && '✅'}
                </div>
                <div className="alert-content">
                  <h3>{alert.title}</h3>
                  <p>{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparativa Mes a Mes */}
      {comparison && (
        <div className="comparison-section">
          <h2>📊 Comparativa Mes a Mes</h2>
          <div className="comparison-cards">
            <div className="comparison-card">
              <h3>Usuarios</h3>
              <div className="comparison-values">
                <div className="comparison-item">
                  <span className="comparison-label">Mes Actual</span>
                  <span className="comparison-value">{comparison.currentMonth.newUsers}</span>
                </div>
                <div className="comparison-item">
                  <span className="comparison-label">Mes Anterior</span>
                  <span className="comparison-value">{comparison.previousMonth.newUsers}</span>
                </div>
                <div className={`comparison-growth ${comparison.growth >= 0 ? 'positive' : 'negative'}`}>
                  <span className="growth-label">Crecimiento</span>
                  <span className="growth-value">{comparison.growth >= 0 ? '+' : ''}{comparison.growth.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="comparison-card">
              <h3>Ingresos</h3>
              <div className="comparison-values">
                <div className="comparison-item">
                  <span className="comparison-label">Mes Actual</span>
                  <span className="comparison-value">${comparison.revenueComparison.current.toFixed(2)}</span>
                </div>
                <div className="comparison-item">
                  <span className="comparison-label">Mes Anterior</span>
                  <span className="comparison-value">${comparison.revenueComparison.previous.toFixed(2)}</span>
                </div>
                <div className={`comparison-growth ${comparison.revenueComparison.growth >= 0 ? 'positive' : 'negative'}`}>
                  <span className="growth-label">Crecimiento</span>
                  <span className="growth-value">{comparison.revenueComparison.growth >= 0 ? '+' : ''}{comparison.revenueComparison.growth.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de Estadísticas Generales */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            title="Total de Usuarios"
            value={stats.total_users}
            icon="👥"
            color="#00D4AA"
          />
          <StatCard
            title="Nuevos (7 días)"
            value={stats.new_users_7d}
            icon="🆕"
            color="#4CAF50"
          />
          <StatCard
            title="Suscripciones Activas"
            value={stats.active_subscriptions}
            icon="💎"
            color="#FFD54A"
          />
        </div>
      )}

      {/* Gráficos */}
      {!loadingCharts && (
        <div className="charts-layout">
          {/* Gráfico de Ingresos Mensuales */}
          <div className="chart-section full-width">
            <h2>💰 Ingresos Mensuales</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="#888" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#888" style={{ fontSize: '12px' }} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                  />
                  <Bar dataKey="revenue" fill="#FFD54A" name="Ingresos ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Crecimiento */}
          <div className="chart-section half-width">
            <h2>📈 Crecimiento</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="monthLabel" stroke="#888" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#888" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                  <Area type="monotone" dataKey="newUsers" stroke="#00D4AA" fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ADMIN ONLY: Revenue Split */}
          {userRole === 'admin' && adminStats && (
            <div className="chart-section half-width">
              <h2>🪙 Origen de Ingresos</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={revenueSplitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueSplitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN ONLY: Data Consistency Check */}
      {userRole === 'admin' && (
        <div className="consistency-section">
          <div className="consistency-header">
            <h2>🛠️ Salud del Sistema</h2>
            <button
              className="btn-secondary"
              onClick={handleRunConsistencyCheck}
              disabled={checkingConsistency}
            >
              {checkingConsistency ? 'Verificando...' : '🔍 Ejecutar Diagnóstico'}
            </button>
          </div>

          {consistencyReport && (
            <div className={`consistency-report ${consistencyReport.has_issues ? 'has-issues' : 'all-good'}`}>
              {consistencyReport.has_issues ? (
                <>
                  <div className="report-alert">
                    ⚠️ Se encontraron inconsistencias en la base de datos.
                  </div>
                  <div className="report-details">
                    {consistencyReport.details.map((item: any, idx: number) => item.count > 0 && (
                      <div key={idx} className="report-item">
                        <span className="item-count">{item.count}</span>
                        <span className="item-message">{item.message} ({item.type})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="report-success">
                  ✅ Todos los sistemas operativos. No se encontraron inconsistencias.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fitness Level Stats */}
      {stats && (
        <div className="fitness-level-stats">
          <h2>Distribución por Nivel</h2>
          <div className="level-cards">
            <LevelCard level="Principiante" count={stats.beginners} color="#4CAF50" />
            <LevelCard level="Intermedio" count={stats.intermediate} color="#FFD54A" />
            <LevelCard level="Avanzado" count={stats.advanced} color="#FF5722" />
          </div>
        </div>
      )}

      <div className="quick-actions">
        <h2>Acciones Rápidas</h2>
        <div className="actions-grid">
          <Link to="/users" className="action-card">
            <span className="action-icon">👥</span>
            <h3>Usuarios</h3>
          </Link>
          <Link to="/stats" className="action-card">
            <span className="action-icon">📊</span>
            <h3>Estadísticas</h3>
          </Link>
          <Link to="/partners" className="action-card">
            <span className="action-icon">🤝</span>
            <h3>Socios</h3>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <h3 className="stat-title">{title}</h3>
      </div>
      <p className="stat-value" style={{ color }}>{value}</p>
    </div>
  );
}

function LevelCard({ level, count, color }: { level: string; count: number; color: string }) {
  return (
    <div className="level-card" style={{ borderLeftColor: color }}>
      <h3>{level}</h3>
      <p className="level-count" style={{ color }}>{count}</p>
    </div>
  );
}

