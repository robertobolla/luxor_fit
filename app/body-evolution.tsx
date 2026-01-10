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
import { useUnitsStore, formatWeight, getWeightInUserUnit } from '../src/store/unitsStore';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

type MetricType = 'weight' | 'bodyFat' | 'muscle';
type PeriodType = '1month' | '3months' | '6months' | '1year' | 'all';

interface BodyMetric {
  date: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  muscle_percentage: number | null;
}

export default function BodyEvolutionScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const { weightUnit } = useUnitsStore();
  
  // Si se pasa userId, es vista de entrenador
  const targetUserId = (params.userId as string) || user?.id;
  const targetUserName = (params.userName as string) || '';
  const isTrainerView = params.isTrainerView === 'true';
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('3months');
  
  const weightUnitLabel = weightUnit === 'kg' ? 'kg' : 'lb';

  useEffect(() => {
    if (targetUserId) {
      loadMetrics();
    }
  }, [targetUserId, selectedPeriod]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Calcular fecha de inicio según el período seleccionado
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
          startDate = new Date('2020-01-01'); // Fecha muy antigua para obtener todo
          break;
      }

      const { data, error } = await supabase
        .from('body_metrics')
        .select('date, weight_kg, body_fat_percentage, muscle_percentage')
        .eq('user_id', targetUserId!)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      setMetrics(data || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (metrics.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{ data: [0] }],
      };
    }

    // Filtrar y preparar datos según la métrica seleccionada
    let filteredMetrics = metrics;
    let dataPoints: number[] = [];
    
    switch (selectedMetric) {
      case 'weight':
        dataPoints = metrics.map(m => getWeightInUserUnit(m.weight_kg, weightUnit));
        break;
      case 'bodyFat':
        filteredMetrics = metrics.filter(m => m.body_fat_percentage !== null);
        dataPoints = filteredMetrics.map(m => m.body_fat_percentage!);
        break;
      case 'muscle':
        filteredMetrics = metrics.filter(m => m.muscle_percentage !== null);
        dataPoints = filteredMetrics.map(m => m.muscle_percentage!);
        break;
    }

    if (dataPoints.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{ data: [0] }],
      };
    }

    // Generar etiquetas de fecha
    const labels = filteredMetrics.map(m => {
      const date = new Date(m.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    // Limitar a máximo 10 puntos para mejor visualización
    const maxPoints = 10;
    const step = Math.ceil(dataPoints.length / maxPoints);
    
    const sampledLabels = labels.filter((_, i) => i % step === 0);
    const sampledData = dataPoints.filter((_, i) => i % step === 0);

    return {
      labels: sampledLabels,
      datasets: [{ data: sampledData }],
    };
  };

  const getMetricInfo = () => {
    switch (selectedMetric) {
      case 'weight':
        return {
          title: 'Peso Corporal',
          unit: weightUnitLabel,
          color: '#ffb300',
          icon: 'fitness' as const,
        };
      case 'bodyFat':
        return {
          title: 'Grasa Corporal',
          unit: '%',
          color: '#F44336',
          icon: 'water' as const,
        };
      case 'muscle':
        return {
          title: 'Masa Muscular',
          unit: '%',
          color: '#4CAF50',
          icon: 'barbell' as const,
        };
    }
  };

  const getStats = () => {
    if (metrics.length === 0) return null;

    let values: number[] = [];
    switch (selectedMetric) {
      case 'weight':
        values = metrics.map(m => getWeightInUserUnit(m.weight_kg, weightUnit));
        break;
      case 'bodyFat':
        values = metrics.filter(m => m.body_fat_percentage !== null).map(m => m.body_fat_percentage!);
        break;
      case 'muscle':
        values = metrics.filter(m => m.muscle_percentage !== null).map(m => m.muscle_percentage!);
        break;
    }

    if (values.length === 0) return null;

    const current = values[values.length - 1];
    const previous = values[0];
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return {
      current: current.toFixed(1),
      change: change.toFixed(1),
      changePercent,
      average: average.toFixed(1),
      max: max.toFixed(1),
      min: min.toFixed(1),
      isPositive: change > 0,
    };
  };

  const metricInfo = getMetricInfo();
  const stats = getStats();
  const chartData = getChartData();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>
  {t('bodyProgress.title')}
</Text>
          {isTrainerView && targetUserName && (
            <Text style={styles.headerSubtitle}>{targetUserName}</Text>
          )}
        </View>
        {!isTrainerView && (
        <TouchableOpacity onPress={() => router.push('/(tabs)/register-weight' as any)}>
          <Ionicons name="add-circle-outline" size={24} color="#ffb300" />
        </TouchableOpacity>
        )}
        {isTrainerView && <View style={{ width: 24 }} />}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Selector de período */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('bodyProgress.period')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.periodSelector}>
              {[
                { value: '1month' as PeriodType, label: '1 Mes' },
                { value: '3months' as PeriodType, label: '3 Meses' },
                { value: '6months' as PeriodType, label: '6 Meses' },
                { value: '1year' as PeriodType, label: '1 Año' },
                { value: 'all' as PeriodType, label: 'Todo' },
              ].map(period => (
                <TouchableOpacity
                  key={period.value}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period.value && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod(period.value)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period.value && styles.periodButtonTextActive
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Selector de métrica */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('bodyProgress.metric')}</Text>
        <View style={styles.metricSelector}>
            <TouchableOpacity
              style={[
                styles.metricButton,
                selectedMetric === 'weight' && styles.metricButtonActive,
                selectedMetric === 'weight' && { borderColor: '#ffb300' }
              ]}
              onPress={() => setSelectedMetric('weight')}
            >
              <Ionicons 
                name="fitness" 
                size={24} 
                color={selectedMetric === 'weight' ? '#ffb300' : '#666'} 
              />
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'weight' && styles.metricButtonTextActive
              ]}>
                Peso
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.metricButton,
                selectedMetric === 'bodyFat' && styles.metricButtonActive,
                selectedMetric === 'bodyFat' && { borderColor: '#F44336' }
              ]}
              onPress={() => setSelectedMetric('bodyFat')}
            >
              <Ionicons 
                name="water" 
                size={24} 
                color={selectedMetric === 'bodyFat' ? '#F44336' : '#666'} 
              />
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'bodyFat' && styles.metricButtonTextActive
              ]}>
                Grasa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.metricButton,
                selectedMetric === 'muscle' && styles.metricButtonActive,
                selectedMetric === 'muscle' && { borderColor: '#4CAF50' }
              ]}
              onPress={() => setSelectedMetric('muscle')}
            >
              <Ionicons 
                name="barbell" 
                size={24} 
                color={selectedMetric === 'muscle' ? '#4CAF50' : '#666'} 
              />
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'muscle' && styles.metricButtonTextActive
              ]}>
                Músculo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffb300" />
            <Text style={styles.loadingText}>
  {t('common.loadingData')}
