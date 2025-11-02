import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  getUserStats, 
  getMonthlyGrowthData, 
  getMonthlyRevenueData, 
  getMonthComparison, 
  getDashboardAlerts,
  type UserStats,
  type MonthlyGrowthData,
  type MonthlyRevenueData,
  type MonthComparison,
  type DashboardAlert
} from '../services/adminService';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<MonthlyGrowthData[]>([]);
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      setLoadingCharts(true);
      
      try {
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
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoading(false);
        setLoadingCharts(false);
      }
    }
    
    loadAllData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Resumen general de Luxor Fitness</p>
      </header>

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

      {/* Tarjetas de Estadísticas */}
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
            title="Nuevos (30 días)"
            value={stats.new_users_30d}
            icon="📈"
            color="#2196F3"
          />
          <StatCard
            title="Suscripciones Activas"
            value={stats.active_subscriptions}
            icon="💎"
            color="#FFD54A"
          />
          <StatCard
            title="Usuarios con Plan"
            value={stats.users_with_workout_plans}
            icon="📋"
            color="#9C27B0"
          />
          <StatCard
            title="Edad Promedio"
            value={stats.avg_age ? Math.round(stats.avg_age) : 'N/A'}
            icon="🎂"
            color="#FF5722"
          />
        </div>
      )}

      {/* Gráficos */}
      {!loadingCharts && (
        <>
          {/* Gráfico de Crecimiento de Usuarios */}
          <div className="chart-section">
            <h2>📈 Crecimiento de Usuarios (Últimos 6 Meses)</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00D4AA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="#00D4AA" 
                    fillOpacity={1} 
                    fill="url(#colorUsers)"
                    name="Nuevos Usuarios"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalUsers" 
                    stroke="#4CAF50" 
                    strokeWidth={2}
                    name="Total Acumulado"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Ingresos Mensuales */}
          <div className="chart-section">
            <h2>💰 Ingresos Mensuales (Últimos 6 Meses)</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="#FFD54A"
                    name="Ingresos ($)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="fitness-level-stats">
        <h2>Distribución por Nivel</h2>
        {stats && (
          <div className="level-cards">
            <LevelCard level="Principiante" count={stats.beginners} color="#4CAF50" />
            <LevelCard level="Intermedio" count={stats.intermediate} color="#FFD54A" />
            <LevelCard level="Avanzado" count={stats.advanced} color="#FF5722" />
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h2>Acciones Rápidas</h2>
        <div className="actions-grid">
          <Link to="/users" className="action-card">
            <span className="action-icon">👥</span>
            <h3>Ver Usuarios</h3>
            <p>Gestionar y ver detalles de usuarios</p>
          </Link>
          <Link to="/stats" className="action-card">
            <span className="action-icon">📊</span>
            <h3>Estadísticas Detalladas</h3>
            <p>Análisis completo de métricas</p>
          </Link>
          <Link to="/partners" className="action-card">
            <span className="action-icon">🤝</span>
            <h3>Gestión de Socios</h3>
            <p>Administrar socios y códigos de descuento</p>
          </Link>
          <Link to="/settings" className="action-card">
            <span className="action-icon">⚙️</span>
            <h3>Configuración</h3>
            <p>Gestionar roles y permisos</p>
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
      <p className="stat-value" style={{ color }}>{value.toLocaleString()}</p>
    </div>
  );
}

function LevelCard({ level, count, color }: { 
  level: string; 
  count: number; 
  color: string;
}) {
  return (
    <div className="level-card" style={{ borderLeftColor: color }}>
      <h3>{level}</h3>
      <p className="level-count" style={{ color }}>{count}</p>
    </div>
  );
}
