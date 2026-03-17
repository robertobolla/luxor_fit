import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { getHealthDataForDate } from '@/services/healthService';
import { getHealthDataFromSupabase } from '@/services/healthSyncService';

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
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos de pasos según el modo de vista
  useEffect(() => {
    loadStepsData();
  }, [viewMode, currentDate]);

  // Recargar al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadStepsData();
    }, [viewMode, currentDate])
  );

  // ── Helpers para obtener rangos de fechas ────────────────────────────────

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Dom, 1=Lun...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
  };

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const getYearRange = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  };

  const dateToStr = (d: Date) => d.toISOString().split('T')[0];

  // ── Load steps data ──────────────────────────────────────────────────────

  const loadStepsData = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      switch (viewMode) {
        case 'day':
          await loadDayData();
          break;
        case 'week':
          await loadWeekData();
          break;
        case 'month':
          await loadMonthData();
          break;
        case 'year':
          await loadYearData();
          break;
      }
    } catch (error) {
      console.error('Error loading steps data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Day: call getHealthDataForDate (same source as dashboard) ────────────

  const loadDayData = async () => {
    const healthData = await getHealthDataForDate(currentDate);
    const daySteps = Math.round(healthData.steps || 0);

    // Para la vista de día, mostramos una sola barra con el total del día
    // (no tenemos datos por hora desde la API)
    const now = new Date();
    const currentHour = currentDate.toDateString() === now.toDateString()
      ? now.getHours()
      : 23;

    const data: StepData[] = Array.from({ length: 24 }, (_, i) => {
      let label = '';
      if (i % 3 === 0) {
        label = `${i}:00`;
      }
      // Distribute steps roughly: show them up to the current hour
      // Since we only have a daily total, we approximate by placing the total
      // in a single bar at the current hour, or spread evenly
      return {
        label,
        value: 0,
      };
    });

    // Place the total steps at the current hour for visual reference
    if (daySteps > 0 && currentHour >= 0 && currentHour < 24) {
      data[currentHour] = {
        ...data[currentHour],
        value: daySteps,
      };
    }

    setStepsData(data);
    setTotalSteps(daySteps);
    setAverageSteps(daySteps);
  };

  // ── Week: fetch 7 days from Supabase ─────────────────────────────────────

  const loadWeekData = async () => {
    if (!user?.id) return;

    const { start, end } = getWeekRange(currentDate);
    const startStr = dateToStr(start);
    const endStr = dateToStr(end);

    const result = await getHealthDataFromSupabase(user.id, startStr, endStr);
    const weekDays = t('stepsDetail.weekDays', { returnObjects: true }) as string[];

    // Build a map date -> steps
    const stepsMap: Record<string, number> = {};
    if (result.success && result.data) {
      result.data.forEach((row: any) => {
        stepsMap[row.date] = row.steps || 0;
      });
    }

    // Also fetch today's steps live (in case not yet synced)
    const today = new Date();
    const todayStr = dateToStr(today);
    if (todayStr >= startStr && todayStr <= endStr) {
      const liveData = await getHealthDataForDate(today);
      stepsMap[todayStr] = Math.round(liveData.steps || 0);
    }

    const data: StepData[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = dateToStr(d);
      data.push({
        label: weekDays[i] || `D${i + 1}`,
        value: stepsMap[dStr] || 0,
        date: d,
      });
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const daysWithData = data.filter(d => d.value > 0).length || 1;
    setStepsData(data);
    setTotalSteps(total);
    setAverageSteps(Math.round(total / daysWithData));
  };

  // ── Month: fetch all days in month from Supabase ─────────────────────────

  const loadMonthData = async () => {
    if (!user?.id) return;

    const { start, end } = getMonthRange(currentDate);
    const startStr = dateToStr(start);
    const endStr = dateToStr(end);

    const result = await getHealthDataFromSupabase(user.id, startStr, endStr);

    const stepsMap: Record<string, number> = {};
    if (result.success && result.data) {
      result.data.forEach((row: any) => {
        stepsMap[row.date] = row.steps || 0;
      });
    }

    // Today live
    const today = new Date();
    const todayStr = dateToStr(today);
    if (todayStr >= startStr && todayStr <= endStr) {
      const liveData = await getHealthDataForDate(today);
      stepsMap[todayStr] = Math.round(liveData.steps || 0);
    }

    const daysInMonth = end.getDate();
    const data: StepData[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), i);
      const dStr = dateToStr(d);
      data.push({
        label: `${i}`,
        value: stepsMap[dStr] || 0,
        date: d,
      });
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const daysWithData = data.filter(d => d.value > 0).length || 1;
    setStepsData(data);
    setTotalSteps(total);
    setAverageSteps(Math.round(total / daysWithData));
  };

  // ── Year: aggregate per month from Supabase ──────────────────────────────

  const loadYearData = async () => {
    if (!user?.id) return;

    const { start, end } = getYearRange(currentDate);
    const startStr = dateToStr(start);
    const endStr = dateToStr(end);

    const result = await getHealthDataFromSupabase(user.id, startStr, endStr);

    // Aggregate per month
    const monthTotals = Array(12).fill(0);
    const monthDays = Array(12).fill(0);
    if (result.success && result.data) {
      result.data.forEach((row: any) => {
        const d = new Date(row.date);
        const m = d.getMonth();
        monthTotals[m] += row.steps || 0;
        monthDays[m] += 1;
      });
    }

    // Today live
    const today = new Date();
    if (today.getFullYear() === currentDate.getFullYear()) {
      const todayStr = dateToStr(today);
      const liveData = await getHealthDataForDate(today);
      const todayMonth = today.getMonth();
      // Remove any existing entry for today and add live data
      monthTotals[todayMonth] = monthTotals[todayMonth] + Math.round(liveData.steps || 0);
      if (monthDays[todayMonth] === 0) monthDays[todayMonth] = 1;
    }

    const months = t('stepsDetail.months.short', { returnObjects: true }) as string[];
    const data: StepData[] = months.map((month, i) => ({
      label: month,
      value: monthTotals[i],
    }));

    const total = monthTotals.reduce((sum, v) => sum + v, 0);
    const totalDays = monthDays.reduce((sum, v) => sum + v, 0) || 1;
    setStepsData(data);
    setTotalSteps(total);
    setAverageSteps(Math.round(total / totalDays));
  };

  // ── Navigation ───────────────────────────────────────────────────────────

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

        return currentDate.toLocaleDateString(t('common.locale'), {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });
      }

      case 'week': {
        const { start, end } = getWeekRange(currentDate);
        const { start: nowWeekStart } = getWeekRange(now);

        if (start.toDateString() === nowWeekStart.toDateString()) {
          return t('stepsDetail.period.thisWeek');
        }

        if (start.getMonth() === end.getMonth()) {
          return `${start.getDate()} – ${end.getDate()} ${start.toLocaleDateString(t('common.locale'), { month: 'short' })}`;
        } else {
          return `${start.getDate()} ${start.toLocaleDateString(t('common.locale'), { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString(t('common.locale'), { month: 'short' })}`;
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
        const { start } = getWeekRange(currentDate);
        const { start: nowWeekStart } = getWeekRange(now);
        return start.toDateString() === nowWeekStart.toDateString();
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
    switch (viewMode) {
      case 'day':
        return t('stepsDetail.unit.steps');
      case 'week':
      case 'month':
      case 'year':
        return t('stepsDetail.unit.avgStepsPerDay');
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
        });
      }
      return t('stepsDetail.status.achieved');
    }
    return t('stepsDetail.status.totalSoFar', {
      total: totalSteps.toLocaleString(locale),
    });
  };

  // ── Chart ────────────────────────────────────────────────────────────────

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

    // Determine today's index to highlight
    const todayStr = dateToStr(new Date());

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{maxValue > 1000 ? `${(maxValue / 1000).toFixed(0)}k` : maxValue}</Text>
          <Text style={styles.yAxisLabel}>{maxValue > 1000 ? `${(maxValue / 2000).toFixed(0)}k` : Math.round(maxValue / 2)}</Text>
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
              const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;

              // Highlight logic
              const isHighlighted =
                (viewMode === 'week' && item.date && dateToStr(item.date) === todayStr) ||
                (viewMode === 'year' && index === new Date().getMonth() && isCurrentPeriod()) ||
                (viewMode === 'day' && item.value > 0);

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
                    isHighlighted && styles.barHighlighted
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

  // ── Summary ──────────────────────────────────────────────────────────────

  const renderPeriodSummary = () => {
    if (viewMode === 'day') return null;

    // Build summary rows from actual data
    const locale = t('common.locale');

    if (viewMode === 'week') {
      const weekDays = t('stepsDetail.weekDays', { returnObjects: true }) as string[];
      const summaryItems = stepsData
        .slice()
        .reverse()
        .filter(d => d.value > 0)
        .slice(0, 5);

      if (summaryItems.length === 0) return null;

      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t('stepsDetail.summary.thisWeekTitle')}</Text>
          {summaryItems.map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.date
                  ? item.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
                  : item.label}
              </Text>
              <Text style={styles.summaryValue}>{item.value.toLocaleString(locale)}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (viewMode === 'month') {
      // Show weekly totals for the month
      const weeksData: { label: string; value: number }[] = [];
      let weekTotal = 0;
      let weekStart = 1;
      stepsData.forEach((d, i) => {
        weekTotal += d.value;
        if ((i + 1) % 7 === 0 || i === stepsData.length - 1) {
          weeksData.push({
            label: `${weekStart} – ${i + 1}`,
            value: weekTotal,
          });
          weekTotal = 0;
          weekStart = i + 2;
        }
      });

      const nonZero = weeksData.filter(w => w.value > 0);
      if (nonZero.length === 0) return null;

      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>
            {currentDate.toLocaleDateString(locale, { month: 'long' })}
          </Text>
          {weeksData.map((week, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('stepsDetail.summary.days')} {week.label}</Text>
              <Text style={styles.summaryValue}>{week.value.toLocaleString(locale)}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (viewMode === 'year') {
      const nonZero = stepsData.filter(d => d.value > 0);
      if (nonZero.length === 0) return null;

      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{currentDate.getFullYear()}</Text>
          {stepsData
            .filter(d => d.value > 0)
            .map((month, i) => (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{month.label}</Text>
                <Text style={styles.summaryValue}>{month.value.toLocaleString(locale)}</Text>
              </View>
            ))}
        </View>
      );
    }

    return null;
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/progress' as any)}>
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
            {isLoading ? (
              <ActivityIndicator size="large" color="#ffb300" />
            ) : (
              <>
                <Text style={styles.statsNumber}>
                  {(viewMode === 'day' ? totalSteps : averageSteps).toLocaleString(t('common.locale'))}
                </Text>
                <Text style={styles.statsLabel}>{getUnitLabel()}</Text>
                <Text style={styles.statsSubtext}>{getStatusText()}</Text>
              </>
            )}
          </View>

          {/* Chart */}
          {!isLoading && renderChart()}

          {/* Summary */}
          {!isLoading && renderPeriodSummary()}

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
    minHeight: 120,
    justifyContent: 'center',
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
