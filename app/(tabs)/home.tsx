// ============================================================================
// HOME SCREEN - Accesos Directos
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { SkeletonProfile, SkeletonCard } from '../../src/components/SkeletonLoaders';
import { EmptyWorkouts } from '../../src/components/EmptyStates';
import { CustomRefreshControl } from '../../src/components/CustomRefreshControl';
import { useRefresh } from '../../src/hooks/useRefresh';
import { useNetworkStatus, checkNetworkBeforeOperation } from '../../src/hooks/useNetworkStatus';
import { getTotalUnreadChatsCount } from '../../src/services/chatService';
import NotificationBell from '../../src/components/NotificationBell';

export default function HomeScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayNutrition, setTodayNutrition] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  // Detectar estado de conexión
  const { isConnected } = useNetworkStatus();

  // Inicializar notificaciones inteligentes
  useSmartNotifications();

  const loadData = React.useCallback(async () => {
    if (!user?.id) return;

    // Verificar conexión antes de cargar datos
    if (!isConnected) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Cargar nombre del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      if (profileData?.name) {
        setUserName(profileData.name);
      }

      // Cargar plan de entrenamiento activo
      const { data: activePlan, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activePlan?.plan_data) {
        const planData = activePlan.plan_data;
        
        // Validar que planData sea un objeto válido
        if (!planData || typeof planData !== 'object') {
          return;
        }
        
        let allDays: any[] = [];
        
        // Verificar si tiene multi_week_structure (planes personalizados)
        if (planData.multi_week_structure && planData.multi_week_structure.length > 0) {
          // Aplanar todas las semanas en un solo array de días
          planData.multi_week_structure.forEach((week: any, weekIndex: number) => {
            if (week.days && Array.isArray(week.days)) {
              week.days.forEach((day: any, dayIndex: number) => {
                allDays.push({
                  ...day,
                  weekNumber: week.week_number || weekIndex + 1,
                  dayInWeek: dayIndex + 1,
                });
              });
            }
          });
        } else {
          // Plan de una semana (weekly_structure)
          const schedule = planData.weekly_structure || planData.weekly_schedule || [];
          allDays = Array.isArray(schedule) ? schedule : [];
        }
        
        // Buscar el primer día sin completar
        if (allDays.length > 0) {
          let foundDay = null;

          for (let i = 0; i < allDays.length; i++) {
            const dayData = allDays[i];
            const dayIndex = i + 1; // day_1, day_2, etc.
            const dayKey = dayData.weekNumber 
              ? `week_${dayData.weekNumber}_day_${dayData.dayInWeek}` 
              : `day_${dayIndex}`;

            // Verificar si este día está completado
            const { data: completionData, error: compError } = await supabase
              .from('workout_completions')
              .select('id')
              .eq('user_id', user.id)
              .eq('workout_plan_id', activePlan.id)
              .eq('day_name', dayKey)
              .maybeSingle();

            if (compError) {
              console.error('Error checking completion:', compError);
              // Continuar pero no marcar como completado
            }

            if (!completionData) {
              // Este día no está completado
              foundDay = {
                ...dayData,
                name: dayData.day || `Día ${dayIndex}`,
                dayKey,
                planId: activePlan.id,
                planName: activePlan.plan_name || 'Plan de Entrenamiento',
              };
              break;
            }
          }

          if (foundDay) {
            setTodayWorkout(foundDay);
          } else {
            // Todos los días están completados, mostrar el primero
            const firstDay = allDays[0];
            const dayKey = firstDay.weekNumber 
              ? `week_${firstDay.weekNumber}_day_${firstDay.dayInWeek}` 
              : 'day_1';
            
            setTodayWorkout({
              ...firstDay,
              name: firstDay.day || 'Día 1',
              dayKey,
              planId: activePlan.id,
              planName: activePlan.plan_name || 'Plan de Entrenamiento',
            });
          }
        }
      }

      // Cargar nutrición de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: targetData, error: targetError } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (targetError && targetError.code !== 'PGRST116') {
        console.error('Error loading nutrition target:', targetError);
      }

      setTodayNutrition(targetData || null);

      // Cargar contador de chats sin leer
      const unreadCount = await getTotalUnreadChatsCount(user.id);
      setUnreadChatsCount(unreadCount);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      
      // Mostrar mensaje amigable si es error de red
      if (
        err?.message?.includes('Network') ||
        err?.message?.includes('fetch') ||
        err?.message?.includes('Failed to fetch') ||
        !isConnected
      ) {
        // El hook useNetworkStatus ya muestra una alerta cuando se pierde conexión
        // Aquí solo registramos el error
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isConnected]);

  // Hook para manejar refresh
  const { refreshing, onRefresh } = useRefresh(loadData);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user, loadData]);

  // Recargar datos cada vez que la pantalla recibe focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadData();
      }
    }, [user, loadData])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Buenos días';
    if (hour < 18) return '🌤️ Buenas tardes';
    return '🌙 Buenas noches';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonProfile />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Actualizando datos..."
          />
        }
      >
        {/* Banner de sin conexión */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={20} color="#FFD93D" />
            <Text style={styles.offlineText}>
              Sin conexión a internet. Algunas funciones pueden no estar disponibles.
            </Text>
          </View>
        )}

        {/* Header con saludo */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userName || 'Usuario'}</Text>
          </View>
          <View style={styles.headerIcons}>
            {/* Icono de Notificaciones */}
            <NotificationBell />
            
            {/* Icono de Mensajes Directos */}
            <TouchableOpacity 
              onPress={() => {
                router.push('/chats');
              }}
              style={styles.profileButton}
            >
              <Ionicons name="paper-plane-outline" size={32} color="#ffb300" />
              {unreadChatsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Fecha de hoy */}
        <View style={styles.dateCard}>
          <Ionicons name="calendar" size={24} color="#ffb300" />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
        </View>

        {/* Debug Info - Removido completamente */}

        {/* Sección: Tus Actividades de Hoy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus Actividades de Hoy</Text>
        </View>

        {/* Tarjeta: Entrenamiento de Hoy */}
        <TouchableOpacity 
          style={styles.activityCard}
          onPress={async () => {
              // Si no hay workout cargado, intentar cargarlo ahora
              if (!todayWorkout) {
                // Buscar el plan activo y navegar al primer día
                const { data: activePlan, error: planError } = await supabase
                  .from('workout_plans')
                  .select('*')
                  .eq('user_id', user?.id)
                  .eq('is_active', true)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (planError && planError.code !== 'PGRST116') {
                  console.error('Error loading active plan:', planError);
                }

                if (activePlan && activePlan.plan_data) {
                  const schedule = activePlan.plan_data.weekly_structure || 
                                   activePlan.plan_data.weekly_schedule || 
                                   [];
                  
                  // Si schedule es un array, tomar el primer día
                  if (Array.isArray(schedule) && schedule.length > 0) {
                    const firstDay = schedule[0];
                    const dayData = {
                      ...firstDay,
                      name: firstDay.day,
                      dayKey: 'day_1',
                      planId: activePlan.id,
                      planName: activePlan.plan_name,
                    };
                    
                    router.push({
                      pathname: '/(tabs)/workout-day-detail' as any,
                      params: {
                        dayData: JSON.stringify(dayData),
                        planName: activePlan.plan_name,
                        planId: activePlan.id,
                        dayName: 'day_1',
                      },
                    });
                    return;
                  }
                }
                
                // Si no encontró nada, ir a la lista
                router.push('/(tabs)/workout');
              } else {
                // Navegar al detalle del día
                router.push({
                  pathname: '/(tabs)/workout-day-detail' as any,
                  params: {
                    dayData: JSON.stringify(todayWorkout),
                    planName: todayWorkout.planName,
                    planId: todayWorkout.planId,
                    dayName: todayWorkout.dayKey,
                  },
                });
              }
            }}
          >
            <View style={[styles.activityIcon, { backgroundColor: '#FF6B6B20' }]}>
              <Ionicons name="fitness" size={32} color="#FF6B6B" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>💪 Entrenamiento de Hoy</Text>
              <Text style={styles.activitySubtitle}>
                {todayWorkout 
                  ? `${todayWorkout.planName} - ${todayWorkout.name || todayWorkout.dayKey}` 
                  : 'No tienes entrenamiento programado'}
              </Text>
              {todayWorkout && todayWorkout.exercises && (
                <Text style={styles.activityExtraInfo}>
                  {todayWorkout.exercises.length} ejercicios
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color="#888888" />
          </TouchableOpacity>

        {/* Tarjeta: Dieta de Hoy */}
        <TouchableOpacity 
          style={styles.activityCard}
          onPress={() => router.push('/(tabs)/nutrition/today-detail' as any)}
          >
            <View style={[styles.activityIcon, { backgroundColor: '#ffb30020' }]}>
              <Ionicons name="restaurant" size={32} color="#ffb300" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>🥗 Dieta de Hoy</Text>
              <Text style={styles.activitySubtitle}>
                {todayNutrition 
                  ? `Objetivo: ${todayNutrition.calories} kcal` 
                  : 'Configura tu plan nutricional'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#888888" />
          </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a00',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD93D',
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    color: '#FFD93D',
    flex: 1,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  activityIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  activityExtraInfo: {
    fontSize: 12,
    color: '#ffb300',
    marginTop: 4,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

