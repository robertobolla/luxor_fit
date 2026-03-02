import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getEmpresarioDashboardStats } from '../services/adminService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import './EmpresarioDashboard.css';

interface DashboardStats {
  member_stats: {
    total_members: number;
    active_members: number;
    inactive_members: number;
    new_members_7d: number;
    new_members_30d: number;
    expiring_7d: number;
    expiring_15d: number;
    expiring_30d: number;
    inactive_training: number;
    retention_rate: number;
  };
  workout_stats: {
    total_workouts_week: number;
    total_workouts_month: number;
    avg_workouts_per_member: number;
    top_active_members: Array<{
      name: string | null;
      email: string | null;
      workout_count: number;
    }>;
    activity_by_day: Array<{
      day_name: string;
      day_number: number;
      workout_count: number;
    }>;
  };
  plan_stats: {
    members_with_plan: number;
    members_without_plan: number;
    plan_coverage_percent: number;
    plan_adherence: number;
  };
  progress_stats: {
    fitness_distribution: Array<{
      nivel: string;
      cantidad: number;
    }>;
    goals_distribution: Array<{
      objetivo: string;
      cantidad: number;
    }>;
  };
}

const COLORS = ['#F7931E', '#FF5252', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];

export default function EmpresarioDashboard() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user?.id]);

  async function loadStats() {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getEmpresarioDashboardStats(user.id);
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return (
      <div className="empresario-dashboard">
        <div className="loading-message">{t('empresario_dashboard.loading')}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empresario-dashboard">
        <div className="error-message">{t('empresario_dashboard.error')}</div>
      </div>
    );
  }

  return (
    <div className="empresario-dashboard">
      <header className="dashboard-header">
        <h1>📊 {t('empresario_dashboard.title')}</h1>
        <p className="subtitle">{t('empresario_dashboard.subtitle')}</p>
      </header>

      {/* Cards Principales */}
      <section className="main-cards">
        <div className="stat-card primary">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <div className="card-value">{stats.member_stats.active_members}</div>
            <div className="card-label">{t('empresario_dashboard.active_members')}</div>
            <div className="card-sublabel">{t('empresario_dashboard.of_total', { total: stats.member_stats.total_members })}</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="card-icon">🏋️</div>
          <div className="card-content">
            <div className="card-value">{stats.workout_stats.total_workouts_month}</div>
            <div className="card-label">{t('empresario_dashboard.workouts')}</div>
            <div className="card-sublabel">{t('empresario_dashboard.last_month')}</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <div className="card-value">{stats.member_stats.retention_rate}%</div>
            <div className="card-label">{t('empresario_dashboard.retention')}</div>
            <div className="card-sublabel">{t('empresario_dashboard.retention_rate')}</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <div className="card-value">{stats.member_stats.expiring_30d}</div>
            <div className="card-label">{t('empresario_dashboard.expiring')}</div>
            <div className="card-sublabel">{t('empresario_dashboard.next_30d')}</div>
          </div>
        </div>
      </section>

      {/* Estadísticas de Miembros */}
      <section className="dashboard-section">
        <h2>👥 {t('empresario_dashboard.member_stats')}</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-icon">🆕</div>
            <div className="stat-info">
              <div className="stat-value">{stats.member_stats.new_members_7d}</div>
              <div className="stat-label">{t('empresario_dashboard.new_7d')}</div>
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <div className="stat-value">{stats.member_stats.new_members_30d}</div>
              <div className="stat-label">{t('empresario_dashboard.new_30d')}</div>
            </div>
          </div>
          <div className="stat-box alert">
            <div className="stat-icon">⏰</div>
            <div className="stat-info">
              <div className="stat-value">{stats.member_stats.expiring_7d}</div>
              <div className="stat-label">{t('empresario_dashboard.expiring_7d')}</div>
            </div>
          </div>
          <div className="stat-box alert">
            <div className="stat-icon">😴</div>
            <div className="stat-info">
              <div className="stat-value">{stats.member_stats.inactive_training}</div>
              <div className="stat-label">{t('empresario_dashboard.inactive_30d')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Actividad de Entrenamientos */}
      <section className="dashboard-section">
        <h2>🏋️ {t('empresario_dashboard.workout_activity')}</h2>

        <div className="two-column-grid">
          {/* Gráfica de actividad por día */}
          <div className="chart-container">
            <h3>{t('empresario_dashboard.workouts_by_day')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.workout_stats.activity_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="day_name" stroke="#999" style={{ fontSize: '12px' }} />
                <YAxis stroke="#999" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #F7931E',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="workout_count" fill="#F7931E" name={t('empresario_dashboard.workouts')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Miembros Activos */}
          <div className="table-container">
            <h3>🏆 {t('empresario_dashboard.top_active')}</h3>
            <table className="top-members-table">
              <thead>
                <tr>
                  <th>{t('empresario_dashboard.member')}</th>
                  <th>{t('empresario_dashboard.workouts')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.workout_stats.top_active_members.slice(0, 5).map((member, index) => (
                  <tr key={index}>
                    <td>
                      <div className="member-info">
                        <span className="member-rank">#{index + 1}</span>
                        <span className="member-name">{member.name || member.email || t('empresario_dashboard.no_name')}</span>
                      </div>
                    </td>
                    <td className="workout-count">{member.workout_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">{stats.workout_stats.total_workouts_week}</div>
              <div className="stat-label">{t('empresario_dashboard.workouts_week')}</div>
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <div className="stat-value">{stats.workout_stats.avg_workouts_per_member}</div>
              <div className="stat-label">{t('empresario_dashboard.avg_workouts')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Planes de Entrenamiento */}
      <section className="dashboard-section">
        <h2>📋 {t('empresario_dashboard.training_plans')}</h2>
        <div className="stats-grid">
          <div className="stat-box success">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value">{stats.plan_stats.members_with_plan}</div>
              <div className="stat-label">{t('empresario_dashboard.with_plan')}</div>
            </div>
          </div>
          <div className="stat-box alert">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <div className="stat-value">{stats.plan_stats.members_without_plan}</div>
              <div className="stat-label">{t('empresario_dashboard.without_plan')}</div>
            </div>
          </div>
          <div className="stat-box info">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">{stats.plan_stats.plan_coverage_percent}%</div>
              <div className="stat-label">{t('empresario_dashboard.plan_coverage')}</div>
            </div>
          </div>
          <div className="stat-box info">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <div className="stat-value">{stats.plan_stats.plan_adherence}%</div>
              <div className="stat-label">{t('empresario_dashboard.adherence')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Metas y Progreso */}
      <section className="dashboard-section">
        <h2>🎯 {t('empresario_dashboard.goals_progress')}</h2>

        <div className="two-column-grid">
          {/* Distribución de Fitness Level */}
          <div className="chart-container">
            <h3>{t('empresario_dashboard.fitness_level')}</h3>
            {stats.progress_stats.fitness_distribution && stats.progress_stats.fitness_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.progress_stats.fitness_distribution}
                    dataKey="cantidad"
                    nameKey="nivel"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {stats.progress_stats.fitness_distribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #F7931E',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">{t('empresario_dashboard.no_fitness_data')}</div>
            )}
          </div>

          {/* Distribución de Objetivos */}
          <div className="chart-container">
            <h3>{t('empresario_dashboard.goals_distribution')}</h3>
            {stats.progress_stats.goals_distribution && stats.progress_stats.goals_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.progress_stats.goals_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="objetivo" stroke="#999" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#999" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #F7931E',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#4CAF50" name="Miembros" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">{t('empresario_dashboard.no_goals_data')}</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

