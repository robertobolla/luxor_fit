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
import { useTranslation } from 'react-i18next';
import { supabase } from '@/services/supabase';
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
import WeeklyRenewalModal from '../../../src/components/WeeklyRenewalModal';
import PlanAdjustmentModal from '../../../src/components/PlanAdjustmentModal';
import { useNutritionStore } from '../../../src/store/nutritionStore';
import { NutritionTarget, MealLog } from '../../../src/types/nutrition';
import { useTutorial } from '@/contexts/TutorialContext';
import { HelpModal } from '@/components/HelpModal';
import { TutorialTooltip } from '@/components/TutorialTooltip';

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
  const { t } = useTranslation();
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
          {isCurrent ? t('nutritionIndex.thisWeek') : dateRange}
        </Text>
        {isCurrent ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>{t('nutritionIndex.current')}</Text>
          </View>
        ) : null}
      </View>
      {isCurrent && (
        <Text style={styles.weekCardDate}>{dateRange}</Text>
      )}
      {!isCurrent && (
        <Text style={styles.weekCardSubtitle}>{t('nutritionIndex.lastWeek')}</Text>
      )}
      
      {/* Adherencia */}
      <View style={styles.adherenceContainer}>
        <Text style={styles.adherenceLabel}>{t('nutrition.adherence')}</Text>
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
          <Text style={styles.summaryLabel}>{t('nutritionIndex.calories')}</Text>
          <Text style={styles.summaryValue}>
            {week.avgCalories} / {week.targetCalories}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('nutritionIndex.meals')}</Text>
          <Text style={styles.summaryValue}>
            {week.loggedMeals} / {week.expectedMeals}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('nutritionIndex.days')}</Text>
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
  onNavigateToPlan,
}: {
  weeklyHistory: WeekSummary[];
  onSelectDate: (date: string) => void;
  onPressNextWeek: () => void;
  onNavigateToPlan: (weekStart?: string) => void;
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      // Limpiar timeout anterior si existe
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Usar requestAnimationFrame para asegurar que el layout esté completo
      requestAnimationFrame(() => {
        scrollTimeoutRef.current = setTimeout(() => {
          const cardWidth = 292;
          const scrollPosition = pastWeeks.length * cardWidth;
          
          scrollViewRef.current?.scrollTo({
            x: scrollPosition,
            animated: false,
          });
          scrollTimeoutRef.current = null; // Limpiar referencia después de ejecutar
        }, 50);
      });
    }
    
    // Cleanup al desmontar
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        console.log('🧹 Timeout de scroll limpiado');
      }
    };
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
          onPress={() => onNavigateToPlan(week.weekStart)}
        />
      ))}

      {/* Semana actual (centro) */}
      {currentWeek && (
        <WeekCard
          key={currentWeek.weekStart}
          week={currentWeek}
          isCurrent={true}
          onPress={() => onNavigateToPlan(currentWeek.weekStart)}
        />
      )}

      {/* Semana siguiente (futura - derecha) */}
      <NextWeekCard onPress={onPressNextWeek} />
    </ScrollView>
  );
});

