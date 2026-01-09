import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentStats, type StudentStats } from '../services/adminService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './GymMemberDetail.css';

type PeriodType = '1week' | '1month' | '3months' | '6months' | 'all';

const PERIODS = {
  '1week': { label: '7 días', days: 7 },
  '1month': { label: 'Este mes', days: 30 },
  '3months': { label: '3 meses', days: 90 },
  '6months': { label: '6 meses', days: 180 },
  'all': { label: 'Todo', days: null },
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
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1month');
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [exerciseTabs, setExerciseTabs] = useState<Record<string, 'rutina' | 'registros' | 'evolucion' | 'estadisticas'>>({});
  const [showBodyMetricsChart, setShowBodyMetricsChart] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'peso' | 'grasa' | 'musculo' | 'imc' | 'magra'>('peso');

  useEffect(() => {
    loadStats();
  }, [empresarioId, userId, selectedPeriod]);

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
      
      if (PERIODS[selectedPeriod].days) {
        const start = new Date();
        start.setDate(start.getDate() - PERIODS[selectedPeriod].days!);
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
          <p>Cargando estadísticas...</p>
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
          ← Volver
        </button>
        <div className="header-info">
          <h1>{decodeURIComponent(userName || 'Usuario')}</h1>
          <p className="user-email">{decodeURIComponent(userEmail || '')}</p>
        </div>
      </header>

      {/* Selector de Periodo */}
      <div className="period-selector-container">
        <label>Período:</label>
        <div className="period-buttons">
          {(Object.keys(PERIODS) as PeriodType[]).map((period) => (
            <button
              key={period}
              className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(period)}
            >
              {PERIODS[period].label}
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="empty-state">
          <p>No se pudieron cargar las estadísticas del usuario</p>
        </div>
      ) : (
        <div className="stats-content">
          {/* Plan Activo */}
          {stats.active_plan && (
            <section className="stats-section">
              <h2>🏋️ Plan de Entrenamiento Activo</h2>
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
                  <span>📅 {stats.active_plan.plan_data?.weeks || 1} semanas</span>
                  <span>🏃 {stats.active_plan.plan_data?.days_per_week || 0} días/semana</span>
                </div>
                
                {isPlanExpanded && stats.active_plan.plan_data?.days && (
                  <div className="plan-details" onClick={(e) => e.stopPropagation()}>
                    {/* Selector de Semana */}
                    <div className="week-selector">
                      <label>Semana:</label>
                      <div className="week-buttons">
                        {Array.from({ length: stats.active_plan.plan_data?.weeks || 1 }, (_, i) => i + 1).map(week => (
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

                    <h4>Semana {selectedWeek}</h4>
                    {stats.active_plan.plan_data.days.map((day: any, dayIndex: number) => {
                      const isDayExpanded = expandedDays.has(dayIndex);
                      
                      // Verificar si este día fue completado en el período seleccionado
                      // Note: recent_workouts doesn't have day_name property, this is just a placeholder
                      const dayWorkouts = stats.recent_workouts?.filter(
                        _w => false // Temporarily disabled until workout type includes day_name
                      ) || [];
                      const isCompleted = dayWorkouts.length > 0;
                      
                      // Obtener la fecha del último entrenamiento de este día
                      const lastWorkout = dayWorkouts.length > 0 
                        ? dayWorkouts.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
                        : null;
                      
                      return (
                        <div key={dayIndex} className={`day-card ${isCompleted ? 'completed' : ''}`}>
                          <div className="day-header" onClick={() => toggleDay(dayIndex)}>
                            <div className="day-title-row">
                              <h5>
                                {isCompleted && '✅ '}
                                {day.name || `Día ${dayIndex + 1}`}
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
                                        <span className="exercise-name">{exercise.name || `Ejercicio ${exIndex + 1}`}</span>
                                        <span className="exercise-summary">
                                          {exercise.sets} series × {exercise.reps} reps
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
                                            📋 Rutina
                                          </button>
                                          <button
                                            className={`exercise-tab ${exerciseTabs[exerciseId] === 'registros' ? 'active' : ''}`}
                                            onClick={() => setExerciseTab(exerciseId, 'registros')}
                                          >
                                            ✅ Registros
                                          </button>
                                          <button
                                            className={`exercise-tab ${exerciseTabs[exerciseId] === 'evolucion' ? 'active' : ''}`}
                                            onClick={() => setExerciseTab(exerciseId, 'evolucion')}
                                          >
                                            📈 Evolución
                                          </button>
                                          <button
                                            className={`exercise-tab ${exerciseTabs[exerciseId] === 'estadisticas' ? 'active' : ''}`}
                                            onClick={() => setExerciseTab(exerciseId, 'estadisticas')}
                                          >
                                            📊 Estadísticas
                                          </button>
                                        </div>

                                        {/* Contenido según pestaña seleccionada */}
                                        <div className="exercise-tab-content">
                                          {/* PESTAÑA: RUTINA */}
                                          {(exerciseTabs[exerciseId] || 'rutina') === 'rutina' && (
                                            <>
                                              <div className="exercise-info-row">
                                                {exercise.rest_seconds && (
                                                  <div className="exercise-info-item">
                                                    <span className="info-label">Descanso:</span>
                                                    <span className="info-value">{exercise.rest_seconds}s</span>
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {exercise.exercise_sets && exercise.exercise_sets.length > 0 ? (
                                                <div className="sets-list">
                                                  <h6>Series:</h6>
                                                  {exercise.exercise_sets.map((set: any, setIndex: number) => (
                                                    <div key={setIndex} className="set-item">
                                                      <span className="set-number">Serie {setIndex + 1}</span>
                                                      <div className="set-details">
                                                        <span>🔁 {set.reps || exercise.reps} reps</span>
                                                        {set.rir !== undefined && <span>💪 RIR {set.rir}</span>}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="sets-list">
                                                  <h6>Series:</h6>
                                                  {Array.from({ length: exercise.sets || 0 }, (_, i) => i + 1).map(setNum => (
                                                    <div key={setNum} className="set-item">
                                                      <span className="set-number">Serie {setNum}</span>
                                                      <div className="set-details">
                                                        <span>🔁 {exercise.reps} reps</span>
                                                        <span>💪 RIR 2-3</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </>
                                          )}

                                          {/* PESTAÑA: REGISTROS */}
                                          {exerciseTabs[exerciseId] === 'registros' && (
                                            <div className="registros-content">
                                              <p className="info-message">
                                                📝 Aquí se mostrarán los registros completados de este ejercicio en este día
                                              </p>
                                              <div className="empty-state-small">
                                                <p>No hay registros de este ejercicio en el período seleccionado</p>
                                              </div>
                                            </div>
                                          )}

                                          {/* PESTAÑA: EVOLUCIÓN */}
                                          {exerciseTabs[exerciseId] === 'evolucion' && (
                                            <div className="evolucion-content">
                                              <p className="info-message">
                                                📈 Progreso histórico del ejercicio "{exercise.name}"
                                              </p>
                                              <div className="empty-state-small">
                                                <p>No hay suficientes datos para mostrar la evolución</p>
                                              </div>
                                            </div>
                                          )}

                                          {/* PESTAÑA: ESTADÍSTICAS */}
                                          {exerciseTabs[exerciseId] === 'estadisticas' && (
                                            <div className="estadisticas-content">
                                              <p className="info-message">
                                                📊 Estadísticas del ejercicio "{exercise.name}"
                                              </p>
                                              <div className="stats-grid-small">
                                                <div className="stat-card-small">
                                                  <div className="stat-label-small">1RM Estimado</div>
                                                  <div className="stat-value-small">-</div>
                                                </div>
                                                <div className="stat-card-small">
                                                  <div className="stat-label-small">Volumen Total</div>
                                                  <div className="stat-value-small">-</div>
                                                </div>
                                                <div className="stat-card-small">
                                                  <div className="stat-label-small">Veces Completado</div>
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
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Estadísticas de Entrenamientos */}
          <section className="stats-section">
            <h2>📊 Estadísticas de Entrenamientos</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{stats.workout_count || 0}</div>
                <div className="stat-label">
                  Completados ({PERIODS[selectedPeriod].label})
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
                  <div className="stat-label">Min. Promedio</div>
                </div>
              )}
            </div>

            {/* Entrenamientos Recientes */}
            {stats.recent_workouts && stats.recent_workouts.length > 0 && (
              <div className="recent-workouts">
                <h3>Entrenamientos Recientes</h3>
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
                <h2>📏 Evolución Corporal</h2>
                <button 
                  className="btn-chart-toggle"
                  onClick={() => setShowBodyMetricsChart(!showBodyMetricsChart)}
                >
                  {showBodyMetricsChart ? '📊 Ocultar Gráfica' : '📈 Ver Gráfica'}
                </button>
              </div>
              
              {/* Gráfica de Evolución */}
              {showBodyMetricsChart && (
                <div className="chart-container">
                  <div className="chart-controls">
                    <label>Mostrar:</label>
                    <div className="metric-selector">
                      <button
                        className={`metric-btn ${selectedMetric === 'peso' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('peso')}
                      >
                        ⚖️ Peso
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'grasa' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('grasa')}
                      >
                        📉 Grasa
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'musculo' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('musculo')}
                      >
                        💪 Músculo
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'imc' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('imc')}
                      >
                        📊 IMC
                      </button>
                      <button
                        className={`metric-btn ${selectedMetric === 'magra' ? 'active' : ''}`}
                        onClick={() => setSelectedMetric('magra')}
                      >
                        🏋️ Masa Magra
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
                            name="Peso (kg)"
                            dot={{ fill: '#F7931E', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'grasa' && (
                          <Line 
                            type="monotone" 
                            dataKey="grasa" 
                            stroke="#FF5252" 
                            strokeWidth={2}
                            name="Grasa Corporal (%)"
                            dot={{ fill: '#FF5252', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'musculo' && (
                          <Line 
                            type="monotone" 
                            dataKey="musculo" 
                            stroke="#4CAF50" 
                            strokeWidth={2}
                            name="Masa Muscular (%)"
                            dot={{ fill: '#4CAF50', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'imc' && (
                          <Line 
                            type="monotone" 
                            dataKey="imc" 
                            stroke="#2196F3" 
                            strokeWidth={2}
                            name="IMC"
                            dot={{ fill: '#2196F3', r: 4 }}
                          />
                        )}
                        {selectedMetric === 'magra' && (
                          <Line 
                            type="monotone" 
                            dataKey="magra" 
                            stroke="#9C27B0" 
                            strokeWidth={2}
                            name="Masa Magra (kg)"
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
                    <div className="metric-label-large">Peso Actual</div>
                  </div>
                </div>
                
                {stats.body_metrics.body_fat_percentage && (
                  <div className="metric-card-large">
                    <div className="metric-icon">📉</div>
                    <div className="metric-info">
                      <div className="metric-value-large">
                        {stats.body_metrics.body_fat_percentage.toFixed(1)}%
                      </div>
                      <div className="metric-label-large">Grasa Corporal</div>
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
                      <div className="metric-label-large">Masa Muscular</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Información adicional de última medición */}
              <div className="metrics-details">
                <h3>Última Medición</h3>
                <div className="detail-item">
                  <span className="detail-label">📅 Fecha:</span>
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
                    <span className="detail-label">📊 IMC:</span>
                    <span className="detail-value">
                      {/* Asumiendo altura promedio de 1.75m - esto debería venir de la BD */}
                      {(stats.body_metrics.current_weight / (1.75 * 1.75)).toFixed(1)}
                    </span>
                  </div>
                )}
                
                {/* Peso magro calculado */}
                {stats.body_metrics.current_weight && stats.body_metrics.body_fat_percentage && (
                  <div className="detail-item">
                    <span className="detail-label">🏋️ Masa Magra:</span>
                    <span className="detail-value">
                      {(stats.body_metrics.current_weight * (1 - stats.body_metrics.body_fat_percentage / 100)).toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>

              {/* Mensaje para ver historial completo */}
              <div className="info-banner">
                <p>💡 En el período seleccionado ({PERIODS[selectedPeriod].label})</p>
              </div>
            </section>
          )}

          {/* Nutrición */}
          {stats.nutrition_stats && (
            <section className="stats-section">
              <h2>🍎 Nutrición (últimos 7 días)</h2>
              <div className="nutrition-grid">
                <div className="nutrition-card">
                  <div className="nutrition-icon">🔥</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_calories)}
                  </div>
                  <div className="nutrition-label">Cal/día</div>
                </div>
                <div className="nutrition-card">
                  <div className="nutrition-icon">🐟</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_protein)}g
                  </div>
                  <div className="nutrition-label">Proteína</div>
                </div>
                <div className="nutrition-card">
                  <div className="nutrition-icon">🍞</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_carbs)}g
                  </div>
                  <div className="nutrition-label">Carbos</div>
                </div>
                <div className="nutrition-card">
                  <div className="nutrition-icon">🥑</div>
                  <div className="nutrition-value">
                    {Math.round(stats.nutrition_stats.avg_fats)}g
                  </div>
                  <div className="nutrition-label">Grasas</div>
                </div>
              </div>
            </section>
          )}

          {/* Pasos */}
          {stats.steps_stats && (
            <section className="stats-section">
              <h2>👟 Actividad Diaria ({PERIODS[selectedPeriod].label})</h2>
              
              {/* Grid de estadísticas principales */}
              <div className="steps-stats-grid">
                <div className="steps-stat-card">
                  <div className="steps-stat-icon">👣</div>
                  <div className="steps-stat-value">
                    {Math.round(stats.steps_stats.avg_steps).toLocaleString()}
                  </div>
                  <div className="steps-stat-label">Promedio Diario</div>
                </div>
                
                <div className="steps-stat-card">
                  <div className="steps-stat-icon">🏆</div>
                  <div className="steps-stat-value">
                    {Math.round(stats.steps_stats.total_steps).toLocaleString()}
                  </div>
                  <div className="steps-stat-label">Total de Pasos</div>
                </div>
                
                <div className="steps-stat-card">
                  <div className="steps-stat-icon">🔥</div>
                  <div className="steps-stat-value">
                    {Math.round(stats.steps_stats.avg_steps * 0.04)} kcal
                  </div>
                  <div className="steps-stat-label">Calorías/Día (est.)</div>
                </div>
                
                <div className="steps-stat-card">
                  <div className="steps-stat-icon">📏</div>
                  <div className="steps-stat-value">
                    {(stats.steps_stats.avg_steps * 0.0007).toFixed(1)} km
                  </div>
                  <div className="steps-stat-label">Distancia/Día (est.)</div>
                </div>
              </div>

              {/* Objetivos y Progreso */}
              <div className="steps-details">
                <h3>Análisis de Actividad</h3>
                
                <div className="progress-item">
                  <div className="progress-header">
                    <span className="progress-label">🎯 Objetivo Diario (10,000 pasos)</span>
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
                    <span className="comparison-label">📊 vs. Objetivo:</span>
                    <span className={`comparison-value ${stats.steps_stats.avg_steps >= 10000 ? 'positive' : 'neutral'}`}>
                      {stats.steps_stats.avg_steps >= 10000 ? '+' : ''}
                      {Math.round(stats.steps_stats.avg_steps - 10000).toLocaleString()} pasos
                    </span>
                  </div>
                  
                  <div className="comparison-item">
                    <span className="comparison-label">⚡ Nivel de Actividad:</span>
                    <span className="comparison-value">
                      {stats.steps_stats.avg_steps < 5000 ? '🟡 Sedentario' :
                       stats.steps_stats.avg_steps < 7500 ? '🟢 Poco Activo' :
                       stats.steps_stats.avg_steps < 10000 ? '🔵 Moderado' :
                       stats.steps_stats.avg_steps < 12500 ? '🟣 Activo' :
                       '🔴 Muy Activo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner informativo */}
              <div className="info-banner">
                <p>💡 Estimaciones basadas en: 0.7m por paso y 0.04 kcal por paso</p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


