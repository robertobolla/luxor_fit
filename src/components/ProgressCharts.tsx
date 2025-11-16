import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { ProgressDataPoint, MacroDataPoint, ProgressComparison } from '../services/progressService';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

interface BodyMetricsChartProps {
  data: ProgressDataPoint[];
  title?: string;
}

export const BodyMetricsChart = React.memo(function BodyMetricsChart({ data, title = 'Peso y Composición' }: BodyMetricsChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart" size={48} color="#666" />
          <Text style={styles.emptyText}>No hay datos suficientes</Text>
          <Text style={styles.emptySubtext}>Registra mediciones para ver tu progreso</Text>
        </View>
      </View>
    );
  }

  // Preparar datos para el gráfico
  const dates = data.map((d) => {
    const date = new Date(d.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  const weightData = data.map((d) => d.weight || 0);
  const bodyFatData = data.map((d) => d.bodyFat || 0);
  const muscleData = data.map((d) => d.muscle || 0);

  // Determinar qué datos mostrar
  const hasBodyFat = bodyFatData.some((v) => v > 0);
  const hasMuscle = muscleData.some((v) => v > 0);

  const datasets = [
    {
      data: weightData,
      color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
      strokeWidth: 2,
    },
  ];

  if (hasBodyFat) {
    datasets.push({
      data: bodyFatData.map((v) => v * 2), // Escalar para visualización
      color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
      strokeWidth: 2,
    });
  }

  if (hasMuscle) {
    datasets.push({
      data: muscleData.map((v) => v * 2), // Escalar para visualización
      color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
      strokeWidth: 2,
    });
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels: dates,
            datasets,
          }}
          width={Math.max(chartWidth, dates.length * 40)}
          height={220}
          yAxisLabel=""
          yAxisSuffix={hasBodyFat || hasMuscle ? '' : ' kg'}
          chartConfig={{
            backgroundColor: '#2a2a2a',
            backgroundGradientFrom: '#2a2a2a',
            backgroundGradientTo: '#2a2a2a',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#ffb300',
            },
          }}
          bezier
          style={styles.chart}
        />
      </ScrollView>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#ffb300' }]} />
          <Text style={styles.legendText}>Peso (kg)</Text>
        </View>
        {hasBodyFat && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF6384' }]} />
            <Text style={styles.legendText}>Grasa (%)</Text>
          </View>
        )}
        {hasMuscle && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#36A2EB' }]} />
            <Text style={styles.legendText}>Músculo (%)</Text>
          </View>
        )}
      </View>
    </View>
  );
});

interface MacrosChartProps {
  data: MacroDataPoint[];
  title?: string;
}

export const MacrosChart = React.memo(function MacrosChart({ data, title = 'Macronutrientes' }: MacrosChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.emptyState}>
          <Ionicons name="restaurant" size={48} color="#666" />
          <Text style={styles.emptyText}>No hay datos de macros</Text>
          <Text style={styles.emptySubtext}>Registra comidas para ver tu progreso</Text>
        </View>
      </View>
    );
  }

  // Agrupar por semana para mejor visualización
  const weeklyData: {
    week: string;
    protein: number;
    carbs: number;
    fats: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
  }[] = [];

  const weekMap = new Map<string, typeof weeklyData[0]>();

  data.forEach((point) => {
    const date = new Date(point.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        protein: 0,
        carbs: 0,
        fats: 0,
        targetProtein: 0,
        targetCarbs: 0,
        targetFats: 0,
        count: 0,
      } as any);
    }

    const weekData = weekMap.get(weekKey)!;
    weekData.protein += point.protein;
    weekData.carbs += point.carbs;
    weekData.fats += point.fats;
    if (point.targetProtein) weekData.targetProtein += point.targetProtein;
    if (point.targetCarbs) weekData.targetCarbs += point.targetCarbs;
    if (point.targetFats) weekData.targetFats += point.targetFats;
    (weekData as any).count++;
  });

  weeklyData.push(...Array.from(weekMap.values()));

  // Promediar valores
  weeklyData.forEach((week) => {
    const count = (week as any).count || 1;
    week.protein = Math.round(week.protein / count);
    week.carbs = Math.round(week.carbs / count);
    week.fats = Math.round(week.fats / count);
    week.targetProtein = Math.round(week.targetProtein / count);
    week.targetCarbs = Math.round(week.targetCarbs / count);
    week.targetFats = Math.round(week.targetFats / count);
    delete (week as any).count;
  });

  const labels = weeklyData.map((w) => w.week);
  const proteinData = weeklyData.map((w) => w.protein);
  const carbsData = weeklyData.map((w) => w.carbs);
  const fatsData = weeklyData.map((w) => w.fats);

  // Para BarChart, necesitamos mostrar cada macro por separado o usar un formato diferente
  // Usaremos un gráfico de líneas múltiples para mostrar las tres líneas
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{
            labels,
            datasets: [
              {
                data: proteinData,
                color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: carbsData,
                color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: fatsData,
                color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
                strokeWidth: 2,
              },
            ],
          }}
          width={Math.max(chartWidth, labels.length * 60)}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" g"
          chartConfig={{
            backgroundColor: '#2a2a2a',
            backgroundGradientFrom: '#2a2a2a',
            backgroundGradientTo: '#2a2a2a',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#333',
            },
          }}
          bezier
          style={styles.chart}
        />
      </ScrollView>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF6384' }]} />
          <Text style={styles.legendText}>Proteína</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FFCE56' }]} />
          <Text style={styles.legendText}>Carbohidratos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4BC0C0' }]} />
          <Text style={styles.legendText}>Grasas</Text>
        </View>
      </View>
    </View>
  );
});

