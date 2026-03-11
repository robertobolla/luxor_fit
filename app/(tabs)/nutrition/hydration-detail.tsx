import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { getHydrationHistory, HydrationLog } from '../../../src/services/nutrition';

const { width } = Dimensions.get('window');

type ViewMode = 'week' | 'month';

interface HydrationChartData {
    label: string;
    value: number;
    date: string;
    fullDate: Date;
}

export default function HydrationDetailScreen() {
    const { user } = useUser();
    const { t } = useTranslation();

    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [chartData, setChartData] = useState<HydrationChartData[]>([]);
    const [logs, setLogs] = useState<HydrationLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const goalWater = 3000; // Meta diaria fija por ahora

    useEffect(() => {
        if (user?.id) {
            loadHydrationData();
        }
    }, [viewMode, currentDate, user?.id]);

    const loadHydrationData = async () => {
        if (!user?.id) return;
        setIsLoading(true);

        try {
            let startDateStr = '';
            let endDateStr = '';
            const now = new Date(currentDate);

            if (viewMode === 'week') {
                const currentDay = now.getDay();
                const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - diffToMonday);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                startDateStr = weekStart.toISOString().split('T')[0];
                endDateStr = weekEnd.toISOString().split('T')[0];
            } else if (viewMode === 'month') {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                startDateStr = firstDay.toISOString().split('T')[0];
                endDateStr = lastDay.toISOString().split('T')[0];
            }

            const history = await getHydrationHistory(user.id, startDateStr, endDateStr);
            setLogs(history);
            processChartData(history, startDateStr, endDateStr);
        } catch (error) {
            console.error('Error loading hydration history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const processChartData = (history: HydrationLog[], startDateStr: string, endDateStr: string) => {
        const data: HydrationChartData[] = [];
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        // Map of date string to water_ml
        const logMap = new Map(history.map(log => [log.date, log.water_ml]));

        const weekDaysShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const val = logMap.get(dateStr) || 0;

            let label = '';
            if (viewMode === 'week') {
                const jsDay = d.getDay(); // 0 is Sunday
                const normalizedDay = jsDay === 0 ? 6 : jsDay - 1;
                label = weekDaysShort[normalizedDay];
            } else if (viewMode === 'month') {
                const dayNum = d.getDate();
                if (dayNum === 1 || dayNum % 5 === 0) {
                    label = dayNum.toString();
                }
            }

            data.push({
                label,
                value: val,
                date: dateStr,
                fullDate: new Date(d)
            });
        }

        setChartData(data);
    };

    const goToPreviousPeriod = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const goToNextPeriod = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const formatPeriod = () => {
        const now = new Date();

        if (viewMode === 'week') {
            const currentDay = currentDate.getDay();
            const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - diffToMonday);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const nowDay = now.getDay();
            const diffToMondayNow = nowDay === 0 ? 6 : nowDay - 1;
            const nowWeekStart = new Date(now);
            nowWeekStart.setDate(now.getDate() - diffToMondayNow);

            if (weekStart.toDateString() === nowWeekStart.toDateString()) {
                return t('common.thisWeek');
            }

            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })}`;
            } else {
                return `${weekStart.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('es-ES', { month: 'short' })}`;
            }
        } else if (viewMode === 'month') {
            if (currentDate.getFullYear() === now.getFullYear() &&
                currentDate.getMonth() === now.getMonth()) {
                return t('common.thisMonth');
            }
            return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
        return '';
    };

    const isCurrentPeriod = () => {
        const now = new Date();
        if (viewMode === 'week') {
            const nowDay = now.getDay();
            const diffToMondayNow = nowDay === 0 ? 6 : nowDay - 1;
            const nowWeekStart = new Date(now);
            nowWeekStart.setDate(now.getDate() - diffToMondayNow);
            nowWeekStart.setHours(0, 0, 0, 0);

            const currentDay = currentDate.getDay();
            const diffToMondayCurrent = currentDay === 0 ? 6 : currentDay - 1;
            const currentWeekStart = new Date(currentDate);
            currentWeekStart.setDate(currentDate.getDate() - diffToMondayCurrent);
            currentWeekStart.setHours(0, 0, 0, 0);

            return nowWeekStart.getTime() === currentWeekStart.getTime();
        } else if (viewMode === 'month') {
            return currentDate.getFullYear() === now.getFullYear() &&
                currentDate.getMonth() === now.getMonth();
        }
        return false;
    };

    const getAverage = () => {
        if (chartData.length === 0) return 0;
        const total = chartData.reduce((sum, item) => sum + item.value, 0);
        // Para el promedio dividimos entre los días pasados en el mes, o 7 en la semana
        let daysToDivide = chartData.length;
        if (isCurrentPeriod()) {
            const now = new Date();
            if (viewMode === 'week') {
                const day = now.getDay() === 0 ? 7 : now.getDay();
                daysToDivide = day;
            } else if (viewMode === 'month') {
                daysToDivide = now.getDate();
            }
        }
        return Math.round(total / (daysToDivide || 1));
    };

    const getStatusText = () => {
        const avg = getAverage();
        return `${avg.toLocaleString()} ml / día promedio`;
    };

    const renderChart = () => {
        const maxValue = 4000;
        const yAxisLabels = ['4L', '2L', '0L'];
        const chartHeight = 260;

        let barWidth = viewMode === 'week' ? 28 : 12;
        let barSpacing = viewMode === 'week' ? 12 : 3;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentDay = now.getDate();

        return (
            <View style={styles.chartWrapper}>
                <View style={styles.yAxisLabels}>
                    {yAxisLabels.map((label, index) => (
                        <Text key={index} style={styles.yAxisLabel}>{label}</Text>
                    ))}
                </View>

                <View style={styles.chartContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartContent}>
                        {/* Goal line (3L) */}
                        <View style={[styles.goalLine, { bottom: (3000 / maxValue) * chartHeight }]} />

                        {chartData.map((item, index) => {
                            const barHeight = Math.min((item.value / maxValue) * chartHeight, chartHeight);

                            let isHighlighted = false;
                            if (viewMode === 'month' && isCurrentPeriod()) {
                                isHighlighted = item.fullDate.getDate() === currentDay;
                            } else if (viewMode === 'week' && isCurrentPeriod()) {
                                isHighlighted = item.fullDate.getDate() === currentDay;
                            }

                            return (
                                <View key={index} style={[styles.barContainer, { width: barWidth, marginRight: barSpacing }]}>
                                    <View
                                        style={[
                                            styles.bar,
                                            { height: Math.max(barHeight, 2) },
                                            isHighlighted && styles.barHighlighted,
                                        ]}
                                    />
                                    {item.label ? (
                                        <View style={styles.labelContainer}>
                                            <Text style={styles.barLabel}>{item.label}</Text>
                                        </View>
                                    ) : <View style={styles.labelContainer} />}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        );
    };

    const renderPeriodSummary = () => {
        // Generate an ordered list of hydration logs in descending order for the active period
        const sortedLogs = [...chartData]
            .filter(d => d.value > 0 || (d.fullDate <= new Date()))
            .sort((a, b) => b.fullDate.getTime() - a.fullDate.getTime());

        return (
            <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>{t('nutritionIndex.hydration')}</Text>
                {sortedLogs.length === 0 ? (
                    <Text style={styles.emptyText}>No hay datos para este período.</Text>
                ) : (
                    sortedLogs.map((log, index) => (
                        <View key={index} style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>
                                {log.fullDate.toDateString() === new Date().toDateString() ? t('common.today') :
                                    log.fullDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                            <View style={styles.summaryValueContainer}>
                                <Text style={styles.summaryValue}>{log.value} ml</Text>
                                <Text style={[styles.summaryPercent, { color: log.value >= goalWater ? '#4CAF50' : '#888' }]}>
                                    {Math.round((log.value / goalWater) * 100)}%
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition' as any)}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('nutritionIndex.hydration')}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, viewMode === 'week' && styles.tabActive]}
                        onPress={() => setViewMode('week')}
                    >
                        <Text style={[styles.tabText, viewMode === 'week' && styles.tabTextActive]}>{t('common.week')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, viewMode === 'month' && styles.tabActive]}
                        onPress={() => setViewMode('month')}
                    >
                        <Text style={[styles.tabText, viewMode === 'month' && styles.tabTextActive]}>{t('common.month')}</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffb300" />
                    </View>
                ) : (
                    <ScrollView style={styles.content}>
                        <View style={styles.periodNav}>
                            <TouchableOpacity onPress={goToPreviousPeriod} style={styles.navButton}>
                                <Ionicons name="chevron-back" size={24} color="#ffffff" />
                            </TouchableOpacity>
                            <Text style={styles.periodText}>{formatPeriod()}</Text>
                            <TouchableOpacity
                                onPress={goToNextPeriod}
                                disabled={isCurrentPeriod()}
                                style={[styles.navButton, isCurrentPeriod() && styles.navButtonDisabled]}
                            >
                                <Ionicons name="chevron-forward" size={24} color={isCurrentPeriod() ? "#333333" : "#ffffff"} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statusContainer}>
                            <Text style={styles.statusMainText}>
                                {getAverage().toLocaleString()} <Text style={styles.statusUnitText}>ml</Text>
                            </Text>
                            <Text style={styles.statusSubText}>{getStatusText()}</Text>
                        </View>

                        {renderChart()}
                        {renderPeriodSummary()}
                        <View style={{ height: 50 }} />
                    </ScrollView>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        marginHorizontal: 4,
    },
    tabActive: {
        backgroundColor: '#333333',
    },
    tabText: {
        color: '#888888',
        fontSize: 14,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#ffffff',
    },
    content: {
        flex: 1,
    },
    periodNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    periodText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    navButton: {
        padding: 8,
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    statusContainer: {
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    statusMainText: {
        color: '#ffffff',
        fontSize: 36,
        fontWeight: 'bold',
    },
    statusUnitText: {
        fontSize: 20,
        color: '#888888',
        fontWeight: 'normal',
    },
    statusSubText: {
        color: '#888888',
        fontSize: 16,
        marginTop: 4,
    },
    chartWrapper: {
        flexDirection: 'row',
        height: 300,
        paddingHorizontal: 10,
        marginBottom: 40,
    },
    yAxisLabels: {
        justifyContent: 'space-between',
        paddingVertical: 20,
        paddingRight: 10,
        width: 40,
    },
    yAxisLabel: {
        color: '#888888',
        fontSize: 12,
        textAlign: 'right',
    },
    chartContainer: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    chartContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: 20,
        paddingHorizontal: 10,
        height: 280, // Allow space for labels below
    },
    goalLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#ffb300',
        opacity: 0.5,
        borderStyle: 'dashed',
    },
    barContainer: {
        height: 280,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        backgroundColor: '#444444',
        width: '100%',
        borderRadius: 4,
        marginBottom: 20, // Space for labels
    },
    barHighlighted: {
        backgroundColor: '#ffb300',
    },
    labelContainer: {
        position: 'absolute',
        bottom: 0,
        height: 20,
        justifyContent: 'center',
    },
    barLabel: {
        color: '#888888',
        fontSize: 10,
        textAlign: 'center',
    },
    summarySection: {
        paddingHorizontal: 20,
    },
    summaryTitle: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    summaryLabel: {
        color: '#ffffff',
        fontSize: 16,
    },
    summaryValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryValue: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
        marginRight: 10,
    },
    summaryPercent: {
        fontSize: 14,
        fontWeight: '600',
        width: 40,
        textAlign: 'right'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    }
});
