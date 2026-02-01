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
  StatusBar,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/services/supabase';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { SkeletonProfile, SkeletonCard } from '../../src/components/SkeletonLoaders';
import { EmptyWorkouts } from '../../src/components/EmptyStates';
import { CustomRefreshControl } from '../../src/components/CustomRefreshControl';
import { useRefresh } from '../../src/hooks/useRefresh';
import { useNetworkStatus, checkNetworkBeforeOperation } from '../../src/hooks/useNetworkStatus';
import { getTotalUnreadChatsCount } from '../../src/services/chatService';
import NotificationBell from '../../src/components/NotificationBell';
import { useTutorial } from '@/contexts/TutorialContext';
import { AppTour } from '@/components/AppTour';
import { HelpModal } from '@/components/HelpModal';
import { TutorialTooltip } from '@/components/TutorialTooltip';
type ProfileNameRow = {
  name: string | null;
};

type WorkoutPlanRow = {
  id: string;
  plan_name: string | null;
  plan_data: any; // (si después querés lo tipamos bien)
};

type NutritionTargetRow = {
  calories: number | null;
  // agregá más campos si los usás en UI
};

type NutritionPlanRow = {
  id: string;
  plan_name: string | null;
  is_active: boolean;
  is_ai_generated: boolean | null;
  current_week_number: number | null;
  total_weeks: number | null;
};


