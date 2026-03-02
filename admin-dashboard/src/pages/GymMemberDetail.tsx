import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentStats, type StudentStats } from '../services/adminService';
import { supabase } from '../services/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import './GymMemberDetail.css';

type PeriodType = '1week' | '1month' | '3months' | '6months' | 'all';

// Las etiquetas ahora se manejan con i18next localmente para cada render;
// la lógica de `days` permanece aquí.
const PERIODS_DATA = {
  '1week': { days: 7 },
  '1month': { days: 30 },
  '3months': { days: 90 },
  '6months': { days: 180 },
  'all': { days: null },
};

// Función para generar datos mock de métricas históricas
function generateMockMetricsData(currentMetrics: any) {
  const data = [];
  const currentWeight = currentMetrics.current_weight || 85;
  const currentFat = currentMetrics.body_fat_percentage || 18;
  const currentMuscle = currentMetrics.muscle_percentage || 38;

  // Generar 16 puntos de datos (últimos 60 días, cada 4 días)
  for (let i = 15; i >= 0; i--) {
    const daysAgo = i * 4;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Simular progreso: peso bajando, grasa bajando, músculo subiendo
    const weight = currentWeight + (i * 0.3);
    const fat = currentFat + (i * 0.2);
    const muscle = currentMuscle - (i * 0.15);
    const imc = weight / (1.75 * 1.75); // Asumiendo altura de 1.75m
    const magra = weight * (1 - fat / 100);

    data.push({
      fecha: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      peso: parseFloat(weight.toFixed(1)),
      grasa: parseFloat(fat.toFixed(1)),
      musculo: parseFloat(muscle.toFixed(1)),
      imc: parseFloat(imc.toFixed(1)),
      magra: parseFloat(magra.toFixed(1)),
    });
  }

  return data;
}