interface ProgressComparisonCardProps {
  comparison: ProgressComparison;
}

export const ProgressComparisonCard = React.memo(function ProgressComparisonCard({ comparison }: ProgressComparisonCardProps) {
  const { current, previous, period } = comparison;

  const formatChange = (value?: number, unit: string = '') => {
    if (value === undefined || value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}${unit}`;
  };

  const getChangeColor = (value?: number) => {
    if (value === undefined || value === null) return '#666';
    if (value > 0) return '#ffb300';
    if (value < 0) return '#FF6384';
    return '#999';
  };

  return (
    <View style={styles.comparisonContainer}>
      <Text style={styles.comparisonTitle}>
        Comparación {period === 'week' ? 'Semanal' : 'Mensual'}
      </Text>
      
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Peso</Text>
          <Text style={styles.comparisonValue}>
            {current.avgWeight?.toFixed(1) || 'N/A'} kg
          </Text>
          <Text
            style={[
              styles.comparisonChange,
              { color: getChangeColor(current.weightChange) },
            ]}
          >
            {formatChange(current.weightChange, ' kg')}
          </Text>
        </View>

        {current.avgBodyFat !== undefined && (
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Grasa</Text>
            <Text style={styles.comparisonValue}>
              {current.avgBodyFat.toFixed(1)}%
            </Text>
            <Text
              style={[
                styles.comparisonChange,
                { color: getChangeColor(-current.bodyFatChange) },
              ]}
            >
              {formatChange(
                current.bodyFatChange ? -current.bodyFatChange : undefined,
                '%'
              )}
            </Text>
          </View>
        )}

        {current.avgMuscle !== undefined && (
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Músculo</Text>
            <Text style={styles.comparisonValue}>
              {current.avgMuscle.toFixed(1)}%
            </Text>
            <Text
              style={[
                styles.comparisonChange,
                { color: getChangeColor(current.muscleChange) },
              ]}
            >
              {formatChange(current.muscleChange, '%')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

interface ProgressIndicatorProps {
  title: string;
  current: number;
  target: number;
  progress: number;
  unit?: string;
  direction?: 'lose' | 'gain' | 'maintain';
}

export const ProgressIndicator = React.memo(function ProgressIndicator({
  title,
  current,
  target,
  progress,
  unit = '',
  direction = 'maintain',
}: ProgressIndicatorProps) {
  const isPositive = direction === 'gain' ? progress >= 0 : direction === 'lose' ? progress <= 0 : true;

  return (
    <View style={styles.indicatorContainer}>
      <View style={styles.indicatorHeader}>
        <Text style={styles.indicatorTitle}>{title}</Text>
        <Text style={styles.indicatorProgress}>{Math.round(progress)}%</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: isPositive ? '#ffb300' : '#FF6384',
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.indicatorValues}>
        <Text style={styles.indicatorValue}>
          Actual: {current.toFixed(1)}{unit}
        </Text>
        <Text style={styles.indicatorValue}>
          Objetivo: {target.toFixed(1)}{unit}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#ccc',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  comparisonContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  comparisonChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  indicatorProgress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#3a3a3a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  indicatorValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indicatorValue: {
    fontSize: 14,
    color: '#999',
  },
});

