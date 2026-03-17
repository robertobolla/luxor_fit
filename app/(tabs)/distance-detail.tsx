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
import { useUnitsStore, formatDistance, conversions } from '../../src/store/unitsStore';
import { getHealthDataForDate } from '@/services/healthService';
import { getHealthDataFromSupabase } from '@/services/healthSyncService';

const { width } = Dimensions.get('window');

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface DistanceData {
  label: string;
  value: number; // always in km
  date?: Date;
}

export default function DistanceDetailScreen() {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const { distanceUnit } = useUnitsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [distanceData, setDistanceData] = useState<DistanceData[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [averageDistance, setAverageDistance] = useState(0);
  const [goalDistance] = useState(8.05); // Meta en km (5 millas)
  const [isLoading, setIsLoading] = useState(false);

  const locale = i18n.language?.startsWith('es') ? 'es-ES' : 'en-US';
  const distUnitLabel = distanceUnit === 'km' ? 'km' : 'mi';
  const toUserUnit = (km: number) => distanceUnit === 'mi' ? conversions.kmToMi(km) : km;

  useEffect(() => {
    loadDistanceData();
  }, [viewMode, currentDate]);

  useFocusEffect(
    useCallback(() => {
      loadDistanceData();
    }, [viewMode, currentDate])
  );

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
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

  // ── Load data ────────────────────────────────────────────────────────────

  const loadDistanceData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      switch (viewMode) {
        case 'day': await loadDayData(); break;
        case 'week': await loadWeekData(); break;
        case 'month': await loadMonthData(); break;
        case 'year': await loadYearData(); break;
      }
    } catch (error) {
      console.error('Error loading distance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDayData = async () => {
    const healthData = await getHealthDataForDate(currentDate);
    const dayDistance = healthData.distance || 0;
    setDistanceData([{ label: t('common.today'), value: dayDistance }]);
    setTotalDistance(dayDistance);
    setAverageDistance(dayDistance);
  };

  const loadWeekData = async () => {
    if (!user?.id) return;
    const { start, end } = getWeekRange(currentDate);
    const result = await getHealthDataFromSupabase(user.id, dateToStr(start), dateToStr(end));

    const distMap: Record<string, number> = {};
    if (result.success && result.data) {
      result.data.forEach((row: any) => { distMap[row.date] = row.distance_km || 0; });
    }

    const today = new Date();
    const todayStr = dateToStr(today);
    if (todayStr >= dateToStr(start) && todayStr <= dateToStr(end)) {
      const live = await getHealthDataForDate(today);
      distMap[todayStr] = live.distance || 0;
    }

    const weekDays = t('common.weekDaysShort', { returnObjects: true }) as string[];
    const data: DistanceData[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      data.push({ label: weekDays[i] || `D${i + 1}`, value: distMap[dateToStr(d)] || 0, date: d });
    }

    const total = data.reduce((s, d) => s + d.value, 0);
    const daysWithData = data.filter(d => d.value > 0).length || 1;
    setDistanceData(data);
    setTotalDistance(total);
    setAverageDistance(total / daysWithData);
  };

  const loadMonthData = async () => {
    if (!user?.id) return;
    const { start, end } = getMonthRange(currentDate);
    const result = await getHealthDataFromSupabase(user.id, dateToStr(start), dateToStr(end));

    const distMap: Record<string, number> = {};
    if (result.success && result.data) {
      result.data.forEach((row: any) => { distMap[row.date] = row.distance_km || 0; });
    }

    const today = new Date();
    const todayStr = dateToStr(today);
    if (todayStr >= dateToStr(start) && todayStr <= dateToStr(end)) {
      const live = await getHealthDataForDate(today);
      distMap[todayStr] = live.distance || 0;
    }

    const daysInMonth = end.getDate();
    const data: DistanceData[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), i);
      data.push({ label: (i === 1 || i % 5 === 0) ? `${i}` : '', value: distMap[dateToStr(d)] || 0, date: d });
    }

    const total = data.reduce((s, d) => s + d.value, 0);
    const daysWithData = data.filter(d => d.value > 0).length || 1;
    setDistanceData(data);
    setTotalDistance(total);
    setAverageDistance(total / daysWithData);
  };

  const loadYearData = async () => {
    if (!user?.id) return;
    const { start, end } = getYearRange(currentDate);
    const result = await getHealthDataFromSupabase(user.id, dateToStr(start), dateToStr(end));

    const monthTotals = Array(12).fill(0);
    const monthDays = Array(12).fill(0);
    if (result.success && result.data) {
      result.data.forEach((row: any) => {
        const m = new Date(row.date).getMonth();
        monthTotals[m] += row.distance_km || 0;
        monthDays[m] += 1;
      });
    }

    const today = new Date();
    if (today.getFullYear() === currentDate.getFullYear()) {
      const live = await getHealthDataForDate(today);
      const m = today.getMonth();
      monthTotals[m] += live.distance || 0;
      if (monthDays[m] === 0) monthDays[m] = 1;
    }

    const months = t('common.monthsShort', { returnObjects: true }) as string[];
    const data: DistanceData[] = months.map((month, i) => ({ label: month, value: monthTotals[i] }));

    const total = monthTotals.reduce((s, v) => s + v, 0);
    const totalDays = monthDays.reduce((s, v) => s + v, 0) || 1;
    setDistanceData(data);
    setTotalDistance(total);
    setAverageDistance(total / totalDays);
  };

  // ── Navigation ───────────────────────────────────────────────────────────

  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day': newDate.setDate(newDate.getDate() - 1); break;
      case 'week': newDate.setDate(newDate.getDate() - 7); break;
      case 'month': newDate.setMonth(newDate.getMonth() - 1); break;
      case 'year': newDate.setFullYear(newDate.getFullYear() - 1); break;
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day': newDate.setDate(newDate.getDate() + 1); break;
      case 'week': newDate.setDate(newDate.getDate() + 7); break;
      case 'month': newDate.setMonth(newDate.getMonth() + 1); break;
      case 'year': newDate.setFullYear(newDate.getFullYear() + 1); break;
    }
    setCurrentDate(newDate);
  };

  const formatPeriod = () => {
    const now = new Date();
    const isToday = currentDate.toDateString() === now.toDateString();

    switch (viewMode) {
      case 'day': {
        if (isToday) return t('common.today');
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (currentDate.toDateString() === yesterday.toDateString()) return t('common.yesterday');
        return currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
      }
      case 'week': {
        const { start, end } = getWeekRange(currentDate);
        const { start: nowWeekStart } = getWeekRange(now);
        if (start.toDateString() === nowWeekStart.toDateString()) return t('common.thisWeek');
        const startMonth = start.toLocaleDateString(locale, { month: 'short' });
        const endMonth = end.toLocaleDateString(locale, { month: 'short' });
        if (start.getMonth() === end.getMonth()) {
          return `${start.getDate()} – ${end.getDate()} ${startMonth}`;
        }
        return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
      }
      case 'month': {
        if (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()) return t('common.thisMonth');
        return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      }
      case 'year': {
        if (currentDate.getFullYear() === now.getFullYear()) return t('common.thisYear');
        return currentDate.getFullYear().toString();
      }
      default: return '';
    }
  };

  const isCurrentPeriod = () => {
    const now = new Date();
    switch (viewMode) {
      case 'day': return currentDate.toDateString() === now.toDateString();
      case 'week': {
        const { start } = getWeekRange(currentDate);
        const { start: nws } = getWeekRange(now);
        return start.toDateString() === nws.toDateString();
      }
      case 'month': return currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();
      case 'year': return currentDate.getFullYear() === now.getFullYear();
      default: return false;
    }
  };

  const getUnitLabel = () => {
    const goalInUserUnit = toUserUnit(goalDistance);
    return `${t('common.of')} ${goalInUserUnit.toFixed(1)} ${distUnitLabel}`;
  };

  const getStatusText = () => {
    if (viewMode === 'day') {
      const remaining = goalDistance - totalDistance;
      if (remaining > 0) {
        return t('distance.dailyGoalRemaining', { distance: toUserUnit(remaining).toFixed(2), unit: distUnitLabel });
      }
      return t('distance.dailyGoalAchieved');
    }
    return t('distance.totalDistanceSoFar', { distance: toUserUnit(totalDistance).toFixed(2), unit: distUnitLabel });
  };

  // ── Chart ────────────────────────────────────────────────────────────────

  const renderChart = () => {
    const maxValue = Math.max(...distanceData.map(d => d.value), goalDistance) || 1;
    const chartHeight = 260;

    let barWidth = 28, barSpacing = 12;
    if (viewMode === 'day') { barWidth = 20; barSpacing = 6; }
    else if (viewMode === 'month') { barWidth = 12; barSpacing = 3; }
    else if (viewMode === 'year') { barWidth = 20; barSpacing = 8; }

    const todayStr = dateToStr(new Date());

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{toUserUnit(maxValue).toFixed(1)}</Text>
          <Text style={styles.yAxisLabel}>{toUserUnit(maxValue / 2).toFixed(1)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>

        <View style={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartContent}>
            <View style={styles.goalLine} />
            {distanceData.map((item, index) => {
              const barHeight = (item.value / maxValue) * chartHeight;
              const isHighlighted =
                (viewMode === 'week' && item.date && dateToStr(item.date) === todayStr) ||
                (viewMode === 'year' && index === new Date().getMonth() && isCurrentPeriod()) ||
                (viewMode === 'day' && item.value > 0);

              return (
                <View key={index} style={[styles.barContainer, { width: barWidth, marginRight: barSpacing }]}>
                  <View style={[styles.bar, { height: Math.max(barHeight, 2) }, isHighlighted && styles.barHighlighted]} />
                  {item.label ? (
                    <View style={styles.labelContainer}>
                      <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                  ) : null}
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
    const nonZero = distanceData.filter(d => d.value > 0);
    if (nonZero.length === 0) return null;

    if (viewMode === 'week') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{t('common.thisWeek')}</Text>
          {distanceData.filter(d => d.value > 0).reverse().slice(0, 5).map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.date ? item.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }) : item.label}
              </Text>
              <Text style={styles.summaryValue}>{toUserUnit(item.value).toFixed(2)} {distUnitLabel}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (viewMode === 'month') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{currentDate.toLocaleDateString(locale, { month: 'long' })}</Text>
          {distanceData.filter(d => d.value > 0).reverse().slice(0, 7).map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.date ? item.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : item.label}
              </Text>
              <Text style={styles.summaryValue}>{toUserUnit(item.value).toFixed(2)} {distUnitLabel}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (viewMode === 'year') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>{currentDate.getFullYear()}</Text>
          {distanceData.filter(d => d.value > 0).map((month, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{month.label}</Text>
              <Text style={styles.summaryValue}>{toUserUnit(month.value).toFixed(2)} {distUnitLabel}</Text>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/progress' as any)}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('distance.title')}</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
            <TouchableOpacity key={mode} style={[styles.tab, viewMode === mode && styles.tabActive]} onPress={() => setViewMode(mode)}>
              <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>{t(`common.${mode}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
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

          <View style={styles.statsCard}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#ffb300" />
            ) : (
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statsNumber}>
                    {toUserUnit(viewMode === 'day' ? totalDistance : averageDistance).toFixed(2)}
                  </Text>
                  <Text style={styles.statsLabel}>{getUnitLabel()}</Text>
                  <Text style={styles.statsSubtext}>{getStatusText()}</Text>
                </View>
                <View style={styles.progressCircle}>
                  <Ionicons name="location" size={40} color="#ffb300" />
                </View>
              </View>
            )}
          </View>

          {!isLoading && renderChart()}
          {!isLoading && renderPeriodSummary()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  content: { flex: 1 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 20, backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  tab: { paddingVertical: 10, paddingHorizontal: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#ffb300' },
  tabText: { fontSize: 16, color: '#999' },
  tabTextActive: { color: '#ffb300', fontWeight: '600' },
  periodNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, marginBottom: 20 },
  periodText: { fontSize: 18, fontWeight: '600', color: '#ffffff', textTransform: 'capitalize' },
  statsCard: { backgroundColor: '#2a2a2a', borderRadius: 16, padding: 24, marginHorizontal: 20, marginBottom: 24, minHeight: 120, justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsNumber: { fontSize: 48, fontWeight: 'bold', color: '#ffffff' },
  statsLabel: { fontSize: 16, color: '#999', marginTop: 4 },
  statsSubtext: { fontSize: 14, color: '#666', marginTop: 12, maxWidth: width * 0.5 },
  progressCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1f3d37', justifyContent: 'center', alignItems: 'center' },
  chartWrapper: { flexDirection: 'row', paddingLeft: 20, marginBottom: 24 },
  yAxisLabels: { justifyContent: 'space-between', paddingRight: 8, height: 260 },
  yAxisLabel: { fontSize: 12, color: '#666' },
  chartContainer: { flex: 1, position: 'relative' },
  goalLine: { position: 'absolute', left: 0, right: 0, bottom: 30, height: 1, backgroundColor: '#ffb300', opacity: 0.5 },
  chartContent: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 30, paddingHorizontal: 4, height: 290 },
  barContainer: { alignItems: 'center', justifyContent: 'flex-end', height: 260, position: 'relative' },
  bar: { width: '100%', backgroundColor: '#ffb300', borderRadius: 3, minHeight: 2 },
  barHighlighted: { backgroundColor: '#00FFD1' },
  labelContainer: { position: 'absolute', bottom: -24, width: 40, alignItems: 'center', height: 20, left: -14 },
  barLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  summarySection: { paddingHorizontal: 20, marginBottom: 24 },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  summaryLabel: { fontSize: 16, color: '#999' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});
