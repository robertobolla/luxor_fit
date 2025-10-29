import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import Svg, { Circle } from 'react-native-svg';
import { getGymDaysThisWeek, getGymDaysThisMonth } from '@/services/exerciseService';

const { width } = Dimensions.get('window');

// Componente para círculos de progreso
function ProgressCircle({ 
  size, 
  strokeWidth, 
  progress, 
  color, 
  icon, 
  iconSize = 40 
}: { 
  size: number; 
  strokeWidth: number; 
  progress: number; 
  color: string; 
  icon: any; 
  iconSize?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Círculo de fondo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2a2a2a"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Círculo de progreso */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Ionicons name={icon} size={iconSize} color={color} />
      </View>
    </View>
  );
}

export default function GymDetailScreen() {
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [gymDaysThisWeek, setGymDaysThisWeek] = useState(0);
  const [gymDaysGoal, setGymDaysGoal] = useState(3);
  const [gymDaysThisMonth, setGymDaysThisMonth] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos cuando cambia la fecha
  useEffect(() => {
    if (user?.id) {
      loadGymData();
    }
  }, [selectedDate, user]);

  // Recargar datos cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadGymData();
      }
    }, [user])
  );

  const loadGymData = async () => {
    try {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      // Obtener días de gimnasio de la semana actual
      const gymData = await getGymDaysThisWeek(user.id);
      setGymDaysThisWeek(gymData.days);
      setGymDaysGoal(gymData.goal);
      
      // Obtener días de gimnasio del mes actual
      const currentDate = selectedDate;
      const gymDaysMonth = await getGymDaysThisMonth(
        user.id, 
        currentDate.getFullYear(), 
        currentDate.getMonth()
      );
      setGymDaysThisMonth(gymDaysMonth);
      
      console.log('🏋️ Datos de gimnasio cargados:', {
        semana: gymData.days,
        meta: gymData.goal,
        mes: gymDaysMonth
      });
      
    } catch (error) {
      console.error('Error cargando datos de gimnasio:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los datos de gimnasio.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGymData();
    setRefreshing(false);
  };

  const goToPreviousMonth = () => {
    const previousMonth = new Date(selectedDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    setSelectedDate(previousMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    // No permitir meses futuros
    if (nextMonth <= new Date()) {
      setSelectedDate(nextMonth);
    }
  };

  const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() && 
                        selectedDate.getFullYear() === new Date().getFullYear();

  const formatMonth = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push({
        name: day.toLocaleDateString('es-ES', { weekday: 'short' }),
        date: day.getDate(),
        isToday: day.toDateString() === today.toDateString()
      });
    }
    
    return weekDays;
  };

  const weekDays = getWeekDays();
  const monthDays = getMonthDays(selectedDate);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={{ color: '#ffffff', marginTop: 16, fontSize: 16 }}>
          Cargando datos de gimnasio...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gimnasio</Text>
          <Text style={styles.headerSubtitle}>Entrenamientos completados</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => router.push('/(tabs)/workout')}
          >
            <Ionicons name="fitness" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#00D4AA"
          />
        }
      >
        {/* Círculo Principal - Progreso semanal */}
        <View style={styles.mainCircleContainer}>
          <ProgressCircle
            size={200}
            strokeWidth={12}
            progress={(gymDaysThisWeek / gymDaysGoal) * 100}
            color="#00D4AA"
            icon="fitness"
            iconSize={60}
          />
          <Text style={styles.mainNumber}>
            {gymDaysThisWeek} <Text style={styles.mainUnit}>de {gymDaysGoal}</Text>
          </Text>
          <Text style={styles.mainLabel}>Esta semana</Text>
        </View>

        {/* Semana actual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Esta semana</Text>
          
          <View style={styles.card}>
            <View style={styles.weekDaysContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.dayColumn}>
                  <View style={[
                    styles.dayBar,
                    day.isToday && styles.dayBarToday
                  ]} />
                  <Text style={[
                    styles.dayLabel,
                    day.isToday && styles.dayLabelToday
                  ]}>
                    {day.name}
                  </Text>
                  <Text style={[
                    styles.dayDate,
                    day.isToday && styles.dayDateToday
                  ]}>
                    {day.date}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.weekSummary}>
              <Text style={styles.weekSummaryText}>
                {gymDaysThisWeek} de {gymDaysGoal} días completados
              </Text>
              <Text style={styles.weekProgressText}>
                {Math.round((gymDaysThisWeek / gymDaysGoal) * 100)}% completado
              </Text>
            </View>
          </View>
        </View>

        {/* Historial mensual */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={goToPreviousMonth}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>
              {formatMonth(selectedDate)}
            </Text>
            
            {!isCurrentMonth && (
              <TouchableOpacity onPress={goToNextMonth}>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
            {isCurrentMonth && <View style={{ width: 24 }} />}
          </View>
          
          <View style={styles.card}>
            <View style={styles.monthGrid}>
              {monthDays.map((day) => {
                const hasGym = gymDaysThisMonth.includes(day);
                const isToday = isCurrentMonth && day === new Date().getDate();
                
                return (
                  <View key={day} style={styles.dayCell}>
                    <View style={[
                      styles.dayCircle,
                      hasGym && styles.dayCircleCompleted,
                      isToday && styles.dayCircleToday
                    ]}>
                      <Text style={[
                        styles.dayNumber,
                        hasGym && styles.dayNumberCompleted,
                        isToday && styles.dayNumberToday
                      ]}>
                        {day}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            <View style={styles.monthSummary}>
              <Text style={styles.monthSummaryText}>
                {gymDaysThisMonth.length} días de gimnasio en {formatMonth(selectedDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{gymDaysThisWeek}</Text>
              <Text style={styles.statLabel}>Esta semana</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{gymDaysThisMonth.length}</Text>
              <Text style={styles.statLabel}>Este mes</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round((gymDaysThisWeek / gymDaysGoal) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Progreso</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
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
    backgroundColor: '#1a1a1a',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  mainCircleContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  mainNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  mainUnit: {
    fontSize: 32,
    fontWeight: 'normal',
    color: '#999',
  },
  mainLabel: {
    fontSize: 18,
    color: '#999',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayBar: {
    width: 10,
    height: 40,
    backgroundColor: '#3a3a3a',
    borderRadius: 5,
    marginBottom: 4,
  },
  dayBarToday: {
    backgroundColor: '#00D4AA',
  },
  dayLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  dayLabelToday: {
    color: '#00D4AA',
    fontWeight: 'bold',
  },
  dayDate: {
    fontSize: 10,
    color: '#666',
  },
  dayDateToday: {
    color: '#00D4AA',
    fontWeight: 'bold',
  },
  weekSummary: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  weekSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  weekProgressText: {
    fontSize: 14,
    color: '#00D4AA',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayCell: {
    width: (width - 80) / 7,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: '#00D4AA',
  },
  dayCircleToday: {
    backgroundColor: '#FF5722',
  },
  dayNumber: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  dayNumberCompleted: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dayNumberToday: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  monthSummary: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  monthSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 16,
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