export default function NutritionHomeScreen() {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
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
  const [showWeeklyRenewalModal, setShowWeeklyRenewalModal] = useState(false);
  const [pendingWeeklyRenewal, setPendingWeeklyRenewal] = useState(false);
  const [showPlanAdjustmentModal, setShowPlanAdjustmentModal] = useState(false);
  const [planAdjustmentData, setPlanAdjustmentData] = useState<any>(null);

  // Tutorial states
  const { 
    showHelpModal, 
    setShowHelpModal, 
    hasCompletedTutorial,
    shouldShowTooltip,
    completeTutorial,
    markTooltipShown 
  } = useTutorial();
  const [showNutritionTooltips, setShowNutritionTooltips] = useState(false);
  const [lastWeekData, setLastWeekData] = useState<{ weekStart: string; weekEnd: string } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadNutritionData();
      checkProfileChanges();
      loadWeeklyHistory();
      checkWeeklyRenewal();
    }
  }, [user]);

  // Mostrar tooltips la primera vez
  useEffect(() => {
    if (shouldShowTooltip('NUTRITION') && user?.id && !isLoading) {
      const timer = setTimeout(() => {
        setShowNutritionTooltips(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTooltip, user, isLoading]);

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
      return t('commonUI.today');
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return t('commonUI.yesterday');
    } else {
      const days = [
        t('weekDays.sunday'),
        t('weekDays.monday'),
        t('weekDays.tuesday'),
        t('weekDays.wednesday'),
        t('weekDays.thursday'),
        t('weekDays.friday'),
        t('weekDays.saturday')
      ];
      const months = [
        t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
        t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
        t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec')
      ];
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
      // NOTA: NO incluimos weight porque cambia frecuentemente con las mediciones
      // El peso se usa automáticamente al generar el siguiente plan
      const currentProfileHash = JSON.stringify({
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
          t('nutrition.profileUpdated'),
          t('nutrition.profileUpdatedMessage'),
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

      Alert.alert(t('nutrition.caloriesUpdated'), t('nutrition.caloriesUpdatedMessage'));
      
      // Recargar datos
      loadNutritionData();
    } catch (err: any) {
      console.error('Error recalculating targets:', err);
      Alert.alert(t('common.error'), t('nutrition.recalcError'));
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

      Alert.alert(t('nutrition.planRegenerated'), t('nutrition.planRegeneratedMessage'));
      
      // Recargar datos
      loadNutritionData();
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      Alert.alert(t('common.error'), t('nutrition.regenerateError'));
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
        
        const typedPlanData = planData as { userData?: any; fitness_level?: string; goals?: string[]; activity_types?: string[]; available_days?: number; days_per_week?: number } | null;
        const workoutPlanData = {
          fitness_level: typedPlanData?.userData?.fitness_level || typedPlanData?.fitness_level,
          goals: typedPlanData?.userData?.goals || typedPlanData?.goals || [],
          activity_types: typedPlanData?.userData?.activity_types || typedPlanData?.activity_types || [],
          available_days: typedPlanData?.userData?.available_days || typedPlanData?.available_days || typedPlanData?.days_per_week,
        };
        
        setActivePlanData(workoutPlanData);
        setShowSelectionModal(true);
      } else {
        // No hay plan activo, mostrar cartel
        Alert.alert(
          t('nutrition.noActivePlan'),
          t('nutrition.noActivePlanMessage'),
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
      Alert.alert(t('common.error'), t('nutrition.verifyPlanError'));
    }
  };

  const addPrompt = () => {
    if (!newPrompt.trim()) {
      Alert.alert(t('common.error'), t('nutrition.writePreference'));
      return;
    }

    if (newPrompt.length > 80) {
      Alert.alert(t('common.error'), t('nutrition.maxCharsPreference'));
      return;
    }

    if (customPrompts.length >= 10) {
      Alert.alert(t('common.error'), t('nutrition.maxPreferences'));
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
      Alert.alert(t('common.error'), t('nutrition.mealsPerDayError'));
      return;
    }

    if (customPrompts.length > 10) {
      Alert.alert(t('common.error'), t('nutrition.maxPreferencesError'));
      return;
    }

    // Confirmar antes de generar
    Alert.alert(
      t('nutrition.generateNewPlan'),
      t('nutrition.generateNewPlanConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.generate'),
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
              Alert.alert(t('common.error'), t('nutrition.saveConfigError'));
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
        const typedPlanData2 = planData as { userData?: any; fitness_level?: string; goals?: string[]; activity_types?: string[]; available_days?: number; days_per_week?: number } | null;
        workoutPlanData = {
          fitness_level: typedPlanData2?.userData?.fitness_level || typedPlanData2?.fitness_level,
          goals: typedPlanData2?.userData?.goals || typedPlanData2?.goals || [],
          activity_types: typedPlanData2?.userData?.activity_types || typedPlanData2?.activity_types || [],
          available_days: typedPlanData2?.userData?.available_days || typedPlanData2?.available_days || typedPlanData2?.days_per_week,
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

      Alert.alert(t('nutrition.ready'), t('nutrition.mealPlanGenerated'));
      loadNutritionData();
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      Alert.alert(t('common.error'), t('nutrition.regenerateError'));
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

  /**
   * Verificar si necesitamos mostrar el modal de renovación semanal
   * Se muestra cuando:
   * 1. Hay un plan de la semana pasada
   * 2. No hay plan para la semana actual
   */
  const checkWeeklyRenewal = async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      // Calcular el lunes de la semana actual
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() + diff);
      const thisMondayStr = thisMonday.toISOString().split('T')[0];

      // Calcular el lunes y domingo de la semana pasada
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);

      const lastWeekStart = lastMonday.toISOString().split('T')[0];
      const lastWeekEnd = lastSunday.toISOString().split('T')[0];

      // Verificar si existe un plan de la semana pasada
      const { data: lastWeekPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', lastWeekStart)
        .maybeSingle();

      if (!lastWeekPlan) return; // No hay plan de la semana pasada

      // Verificar si ya existe un plan para esta semana
      const { data: thisWeekPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', thisMondayStr)
        .maybeSingle();

      if (thisWeekPlan) return; // Ya hay plan para esta semana

      // Mostrar modal de renovación y marcar que hay renovación pendiente
      setLastWeekData({ weekStart: lastWeekStart, weekEnd: lastWeekEnd });
      setPendingWeeklyRenewal(true);
      setShowWeeklyRenewalModal(true);
    } catch (err) {
      console.error('Error checking weekly renewal:', err);
    }
  };

  /**
   * Función para navegar al plan semanal verificando si hay renovación pendiente
   */
  const handleNavigateToPlan = (weekStart?: string) => {
    if (pendingWeeklyRenewal) {
      // Si hay renovación pendiente, mostrar modal
      setShowWeeklyRenewalModal(true);
      return;
    }
    
    // Si no hay renovación pendiente, navegar al plan
    if (weekStart) {
      router.push(`/(tabs)/nutrition/plan?weekStart=${weekStart}` as any);
    } else {
      router.push('/(tabs)/nutrition/plan' as any);
    }
  };

  /**
   * Generar plan de la siguiente semana con ajustes basados en métricas y adherencia
   */
  const handleWeeklyRenewal = async (metrics: {
    weight: number;
    bodyFat?: number;
    muscle?: number;
    adherence: number;
  }) => {
    if (!user?.id) return;

    try {
      console.log('📊 Generando plan semanal con nuevas métricas:', metrics);
      
      const hasBodyComposition = !!(metrics.bodyFat && metrics.muscle);
      const isLowAdherence = metrics.adherence < 50;
      
      // Determinar tipo de ajuste
      let adjustmentType: 'repeat' | 'basic' | 'full' = 'full';
      if (isLowAdherence && !hasBodyComposition) {
        adjustmentType = 'repeat';
      } else if (!hasBodyComposition) {
        adjustmentType = 'basic';
      }

      // 1. Obtener targets actuales antes del ajuste
      const { data: currentTargets } = await supabase
        .from('nutrition_targets')
        .select('calories, protein_g, carbs_g, fats_g')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const oldCalories = currentTargets?.calories || 2000;
      const oldProtein = currentTargets?.protein_g || 150;
      const oldCarbs = currentTargets?.carbs_g || 250;
      const oldFats = currentTargets?.fats_g || 65;

      // 2. Actualizar métricas en user_profiles
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          weight: metrics.weight,
          body_fat_percentage: metrics.bodyFat || null,
          muscle_percentage: metrics.muscle || null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating metrics:', updateError);
        throw new Error('No se pudieron actualizar las métricas.');
      }

      // 3. Calcular la semana actual (lunes de esta semana)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() + diff);
      const mondayStr = thisMonday.toISOString().split('T')[0];

      let newCalories = oldCalories;
      let newProtein = oldProtein;
      let newCarbs = oldCarbs;
      let newFats = oldFats;

      if (adjustmentType === 'repeat') {
        // Solo copiar el plan de la semana pasada sin cambios
        console.log('📋 Adherencia baja, repitiendo plan anterior');
        
        // Copiar targets de la semana pasada
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);
        const lastMondayStr = lastMonday.toISOString().split('T')[0];
        
        const { data: lastWeekTargets } = await supabase
          .from('nutrition_targets')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', lastMondayStr)
          .order('date', { ascending: true })
          .limit(7);

        if (lastWeekTargets && lastWeekTargets.length > 0) {
          for (let i = 0; i < 7; i++) {
            const date = new Date(thisMonday);
            date.setDate(thisMonday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const sourceTarget = lastWeekTargets[i % lastWeekTargets.length];
            await supabase
              .from('nutrition_targets')
              .upsert({
                user_id: user.id,
                date: dateStr,
                calories: sourceTarget.calories,
                protein_g: sourceTarget.protein_g,
                carbs_g: sourceTarget.carbs_g,
                fats_g: sourceTarget.fats_g,
              });
          }
        }
        
        // Copiar plan de comidas de la semana pasada
        const lastWeekEnd = new Date(thisMonday);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        const lastWeekStartStr = lastMonday.toISOString().split('T')[0];
        
        const { data: lastPlan } = await supabase
          .from('meal_plans')
          .select('plan_json')
          .eq('user_id', user.id)
          .eq('week_start', lastWeekStartStr)
          .maybeSingle();

        if (lastPlan) {
          await supabase
            .from('meal_plans')
            .upsert({
              user_id: user.id,
              week_start: mondayStr,
              plan_json: lastPlan.plan_json,
            });
        }
      } else {
        // 4. Generar targets para la semana con las nuevas métricas
        for (let i = 0; i < 7; i++) {
          const date = new Date(thisMonday);
          date.setDate(thisMonday.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          await computeAndSaveTargets(user.id, dateStr);
        }

        // 5. Generar el plan de comidas para la semana
        await createOrUpdateMealPlan(user.id, mondayStr);
        
        // 6. Obtener los nuevos targets generados
        const { data: newTargets } = await supabase
          .from('nutrition_targets')
          .select('calories, protein_g, carbs_g, fats_g')
          .eq('user_id', user.id)
          .eq('date', mondayStr)
          .maybeSingle();

        if (newTargets) {
          newCalories = newTargets.calories;
          newProtein = newTargets.protein_g;
          newCarbs = newTargets.carbs_g;
          newFats = newTargets.fats_g;
        }
      }

      // 7. Marcar que no hay renovación pendiente
      setPendingWeeklyRenewal(false);

      // 8. Recargar datos
      await loadNutritionData();
      await loadWeeklyHistory();

      // 9. Mostrar modal de ajuste
      const calorieChange = newCalories - oldCalories;
      const calorieChangePercent = Math.round((calorieChange / oldCalories) * 100);
      
      setPlanAdjustmentData({
        type: adjustmentType,
        calorieChange,
        calorieChangePercent,
        proteinChange: newProtein - oldProtein,
        carbsChange: newCarbs - oldCarbs,
        fatsChange: newFats - oldFats,
        oldCalories,
        newCalories,
        oldProtein,
        newProtein,
        adherence: metrics.adherence,
        hasBodyComposition,
      });
      setShowPlanAdjustmentModal(true);
      
    } catch (error: any) {
      console.error('Error generating weekly plan:', error);
      throw error;
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
          t('nutrition.configRequired'),
          t('nutrition.configRequiredMessage'),
          [
            {
              text: t('common.configure'),
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
      Alert.alert(t('common.error'), t('nutrition.loadNutritionError'));
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

      Alert.alert(t('nutrition.ready'), t('nutrition.planInitialized'));
    } catch (err) {
      console.error('Error initializing week:', err);
      Alert.alert(t('common.error'), t('nutrition.initError'));
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
          <View style={styles.backButton} />
          <Text style={styles.headerTitle}>{t('nutritionIndex.title')}</Text>
          <TouchableOpacity
            onPress={() => setShowHelpModal(true)}
            style={styles.helpButton}
          >
            <Ionicons name="help-circle-outline" size={28} color="#ffb300" />
          </TouchableOpacity>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleNavigateToPlan()}
            >
              <Ionicons name="restaurant" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.viewPlan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/(tabs)/nutrition/log?date=${selectedDate}` as any)}
            >
              <Ionicons name="add-circle-outline" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.logMeal')}</Text>
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <Text style={styles.actionSubtext}>{t('nutritionIndex.forSelectedDay')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/grocery' as any)}
            >
              <Ionicons name="cart" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.shoppingList')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/register-weight' as any)}
            >
              <Ionicons name="body" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.registerMeasurement')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardWide]}
              onPress={handleGenerateNewPlan}
            >
              <Ionicons name="create" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.generatePlan')}</Text>
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
              <Text style={styles.macroLabel}>{t('nutrition.calories')}</Text>
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
              <Text style={styles.macroLabel}>{t('nutrition.protein')}</Text>
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
              <Text style={styles.macroLabel}>{t('nutrition.carbs')}</Text>
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
              <Text style={styles.macroLabel}>{t('nutrition.fats')}</Text>
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
            <Text style={styles.detailButtonText}>{t('nutritionIndex.viewFullDetail')}</Text>
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
              <Text style={styles.modalTitle}>{t('nutritionIndex.selectDate')}</Text>
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
                <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Hidratación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('nutritionIndex.hydration')}</Text>
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
              <Text style={styles.addWaterText}>{t('nutritionIndex.addWater')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Historial Semanal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 {t('nutritionIndex.weeklyHistory')}</Text>
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
              onNavigateToPlan={handleNavigateToPlan}
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

      {/* Modal de renovación semanal */}
      {lastWeekData && (
        <WeeklyRenewalModal
          visible={showWeeklyRenewalModal}
          onClose={() => setShowWeeklyRenewalModal(false)}
          onGenerate={handleWeeklyRenewal}
          userId={user?.id || ''}
          lastWeekStart={lastWeekData.weekStart}
          lastWeekEnd={lastWeekData.weekEnd}
        />
      )}

      {/* Modal de ajuste de plan */}
      {planAdjustmentData && (
        <PlanAdjustmentModal
          visible={showPlanAdjustmentModal}
          onClose={() => {
            setShowPlanAdjustmentModal(false);
            setPlanAdjustmentData(null);
          }}
          adjustmentData={planAdjustmentData}
        />
      )}

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
              <Text style={styles.modalTitle}>
  {t('nutrition.nextWeek')}
</Text>
            </View>
            <Text style={styles.modalMessage}>
  {t('nutrition.nextWeekInfo')}
</Text>

<Text style={styles.modalSubtext}>
  {t('nutrition.autoAdjustInfo')}
</Text>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNextWeekModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>
  {t('common.gotIt')}
</Text>

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
        <View style={styles.selectionModalOverlay} pointerEvents="box-none">
          <View style={styles.selectionModalContent} pointerEvents="box-none">
            <View pointerEvents="auto">
              <Text style={styles.selectionModalTitle}>{t('nutrition.howToCreatePlan')}</Text>
              <Text style={styles.selectionModalSubtitle}>
                {t('nutrition.chooseMethod')}
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
                <Text style={styles.selectionOptionTitlePrimary}>{t('nutrition.basedOnActivePlan')}</Text>
                <Text style={styles.selectionOptionDescriptionPrimary}>
                  {t('nutrition.basedOnActivePlanDesc')}
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
                <Text style={styles.selectionOptionTitleSecondary}>{t('nutrition.withDifferentGoals')}</Text>
                <Text style={styles.selectionOptionDescriptionSecondary}>
                  {t('nutrition.withDifferentGoalsDesc')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.selectionModalCloseButton}
                onPress={() => setShowSelectionModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectionModalCloseButtonText}>{t('common.cancel')}</Text>
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
                <Text style={styles.generatePlanModalTitle}>{t('nutrition.generatePlan')}</Text>
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
                  <Text style={styles.generatePlanSectionTitle}>📋 {t('nutrition.activeWorkoutPlan')}</Text>
                  <View style={styles.generatePlanInfoCard}>
                    <View style={styles.generatePlanInfoRow}>
                    <Text style={styles.generatePlanInfoLabel}>
  {t('nutrition.fitnessLevelLabel')}
</Text>

<Text style={styles.generatePlanInfoValue}>
  {activePlanData.fitness_level
    ? t(`fitnessLevels.${activePlanData.fitness_level}`)
    : t('common.notAvailable')}
</Text>

                    </View>
                    <View style={styles.generatePlanInfoRow}>
                    <Text style={styles.generatePlanInfoLabel}>
  {t('workout.goalsLabel')}
</Text>
<View style={styles.generatePlanTagsContainer}>
  {(activePlanData.goals || []).map((goal: string, index: number) => (
    <View key={index} style={styles.generatePlanTag}>
      <Text style={styles.generatePlanTagText}>
        {t(`fitnessGoals.${goal}`)}
      </Text>
    </View>
  ))}
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
              <Text style={styles.generatePlanSectionTitle}>
  {t('nutrition.preferencesTitle')}
</Text>

<Text style={styles.generatePlanSectionHelper}>
  {t('nutrition.preferencesHelper')}
</Text>


                <View style={styles.generatePlanInputContainer}>
                <TextInput
  style={styles.generatePlanInput}
  value={newPrompt}
  onChangeText={setNewPrompt}
  placeholder={t('nutrition.preferencesPlaceholder')}
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
  {t('nutrition.preferencesCount', {
    count: customPrompts.length,
    max: 10,
  })}
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
                    <Text style={styles.generatePlanButtonText}>
  {t('nutrition.generatePlan')}
</Text>
                  </>
                )}
              </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de ayuda */}
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Tooltips de tutorial */}
      {showNutritionTooltips && (
        <TutorialTooltip
          visible={showNutritionTooltips}
          steps={[
            {
              element: <View />,
              title: t('tutorial.nutrition.title1'),
              content: t('tutorial.nutrition.content1'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.nutrition.title2'),
              content: t('tutorial.nutrition.content2'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.nutrition.title3'),
              content: t('tutorial.nutrition.content3'),
              placement: 'center',
            },
          ]}
          onComplete={() => {
            setShowNutritionTooltips(false);
            completeTutorial('NUTRITION');
            markTooltipShown('NUTRITION');
          }}
          onSkip={() => {
            setShowNutritionTooltips(false);
            completeTutorial('NUTRITION');
            markTooltipShown('NUTRITION');
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
  helpButton: {
    padding: 4,
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
    position: 'relative',
  },
  actionCardWide: {
    minWidth: '100%',
    flex: 0,
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
  selectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectionModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  selectionModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionModalSubtitle: {
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
  selectionModalCloseButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  selectionModalCloseButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});

