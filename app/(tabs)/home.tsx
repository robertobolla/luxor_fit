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
import { SkeletonProfile, SkeletonCard, FadeInView, SlideInView } from '../../src/components/SkeletonLoaders';
import { EmptyWorkouts } from '../../src/components/EmptyStates';
import { CustomRefreshControl } from '../../src/components/CustomRefreshControl';
import { useRefresh } from '../../src/hooks/useRefresh';

export default function HomeScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayNutrition, setTodayNutrition] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Inicializar notificaciones inteligentes
  useSmartNotifications();

  // Hook para manejar refresh
  const { refreshing, onRefresh } = useRefresh(loadData);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  // Recargar datos cada vez que la pantalla recibe focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadData();
      }
    }, [user])
  );

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Cargar nombre del usuario
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

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
        .single();

      console.log('📋 Plan activo:', JSON.stringify(activePlan, null, 2));
      console.log('❌ Error al cargar plan:', planError);

      let debugMsg = '';
      if (!activePlan) {
        debugMsg = planError ? `Error: ${planError.message}` : 'No hay plan activo';
        setDebugInfo(debugMsg);
      }

      if (activePlan && activePlan.plan_data) {
        const planData = activePlan.plan_data;
        console.log('📦 Plan data keys:', Object.keys(planData));
        
        // El plan tiene estructura: weekly_structure es un ARRAY de días
        const schedule = planData.weekly_structure || planData.weekly_schedule || [];
        console.log('📅 Schedule es array:', Array.isArray(schedule), 'Longitud:', schedule.length);
        
        // Limpiar debug
        setDebugInfo('');
        
        // Si schedule es un array, buscar el primer día sin completar
        if (Array.isArray(schedule) && schedule.length > 0) {
          let foundDay = null;

          for (let i = 0; i < schedule.length; i++) {
            const dayData = schedule[i];
            const dayIndex = i + 1; // day_1, day_2, etc.
            const dayKey = `day_${dayIndex}`;

            // Verificar si este día está completado
            const { data: completionData, error: compError } = await supabase
              .from('workout_completions')
              .select('id')
              .eq('user_id', user.id)
              .eq('workout_plan_id', activePlan.id)
              .eq('day_name', dayKey)
              .maybeSingle();

            console.log(`🔍 ${dayData.day} (${dayKey}) - Completado:`, !!completionData);

            if (!completionData) {
              // Este día no está completado
              foundDay = {
                ...dayData,
                name: dayData.day, // "Día 1", "Día 2", etc.
                dayKey,
                planId: activePlan.id,
                planName: activePlan.plan_name || 'Plan de Entrenamiento',
              };
              console.log('✅ Día sin completar encontrado:', dayData.day);
              break;
            }
          }

          if (foundDay) {
            setTodayWorkout(foundDay);
            console.log('💪 Entrenamiento de hoy configurado:', foundDay.name);
          } else {
            // Todos los días están completados, mostrar el primero
            const firstDay = {
              ...schedule[0],
              name: schedule[0].day,
              dayKey: 'day_1',
              planId: activePlan.id,
              planName: activePlan.plan_name || 'Plan de Entrenamiento',
            };
            setTodayWorkout(firstDay);
            console.log('🔄 Todos completados, mostrando día 1');
          }
        } else {
          setDebugInfo('⚠️ Schedule no es un array o está vacío');
          console.log('⚠️ Schedule no es un array válido');
        }
      } else {
        setDebugInfo('⚠️ No hay plan activo o plan_data está vacío');
        console.log('⚠️ No hay plan activo o plan_data está vacío');
      }

      // Cargar nutrición de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: targetData } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      setTodayNutrition(targetData);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
          <FadeInView delay={0}>
            <SkeletonProfile />
          </FadeInView>
          <FadeInView delay={200}>
            <SkeletonCard />
          </FadeInView>
          <FadeInView delay={400}>
            <SkeletonCard />
          </FadeInView>
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
        {/* Header con saludo */}
        <SlideInView direction="down" delay={0}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{userName || 'Usuario'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Ionicons name="person-circle" size={48} color="#00D4AA" />
            </TouchableOpacity>
          </View>
        </SlideInView>

        {/* Fecha de hoy */}
        <FadeInView delay={200}>
          <View style={styles.dateCard}>
            <Ionicons name="calendar" size={24} color="#00D4AA" />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>
        </FadeInView>

        {/* Debug Info - Temporal */}
        {debugInfo && (
          <View style={{ backgroundColor: '#FF6B6B20', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#FF6B6B', fontSize: 12 }}>{debugInfo}</Text>
          </View>
        )}

        {/* Sección: Tus Actividades de Hoy */}
        <FadeInView delay={400}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus Actividades de Hoy</Text>
          </View>
        </FadeInView>

        {/* Tarjeta: Entrenamiento de Hoy */}
        <SlideInView direction="right" delay={600}>
          <TouchableOpacity 
            style={styles.activityCard}
            onPress={async () => {
              // Si no hay workout cargado, intentar cargarlo ahora
              if (!todayWorkout) {
                // Buscar el plan activo y navegar al primer día
                const { data: activePlan } = await supabase
                  .from('workout_plans')
                  .select('*')
                  .eq('user_id', user?.id)
                  .eq('is_active', true)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

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
        </SlideInView>

        {/* Tarjeta: Dieta de Hoy */}
        <SlideInView direction="left" delay={800}>
          <TouchableOpacity 
            style={styles.activityCard}
            onPress={() => router.push('/(tabs)/nutrition/today-detail' as any)}
          >
            <View style={[styles.activityIcon, { backgroundColor: '#00D4AA20' }]}>
              <Ionicons name="restaurant" size={32} color="#00D4AA" />
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
        </SlideInView>

        {/* Sección: Accesos Rápidos */}
        <FadeInView delay={1000}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
          
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity 
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/progress')}
            >
              <Ionicons name="analytics" size={32} color="#FFD93D" />
              <Text style={styles.quickAccessText}>Métricas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/workout-generator' as any)}
            >
              <Ionicons name="barbell" size={32} color="#FF6B6B" />
              <Text style={styles.quickAccessText}>Nuevo Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/nutrition/plan' as any)}
            >
              <Ionicons name="fast-food" size={32} color="#00D4AA" />
              <Text style={styles.quickAccessText}>Plan Semanal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/nutrition/log' as any)}
            >
              <Ionicons name="add-circle" size={32} color="#A8E6CF" />
              <Text style={styles.quickAccessText}>Registrar</Text>
            </TouchableOpacity>
          </View>
        </View>
        </FadeInView>

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
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#00D4AA',
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
    color: '#00D4AA',
    marginTop: 4,
    fontWeight: '600',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    gap: 12,
  },
  quickAccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});