export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayNutrition, setTodayNutrition] = useState<any>(null);
  const [activeNutritionPlan, setActiveNutritionPlan] = useState<NutritionPlanRow | null>(null);
  const [userName, setUserName] = useState('');
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  // Tutorial states
  const { 
    hasCompletedInitialTour, 
    shouldShowTooltip, 
    completeTutorial, 
    markTooltipShown, 
    showHelpModal, 
    setShowHelpModal 
  } = useTutorial();
  const [showTour, setShowTour] = useState(false);
  const [showHomeTooltips, setShowHomeTooltips] = useState(false);

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
      .maybeSingle<ProfileNameRow>();
    

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      if (profileData?.name) {
        setUserName(profileData.name);
      }

      // Cargar plan de entrenamiento activo
      const { data: activePlan, error: planError } = await supabase
      .from('workout_plans')
      .select('id, plan_name, plan_data')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<WorkoutPlanRow>();
    

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
                name: dayData.day || t('home.day', { dayIndex }),
                dayKey,
                planId: activePlan.id,
                planName: activePlan.plan_name || t('home.workoutPlan'),
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
              name: firstDay.day || t('home.day', { dayIndex: 1 }),
              dayKey,
              planId: activePlan.id,
              planName: activePlan.plan_name || t('home.workoutPlan'),
            });
          }
        }
      }

      // Cargar plan nutricional activo
      const { data: nutritionPlanData, error: nutritionPlanError } = await supabase
        .from('nutrition_plans')
        .select('id, plan_name, is_active, is_ai_generated, current_week_number, total_weeks')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle<NutritionPlanRow>();

      if (nutritionPlanError && nutritionPlanError.code !== 'PGRST116') {
        console.error('Error loading nutrition plan:', nutritionPlanError);
      }

      setActiveNutritionPlan(nutritionPlanData || null);

      // Cargar nutrición de hoy (targets)
      const today = new Date().toISOString().split('T')[0];
      const { data: targetData, error: targetError } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle<NutritionTargetRow>();

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

  // Mostrar tour inicial la primera vez
  useEffect(() => {
    if (!hasCompletedInitialTour && user?.id && !isLoading) {
      // Esperar un segundo después de cargar para mejor UX
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedInitialTour, user, isLoading]);

  // Mostrar tooltips después del tour
  useEffect(() => {
    if (shouldShowTooltip('HOME') && user?.id && !isLoading && !showTour) {
      const timer = setTimeout(() => {
        setShowHomeTooltips(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTooltip, user, isLoading, showTour]);

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
    if (hour < 12) return t('home.goodMorning');
    if (hour < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}>
          <SkeletonProfile />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 30 }
        ]}
        showsVerticalScrollIndicator={true}
        refreshControl={
          Platform.OS === 'android' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ffb300']}
              progressBackgroundColor="#2a2a2a"
            />
          ) : (
            <CustomRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title={t('home.updatingData')}
            />
          )
        }
      >
        {/* Banner de sin conexión */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={20} color="#FFD93D" />
            <Text style={styles.offlineText}>
              {t('home.offlineMessage')}
            </Text>
          </View>
        )}

        {/* Header con saludo */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userName || t('home.user')}</Text>
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

            {/* Botón de Ayuda */}
            <TouchableOpacity
              onPress={() => setShowHelpModal(true)}
              style={styles.helpButton}
            >
              <Ionicons name="help-circle-outline" size={28} color="#ffb300" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fecha de hoy */}
        <View style={styles.dateCard}>
          <Ionicons name="calendar" size={24} color="#ffb300" />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString(t('common.locale') || 'es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
        </View>

        {/* Debug Info - Removido completamente */}

        {/* Sección: Tus Actividades de Hoy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.todayActivities')}</Text>
        </View>

        {/* Tarjeta: Entrenamiento de Hoy */}
        <TouchableOpacity 
          style={styles.activityCard}
          onPress={async () => {
              // Si no hay workout cargado, intentar cargarlo ahora
              if (!todayWorkout) {
                if (!user?.id) return;

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
                  const planData = activePlan.plan_data as { weekly_structure?: any[]; weekly_schedule?: any[] } | null;
                  const schedule = planData?.weekly_structure || 
                                   planData?.weekly_schedule || 
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
              <Text style={styles.activityTitle}>{t('home.todayWorkout')}</Text>
              <Text style={styles.activitySubtitle}>
                {todayWorkout 
                  ? `${todayWorkout.planName} - ${todayWorkout.name || todayWorkout.dayKey}` 
                  : t('home.noWorkoutScheduled')}
              </Text>
              {todayWorkout && todayWorkout.exercises && (
                <Text style={styles.activityExtraInfo}>
                  {todayWorkout.exercises.length} {t('home.exercises')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color="#888888" />
          </TouchableOpacity>

        {/* Tarjeta: Dieta de Hoy */}
        <TouchableOpacity 
          style={styles.activityCard}
          onPress={() => {
            if (activeNutritionPlan) {
              // Si hay plan activo, ir al detalle del plan
              router.push(`/(tabs)/nutrition/plan-detail?id=${activeNutritionPlan.id}` as any);
            } else {
              // Si no hay plan, ir a la pantalla de nutrición para crear uno
              router.push('/(tabs)/nutrition' as any);
            }
          }}
        >
          <View style={[styles.activityIcon, { backgroundColor: '#ffb30020' }]}>
            <Ionicons name="restaurant" size={32} color="#ffb300" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>{t('home.todayDiet')}</Text>
            <Text style={styles.activitySubtitle}>
              {activeNutritionPlan 
                ? activeNutritionPlan.plan_name || t('home.activePlan')
                : t('home.configureNutrition')}
            </Text>
            {activeNutritionPlan && (
              <Text style={styles.activityExtraInfo}>
                {activeNutritionPlan.is_ai_generated 
                  ? t('home.aiGeneratedPlan') 
                  : t('home.customPlan')}
                {activeNutritionPlan.current_week_number && activeNutritionPlan.total_weeks && (
                  ` • ${t('home.week')} ${activeNutritionPlan.current_week_number}/${activeNutritionPlan.total_weeks}`
                )}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color="#888888" />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Tour inicial */}
      {showTour && (
        <AppTour
          onDone={() => {
            setShowTour(false);
          }}
        />
      )}

      {/* Modal de ayuda */}
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Tooltips de tutorial */}
      {showHomeTooltips && (
        <TutorialTooltip
          visible={showHomeTooltips}
          steps={[
            {
              element: <View />,
              title: t('tutorial.home.title1'),
              content: t('tutorial.home.content1'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.home.title2'),
              content: t('tutorial.home.content2'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.home.title3'),
              content: t('tutorial.home.content3'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.home.title4'),
              content: t('tutorial.home.content4'),
              placement: 'center',
            },
          ]}
          onComplete={() => {
            setShowHomeTooltips(false);
            completeTutorial('HOME');
            markTooltipShown('HOME');
          }}
          onSkip={() => {
            setShowHomeTooltips(false);
            completeTutorial('HOME');
            markTooltipShown('HOME');
          }}
        />
      )}
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
  helpButton: {
    padding: 4,
    marginLeft: 12,
  },
});

