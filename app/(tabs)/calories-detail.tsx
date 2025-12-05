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

const { width, height } = Dimensions.get('window');

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface CaloriesData {
  label: string;
  value: number;
  date?: Date;
}

export default function CaloriesDetailScreen() {
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [caloriesData, setCaloriesData] = useState<CaloriesData[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [averageCalories, setAverageCalories] = useState(0);
  const [goalCalories] = useState(2000); // Meta en kcal

  // Cargar datos de calorías según el modo de vista
  useEffect(() => {
    loadCaloriesData();
  }, [viewMode, currentDate]);

  const loadCaloriesData = () => {
    // Aquí integraremos con el servicio de salud más adelante
    // Por ahora usamos datos simulados
    const data = generateMockData();
    setCaloriesData(data);
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    setTotalCalories(total);
    setAverageCalories(total / (data.length || 1));
  };

  const generateMockData = (): CaloriesData[] => {
    switch (viewMode) {
      case 'day':
        // Datos por hora del día
        const hourlyData = [
          0, 0, 0, 0, 0, 0, 0, 0, 0, // 0:00 - 8:00
          20, 30, 40, // 9:00 - 11:00 (actividad matutina)
          0, 0, 0, 0, 0, 0, // 12:00 - 17:00
          0, 0, 0, // 18:00 - 20:00
          80, 120, 0 // 21:00 - 23:00 (actividad nocturna)
        ];
        
        return Array.from({ length: 24 }, (_, i) => {
          let label = '';
          // Mostrar cada 3 horas
          if (i % 3 === 0) {
            if (i === 0) label = '12:00';
            else if (i < 12) label = `${i}:00`;
            else if (i === 12) label = '12:00';
            else label = `${i - 12}:00`;
          }
          
          return { 
            label, 
            value: hourlyData[i] || 0 
          };
        });
      
      case 'week':
        // Datos por día de la semana
        const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        return weekDays.map((day) => ({
          label: day,
          value: Math.random() * 800,
        }));
      
      case 'month':
        // Datos por día del mes
        const daysInMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          let label = '';
          // Mostrar solo algunos días para evitar solapamiento
          if (day === 1 || day % 5 === 0) {
            label = `${day}`;
          }
          return {
            label,
            value: Math.random() * 1200,
          };
        });
      
      case 'year':
        // Datos por mes del año
        const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        return months.map((month) => ({
          label: month,
          value: Math.random() * 50000,
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
      case 'day':
        if (isToday) return 'Hoy';
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (currentDate.toDateString() === yesterday.toDateString()) return 'Ayer';
        return currentDate.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'short' 
        });
      
      case 'week':
        const currentDay = currentDate.getDay();
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDay);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const nowDay = now.getDay();
        const nowWeekStart = new Date(now);
        nowWeekStart.setDate(now.getDate() - nowDay);
        
        if (weekStart.toDateString() === nowWeekStart.toDateString()) {
          return 'Esta semana';
        }
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })}`;
        } else {
          return `${weekStart.getDate()} ${weekStart.toLocaleDateString('es-ES', { month: 'short' })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('es-ES', { month: 'short' })}`;
        }
      
      case 'month':
        if (currentDate.getFullYear() === now.getFullYear() && 
            currentDate.getMonth() === now.getMonth()) {
          return 'Este mes';
        }
        return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      
      case 'year':
        if (currentDate.getFullYear() === now.getFullYear()) {
          return 'Este año';
        }
        return currentDate.getFullYear().toString();
      
      default:
        return '';
    }
  };

  const isCurrentPeriod = () => {
    const now = new Date();
    
    switch (viewMode) {
      case 'day':
        return currentDate.toDateString() === now.toDateString();
      
      case 'week':
        const nowDay = now.getDay();
        const nowWeekStart = new Date(now);
        nowWeekStart.setDate(now.getDate() - nowDay);
        nowWeekStart.setHours(0, 0, 0, 0);
        
        const currentDay = currentDate.getDay();
        const currentWeekStart = new Date(currentDate);
        currentWeekStart.setDate(currentDate.getDate() - currentDay);
        currentWeekStart.setHours(0, 0, 0, 0);
        
        return nowWeekStart.getTime() === currentWeekStart.getTime();
      
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
    return 'de 2000 kcal';
  };

  const getStatusText = () => {
    if (viewMode === 'day') {
      const remaining = goalCalories - totalCalories;
      if (remaining > 0) {
        return `Estás a ${remaining.toLocaleString()} calorías de alcanzar tu objetivo diario`;
      } else {
        return `¡Objetivo alcanzado! 🎉`;
      }
    } else {
      return `Hasta ahora, has quemado un total de ${totalCalories.toLocaleString()} kcal.`;
    }
  };

  const renderChart = () => {
    // Usar un valor máximo fijo para la escala del gráfico
    let maxValue = 200; // 200 kcal como máximo para el día
    let yAxisLabels = ['200', '100', '0'];
    
    if (viewMode === 'week') {
      maxValue = 1000;
      yAxisLabels = ['1000', '500', '0'];
    } else if (viewMode === 'month') {
      maxValue = 1500;
      yAxisLabels = ['1500', '750', '0'];
    } else if (viewMode === 'year') {
      maxValue = 60000;
      yAxisLabels = ['60k', '30k', '0'];
    }
    
    const chartHeight = 260;
    
    let barWidth = 28;
    let barSpacing = 12;
    
    if (viewMode === 'day') {
      barWidth = 20;
      barSpacing = 6;
    } else if (viewMode === 'month') {
      barWidth = 12;
      barSpacing = 3;
    } else if (viewMode === 'year') {
      barWidth = 20;
      barSpacing = 8;
    }
    
    const now = new Date();
    const isToday = currentDate.toDateString() === now.toDateString();
    const currentHour = now.getHours();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    return (
      <View style={styles.chartWrapper}>
        {/* Eje Y */}
        <View style={styles.yAxisLabels}>
          {yAxisLabels.map((label, index) => (
            <Text key={index} style={styles.yAxisLabel}>
              {label}
            </Text>
          ))}
        </View>
        
        {/* Contenedor del gráfico */}
        <View style={styles.chartContainer}>
          {/* Contenido scrollable */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartContent}
          >
            {/* Línea de objetivo */}
            <View style={styles.goalLine} />
            
            {caloriesData.map((item, index) => {
              const barHeight = (item.value / maxValue) * chartHeight;
              
              let isHighlighted = false;
              if (viewMode === 'day' && isToday) {
                isHighlighted = index === currentHour;
              } else if (viewMode === 'month' && isCurrentPeriod()) {
                isHighlighted = index + 1 === currentDay;
              } else if (viewMode === 'year' && isCurrentPeriod()) {
                isHighlighted = index === currentMonth;
              }
              
              return (
                <View 
                  key={index} 
                  style={[
                    styles.barContainer, 
                    { width: barWidth, marginRight: barSpacing }
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(barHeight, 2) },
                      isHighlighted && styles.barHighlighted,
                    ]}
                  />
                  {item.label && (
                    <View style={styles.labelContainer}>
                      <Text style={styles.barLabel}>
                        {item.label}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderPeriodSummary = () => {
    // Datos simulados para el resumen
    if (viewMode === 'week') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Esta semana</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hoy</Text>
            <Text style={styles.summaryValue}>290</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ayer</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Wed, 15 Oct</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>
      );
    }
    
    if (viewMode === 'month') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>October</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Esta semana</Text>
            <Text style={styles.summaryValue}>290</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>5 - 11 Oct</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>28 Sep - 4 Oct</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>
      );
    }
    
    if (viewMode === 'year') {
      return (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>2025</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>October</Text>
            <Text style={styles.summaryValue}>290</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>September</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>August</Text>
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
          <Text style={styles.headerTitle}>Energía quemada</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Tabs: Día / Semana / Mes / Año - FIJAS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'day' && styles.tabActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.tabText, viewMode === 'day' && styles.tabTextActive]}>
              Día
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'week' && styles.tabActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.tabText, viewMode === 'week' && styles.tabTextActive]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'month' && styles.tabActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.tabText, viewMode === 'month' && styles.tabTextActive]}>
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'year' && styles.tabActive]}
            onPress={() => setViewMode('year')}
          >
            <Text style={[styles.tabText, viewMode === 'year' && styles.tabTextActive]}>
              Año
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Navegación de período */}
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

          {/* Estadística principal */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statsNumber}>
                  {Math.round(totalCalories).toLocaleString()}
                </Text>
                <Text style={styles.statsLabel}>{getUnitLabel()}</Text>
                <Text style={styles.statsSubtext}>
                  {getStatusText()}
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Ionicons name="flame" size={40} color="#ffb300" />
              </View>
            </View>
          </View>

          {/* Gráfico */}
          {renderChart()}

          {/* Resumen por período */}
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
    paddingBottom: 16,
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
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsLabel: {
    fontSize: 16,
    color: '#999',
    marginTop: 4,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    maxWidth: width * 0.5,
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3d2f1f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartWrapper: {
    flexDirection: 'row',
    paddingLeft: 20,
    marginBottom: 24,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingRight: 8,
    height: 260,
    paddingTop: 0,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#666',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    height: 1,
    backgroundColor: '#ffb300',
    opacity: 0.5,
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 0,
    paddingBottom: 30,
    paddingHorizontal: 4,
    height: 290,
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
    borderRadius: 3,
    minHeight: 2,
  },
  barHighlighted: {
    backgroundColor: '#00FFD1',
  },
  labelContainer: {
    position: 'absolute',
    bottom: -24,
    width: 40,
    alignItems: 'center',
    height: 20,
    left: -14,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#999',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