export default function GymMemberDetail() {
  const { empresarioId, userId, userName, userEmail } = useParams<{
    empresarioId: string;
    userId: string;
    userName: string;
    userEmail: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1month');

  // Helper to get translated period label
  const getPeriodLabel = (period: PeriodType) => {
    const periodKeyMap: Record<PeriodType, string> = {
      '1week': 'days_7',
      '1month': 'this_month',
      '3months': 'months_3',
      '6months': 'months_6',
      'all': 'all'
    };
    return t(`gym_member_detail.periods.${periodKeyMap[period]}`);
  };

  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [exerciseTabs, setExerciseTabs] = useState<Record<string, 'rutina' | 'registros' | 'evolucion' | 'estadisticas'>>({});
  const [showBodyMetricsChart, setShowBodyMetricsChart] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'peso' | 'grasa' | 'musculo' | 'imc' | 'magra'>('peso');

  // Nutritionist notes
  const [nutritionistNotes, setNutritionistNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Diet assignment history
  const [dietHistory, setDietHistory] = useState<any[]>([]);
  const [dietHistoryLoading, setDietHistoryLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, [empresarioId, userId, selectedPeriod]);

  useEffect(() => {
    if (userId && empresarioId) {
      loadNutritionistNotes();
      loadDietHistory();
    }
  }, [userId, empresarioId]);

  async function loadNutritionistNotes() {
    if (!userId || !empresarioId) return;
    try {
      const { data } = await supabase
        .from('gym_members')
        .select('nutritionist_notes')
        .eq('user_id', userId)
        .eq('empresario_id', empresarioId)
        .maybeSingle();
      if (data?.nutritionist_notes) {
        setNutritionistNotes(data.nutritionist_notes);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  }

  async function saveNutritionistNotes() {
    if (!userId || !empresarioId) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('gym_members')
        .update({ nutritionist_notes: nutritionistNotes })
        .eq('user_id', userId)
        .eq('empresario_id', empresarioId);
      if (error) throw error;
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  }

  async function loadDietHistory() {
    if (!userId) return;
    setDietHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('shared_nutrition_plans')
        .select('id, status, message, created_at, nutrition_plan_id')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        // Fetch plan names
        const planIds = data.map(d => d.nutrition_plan_id).filter(Boolean);
        const { data: plans } = await supabase
          .from('nutrition_plans')
          .select('id, plan_name')
          .in('id', planIds);
        const planMap = new Map((plans || []).map(p => [p.id, p.plan_name]));

        setDietHistory(data.map(d => ({
          ...d,
          plan_name: planMap.get(d.nutrition_plan_id) || t('gym_member_detail.diet_history.no_plan'),
        })));
      } else {
        setDietHistory([]);
      }
    } catch (err) {
      console.error('Error loading diet history:', err);
    } finally {
      setDietHistoryLoading(false);
    }
  }

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex);
      } else {
        newSet.add(dayIndex);
      }
      return newSet;
    });
  };

  const toggleExercise = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
        // Inicializar la pestaña en 'rutina' si no existe
        if (!exerciseTabs[exerciseId]) {
          setExerciseTabs(tabs => ({ ...tabs, [exerciseId]: 'rutina' }));
        }
      }
      return newSet;
    });
  };

  const setExerciseTab = (exerciseId: string, tab: 'rutina' | 'registros' | 'evolucion' | 'estadisticas') => {
    setExerciseTabs(prev => ({ ...prev, [exerciseId]: tab }));
  };

  async function loadStats() {
    if (!empresarioId || !userId) return;

    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      let startDate: string;

      if (PERIODS_DATA[selectedPeriod].days) {
        const start = new Date();
        start.setDate(start.getDate() - PERIODS_DATA[selectedPeriod].days!);
        startDate = start.toISOString().split('T')[0];
      } else {
        startDate = '2020-01-01';
      }

      const result = await getStudentStats(empresarioId, userId, startDate, endDate);
      setStats(result);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="gym-member-detail-page">
        <div className="loading-container">
          <p>{t('gym_member_detail.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gym-member-detail-page">
      <header className="page-header">
        <button
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          {t('gym_member_detail.back')}
        </button>
        <div className="header-info">
          <h1>{decodeURIComponent(userName || t('gym_member_detail.default_user'))}</h1>
          <p className="user-email">{decodeURIComponent(userEmail || '')}</p>
        </div>
      </header>

      {/* Selector de Periodo */}
      <div className="period-selector-container">
        <label>{t('gym_member_detail.period')}</label>
        <div className="period-buttons">
          {(Object.keys(PERIODS_DATA) as PeriodType[]).map((period) => {
            return (
              <button
                key={period}
                className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {getPeriodLabel(period)}
              </button>
            );
          })}
        </div>
      </div>

      {!stats ? (
        <div className="empty-state">
          <p>{t('gym_member_detail.stats_error')}</p>
        </div>
      ) : (
        <div className="stats-content">
          {/* Plan Activo */}
          {stats.active_plan && (
            <section className="stats-section">
              <h2>{t('gym_member_detail.active_plan.title')}</h2>
              <div className="plan-card expandable" onClick={() => setIsPlanExpanded(!isPlanExpanded)}>
                <div className="plan-header">
                  <div>
                    <h3>{stats.active_plan.plan_name}</h3>
                    <p className="plan-description">{stats.active_plan.description}</p>
                  </div>
                  <button className="expand-btn" onClick={(e) => { e.stopPropagation(); setIsPlanExpanded(!isPlanExpanded); }}>
                    {isPlanExpanded ? '▼' : '▶'}
                  </button>
                </div>
                <div className="plan-meta">
                  <span>📅 {t('gym_member_detail.active_plan.weeks', { count: Array.isArray(stats.active_plan.plan_data?.weeks) ? stats.active_plan.plan_data.weeks.length : (stats.active_plan.plan_data?.weeks || stats.active_plan.duration_weeks || 1) })}</span>
                  <span>🏃 {t('gym_member_detail.active_plan.days_per_week', { count: stats.active_plan.plan_data?.days_per_week || 0 })}</span>
                </div>

                {isPlanExpanded && (stats.active_plan.plan_data?.days || Array.isArray(stats.active_plan.plan_data?.weeks)) && (
                  <div className="plan-details" onClick={(e) => e.stopPropagation()}>
                    {/* Selector de Semana */}
                    <div className="week-selector">
                      <label>{t('gym_member_detail.active_plan.week')}</label>
                      <div className="week-buttons">
                        {Array.from({ length: Array.isArray(stats.active_plan.plan_data?.weeks) ? stats.active_plan.plan_data.weeks.length : (stats.active_plan.plan_data?.weeks || stats.active_plan.duration_weeks || 1) }, (_, i) => i + 1).map(week => (
                          <button
                            key={week}
                            className={`week-btn ${selectedWeek === week ? 'active' : ''}`}
                            onClick={() => setSelectedWeek(week)}
                          >
                            {week}
                          </button>
                        ))}
                      </div>
                    </div>

                    <h4>{t('gym_member_detail.active_plan.week_num', { num: selectedWeek })}</h4>
                    {(() => {
                      const planData = stats?.active_plan?.plan_data;
                      if (!planData) return null;

                      const isModern = Array.isArray(planData.weeks);
                      let daysToRender = [];
                      if (isModern) {
                        const weekData = planData.weeks.find((w: any) => w.weekNumber === selectedWeek || w.week_number === selectedWeek) || planData.weeks[selectedWeek - 1];
                        daysToRender = weekData?.days || weekData?.weekly_structure || [];
                      } else {
                        daysToRender = planData?.days || planData?.weekly_structure || [];
                      }

                      if (!daysToRender.length) {
                        return <p style={{ color: '#888', margin: '12px 0' }}>No hay días configurados para esta semana.</p>;
                      }

                      return daysToRender.map((day: any, dayIndex: number) => {
                        const isDayExpanded = expandedDays.has(dayIndex);

                        // Verificar si este día fue completado en el período seleccionado
                        const dayWorkouts = stats.recent_workouts?.filter(
                          _w => false // Temporarily disabled until workout type includes day_name
                        ) || [];
                        const isCompleted = dayWorkouts.length > 0;

                        // Obtener la fecha del último entrenamiento de este día
                        const lastWorkout = dayWorkouts.length > 0
                          ? dayWorkouts.sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
                          : null;

                        return (
                          <div key={dayIndex} className={`day-card ${isCompleted ? 'completed' : ''}`}>
                            <div className="day-header" onClick={() => toggleDay(dayIndex)}>
                              <div className="day-title-row">
                                <h5>
                                  {isCompleted && '✅ '}
                                  {day.name || day.day || day.focus || t('gym_member_detail.active_plan.day', { num: dayIndex + 1 })}
                                </h5>
                                {isCompleted && lastWorkout && (
                                  <span className="completion-badge">
                                    {new Date(lastWorkout.completed_at).toLocaleDateString('es-ES', {
                                      day: 'numeric',
                                      month: 'short'
                                    })}
                                  </span>
                                )}
                              </div>
                              <button className="day-expand-btn">
                                {isDayExpanded ? '▼' : '▶'}
                              </button>
                            </div>

                            {isDayExpanded && day.exercises && day.exercises.length > 0 && (
                              <div className="exercises-list">
                                {day.exercises.map((exercise: any, exIndex: number) => {
                                  const exerciseId = `${dayIndex}-${exIndex}`;
                                  const isExerciseExpanded = expandedExercises.has(exerciseId);

                                  return (
                                    <div key={exIndex} className="exercise-item">
                                      <div className="exercise-header" onClick={() => toggleExercise(exerciseId)}>
                                        <div className="exercise-name-row">
                                          <span className="exercise-name">
                                            {exercise.type === 'superset' ? 'Superserie' : (exercise.name || t('gym_member_detail.active_plan.exercise', { num: exIndex + 1 }))}
                                          </span>
                                          <span className="exercise-summary">
                                            {exercise.type === 'superset'
                                              ? `${exercise.exercises?.length || 0} ejercicios, ${exercise.sets || 0} series`
                                              : t('gym_member_detail.active_plan.exercise_summary', { sets: exercise.sets, reps: Array.isArray(exercise.reps) ? exercise.reps[0] : exercise.reps })}
                                          </span>
                                        </div>
                                        <button className="exercise-expand-btn">
                                          {isExerciseExpanded ? '▼' : '▶'}
                                        </button>
                                      </div>

                                      {isExerciseExpanded && (
                                        <div className="exercise-expanded-details">
                                          {/* Pestañas del Ejercicio */}
                                          <div className="exercise-tabs">
                                            <button
                                              className={`exercise-tab ${(exerciseTabs[exerciseId] || 'rutina') === 'rutina' ? 'active' : ''}`}
                                              onClick={() => setExerciseTab(exerciseId, 'rutina')}
                                            >
                                              {t('gym_member_detail.active_plan.tabs.routine')}
                                            </button>
                                            <button
                                              className={`exercise-tab ${exerciseTabs[exerciseId] === 'registros' ? 'active' : ''}`}
                                              onClick={() => setExerciseTab(exerciseId, 'registros')}
                                            >
                                              {t('gym_member_detail.active_plan.tabs.records')}
                                            </button>
                                            <button
                                              className={`exercise-tab ${exerciseTabs[exerciseId] === 'evolucion' ? 'active' : ''}`}
                                              onClick={() => setExerciseTab(exerciseId, 'evolucion')}
                                            >
                                              {t('gym_member_detail.active_plan.tabs.evolution')}
                                            </button>
                                            <button
                                              className={`exercise-tab ${exerciseTabs[exerciseId] === 'estadisticas' ? 'active' : ''}`}
                                              onClick={() => setExerciseTab(exerciseId, 'estadisticas')}
                                            >
                                              {t('gym_member_detail.active_plan.tabs.stats')}
                                            </button>
                                          </div>

                                          {/* Contenido según pestaña seleccionada */}
                                          <div className="exercise-tab-content">
                                            {/* PESTAÑA: RUTINA */}
                                            {(exerciseTabs[exerciseId] || 'rutina') === 'rutina' && (
                                              <>
                                                <div className="exercise-info-row">
                                                  {exercise.rest_seconds !== undefined && (
                                                    <div className="exercise-info-item">
                                                      <span className="info-label">{t('gym_member_detail.active_plan.routine.rest')}</span>
                                                      <span className="info-value">{exercise.rest_seconds}s</span>
                                                    </div>
                                                  )}
                                                </div>

                                                {exercise.type === 'superset' ? (
                                                  <div className="superset-details" style={{ marginTop: '10px' }}>
                                                    <h6 style={{ marginBottom: '8px', color: '#999' }}>Ejercicios en la Superserie:</h6>
                                                    {exercise.exercises?.map((subEx: any, subIdx: number) => (
                                                      <div key={subIdx} style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px', marginBottom: '8px' }}>
                                                        <strong style={{ color: '#fff', fontSize: '14px', display: 'block', marginBottom: '4px' }}>{subEx.name}</strong>
                                                        <div style={{ fontSize: '13px', color: '#bbb' }}>
                                                          {exercise.sets} series x {Array.isArray(subEx.reps) ? subEx.reps.join(', ') : subEx.reps} reps
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : exercise.exercise_sets && exercise.exercise_sets.length > 0 ? (
                                                  <div className="sets-list">
                                                    <h6>{t('gym_member_detail.active_plan.routine.sets')}</h6>
                                                    {exercise.exercise_sets.map((set: any, setIndex: number) => (
                                                      <div key={setIndex} className="set-item">
                                                        <span className="set-number">{t('gym_member_detail.active_plan.routine.set_num', { num: setIndex + 1 })}</span>
                                                        <div className="set-details">
                                                          <span>{t('gym_member_detail.active_plan.routine.reps', { count: set.reps || exercise.reps })}</span>
                                                          {set.rir !== undefined && <span>{t('gym_member_detail.active_plan.routine.rir', { count: set.rir })}</span>}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="sets-list">
                                                    <h6>{t('gym_member_detail.active_plan.routine.sets')}</h6>
                                                    {Array.from({ length: exercise.sets || 0 }, (_, i) => {
                                                      const repCount = Array.isArray(exercise.reps) ? exercise.reps[i] : (exercise.reps || 0);
                                                      const setType = Array.isArray(exercise.setTypes) ? exercise.setTypes[i] : 'normal';
                                                      const typeLabel = setType === 'warmup' ? 'Calentamiento' : setType === 'failure' ? 'Al Fallo' : setType === 'drop' ? 'Drop Set' : '';
                                                      return (
                                                        <div key={i} className="set-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #333' }}>
                                                          <span className="set-number" style={{ color: '#F7931E' }}>Serie {i + 1}</span>
                                                          <div className="set-details" style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                                                            {typeLabel && <span style={{ color: setType === 'failure' ? '#ff4d4d' : setType === 'drop' ? '#a64dff' : '#aaa', fontWeight: 500 }}>[{typeLabel}]</span>}
                                                            <span>{repCount} reps</span>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </>
                                            )}

                                            {/* PESTAÑA: REGISTROS */}
                                            {exerciseTabs[exerciseId] === 'registros' && (
                                              <div className="registros-content">
                                                <p className="info-message">
                                                  {t('gym_member_detail.active_plan.records.info')}
                                                </p>
                                                <div className="empty-state-small">
                                                  <p>{t('gym_member_detail.active_plan.records.empty')}</p>
                                                </div>
                                              </div>
                                            )}

                                            {/* PESTAÑA: EVOLUCIÓN */}
                                            {exerciseTabs[exerciseId] === 'evolucion' && (
                                              <div className="evolucion-content">
                                                <p className="info-message">
                                                  {t('gym_member_detail.active_plan.evolution.info', { name: exercise.name })}
                                                </p>
                                                <div className="empty-state-small">
                                                  <p>{t('gym_member_detail.active_plan.evolution.empty')}</p>
                                                </div>
                                              </div>
                                            )}

                                            {/* PESTAÑA: ESTADÍSTICAS */}
                                            {exerciseTabs[exerciseId] === 'estadisticas' && (
                                              <div className="estadisticas-content">
                                                <p className="info-message">
                                                  {t('gym_member_detail.active_plan.stats.info', { name: exercise.name })}
                                                </p>
                                                <div className="stats-grid-small">
                                                  <div className="stat-card-small">
                                                    <div className="stat-label-small">{t('gym_member_detail.active_plan.stats.orm')}</div>
                                                    <div className="stat-value-small">-</div>
                                                  </div>
                                                  <div className="stat-card-small">
                                                    <div className="stat-label-small">{t('gym_member_detail.active_plan.stats.volume')}</div>
                                                    <div className="stat-value-small">-</div>
                                                  </div>
                                                  <div className="stat-card-small">
                                                    <div className="stat-label-small">{t('gym_member_detail.active_plan.stats.completed')}</div>
                                                    <div className="stat-value-small">0</div>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Estadísticas de Entrenamientos */}
          <section className="stats-section">
            <h2>{t('gym_member_detail.workout_stats.title')}</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{stats.workout_count || 0}</div>
                <div className="stat-label">
                  {t('gym_member_detail.workout_stats.completed', { period: getPeriodLabel(selectedPeriod) })}
                </div>
              </div>
              {stats.recent_workouts && stats.recent_workouts.length > 0 && (
                <div className="stat-box">
                  <div className="stat-icon">⏱️</div>
                  <div className="stat-value">
                    {Math.round(
                      stats.recent_workouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0) /
                      stats.recent_workouts.length
                    )}
                  </div>
                  <div className="stat-label">{t('gym_member_detail.workout_stats.avg_min')}</div>
                </div>
              )}
            </div>

            {/* Entrenamientos Recientes */}
            {stats.recent_workouts && stats.recent_workouts.length > 0 && (
              <div className="recent-workouts">
                <h3>{t('gym_member_detail.workout_stats.recent')}</h3>
                <div className="workout-list">
                  {stats.recent_workouts.slice(0, 10).map((workout, index) => (
                    <div key={workout.id || index} className="workout-item">
                      <div className="workout-date">
                        {new Date(workout.completed_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="workout-duration">{workout.duration_minutes} min</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Métricas Corporales */}
          {stats.body_metrics && (
            <section className="stats-section">
              <div className="section-header-with-actions">
                <h2>{t('gym_member_detail.body_metrics.title')}</h2>
                <button
                  className="btn-chart-toggle"
                  onClick={() => setShowBodyMetricsChart(!showBodyMetricsChart)}
                >
                  {showBodyMetricsChart ? t('gym_member_detail.body_metrics.hide_chart') : t('gym_member_detail.body_metrics.show_chart')}
                </button>
              </div>

              {/* Gráfica de Evolución */}
              {showBodyMetricsChart && (
                <div className="chart-container">
                  <div className="chart-controls">
                    <label>{t('gym_member_detail.body_metrics.show')}</label>
                    <div className="metric-selector">
                      <button
                        className={`metric-btn ${selectedMetric === 'peso' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('peso')}
                      >
                        {t('gym_member_detail.body_metrics.metrics.weight')}
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'grasa' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('grasa')}
                      >
                        {t('gym_member_detail.body_metrics.metrics.fat')}
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'musculo' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('musculo')}
                      >
                        {t('gym_member_detail.body_metrics.metrics.muscle')}
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'imc' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('imc')}
                      >
                        {t('gym_member_detail.body_metrics.metrics.bmi')}
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'magra' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('magra')}
                      >
                        {t('gym_member_detail.body_metrics.metrics.lean')}
                      </button>
                    </div>
                  </div>

                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={generateMockMetricsData(stats.body_metrics)}
                        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis
                          dataKey="fecha"
                          stroke="#999"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="#999"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #F7931E',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Legend />
                        {selectedMetric === 'peso' && (
                          <Line
                            type="monotone"
                            dataKey="peso"
                            stroke="#F7931E"
                            strokeWidth={2}
                            name={t('gym_member_detail.body_metrics.chart.weight')}
                            dot={{ fill: '#F7931E', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'grasa' && (
                          <Line
                            type="monotone"
                            dataKey="grasa"
                            stroke="#FF5252"
                            strokeWidth={2}
                            name={t('gym_member_detail.body_metrics.chart.fat')}
                            dot={{ fill: '#FF5252', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'musculo' && (
                          <Line
                            type="monotone"
                            dataKey="musculo"
                            stroke="#4CAF50"
                            strokeWidth={2}
                            name={t('gym_member_detail.body_metrics.chart.muscle')}
                            dot={{ fill: '#4CAF50', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'imc' && (
                          <Line
                            type="monotone"
                            dataKey="imc"
                            stroke="#2196F3"
                            strokeWidth={2}
                            name={t('gym_member_detail.body_metrics.chart.bmi')}
                            dot={{ fill: '#2196F3', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'magra' && (
                          <Line
                            type="monotone"
                            dataKey="magra"
                            stroke="#9C27B0"
                            strokeWidth={2}
                            name={t('gym_member_detail.body_metrics.chart.lean')}
                            dot={{ fill: '#9C27B0', r: 4 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Métricas Actuales en Grid */}
              <div className="body-metrics-grid">
                <div className="metric-card-large">
                  <div className="metric-icon">⚖️</div>
                  <div className="metric-info">
                    <div className="metric-value-large">
                      {stats.body_metrics.current_weight.toFixed(1)} kg
                    </div>
                    <div className="metric-label-large">{t('gym_member_detail.body_metrics.current.weight')}</div>
                  </div>
                </div>

                {stats.body_metrics.body_fat_percentage && (
                  <div className="metric-card-large">
                    <div className="metric-icon">📉</div>
                    <div className="metric-info">
                      <div className="metric-value-large">
                        {stats.body_metrics.body_fat_percentage.toFixed(1)}%
                      </div>
                      <div className="metric-label-large">{t('gym_member_detail.body_metrics.current.fat')}</div>
                    </div>
                  </div>
                )}

                {stats.body_metrics.muscle_percentage && (
                  <div className="metric-card-large">
                    <div className="metric-icon">💪</div>
                    <div className="metric-info">
                      <div className="metric-value-large">
                        {stats.body_metrics.muscle_percentage.toFixed(1)}%
                      </div>
                      <div className="metric-label-large">{t('gym_member_detail.body_metrics.current.muscle')}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Información adicional de última medición */}
              <div className="metrics-details">
                <h3>{t('gym_member_detail.body_metrics.details.title')}</h3>
                <div className="detail-item">
                  <span className="detail-label">{t('gym_member_detail.body_metrics.details.date')}</span>
                  <span className="detail-value">
                    {new Date(stats.body_metrics.recorded_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* Calcular IMC si hay peso */}
                {stats.body_metrics.current_weight && (
                  <div className="detail-item">
                    <span className="detail-label">{t('gym_member_detail.body_metrics.details.bmi')}</span>
                    <span className="detail-value">
                      {/* Asumiendo altura promedio de 1.75m - esto debería venir de la BD */}
                      {(stats.body_metrics.current_weight / (1.75 * 1.75)).toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Peso magro calculado */}
                {stats.body_metrics.current_weight && stats.body_metrics.body_fat_percentage && (
                  <div className="detail-item">
                    <span className="detail-label">{t('gym_member_detail.body_metrics.details.lean')}</span>
                    <span className="detail-value">
                      {(stats.body_metrics.current_weight * (1 - stats.body_metrics.body_fat_percentage / 100)).toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>

              {/* Mensaje para ver historial completo */}
              <div className="info-banner">
                <p>{t('gym_member_detail.body_metrics.info', { period: getPeriodLabel(selectedPeriod) })}</p>
              </div>
            </section>
          )}

          {/* Nutrición */}
          {stats.nutrition_stats && (
            <section className="stats-section">
              <h2>{t('gym_member_detail.nutrition.title')}</h2>
              <div className="nutrition-grid">
                <div className="nutrition-card">
                  <div className="nutrition-icon">🔥</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_calories)}
                  </div>
                  <div className="nutrition-label">{t('gym_member_detail.nutrition.cal')}</div>
                </div>
                <div className="nutrition-card">
                  <div className="nutrition-icon">🐟</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_protein)}g
                  </div>
                  <div className="nutrition-label">{t('gym_member_detail.nutrition.protein')}</div>
                </div>
                <div className="nutrition-card">
                  <div className="nutrition-icon">🍞</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_carbs)}g
                  </div>
                  <div className="nutrition-label">{t('gym_member_detail.nutrition.carbs')}</div>
                </div>
                <div className="nutrition-card">
                  <div className="nutrition-icon">🥑</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_fats)}g
                  </div>
                  <div className="nutrition-label">{t('gym_member_detail.nutrition.fat')}</div>
                </div>
              </div>
            </section>
          )}

          {/* Pasos */}
          {stats.steps_stats && (
            <section className="stats-section">
              <h2>{t('gym_member_detail.steps.title', { period: getPeriodLabel(selectedPeriod) })}</h2>

              {/* Grid de estadísticas principales */}
              <div className="steps-stats-grid">
                <div className="steps-stat-card">
                  <div className="steps-stat-icon">👣</div>
                  <div className="steps-stat-value">
                    {Math.round(stats.steps_stats.avg_steps).toLocaleString()}
                  </div>
                  <div className="steps-stat-label">{t('gym_member_detail.steps.avg')}</div>
                </div>

                <div className="steps-stat-card">
                  <div className="steps-stat-icon">🏆</div>
                  <div className="steps-stat-value">
                    {Math.round(stats.steps_stats.total_steps).toLocaleString()}
                  </div>
                  <div className="steps-stat-label">{t('gym_member_detail.steps.total')}</div>
                </div>

                <div className="steps-stat-card">
                  <div className="steps-stat-icon">🔥</div>
                  <div className="steps-stat-value">
                    {Math.round(stats.steps_stats.avg_steps * 0.04)} kcal
                  </div>
                  <div className="steps-stat-label">{t('gym_member_detail.steps.cal')}</div>
                </div>

                <div className="steps-stat-card">
                  <div className="steps-stat-icon">📏</div>
                  <div className="steps-stat-value">
                    {(stats.steps_stats.avg_steps * 0.0007).toFixed(1)} km
                  </div>
                  <div className="steps-stat-label">{t('gym_member_detail.steps.dist')}</div>
                </div>
              </div>

              {/* Objetivos y Progreso */}
              <div className="steps-details">
                <h3>{t('gym_member_detail.steps.analysis')}</h3>

                <div className="progress-item">
                  <div className="progress-header">
                    <span className="progress-label">{t('gym_member_detail.steps.target')}</span>
                    <span className="progress-percentage">
                      {Math.round((stats.steps_stats.avg_steps / 10000) * 100)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min((stats.steps_stats.avg_steps / 10000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="stats-comparison">
                  <div className="comparison-item">
                    <span className="comparison-label">{t('gym_member_detail.steps.vs_target')}</span>
                    <span className={`comparison-value ${stats.steps_stats.avg_steps >= 10000 ? 'positive' : 'neutral'}`}>
                      {stats.steps_stats.avg_steps >= 10000 ? '+' : ''}
                      {Math.round(stats.steps_stats.avg_steps - 10000).toLocaleString()}
                    </span>
                  </div>

                  <div className="comparison-item">
                    <span className="comparison-label">{t('gym_member_detail.steps.level')}</span>
                    <span className="comparison-value">
                      {stats.steps_stats.avg_steps < 5000 ? t('gym_member_detail.steps.levels.sedentary') :
                        stats.steps_stats.avg_steps < 7500 ? t('gym_member_detail.steps.levels.light') :
                          stats.steps_stats.avg_steps < 10000 ? t('gym_member_detail.steps.levels.moderate') :
                            stats.steps_stats.avg_steps < 12500 ? t('gym_member_detail.steps.levels.active') :
                              t('gym_member_detail.steps.levels.very_active')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner informativo */}
              <div className="info-banner">
                <p>{t('gym_member_detail.steps.info')}</p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Notas del Nutricionista */}
      <section className="stats-section">
        <h2>{t('gym_member_detail.notes.title')}</h2>
        <div style={{ background: '#111', borderRadius: '12px', padding: '1.5rem', border: '1px solid #2a2a2a' }}>
          <textarea
            value={nutritionistNotes}
            onChange={(e) => setNutritionistNotes(e.target.value)}
            placeholder={t('gym_member_detail.notes.placeholder')}
            style={{
              width: '100%',
              minHeight: '120px',
              background: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#fff',
              padding: '12px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            {notesSaved && <span style={{ color: '#4CAF50', fontSize: '14px' }}>{t('gym_member_detail.notes.saved')}</span>}
            <button
              onClick={saveNutritionistNotes}
              disabled={savingNotes}
              style={{
                background: '#F7931E',
                color: '#000',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: savingNotes ? 'wait' : 'pointer',
              }}
            >
              {savingNotes ? t('gym_member_detail.notes.saving') : t('gym_member_detail.notes.save')}
            </button>
          </div>
        </div>
      </section>

      {/* Historial de Dietas Enviadas */}
      <section className="stats-section">
        <h2>{t('gym_member_detail.diet_history.title')}</h2>
        {dietHistoryLoading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>{t('gym_member_detail.diet_history.loading')}</p>
        ) : dietHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>{t('gym_member_detail.diet_history.empty')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1a1a1a', color: '#888', textAlign: 'left', padding: '10px 14px', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>{t('gym_member_detail.diet_history.table.plan')}</th>
                  <th style={{ background: '#1a1a1a', color: '#888', textAlign: 'left', padding: '10px 14px', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>{t('gym_member_detail.diet_history.table.date')}</th>
                  <th style={{ background: '#1a1a1a', color: '#888', textAlign: 'left', padding: '10px 14px', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>{t('gym_member_detail.diet_history.table.status')}</th>
                  <th style={{ background: '#1a1a1a', color: '#888', textAlign: 'left', padding: '10px 14px', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>{t('gym_member_detail.diet_history.table.message')}</th>
                </tr>
              </thead>
              <tbody>
                {dietHistory.map((d) => {
                  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                    pending: { bg: '#ffb30022', color: '#ffb300', label: t('gym_member_detail.diet_history.status.pending') },
                    accepted: { bg: '#4CAF5022', color: '#4CAF50', label: t('gym_member_detail.diet_history.status.accepted') },
                    rejected: { bg: '#f4433622', color: '#f44336', label: t('gym_member_detail.diet_history.status.rejected') },
                  };
                  const sc = statusColors[d.status] || statusColors.pending;
                  return (
                    <tr key={d.id}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a', color: '#eee' }}>{d.plan_name}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a', color: '#aaa', fontSize: '13px' }}>{new Date(d.created_at).toLocaleDateString('es-ES')}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a', color: '#888', fontSize: '13px' }}>{d.message || t('gym_member_detail.diet_history.no_message')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


