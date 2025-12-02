// ============================================================================
// NUTRITION HOME SCREEN
// ============================================================================

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';
import { useLoadingState } from '../../../src/hooks/useLoadingState';
import { SkeletonBox, SkeletonNutrition } from '../../../src/components/SkeletonLoaders';
import {
  computeAndSaveTargets,
  createOrUpdateMealPlan,
  getNutritionProfile,
  upsertNutritionProfile,
  applyWeeklyAdjustment,
  getWeeklyHistory,
  getNextWeekStart,
  WeekSummary,
} from '../../../src/services/nutrition';
import NutritionAdjustmentModal from '../../../src/components/NutritionAdjustmentModal';
import { useNutritionStore } from '../../../src/store/nutritionStore';
import { NutritionTarget, MealLog } from '../../../src/types/nutrition';

// Componente memoizado para las tarjetas de semana
const WeekCard = React.memo(({ 
  week, 
  isCurrent = false, 
  onPress 
}: { 
  week: WeekSummary; 
  isCurrent?: boolean; 
  onPress: () => void;
}) => {
  const weekStartDate = useMemo(() => {
    // Parsear como fecha local para evitar problemas de UTC
    const [year, month, day] = week.weekStart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [week.weekStart]);
  
  const weekEndDate = useMemo(() => {
    // Parsear como fecha local para evitar problemas de UTC
    const [year, month, day] = week.weekEnd.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [week.weekEnd]);
  
  const dateRange = useMemo(() => {
    const start = weekStartDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const end = weekEndDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return `${start} - ${end}`;
  }, [weekStartDate, weekEndDate]);

  const adherenceColor = useMemo(() => {
    return week.adherence >= 70 ? '#ffb300' : week.adherence >= 50 ? '#FFD93D' : '#FF6B6B';
  }, [week.adherence]);

  return (
    <TouchableOpacity
      style={[styles.weekCard, isCurrent && styles.currentWeekCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.weekCardHeader}>
        <Text style={styles.weekCardTitle}>
          {isCurrent ? 'Esta Semana' : dateRange}
        </Text>
        {isCurrent ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Actual</Text>
          </View>
        ) : null}
      </View>
      {isCurrent && (
        <Text style={styles.weekCardDate}>{dateRange}</Text>
      )}
      {!isCurrent && (
        <Text style={styles.weekCardSubtitle}>Semana pasada</Text>
      )}
      
      {/* Adherencia */}
      <View style={styles.adherenceContainer}>
        <Text style={styles.adherenceLabel}>Adherencia</Text>
        <View style={styles.adherenceBar}>
          <View
            style={[
              styles.adherenceFill,
              {
                width: `${week.adherence}%`,
                backgroundColor: adherenceColor,
              },
            ]}
          />
        </View>
        <Text style={styles.adherenceText}>{week.adherence}%</Text>
      </View>

      {/* Resumen */}
      <View style={styles.weekSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Calorías:</Text>
          <Text style={styles.summaryValue}>
            {week.avgCalories} / {week.targetCalories}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Comidas:</Text>
          <Text style={styles.summaryValue}>
            {week.loggedMeals} / {week.expectedMeals}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Días:</Text>
          <Text style={styles.summaryValue}>{week.daysLogged} / 7</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Componente para la semana futura
const NextWeekCard = React.memo(({ onPress }: { onPress: () => void }) => {
  const nextWeekStart = useMemo(() => getNextWeekStart(), []);
  const nextWeekEnd = useMemo(() => {
    const end = new Date(nextWeekStart);
    end.setDate(nextWeekStart.getDate() + 6);
    return end;
  }, [nextWeekStart]);

  const dateRange = useMemo(() => {
    return `${nextWeekStart.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${nextWeekEnd.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
  }, [nextWeekStart, nextWeekEnd]);

  return (
    <TouchableOpacity
      style={[styles.weekCard, styles.nextWeekCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.weekCardHeader}>
        <Text style={styles.weekCardTitle}>Próxima Semana</Text>
        <Ionicons name="lock-closed" size={16} color="#888888" />
      </View>
      <Text style={styles.weekCardDate}>{dateRange}</Text>
      <Text style={styles.weekCardSubtext}>Disponible el lunes</Text>
    </TouchableOpacity>
  );
});

// Skeleton para tarjeta de semana
const SkeletonWeekCard = React.memo(() => (
  <View style={styles.weekCard}>
    <View style={styles.weekCardHeader}>
      <SkeletonBox width="60%" height={16} borderRadius={4} />
      <SkeletonBox width={50} height={20} borderRadius={12} />
    </View>
    <SkeletonBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 12 }} />
    
    {/* Adherencia skeleton */}
    <View style={styles.adherenceContainer}>
      <SkeletonBox width="50%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
      <View style={styles.adherenceBar}>
        <SkeletonBox width="70%" height={6} borderRadius={3} />
      </View>
      <SkeletonBox width="30%" height={12} borderRadius={4} style={{ alignSelf: 'flex-end', marginTop: 4 }} />
    </View>

    {/* Resumen skeleton */}
    <View style={styles.weekSummary}>
      <View style={styles.summaryRow}>
        <SkeletonBox width="40%" height={11} borderRadius={4} />
        <SkeletonBox width="35%" height={11} borderRadius={4} />
      </View>
      <View style={styles.summaryRow}>
        <SkeletonBox width="40%" height={11} borderRadius={4} />
        <SkeletonBox width="35%" height={11} borderRadius={4} />
      </View>
      <View style={styles.summaryRow}>
        <SkeletonBox width="40%" height={11} borderRadius={4} />
        <SkeletonBox width="35%" height={11} borderRadius={4} />
      </View>
    </View>
  </View>
));

// Componente para el scroll de historial
const WeeklyHistoryScrollView = React.memo(({
  weeklyHistory,
  onSelectDate,
  onPressNextWeek,
}: {
  weeklyHistory: WeekSummary[];
  onSelectDate: (date: string) => void;
  onPressNextWeek: () => void;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const pastWeeks = useMemo(() => {
    return weeklyHistory
      .filter((week) => todayStr > week.weekEnd)
      .reverse();
  }, [weeklyHistory, todayStr]);

  const currentWeek = useMemo(() => {
    return weeklyHistory.find(
      (week) => todayStr >= week.weekStart && todayStr <= week.weekEnd
    );
  }, [weeklyHistory, todayStr]);

  // Scroll automático a la semana actual cuando se carga
  const handleContentSizeChange = () => {
    if (scrollViewRef.current && pastWeeks.length > 0) {
      // Calcular la posición X: cada tarjeta tiene ~292px de ancho (280px + 12px margin)
      const cardWidth = 292;
      const scrollPosition = pastWeeks.length * cardWidth;
      
      scrollViewRef.current.scrollTo({
        x: scrollPosition,
        animated: false, // Sin animación para que sea instantáneo
      });
    }
  };

  // También intentar scroll cuando cambian las semanas pasadas
  useEffect(() => {
    if (scrollViewRef.current && pastWeeks.length > 0) {
      // Usar requestAnimationFrame para asegurar que el layout esté completo
      requestAnimationFrame(() => {
        setTimeout(() => {
          const cardWidth = 292;
          const scrollPosition = pastWeeks.length * cardWidth;
          
          scrollViewRef.current?.scrollTo({
            x: scrollPosition,
            animated: false,
          });
        }, 50);
      });
    }
  }, [pastWeeks.length, weeklyHistory.length]);

  return (
    <ScrollView 
      ref={scrollViewRef}
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.weeksContainer}
      removeClippedSubviews={false}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
    >
      {/* Semanas pasadas (izquierda) */}
      {pastWeeks.map((week) => (
        <WeekCard
          key={week.weekStart}
          week={week}
          isCurrent={false}
          onPress={() => router.push(`/(tabs)/nutrition/plan?weekStart=${week.weekStart}` as any)}
        />
      ))}

      {/* Semana actual (centro) */}
      {currentWeek && (
        <WeekCard
          key={currentWeek.weekStart}
          week={currentWeek}
          isCurrent={true}
          onPress={() => router.push(`/(tabs)/nutrition/plan?weekStart=${currentWeek.weekStart}` as any)}
        />
      )}

      {/* Semana siguiente (futura - derecha) */}
      <NextWeekCard onPress={onPressNextWeek} />
    </ScrollView>
  );
});

export default function NutritionHomeScreen() {
  const { user } = useUser();
  const { isLoading, setLoading, executeAsync } = useLoadingState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayTarget, setTodayTarget] = useState<NutritionTarget | null>(null);
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [todayWater, setTodayWater] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<any>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<WeekSummary[]>([]);
  const [showNextWeekModal, setShowNextWeekModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showGeneratePlanModal, setShowGeneratePlanModal] = useState(false);
  const [activePlanData, setActivePlanData] = useState<any>(null);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadNutritionData();
      checkProfileChanges();
      loadWeeklyHistory();
    }
  }, [user]);

  // Recargar datos cada vez que la pantalla recibe focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadTodayData();
      }
    }, [user])
  );

  const loadTodayData = async () => {
    if (!user?.id) return;

    try {
      // Usar selectedDate en lugar de "hoy"
      const targetDate = selectedDate;

      // Cargar logs del día
      const { data: logsData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('datetime', `${targetDate}T00:00:00`)
        .lte('datetime', `${targetDate}T23:59:59`)
        .order('datetime', { ascending: true });

      setTodayLogs((logsData || []) as MealLog[]);

      // Cargar agua del día
      const { data: waterData, error: waterError } = await supabase
        .from('hydration_logs')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (waterError && waterError.code !== 'PGRST116') {
        console.error('Error loading water:', waterError);
      }

      setTodayWater(waterData?.water_ml || 0);

      // Cargar target del día seleccionado
      const { data: targetData, error: targetError } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (targetError && targetError.code !== 'PGRST116') {
        console.error('Error loading target:', targetError);
      }

      setTodayTarget((targetData as NutritionTarget) || null);
    } catch (err) {
      console.error('Error loading today data:', err);
    }
  };

  // Recargar cuando cambia la fecha seleccionada
  useEffect(() => {
    if (user?.id) {
      loadTodayData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Helpers para navegación de fechas
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Hoy';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Ayer';
    } else {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    }
  };

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const changeDateTo = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDatePicker(false);
  };

  const checkProfileChanges = async () => {
    if (!user?.id) return;

    try {
      // Obtener el perfil actual del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('weight, height, goals, activity_types, age, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
      }

      if (!profileData) return;

      // Crear un hash del perfil relevante para nutrición
      const currentProfileHash = JSON.stringify({
        weight: profileData.weight,
        height: profileData.height,
        goals: profileData.goals,
        activity_types: profileData.activity_types,
        age: profileData.age,
        gender: profileData.gender,
      });

      // Obtener el hash anterior (guardado en localStorage/AsyncStorage)
      const { data: nutritionProfile, error: nutritionError } = await supabase
        .from('nutrition_profiles')
        .select('custom_prompts')
        .eq('user_id', user.id)
        .maybeSingle();

      if (nutritionError && nutritionError.code !== 'PGRST116') {
        console.error('Error loading nutrition profile:', nutritionError);
      }

      // Buscar el hash anterior en custom_prompts (lo guardaremos como metadata)
      const storedHash = nutritionProfile?.custom_prompts?.find((p: string) => 
        p.startsWith('__PROFILE_HASH__:')
      );

      const previousHash = storedHash?.replace('__PROFILE_HASH__:', '');

      // Si el perfil cambió, regenerar plan
      if (previousHash && previousHash !== currentProfileHash) {
        console.log('🔄 Perfil del usuario ha cambiado, regenerando plan...');
        
        Alert.alert(
          'Perfil actualizado',
          'Detectamos cambios en tu perfil (peso, altura, objetivo o nivel de actividad). Es necesario recalcular tus calorías y macros.',
          [
            {
              text: 'Solo recalcular calorías',
              onPress: async () => {
                await recalculateTargetsOnly(currentProfileHash);
              },
            },
            {
              text: 'Recalcular y nuevo plan',
              onPress: async () => {
                await regeneratePlanWithNewProfile(currentProfileHash);
              },
            },
          ]
        );
      } else if (!previousHash) {
        // Primera vez, guardar el hash
        await saveProfileHash(currentProfileHash);
      }
    } catch (err) {
      console.error('Error checking profile changes:', err);
    }
  };

  const recalculateTargetsOnly = async (newHash: string) => {
    if (!user?.id) return;

    setIsInitializing(true);
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);

      // Borrar targets existentes de esta semana
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        await supabase
          .from('nutrition_targets')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateStr);
      }

      // Regenerar targets con el perfil actualizado
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        await computeAndSaveTargets(user.id, dateStr);
      }

      // Guardar el nuevo hash
      await saveProfileHash(newHash);

      Alert.alert('¡Calorías actualizadas!', 'Tus objetivos de calorías y macros han sido recalculados.');
      
      // Recargar datos
      loadNutritionData();
    } catch (err: any) {
      console.error('Error recalculating targets:', err);
      Alert.alert('Error', 'No se pudieron recalcular las calorías. Intenta nuevamente.');
    } finally {
      setIsInitializing(false);
    }
  };

  const saveProfileHash = async (hash: string) => {
    if (!user?.id) return;

    try {
      const nutritionProfile = await getNutritionProfile(user.id);
      if (!nutritionProfile) return;

      const customPrompts = nutritionProfile.custom_prompts || [];
      
      // Remover hash anterior si existe
      const filteredPrompts = customPrompts.filter((p: string) => 
        !p.startsWith('__PROFILE_HASH__:')
      );

      // Agregar nuevo hash
      filteredPrompts.push(`__PROFILE_HASH__:${hash}`);

      // Actualizar en la base de datos
      await supabase
        .from('nutrition_profiles')
        .update({ custom_prompts: filteredPrompts })
        .eq('user_id', user.id);

      console.log('✅ Hash de perfil guardado');
    } catch (err) {
      console.error('Error saving profile hash:', err);
    }
  };

  const regeneratePlanWithNewProfile = async (newHash: string) => {
    if (!user?.id) return;

    setIsInitializing(true);
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = monday.toISOString().split('T')[0];

      // Borrar plan existente
      await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start', mondayStr);

      // Borrar targets existentes de esta semana
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        await supabase
          .from('nutrition_targets')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateStr);
      }

      // Regenerar targets
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        await computeAndSaveTargets(user.id, dateStr);
      }

      // Regenerar plan
      await createOrUpdateMealPlan(user.id, mondayStr);

      // Guardar el nuevo hash
      await saveProfileHash(newHash);

      Alert.alert('¡Plan regenerado!', 'Tu plan de nutrición ha sido actualizado con tu nuevo perfil.');
      
      // Recargar datos
      loadNutritionData();
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      Alert.alert('Error', 'No se pudo regenerar el plan. Intenta nuevamente.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGenerateNewPlan = async () => {
    if (!user?.id) return;

    try {
      // Verificar si hay plan activo
      const { data: activePlan } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      // Mostrar modal de selección
      if (activePlan) {
        // Extraer datos del plan activo
        let planData = activePlan.plan_data;
        if (typeof planData === 'string') {
          try {
            planData = JSON.parse(planData);
          } catch (e) {
            console.error('Error parseando plan_data:', e);
            planData = {};
          }
        }
        
        const workoutPlanData = {
          fitness_level: planData.userData?.fitness_level || planData.fitness_level,
          goals: planData.userData?.goals || planData.goals || [],
          activity_types: planData.userData?.activity_types || planData.activity_types || [],
          available_days: planData.userData?.available_days || planData.available_days || planData.days_per_week,
          session_duration: planData.userData?.session_duration || planData.session_duration,
        };
        
        setActivePlanData(workoutPlanData);
        setShowSelectionModal(true);
      } else {
        // No hay plan activo, mostrar cartel
        Alert.alert(
          'No hay plan activo',
          'No tienes un plan de entrenamiento activo. Crea un plan de entrenamiento para poder generar una dieta basada en ese plan.',
          [
            {
              text: 'Cerrar',
              style: 'cancel',
            },
            {
              text: 'Ir a Entrenamiento',
              onPress: () => {
                router.push('/(tabs)/workout' as any);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Error checking active plan:', err);
      Alert.alert('Error', 'No se pudo verificar el plan activo. Intenta nuevamente.');
    }
  };

  const addPrompt = () => {
    if (!newPrompt.trim()) {
      Alert.alert('Error', 'Escribe una preferencia.');
      return;
    }

    if (newPrompt.length > 80) {
      Alert.alert('Error', 'Máximo 80 caracteres por preferencia.');
      return;
    }

    if (customPrompts.length >= 10) {
      Alert.alert('Error', 'Máximo 10 preferencias.');
      return;
    }

    setCustomPrompts([...customPrompts, newPrompt.trim()]);
    setNewPrompt('');
  };

  const removePrompt = (index: number) => {
    setCustomPrompts(customPrompts.filter((_, i) => i !== index));
  };

  const handleGenerateWithActivePlan = async () => {
    if (!user?.id || !activePlanData) return;

    // Validaciones
    if (mealsPerDay < 1 || mealsPerDay > 6) {
      Alert.alert('Error', 'Las comidas por día deben estar entre 1 y 6.');
      return;
    }

    if (customPrompts.length > 10) {
      Alert.alert('Error', 'Máximo 10 preferencias personalizadas.');
      return;
    }

    // Confirmar antes de generar
    Alert.alert(
      '¿Generar nuevo plan?',
      '¿Estás seguro de generar un nuevo plan? Se borrarán los datos del plan nutricional anterior.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Generar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Guardar configuración de nutrición
              const currentProfile = await getNutritionProfile(user.id);
              const existingHash = currentProfile?.custom_prompts?.find((p: string) => 
                p.startsWith('__PROFILE_HASH__:')
              );
              
              const promptsToSave = existingHash 
                ? [...customPrompts, existingHash]
                : customPrompts;

              await upsertNutritionProfile(user.id, {
                meals_per_day: mealsPerDay,
                fasting_window: null,
                custom_prompts: promptsToSave,
              });

              // Obtener el plan activo completo
              const { data: activePlan } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

              if (activePlan) {
                setShowGeneratePlanModal(false);
                await regenerateMealPlan(true, activePlan);
              }
            } catch (err: any) {
              console.error('Error saving configuration:', err);
              Alert.alert('Error', 'No se pudo guardar la configuración. Intenta nuevamente.');
            }
          },
        },
      ]
    );
  };

  const regenerateMealPlan = async (useActivePlan: boolean, activePlan: any) => {
    if (!user?.id) return;

    try {
      setIsInitializing(true);
      
      // Obtener lunes de esta semana
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = monday.toISOString().split('T')[0];

      // Extraer datos del plan activo si se usa
      let workoutPlanData = null;
      if (useActivePlan && activePlan) {
        // Normalizar plan_data: puede venir como string o como objeto
        let planData = activePlan.plan_data;
        if (typeof planData === 'string') {
          try {
            planData = JSON.parse(planData);
          } catch (e) {
            console.error('Error parseando plan_data:', e);
            planData = {};
          }
        }

        // Extraer datos relevantes del plan para usar en la generación de dieta
        // Priorizar userData si existe (datos del formulario), sino usar datos directos del plan
        workoutPlanData = {
          fitness_level: planData.userData?.fitness_level || planData.fitness_level,
          goals: planData.userData?.goals || planData.goals || [],
          activity_types: planData.userData?.activity_types || planData.activity_types || [],
          available_days: planData.userData?.available_days || planData.available_days || planData.days_per_week,
          session_duration: planData.userData?.session_duration || planData.session_duration,
        };
        console.log('📋 Usando datos del plan activo para generar dieta:', workoutPlanData);
      }

      // Borrar plan existente
      await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start', mondayStr);

      // Borrar targets existentes de esta semana
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        await supabase
          .from('nutrition_targets')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateStr);
      }

      // Regenerar targets (si usa plan activo, se pasarán esos datos)
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        await computeAndSaveTargets(user.id, dateStr, workoutPlanData);
      }

      // Regenerar plan (pasar datos del plan activo si corresponde)
      await createOrUpdateMealPlan(user.id, mondayStr, workoutPlanData);

      Alert.alert('¡Listo!', 'Tu nuevo plan de comidas ha sido generado.');
      loadNutritionData();
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      Alert.alert('Error', 'No se pudo regenerar el plan. Intenta nuevamente.');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadWeeklyHistory = async () => {
    if (!user?.id) return;

    setLoadingHistory(true);
    try {
      const history = await getWeeklyHistory(user.id, 8); // Últimas 8 semanas
      setWeeklyHistory(history);
    } catch (err) {
      console.error('Error loading weekly history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadNutritionData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Verificar si existe perfil nutricional
      const profile = await getNutritionProfile(user.id);
      if (!profile) {
        // Redirigir a settings para configurar
        setLoading(false);
        Alert.alert(
          'Configuración Requerida',
          'Necesitas configurar tu perfil nutricional primero.',
          [
            {
              text: 'Configurar',
              onPress: () => router.push('/(tabs)/nutrition/settings' as any),
            },
          ]
        );
        return;
      }

      // Cargar target del día
      const { data: targetData, error: targetError } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (targetError && targetError.code !== 'PGRST116') {
        console.error('Error loading target:', targetError);
      }

      if (!targetData) {
        // No hay target, inicializar (pero no bloquear la UI)
        setLoading(false); // Quitar loading antes de inicializar para que no se quede cargando
        await initializeWeek();
        // Recargar datos después de inicializar
        await loadTodayData();
        return;
      } else {
        setTodayTarget(targetData as NutritionTarget);
        
        // Verificar si existe plan de comidas para esta semana
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(todayDate);
        monday.setDate(todayDate.getDate() + diff);
        const mondayStr = monday.toISOString().split('T')[0];
        
        const { data: planData, error: planError } = await supabase
          .from('meal_plans')
          .select('id')
          .eq('user_id', user.id)
          .eq('week_start', mondayStr)
          .maybeSingle();

        if (planError && planError.code !== 'PGRST116') {
          console.error('Error loading meal plan:', planError);
        }
        
        if (!planData) {
          // No hay plan, generarlo en segundo plano (no bloquear)
          console.log('📋 No se encontró plan de comidas, generando...');
          // Generar plan sin bloquear la UI
          createOrUpdateMealPlan(user.id, mondayStr).catch((err) => {
            console.error('Error generating meal plan:', err);
          });
        }
      }

      // Cargar logs del día
      const { data: logsData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('datetime', `${today}T00:00:00`)
        .lte('datetime', `${today}T23:59:59`)
        .order('datetime', { ascending: true });

      setTodayLogs((logsData || []) as MealLog[]);

      // Cargar agua del día
      const { data: waterData, error: waterError } = await supabase
        .from('hydration_logs')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (waterError && waterError.code !== 'PGRST116') {
        console.error('Error loading water:', waterError);
      }

      setTodayWater(waterData?.water_ml || 0);
    } catch (err) {
      console.error('Error loading nutrition data:', err);
      Alert.alert('Error', 'No se pudieron cargar los datos de nutrición. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const initializeWeek = async () => {
    if (!user?.id) return;

    setIsInitializing(true);
    try {
      // Obtener lunes de esta semana
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para lunes
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = monday.toISOString().split('T')[0];

      // Generar targets para toda la semana
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const result = await computeAndSaveTargets(user.id, dateStr);
        if (!result.success) {
          console.error('Error computing targets for', dateStr, result.error);
        }

        // Si es hoy, guardar el target
        if (dateStr === new Date().toISOString().split('T')[0]) {
          setTodayTarget(result.target || null);
        }
      }

      // Generar plan de comidas
      await createOrUpdateMealPlan(user.id, mondayStr);

      // Aplicar ajuste semanal si corresponde (si es lunes)
      if (dayOfWeek === 1) {
        const adjustmentResult = await applyWeeklyAdjustment(user.id);
        if (adjustmentResult.success && adjustmentResult.adjustment) {
          setAdjustmentData(adjustmentResult.adjustment);
          setShowAdjustmentModal(true);
        }
      }

      Alert.alert('¡Listo!', 'Tu plan nutricional ha sido generado.');
    } catch (err) {
      console.error('Error initializing week:', err);
      Alert.alert('Error', 'No se pudo inicializar tu plan semanal.');
    } finally {
      setIsInitializing(false);
    }
  };

  const calculateConsumed = () => {
    return todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein_g: acc.protein_g + log.protein_g,
        carbs_g: acc.carbs_g + log.carbs_g,
        fats_g: acc.fats_g + log.fats_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    );
  };

  const consumed = calculateConsumed();
  const targetWater = 3000; // ml, podría calcularse dinámicamente

  if (isLoading || isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <SkeletonNutrition />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Mantener el LoadingOverlay para otros casos
  if (false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LoadingOverlay 
          visible={true} 
          message={isInitializing ? 'Generando tu plan nutricional...' : 'Cargando...'} 
          fullScreen 
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              try {
                if (router.canGoBack && router.canGoBack()) {
                  router.back();
                }
              } catch (error) {
                // Si no hay pantalla anterior, no hacer nada (ya estamos en la tab de nutrición)
              }
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nutrición</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Acciones rápidas */}
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/plan' as any)}
            >
              <Ionicons name="restaurant" size={32} color="#ffb300" />
              <Text style={styles.actionText}>Ver Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/(tabs)/nutrition/log?date=${selectedDate}` as any)}
            >
              <Ionicons name="add-circle-outline" size={32} color="#ffb300" />
              <Text style={styles.actionText}>Registrar Comida</Text>
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <Text style={styles.actionSubtext}>Para el día seleccionado</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/grocery' as any)}
            >
              <Ionicons name="cart" size={32} color="#ffb300" />
              <Text style={styles.actionText}>Lista de Compras</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleGenerateNewPlan}
            >
              <Ionicons name="create" size={32} color="#ffb300" />
              <Text style={styles.actionText}>Generar Plan Nutricional</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Macros del día */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 {formatDate(selectedDate)}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
                <Ionicons name="chevron-back" size={20} color="#ffb300" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)} 
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>{new Date(selectedDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavButton}>
                <Ionicons name="chevron-forward" size={20} color="#ffb300" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push(`/(tabs)/nutrition/today-detail?date=${selectedDate}` as any)}
          >
          <View style={styles.macrosCard}>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Calorías</Text>
              <Text style={styles.macroValue}>
                {consumed.calories} / {todayTarget?.calories || 0} kcal
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (consumed.calories / (todayTarget?.calories || 1)) * 100)}%`,
                    backgroundColor: '#ffb300',
                  },
                ]}
              />
            </View>

            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Proteína</Text>
              <Text style={styles.macroValue}>
                {consumed.protein_g}g / {todayTarget?.protein_g || 0}g
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (consumed.protein_g / (todayTarget?.protein_g || 1)) * 100)}%`,
                    backgroundColor: '#FF6B6B',
                  },
                ]}
              />
            </View>

            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Carbohidratos</Text>
              <Text style={styles.macroValue}>
                {consumed.carbs_g}g / {todayTarget?.carbs_g || 0}g
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (consumed.carbs_g / (todayTarget?.carbs_g || 1)) * 100)}%`,
                    backgroundColor: '#FFD93D',
                  },
                ]}
              />
            </View>

            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Grasas</Text>
              <Text style={styles.macroValue}>
                {consumed.fats_g}g / {todayTarget?.fats_g || 0}g
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (consumed.fats_g / (todayTarget?.fats_g || 1)) * 100)}%`,
                    backgroundColor: '#A8E6CF',
                  },
                ]}
              />
            </View>
          </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push(`/(tabs)/nutrition/today-detail?date=${selectedDate}` as any)}
            style={styles.detailButton}
          >
            <Text style={styles.detailButtonText}>Ver detalle completo</Text>
            <Ionicons name="chevron-forward" size={20} color="#ffb300" />
          </TouchableOpacity>
        </View>

        {/* Modal de selección de fecha */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar fecha</Text>
              <ScrollView style={styles.dateList}>
                {Array.from({ length: 30 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - i);
                  const dateStr = date.toISOString().split('T')[0];
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={styles.dateItem}
                      onPress={() => changeDateTo(dateStr)}
                    >
                      <Text style={styles.dateItemText}>{formatDate(dateStr)}</Text>
                      {dateStr === selectedDate && (
                        <Ionicons name="checkmark" size={20} color="#ffb300" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Hidratación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💧 Hidratación</Text>
          <View style={styles.waterCard}>
            <Ionicons name="water" size={40} color="#ffb300" />
            <Text style={styles.waterText}>
              {todayWater} / {targetWater} ml
            </Text>
            <TouchableOpacity
              style={styles.addWaterButton}
              onPress={() => router.push(`/(tabs)/nutrition/log?type=water&date=${selectedDate}` as any)}
            >
              <Ionicons name="add-circle" size={28} color="#ffb300" />
              <Text style={styles.addWaterText}>Agregar agua</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Historial Semanal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Historial Semanal</Text>
          {loadingHistory ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weeksContainer}
            >
              <SkeletonWeekCard />
              <SkeletonWeekCard />
              <SkeletonWeekCard />
            </ScrollView>
          ) : (
            <WeeklyHistoryScrollView
              weeklyHistory={weeklyHistory}
              onSelectDate={setSelectedDate}
              onPressNextWeek={() => setShowNextWeekModal(true)}
            />
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modal de ajuste nutricional */}
      <NutritionAdjustmentModal
        visible={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        adjustment={adjustmentData}
      />

      {/* Modal de semana futura */}
      <Modal
        visible={showNextWeekModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNextWeekModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar-outline" size={32} color="#ffb300" />
              <Text style={styles.modalTitle}>Próxima Semana</Text>
            </View>
            <Text style={styles.modalMessage}>
              El plan de la próxima semana se habilitará el lunes siguiente y se generará automáticamente en base a la información recolectada de la semana actual.
            </Text>
            <Text style={styles.modalSubtext}>
              Tu plan de nutrición se ajustará automáticamente según tu progreso, adherencia y resultados de esta semana.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNextWeekModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de selección de tipo de plan */}
      <Modal
        visible={showSelectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSelectionModal(false)}
        onDismiss={() => {
          // Este callback se ejecuta cuando el modal se cierra completamente
        }}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContent} pointerEvents="box-none">
            <View pointerEvents="auto">
              <Text style={styles.modalTitle}>¿Cómo quieres crear tu plan?</Text>
              <Text style={styles.modalSubtitle}>
                Elige el método que prefieras para generar tu plan de nutrición
              </Text>
              
              <TouchableOpacity
                style={[styles.selectionOption, styles.selectionOptionPrimary]}
                onPress={async () => {
                  setShowSelectionModal(false);
                  // Usar requestAnimationFrame para asegurar que el modal se cierre antes de navegar
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      setShowGeneratePlanModal(true);
                    });
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="restaurant" size={28} color="#ffb300" />
                </View>
                <Text style={styles.selectionOptionTitlePrimary}>Basada en plan activo</Text>
                <Text style={styles.selectionOptionDescriptionPrimary}>
                  Genera tu dieta usando los parámetros de tu plan de entrenamiento activo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectionOption, styles.selectionOptionSecondary]}
                onPress={async () => {
                  setShowSelectionModal(false);
                  // Usar requestAnimationFrame para asegurar que el modal se cierre antes de navegar
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      router.push({
                        pathname: '/(tabs)/nutrition/settings' as any,
                        params: {
                          useActivePlan: 'false',
                        },
                      });
                    });
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="settings" size={28} color="#ffb300" />
                </View>
                <Text style={styles.selectionOptionTitleSecondary}>Con objetivos diferentes</Text>
                <Text style={styles.selectionOptionDescriptionSecondary}>
                  Configura objetivos y preferencias personalizadas para tu plan de nutrición
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSelectionModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de generar plan con plan activo */}
      <Modal
        visible={showGeneratePlanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGeneratePlanModal(false)}
      >
        <View style={styles.generatePlanModalOverlay} pointerEvents="box-none">
          <View style={styles.generatePlanModalContent} pointerEvents="box-none">
            <View pointerEvents="auto">
              <View style={styles.generatePlanModalHeader}>
                <Text style={styles.generatePlanModalTitle}>Generar Plan de Nutrición</Text>
                <TouchableOpacity
                  onPress={() => setShowGeneratePlanModal(false)}
                  style={styles.generatePlanModalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.generatePlanModalScroll} 
                contentContainerStyle={styles.generatePlanModalScrollContent}
                showsVerticalScrollIndicator={false}
              >
              {/* Información del Plan Activo */}
              {activePlanData && (
                <View style={styles.generatePlanSection}>
                  <Text style={styles.generatePlanSectionTitle}>📋 Plan de Entrenamiento Activo</Text>
                  <View style={styles.generatePlanInfoCard}>
                    <View style={styles.generatePlanInfoRow}>
                      <Text style={styles.generatePlanInfoLabel}>Nivel de Fitness:</Text>
                      <Text style={styles.generatePlanInfoValue}>
                        {activePlanData.fitness_level === 'beginner' ? 'Principiante' :
                         activePlanData.fitness_level === 'intermediate' ? 'Intermedio' :
                         activePlanData.fitness_level === 'advanced' ? 'Avanzado' :
                         activePlanData.fitness_level || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.generatePlanInfoRow}>
                      <Text style={styles.generatePlanInfoLabel}>Objetivos:</Text>
                      <View style={styles.generatePlanTagsContainer}>
                        {(activePlanData.goals || []).map((goal: string, index: number) => {
                          const goalMap: { [key: string]: string } = {
                            weight_loss: 'Perder peso',
                            muscle_gain: 'Ganar músculo',
                            strength: 'Aumentar fuerza',
                            endurance: 'Mejorar resistencia',
                            flexibility: 'Flexibilidad',
                            general_fitness: 'Forma general',
                          };
                          return (
                            <View key={index} style={styles.generatePlanTag}>
                              <Text style={styles.generatePlanTagText}>{goalMap[goal] || goal}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    <View style={styles.generatePlanInfoRow}>
                      <Text style={styles.generatePlanInfoLabel}>Tipos de Actividad:</Text>
                      <View style={styles.generatePlanTagsContainer}>
                        {(activePlanData.activity_types || []).map((activity: string, index: number) => {
                          const activityMap: { [key: string]: string } = {
                            cardio: 'Cardio',
                            strength: 'Fuerza',
                            sports: 'Deportes',
                            yoga: 'Yoga/Pilates',
                            hiit: 'HIIT',
                            mixed: 'Mixto',
                          };
                          return (
                            <View key={index} style={styles.generatePlanTag}>
                              <Text style={styles.generatePlanTagText}>{activityMap[activity] || activity}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    <View style={styles.generatePlanInfoRow}>
                      <Text style={styles.generatePlanInfoLabel}>Días por Semana:</Text>
                      <Text style={styles.generatePlanInfoValue}>{activePlanData.available_days || 0} días</Text>
                    </View>
                    <View style={styles.generatePlanInfoRow}>
                      <Text style={styles.generatePlanInfoLabel}>Duración por Sesión:</Text>
                      <Text style={styles.generatePlanInfoValue}>{activePlanData.session_duration || 0} minutos</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Comidas por día */}
              <View style={styles.generatePlanSection}>
                <Text style={styles.generatePlanSectionTitle}>🍽️ Comidas por Día</Text>
                <View style={styles.generatePlanStepperContainer}>
                  <TouchableOpacity
                    style={styles.generatePlanStepperButton}
                    onPress={() => setMealsPerDay(Math.max(1, mealsPerDay - 1))}
                    disabled={mealsPerDay <= 1}
                  >
                    <Ionicons
                      name="remove-circle"
                      size={32}
                      color={mealsPerDay <= 1 ? '#444444' : '#ffb300'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.generatePlanStepperValue}>{mealsPerDay}</Text>
                  <TouchableOpacity
                    style={styles.generatePlanStepperButton}
                    onPress={() => setMealsPerDay(Math.min(6, mealsPerDay + 1))}
                    disabled={mealsPerDay >= 6}
                  >
                    <Ionicons
                      name="add-circle"
                      size={32}
                      color={mealsPerDay >= 6 ? '#444444' : '#ffb300'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preferencias personalizadas */}
              <View style={styles.generatePlanSection}>
                <Text style={styles.generatePlanSectionTitle}>✨ Preferencias Personalizadas</Text>
                <Text style={styles.generatePlanSectionHelper}>
                  Estas preferencias afectarán tu plan de comidas. Ejemplos: "prefiero platos rápidos",
                  "evitar picantes", "más opciones con pescado", "budget bajo".
                </Text>

                <View style={styles.generatePlanInputContainer}>
                  <TextInput
                    style={styles.generatePlanInput}
                    value={newPrompt}
                    onChangeText={setNewPrompt}
                    placeholder="Ej: prefiero comidas rápidas"
                    placeholderTextColor="#666666"
                    maxLength={80}
                    onSubmitEditing={addPrompt}
                  />
                  <TouchableOpacity style={styles.generatePlanAddButton} onPress={addPrompt}>
                    <Ionicons name="add" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.generatePlanPromptsList}>
                  {customPrompts.map((prompt, index) => (
                    <View key={index} style={styles.generatePlanPromptChip}>
                      <Text style={styles.generatePlanPromptText}>{prompt}</Text>
                      <TouchableOpacity onPress={() => removePrompt(index)}>
                        <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <Text style={styles.generatePlanPromptsCount}>
                  {customPrompts.length} / 10 preferencias
                </Text>
              </View>

              {/* Botón generar */}
              <TouchableOpacity
                style={[styles.generatePlanButton, isInitializing && styles.generatePlanButtonDisabled]}
                onPress={handleGenerateWithActivePlan}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <>
                    <Ionicons name="create" size={24} color="#1a1a1a" />
                    <Text style={styles.generatePlanButtonText}>Generar Plan Nutricional</Text>
                  </>
                )}
              </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  macrosCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 14,
    color: '#888888',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  waterCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  waterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 16,
  },
  addWaterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addWaterText: {
    fontSize: 16,
    color: '#ffb300',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#ffb300',
    marginTop: 4,
    textAlign: 'center',
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 8,
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 8,
  },
  dateButtonText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '600',
  },
  detailButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffb300',
  },
  detailButtonText: {
    color: '#ffb300',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  dateList: {
    maxHeight: 400,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  dateItemText: {
    fontSize: 16,
    color: '#ffffff',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ffb300',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  weeksContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  weekCard: {
    width: 280,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginRight: 12,
  },
  currentWeekCard: {
    borderColor: '#ffb300',
    backgroundColor: '#1a2a2a',
  },
  nextWeekCard: {
    borderColor: '#444444',
    backgroundColor: '#1a1a1a',
    opacity: 0.7,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  weekCardDate: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
  },
  weekCardSubtitle: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  weekCardSubtext: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  currentBadge: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  adherenceContainer: {
    marginBottom: 12,
  },
  adherenceLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  adherenceBar: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  adherenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
  },
  weekSummary: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888888',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  // Estilos del modal de generar plan
  generatePlanModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  generatePlanModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  generatePlanModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  generatePlanModalCloseButton: {
    padding: 4,
  },
  generatePlanModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  generatePlanModalScroll: {
    maxHeight: 500,
  },
  generatePlanModalScrollContent: {
    paddingBottom: 10,
  },
  generatePlanSection: {
    marginBottom: 32,
  },
  generatePlanSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  generatePlanSectionHelper: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    lineHeight: 20,
  },
  generatePlanInfoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  generatePlanInfoRow: {
    marginBottom: 16,
  },
  generatePlanInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 8,
  },
  generatePlanInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  generatePlanTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  generatePlanTag: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  generatePlanTagText: {
    fontSize: 14,
    color: '#ffffff',
  },
  generatePlanStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  generatePlanStepperButton: {
    padding: 8,
  },
  generatePlanStepperValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginHorizontal: 40,
    minWidth: 60,
    textAlign: 'center',
  },
  generatePlanInputContainer: {
    marginTop: 16,
    position: 'relative',
  },
  generatePlanInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  generatePlanAddButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#ffb300',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatePlanPromptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  generatePlanPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 8,
  },
  generatePlanPromptText: {
    fontSize: 14,
    color: '#ffffff',
  },
  generatePlanPromptsCount: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
    textAlign: 'right',
  },
  generatePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 20,
  },
  generatePlanButtonDisabled: {
    opacity: 0.6,
  },
  generatePlanButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  // Estilos del modal de selección (iguales al de entrenamiento)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  selectionOption: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: '#1f1f1f',
  },
  selectionOptionPrimary: {
    borderColor: '#ffb300',
    backgroundColor: '#1f1f1f',
  },
  selectionOptionSecondary: {
    borderColor: '#ffb300',
    backgroundColor: '#1f1f1f',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionOptionTitlePrimary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionOptionDescriptionPrimary: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectionOptionTitleSecondary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionOptionDescriptionSecondary: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalCloseButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  modalCloseButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});