</Text>
          </View>
        ) : metrics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>
  {t('common.noDataYet')}
</Text>
            <Text style={styles.emptyStateSubtext}>
  {t('bodyProgress.noDataDescription')}
</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/register-weight' as any)}
            >
              <Ionicons name="add-circle" size={20} color="#1a1a1a" />
             
<Text style={styles.addButtonText}>
  {t('bodyProgress.addMeasurement')}
</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Estadísticas */}
            {stats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{metricInfo.title}</Text>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="trending-up" size={20} color={metricInfo.color} />
                    <Text style={styles.statValue}>{stats.current} {metricInfo.unit}</Text>
                    <Text style={styles.statLabel}>{t('common.current')}</Text>
                    </View>

                  <View style={styles.statCard}>
                    <Ionicons 
                      name={stats.isPositive ? 'arrow-up' : 'arrow-down'} 
                      size={20} 
                      color={
                        selectedMetric === 'weight' 
                          ? (stats.isPositive ? '#F44336' : '#4CAF50')
                          : selectedMetric === 'bodyFat'
                          ? (stats.isPositive ? '#F44336' : '#4CAF50')
                          : (stats.isPositive ? '#4CAF50' : '#F44336')
                      } 
                    />
                    <Text style={[
                      styles.statValue,
                      { color: 
                        selectedMetric === 'weight' 
                          ? (stats.isPositive ? '#F44336' : '#4CAF50')
                          : selectedMetric === 'bodyFat'
                          ? (stats.isPositive ? '#F44336' : '#4CAF50')
                          : (stats.isPositive ? '#4CAF50' : '#F44336')
                      }
                    ]}>
                      {parseFloat(stats.change) > 0 ? '+' : ''}{stats.change} {metricInfo.unit}
                    </Text>
                    <Text style={styles.statLabel}>{t('common.change')}</Text>
                    </View>

                  <View style={styles.statCard}>
                    <Ionicons name="analytics" size={20} color="#999" />
                    <Text style={styles.statValue}>{stats.average} {metricInfo.unit}</Text>
                    <Text style={styles.statLabel}>{t('common.average')}</Text>
                    </View>
                </View>

                <View style={styles.rangeCard}>
                  <View style={styles.rangeItem}>
                    <Ionicons name="arrow-down-circle" size={18} color="#4CAF50" />
                    <Text style={styles.rangeLabel}>{t('common.min')}</Text>
                    <Text style={styles.rangeValue}>{stats.min} {metricInfo.unit}</Text>
                  </View>
                  <View style={styles.rangeDivider} />
                  <View style={styles.rangeItem}>
                    <Ionicons name="arrow-up-circle" size={18} color="#F44336" />
                    <Text style={styles.rangeLabel}>{t('common.max')}</Text>
                    <Text style={styles.rangeValue}>{stats.max} {metricInfo.unit}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Gráfica */}
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('bodyProgress.evolution')}</Text>
              
              {chartData.datasets[0].data.length > 1 ? (
                <View style={styles.chartContainer}>
                  <LineChart
                    data={chartData}
                    width={width - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#1a1a1a',
                      backgroundGradientFrom: '#1a1a1a',
                      backgroundGradientTo: '#2a2a2a',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(${
                        selectedMetric === 'weight' 
                          ? '247, 147, 30' // #ffb300
                          : selectedMetric === 'bodyFat'
                          ? '244, 67, 54' // #F44336
                          : '76, 175, 80' // #4CAF50
                      }, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(153, 153, 153, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: metricInfo.color,
                      },
                      propsForBackgroundLines: {
                        strokeDasharray: '',
                        stroke: '#333',
                        strokeWidth: 1,
                      },
                    }}
                    bezier
                    style={styles.chart}
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    fromZero={false}
                  />
                </View>
              ) : (
                <View style={styles.noDataCard}>
                  <Ionicons name="bar-chart-outline" size={48} color="#666" />
                  {t('bodyProgress.needTwoMeasurements')}

                </View>
              )}
            </View>

            {/* Historial de mediciones */}
            <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('bodyProgress.history')}</Text>
            {metrics.slice().reverse().map((metric, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyDate}>
                    <Ionicons name="calendar" size={16} color="#ffb300" />
                    <Text style={styles.historyDateText}>
                      {new Date(metric.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyValues}>
                    <View style={styles.historyValue}>
                    <Text style={styles.historyValueLabel}>{t('metrics.weight')}</Text>
                    <Text style={styles.historyValueText}>{formatWeight(metric.weight_kg, weightUnit, 1)}</Text>
                    </View>
                    {metric.body_fat_percentage && (
                      <View style={styles.historyValue}>
<Text style={styles.historyValueLabel}>{t('metrics.fat')}</Text>
<Text style={styles.historyValueText}>{metric.body_fat_percentage}%</Text>
                      </View>
                    )}
                    {metric.muscle_percentage && (
                      <View style={styles.historyValue}>
<Text style={styles.historyValueLabel}>{t('metrics.muscle')}</Text>
<Text style={styles.historyValueText}>{metric.muscle_percentage}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Botón flotante para agregar medición */}
      {!loading && metrics.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/register-weight' as any)}
        >
          <Ionicons name="add" size={28} color="#1a1a1a" />
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffb300',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  periodButtonActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  periodButtonTextActive: {
    color: '#1a1a1a',
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  metricButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  metricButtonActive: {
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 4,
  },
  metricButtonTextActive: {
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  rangeCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  rangeItem: {
    flex: 1,
    alignItems: 'center',
  },
  rangeDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  historyValues: {
    flexDirection: 'row',
    gap: 16,
  },
  historyValue: {
    flex: 1,
  },
  historyValueLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  historyValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

