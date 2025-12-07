import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../src/services/supabase';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

type PeriodType = '1month' | '3months' | '6months' | '1year' | 'all';

interface ExerciseSet {
  date: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  created_at: string;
}

interface SessionData {
  date: string;
  maxWeight: number;
  totalVolume: number;
  bestSet: string;
  sets: ExerciseSet[];
}

export default function ExerciseProgressStatsScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const exerciseName = params.exerciseName as string;
  const exerciseId = params.exerciseId as string;

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('3months');
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [stats, setStats] = useState({
    personalRecord: 0,
    totalVolume: 0,
    progressPercent: 0,
    lastSession: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user, selectedPeriod]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Calcular fecha de inicio según el período
      const now = new Date();
      let startDate = new Date();
      
      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date('2020-01-01');
          break;
      }

      // Obtener todas las series del ejercicio (excluyendo calentamiento si estuviera marcado)
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('*')
        .eq('user_id', user!.id)
        .eq('exercise_id', exerciseId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Agrupar por fecha (día)
      const sessionsByDate: { [key: string]: ExerciseSet[] } = {};
      data.forEach(set => {
        const date = set.created_at.split('T')[0]; // YYYY-MM-DD
        if (!sessionsByDate[date]) {
          sessionsByDate[date] = [];
        }
        sessionsByDate[date].push({
          date,
          set_number: set.set_number,
          reps: set.reps || 0,
          weight_kg: set.weight_kg || 0,
          created_at: set.created_at,
        });
      });

      // Calcular métricas por sesión
      const sessionsData: SessionData[] = Object.entries(sessionsByDate).map(([date, sets]) => {
        const maxWeight = Math.max(...sets.map(s => s.weight_kg));
        const totalVolume = sets.reduce((sum, s) => sum + (s.weight_kg * s.reps), 0);
        const bestSetData = sets.reduce((best, current) => 
          (current.weight_kg * current.reps) > (best.weight_kg * best.reps) ? current : best
        );
        const bestSet = `${bestSetData.weight_kg}kg × ${bestSetData.reps}`;

        return {
          date,
          maxWeight,
          totalVolume,
          bestSet,
          sets,
        };
      });

      setSessions(sessionsData);

      // Calcular estadísticas globales
      const allWeights = data.map(s => s.weight_kg || 0);
      const personalRecord = Math.max(...allWeights);
      const totalVolume = data.reduce((sum, s) => sum + ((s.weight_kg || 0) * (s.reps || 0)), 0);
      
      // Calcular progreso (comparar primera vs última sesión)
      let progressPercent = 0;
      if (sessionsData.length >= 2) {
        const firstMax = sessionsData[0].maxWeight;
        const lastMax = sessionsData[sessionsData.length - 1].maxWeight;
        progressPercent = firstMax > 0 ? ((lastMax - firstMax) / firstMax) * 100 : 0;
      }

      const lastSessionData = sessionsData[sessionsData.length - 1];
      const lastSession = lastSessionData ? lastSessionData.bestSet : 'N/A';

      setStats({
        personalRecord,
        totalVolume: Math.round(totalVolume),
        progressPercent: Math.round(progressPercent),
        lastSession,
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxWeightChartData = () => {
    if (sessions.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = sessions.map(s => {
      const date = new Date(s.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = sessions.map(s => s.maxWeight);

    return {
      labels: labels.length > 10 ? labels.filter((_, i) => i % Math.ceil(labels.length / 10) === 0) : labels,
      datasets: [{ data }],
    };
  };

  const getVolumeChartData = () => {
    if (sessions.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = sessions.map(s => {
      const date = new Date(s.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = sessions.map(s => s.totalVolume);

    return {
      labels: labels.length > 10 ? labels.filter((_, i) => i % Math.ceil(labels.length / 10) === 0) : labels,
      datasets: [{ data }],
    };
  };

  const chartConfig = {
    backgroundGradientFrom: '#1a1a1a',
    backgroundGradientTo: '#1a1a1a',
    color: (opacity = 1) => `rgba(255, 179, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10,
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {exerciseName}
        </Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Stats Cards */}
          {sessions.length > 0 ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="trophy" size={32} color="#ffb300" />
                  <Text style={styles.statValue}>{stats.personalRecord} kg</Text>
                  <Text style={styles.statLabel}>Record Personal</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="trending-up" size={32} color="#4CAF50" />
                  <Text style={styles.statValue}>
                    {stats.progressPercent > 0 ? '+' : ''}{stats.progressPercent}%
                  </Text>
                  <Text style={styles.statLabel}>Progreso</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="fitness" size={32} color="#2196F3" />
                  <Text style={styles.statValue}>{stats.totalVolume} kg</Text>
                  <Text style={styles.statLabel}>Volumen Total</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="calendar" size={32} color="#FF9800" />
                  <Text style={styles.statValue}>{stats.lastSession}</Text>
                  <Text style={styles.statLabel}>Última Sesión</Text>
                </View>
              </View>

              {/* Period Selector */}
              <View style={styles.periodSelector}>
                {(['1month', '3months', '6months', '1year', 'all'] as PeriodType[]).map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonActive,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive,
                    ]}>
                      {period === '1month' ? '1M' : 
                       period === '3months' ? '3M' : 
                       period === '6months' ? '6M' : 
                       period === '1year' ? '1A' : 
                       'TODO'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Charts */}
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>📈 Peso Máximo por Sesión</Text>
                <LineChart
                  data={getMaxWeightChartData()}
                  width={width - 40}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                />
              </View>

              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>💪 Volumen Total por Sesión</Text>
                <LineChart
                  data={getVolumeChartData()}
                  width={width - 40}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={false}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                />
              </View>

              {/* Session History */}
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>📜 Historial de Sesiones</Text>
                {sessions.slice().reverse().map((session, index) => {
                  const date = new Date(session.date);
                  const formattedDate = `${date.getDate()} ${date.toLocaleString('es', { month: 'short' })} ${date.getFullYear()}`;
                  
                  return (
                    <View key={index} style={styles.sessionCard}>
                      <View style={styles.sessionHeader}>
                        <Text style={styles.sessionDate}>📅 {formattedDate}</Text>
                        <Text style={styles.sessionVolume}>{session.totalVolume} kg</Text>
                      </View>
                      {session.sets.map((set, setIndex) => (
                        <View key={setIndex} style={styles.setRow}>
                          <Text style={styles.setNumber}>Serie {set.set_number}</Text>
                          <Text style={styles.setText}>{set.weight_kg}kg × {set.reps} reps</Text>
                        </View>
                      ))}
                      <Text style={styles.sessionBest}>🏆 Mejor: {session.bestSet}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={80} color="#444" />
              <Text style={styles.emptyTitle}>Sin Datos</Text>
              <Text style={styles.emptyText}>
                Aún no has registrado series para este ejercicio.
              </Text>
              <Text style={styles.emptyText}>
                Completa tu primer entrenamiento para ver tus estadísticas.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  periodButtonActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  periodButtonTextActive: {
    color: '#1a1a1a',
  },
  chartSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  historySection: {
    padding: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  sessionVolume: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  setNumber: {
    fontSize: 13,
    color: '#888',
  },
  setText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  sessionBest: {
    fontSize: 13,
    color: '#ffb300',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
});

