import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface StepData {
  label: string;
  value: number;
  date?: Date;
}

export default function StepsDetailScreen() {
  const { user } = useUser();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stepsData, setStepsData] = useState<StepData[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [averageSteps, setAverageSteps] = useState(0);
  const [goalSteps] = useState(10000);

  // Cargar datos de pasos según el modo de vista
  useEffect(() => {
    loadStepsData();
  }, [viewMode, currentDate]);

  const loadStepsData = () => {
    // Aquí integraremos con el servicio de salud más adelante
    // Por ahora usamos datos simulados
    const data = generateMockData();
    setStepsData(data);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    setTotalSteps(total);
    setAverageSteps(Math.round(total / (data.length || 1)));
  };

  const generateMockData = (): StepData[] => {
    switch (viewMode) {
      case 'day':
        // Datos por hora del día - solo mostrar algunas etiquetas clave
        return Array.from({ length: 24 }, (_, i) => {
          let label = '';
          // Solo mostrar 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
          if (i % 3 === 0) {
            label = `${i}:00`;
          }
          return {
            label,
            value: Math.floor(Math.random() * 1000),
          };
        });

      case 'week':
        // Datos por día de la semana
        // Ojo: tus labels eran ES (D L M M J V S). Los dejamos como estaban.
        // Si querés, después los hacemos dependientes del locale.
        const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        return weekDays.map((day, i) => ({
          label: day,
          value: i === 5 ? 187 : Math.floor(Math.random() * 5000), // Viernes tiene datos reales
        }));

      case 'month':
        // Datos por día del mes
        const daysInMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => ({
          label: `${i + 1}`,
          value: Math.floor(Math.random() * 8000),
        }));

      case 'year':
        // Datos por mes del año (tus labels eran ES: E F M A M J J A S O N D)
        const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        return months.map((month) => ({
          label: month,
          value: Math.floor(Math.random() * 150000),
        }));

      default:
        return [];
    }
  };

  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const formatPeriod = () => {
    const now = new Date();
    const isToday = currentDate.toDateString() === now.toDateString();

    switch (viewMode) {
      case 'day': {
        if (isToday) return t('stepsDetail.period.today');

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (currentDate.toDateString() === yesterday.toDateString()) return t('stepsDetail.period.yesterday');

        // Mantengo tu formato original pero con locale configurable
        return currentDate.toLocaleDateString(t('common.locale'), {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });
      }

      case 'week': {
        const currentDay = currentDate.getDay();
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDay);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const nowDay = now.getDay();
        const nowWeekStart = new Date(now);
        nowWeekStart.setDate(now.getDate() - nowDay);

        if (weekStart.toDateString() === nowWeekStart.toDateString()) {
          return t('stepsDetail.period.thisWeek');
        }

        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekStart.toLocaleDateString(t('common.locale'), { month: 'short' })}`;
        } else {
          return `${weekStart.getDate()} ${weekStart.toLocaleDateString(t('common.locale'), { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString(t('common.locale'), { month: 'short' })}`;
        }
      }

      case 'month': {
        if (
          currentDate.getFullYear() === now.getFullYear() &&
          currentDate.getMonth() === now.getMonth()
        ) {
          return t('stepsDetail.period.thisMonth');
        }
        return currentDate.toLocaleDateString(t('common.locale'), { month: 'long', year: 'numeric' });
      }

      case 'year': {
        if (currentDate.getFullYear() === now.getFullYear()) {
          return t('stepsDetail.period.thisYear');
        }
        return currentDate.getFullYear().toString();
      }

      default:
        return '';
    }
  };

  const isCurrentPeriod = () => {
    const now = new Date();

    switch (viewMode) {
      case 'day':
        return currentDate.toDateString() === now.toDateString();

      case 'week': {
        const nowDay = now.getDay();
        const nowWeekStart = new Date(now);
        nowWeekStart.setDate(now.getDate() - nowDay);
        nowWeekStart.setHours(0, 0, 0, 0);

        const currentDay = currentDate.getDay();
        const currentWeekStart = new Date(currentDate);
        currentWeekStart.setDate(currentDate.getDate() - currentDay);
        currentWeekStart.setHours(0, 0, 0, 0);

        return nowWeekStart.getTime() === currentWeekStart.getTime();
      }

      case 'month':
        return currentDate.getFullYear() === now.getFullYear() &&
               currentDate.getMonth() === now.getMonth();

      case 'year':
        return currentDate.getFullYear() === now.getFullYear();

      default:
        return false;
    }
  };

  const getUnitLabel = () => {
    // En tu código había un typo en year: "paso al día"
    // Lo pasamos a t() para corregir por idioma.
    switch (viewMode) {
      case 'day':
      case 'week':
      case 'month':
        return t('stepsDetail.unit.avgStepsPerDay');
      case 'year':
        return t('stepsDetail.unit.avgStepsPerDay'); // mismo texto
      default:
        return t('stepsDetail.unit.steps');
    }
  };

  const getStatusText = () => {
    const locale = t('common.locale');
    if (viewMode === 'day') {
      const remaining = goalSteps - totalSteps;
      if (remaining > 0) {
        return t('stepsDetail.status.remaining', {
          remaining: remaining.toLocaleString(locale),
        });      }
      return t('stepsDetail.status.achieved');
    }
    return t('stepsDetail.status.totalSoFar', {
      total: totalSteps.toLocaleString(locale),
    });
  };

  const renderChart = () => {
    const maxValue = Math.max(...stepsData.map(d => d.value), goalSteps);
    const chartHeight = 220;

    const getBarWidth = () => {
      switch (viewMode) {
        case 'day':
          return 24;
        case 'week':
          return 40;
        case 'month':
          return 14;
        case 'year':
          return 35;
        default:
          return 30;
      }
    };

    const barWidth = getBarWidth();
    const barSpacing = viewMode === 'day' ? 4 : 8;
    const totalWidth = stepsData.length * (barWidth + barSpacing) + 40;
    const shouldScroll = totalWidth > width - 40;

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{(maxValue / 1000).toFixed(0)}k</Text>
          <Text style={styles.yAxisLabel}>{(maxValue / 2000).toFixed(0)}k</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>

        <View style={styles.chartContainer}>
          {(viewMode === 'day' || viewMode === 'week') && (
            <View style={[styles.goalLine, { top: 10 + (chartHeight * (1 - goalSteps / maxValue)) }]}>
              <View style={styles.goalLineDashed} />
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={shouldScroll}
            contentContainerStyle={[
              styles.chartContent,
              !shouldScroll && { flex: 1, justifyContent: 'space-around' }
            ]}
          >
            {stepsData.map((item, index) => {
              const barHeight = (item.value / maxValue) * chartHeight;
              const isToday = viewMode === 'week' && index === 5; // Viernes
              const isCurrentMonth = viewMode === 'year' && index === 9; // Octubre
              const isCurrentHour = viewMode === 'day' && index === 8; // 8:00 destacado

              return (
                <View
                  key={index}
                  style={[
                    styles.barContainer,
                    {
                      width: barWidth,
                      marginHorizontal: barSpacing / 2
                    }
                  ]}
                >
                  <View style={[
                    styles.bar,
                    { height: Math.max(barHeight, 3) },
                    (isToday || isCurrentMonth || isCurrentHour) && styles.barHighlighted
                  ]} />
                  <View style={styles.labelContainer}>
                    {item.label && (
                      <Text style={[
                        styles.barLabel,
                        viewMode === 'day' && { fontSize: 10 }
                      ]}>
                        {item.label}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderPeriodSummary = () => {
    if (viewMode === 'week') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t('stepsDetail.summary.thisWeekTitle')}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.today')}</Text>
            <Text style={styles.summaryValue}>187</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.yesterday')}</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.sampleDateWeek')}</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>
      );
    }

    if (viewMode === 'month') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t('stepsDetail.summary.sampleMonthTitle')}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.thisWeek')}</Text>
            <Text style={styles.summaryValue}>31</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.sampleRange1')}</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.sampleRange2')}</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>
      );
    }

    if (viewMode === 'year') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t('stepsDetail.summary.sampleYearTitle')}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.sampleMonth1')}</Text>
            <Text style={styles.summaryValue}>11</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.sampleMonth2')}</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('stepsDetail.summary.sampleMonth3')}</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard' as any)}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('stepsDetail.title')}</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Tabs: Day / Week / Month / Year */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'day' && styles.tabActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.tabText, viewMode === 'day' && styles.tabTextActive]}>
              {t('stepsDetail.tabs.day')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, viewMode === 'week' && styles.tabActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.tabText, viewMode === 'week' && styles.tabTextActive]}>
              {t('stepsDetail.tabs.week')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, viewMode === 'month' && styles.tabActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.tabText, viewMode === 'month' && styles.tabTextActive]}>
              {t('stepsDetail.tabs.month')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, viewMode === 'year' && styles.tabActive]}
            onPress={() => setViewMode('year')}
          >
            <Text style={[styles.tabText, viewMode === 'year' && styles.tabTextActive]}>
              {t('stepsDetail.tabs.year')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Period navigation */}
          <View style={styles.periodNav}>
            <TouchableOpacity onPress={goToPreviousPeriod}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>

            <Text style={styles.periodText}>{formatPeriod()}</Text>

            {!isCurrentPeriod() ? (
              <TouchableOpacity onPress={goToNextPeriod}>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          {/* Main stat */}
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>
              {averageSteps.toLocaleString(t('common.locale'))}
            </Text>
            <Text style={styles.statsLabel}>{getUnitLabel()}</Text>
            <Text style={styles.statsSubtext}>{getStatusText()}</Text>
          </View>

          {/* Chart */}
          {renderChart()}

          {/* Summary */}
          {renderPeriodSummary()}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ffb300',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  tabTextActive: {
    color: '#ffb300',
    fontWeight: '600',
  },
  periodNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  statsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  chartWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 40,
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 30,
    marginRight: 8,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  goalLineDashed: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 4,
    minHeight: 280,
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 260,
    position: 'relative',
  },
  bar: {
    width: '100%',
    backgroundColor: '#ffb300',
    borderRadius: 4,
  },
  barHighlighted: {
    backgroundColor: '#00FFD1',
  },
  labelContainer: {
    position: 'absolute',
    bottom: -25,
    width: '100%',
    alignItems: 'center',
    height: 20,
  },
  barLabel: {
    fontSize: 11,
    color: '#999',
  },
  summarySection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
