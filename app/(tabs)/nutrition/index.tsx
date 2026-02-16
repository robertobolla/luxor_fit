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
} from '../../../src/services/nutrition';
import NutritionAdjustmentModal from '../../../src/components/NutritionAdjustmentModal';
import WeeklyRenewalModal from '../../../src/components/WeeklyRenewalModal';
import PlanAdjustmentModal from '../../../src/components/PlanAdjustmentModal';
import AIWeeklyRenewalModal from '../../../src/components/AIWeeklyRenewalModal';
import { useNutritionStore } from '../../../src/store/nutritionStore';
import { NutritionTarget, MealLog } from '../../../src/types/nutrition';
import { useTutorial } from '@/contexts/TutorialContext';
import { HelpModal } from '@/components/HelpModal';
import { TutorialTooltip } from '@/components/TutorialTooltip';
import { useUnitsStore, conversions, formatHeight } from '@/store/unitsStore';

export default function NutritionHomeScreen() {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const { weightUnit, heightUnit } = useUnitsStore();
  const { isLoading, setLoading, executeAsync } = useLoadingState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayTarget, setTodayTarget] = useState<NutritionTarget | null>(null);
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [todayWater, setTodayWater] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<any>(null);
  const [showNextWeekModal, setShowNextWeekModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [showGeneratePlanModal, setShowGeneratePlanModal] = useState(false);
  const [activePlanData, setActivePlanData] = useState<any>(null);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [nutritionGoal, setNutritionGoal] = useState<'lose_fat' | 'gain_muscle' | 'maintain'>('maintain');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [userWeightKg, setUserWeightKg] = useState(0); // Siempre en kg internamente
  const [displayWeight, setDisplayWeight] = useState(''); // Mostrado en la unidad del usuario
  const [userHeight, setUserHeight] = useState('');
  const [userSex, setUserSex] = useState<'male' | 'female'>('male');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [muscleMassPercentage, setMuscleMassPercentage] = useState('');
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onClose?: () => void;
  } | null>(null);
  const [showConfirmGenerateModal, setShowConfirmGenerateModal] = useState(false);
  const [showActivatePlanModal, setShowActivatePlanModal] = useState(false);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
    setMessageModalData({ type, title, message, onClose });
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    if (messageModalData?.onClose) {
      messageModalData.onClose();
    }
    setMessageModalData(null);
  };
  const [newPrompt, setNewPrompt] = useState('');
  const [showWeeklyRenewalModal, setShowWeeklyRenewalModal] = useState(false);
  const [pendingWeeklyRenewal, setPendingWeeklyRenewal] = useState(false);
  const [showPlanAdjustmentModal, setShowPlanAdjustmentModal] = useState(false);
  const [planAdjustmentData, setPlanAdjustmentData] = useState<any>(null);

  // Estados para modal de renovación de planes IA
  const [showAIRenewalModal, setShowAIRenewalModal] = useState(false);
  const [aiPlanRenewalData, setAIPlanRenewalData] = useState<{
    planId: string;
    activatedAt: string | null;
    initialWeight: number | null;
    nutritionGoal: 'lose_fat' | 'maintain' | 'gain_muscle' | null;
  } | null>(null);

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
      // NOTA: Ya no verificamos renovación automáticamente
      // Solo se verifica cuando el usuario hace clic en "Ver Plan"
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
        loadActivePlanTargets(); // Recargar macros del plan activo
      }
    }, [user])
  );

  // Función para cargar solo los targets del plan activo (sin recargar todo)
  // Calcula los macros sumando los alimentos de las comidas del día correspondiente
  const loadActivePlanTargets = async () => {
    if (!user?.id) return;

    try {
      const { data: activePlan, error: activePlanError } = await (supabase as any)
        .from('nutrition_plans')
        .select(`
          id,
          nutrition_plan_weeks (
            id,
            week_number,
            nutrition_plan_days (
              id,
              day_number,
              day_name,
              target_calories,
              target_protein,
              target_carbs,
              target_fat,
              nutrition_plan_meals (
                id,
                meal_order,
                nutrition_plan_meal_foods (
                  calculated_calories,
                  calculated_protein,
                  calculated_carbs,
                  calculated_fat
                )
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (activePlan && !activePlanError) {
        // Usar selectedDate para calcular el día de la semana
        const targetDate = new Date(selectedDate + 'T12:00:00');
        const dayOfWeek = targetDate.getDay();
        const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

        const weeks = activePlan.nutrition_plan_weeks || [];
        const currentWeek = weeks[0];

        if (currentWeek) {
          const days = currentWeek.nutrition_plan_days || [];
          const todayPlan = days.find((d: any) => d.day_number === dayNumber) || days[0];

          if (todayPlan) {
            // Calcular totales sumando los alimentos de las comidas (igual que plan-detail.tsx)
            let totalCalories = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;

            todayPlan.nutrition_plan_meals?.forEach((meal: any) => {
              meal.nutrition_plan_meal_foods?.forEach((food: any) => {
                totalCalories += food.calculated_calories || 0;
                totalProtein += food.calculated_protein || 0;
                totalCarbs += food.calculated_carbs || 0;
                totalFat += food.calculated_fat || 0;
              });
            });

            // Si hay alimentos, usar los totales calculados; si no, usar los targets guardados
            const hasFood = totalCalories > 0 || totalProtein > 0 || totalCarbs > 0 || totalFat > 0;

            setTodayTarget({
              calories: hasFood ? Math.round(totalCalories) : (todayPlan.target_calories || 0),
              protein_g: hasFood ? Math.round(totalProtein) : (todayPlan.target_protein || 0),
              carbs_g: hasFood ? Math.round(totalCarbs) : (todayPlan.target_carbs || 0),
              fats_g: hasFood ? Math.round(totalFat) : (todayPlan.target_fat || 0),
            } as NutritionTarget);
          }
        }
      }
    } catch (err) {
      console.error('Error loading active plan targets:', err);
    }
  };

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

      // PRIMERO verificar si hay un plan activo en nutrition_plans
      const { data: activePlan } = await (supabase as any)
        .from('nutrition_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      // Solo cargar de nutrition_targets si NO hay plan activo
      // (los targets del plan activo se cargan en loadActivePlanTargets)
      if (!activePlan) {
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
      }
    } catch (err) {
      console.error('Error loading today data:', err);
    }
  };

  // Recargar cuando cambia la fecha seleccionada
  useEffect(() => {
    if (user?.id) {
      loadTodayData();
      loadActivePlanTargets(); // Recargar macros del plan activo para la fecha seleccionada
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
        .select('weight, height, goals, age, gender')
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

      showMessage('success', t('nutrition.caloriesUpdated'), t('nutrition.caloriesUpdatedMessage'));

      // Recargar datos
      loadNutritionData();
    } catch (err: any) {
      console.error('Error recalculating targets:', err);
      showMessage('error', t('common.error'), t('nutrition.recalcError'));
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

      showMessage('success', t('nutrition.planRegenerated'), t('nutrition.planRegeneratedMessage'));

      // Recargar datos
      loadNutritionData();
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      showMessage('error', t('common.error'), t('nutrition.regenerateError'));
    } finally {
      setIsInitializing(false);
    }
  };

  // Debug useEffect para modal
  useEffect(() => {
    console.log('showSelectionModal changed to:', showSelectionModal);
  }, [showSelectionModal]);

  useEffect(() => {
    console.log('selectionModalVisible changed to:', selectionModalVisible);
  }, [selectionModalVisible]);

  const handleGenerateNewPlan = () => {
    console.log('handleGenerateNewPlan called, user:', user?.id);
    if (!user?.id) {
      console.log('No user id, returning');
      return;
    }
    console.log('Setting showSelectionModal to true');
    setShowSelectionModal(true);
    console.log('After setShowSelectionModal, value:', showSelectionModal);
  };

  const loadProfileDataForAI = async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('weight, height, gender')
        .eq('user_id', user.id)
        .single();

      console.log('Profile data for AI:', profile, 'Error:', error);

      if (profile) {
        const weightKg = profile.weight || 0;
        const heightCm = profile.height || 0;

        setUserWeightKg(weightKg);
        setUserHeight(heightCm.toString());
        setUserSex(profile.gender === 'female' ? 'female' : 'male');
        // Los campos de composición corporal se dejan vacíos para que el usuario los ingrese opcionalmente
        setBodyFatPercentage('');
        setMuscleMassPercentage('');

        // Mostrar peso en la unidad del usuario
        if (weightUnit === 'lb') {
          const weightLb = conversions.kgToLb(weightKg);
          setDisplayWeight(weightLb > 0 ? weightLb.toFixed(1) : '');
        } else {
          setDisplayWeight(weightKg > 0 ? weightKg.toFixed(1) : '');
        }

        console.log('Loaded - Weight:', weightKg, 'Height:', heightCm);
      }
    } catch (err) {
      console.error('Error loading profile for AI:', err);
    }
  };

  const handleWeightChange = (value: string) => {
    setDisplayWeight(value);
  };

  const handleWeightBlur = async () => {
    if (!user?.id || !displayWeight) return;

    const inputValue = parseFloat(displayWeight);
    if (isNaN(inputValue) || inputValue <= 0) return;

    // Convertir a kg si está en libras
    const weightInKg = weightUnit === 'lb'
      ? conversions.lbToKg(inputValue)
      : inputValue;

    setUserWeightKg(weightInKg);

    try {
      await supabase
        .from('user_profiles')
        .update({ weight: Math.round(weightInKg * 10) / 10 })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error updating weight:', err);
    }
  };

  const addPrompt = () => {
    if (!newPrompt.trim()) {
      showMessage('error', t('common.error'), t('nutrition.writePreference'));
      return;
    }

    if (newPrompt.length > 80) {
      showMessage('error', t('common.error'), t('nutrition.maxCharsPreference'));
      return;
    }

    if (customPrompts.length >= 10) {
      showMessage('error', t('common.error'), t('nutrition.maxPreferences'));
      return;
    }

    setCustomPrompts([...customPrompts, newPrompt.trim()]);
    setNewPrompt('');
  };

  const removePrompt = (index: number) => {
    setCustomPrompts(customPrompts.filter((_, i) => i !== index));
  };

  const handleGenerateWithActivePlan = async () => {
    if (!user?.id) return;

    // Validaciones
    if (mealsPerDay < 1 || mealsPerDay > 6) {
      showMessage('error', t('common.error'), t('nutrition.mealsPerDayError'));
      return;
    }

    if (customPrompts.length > 10) {
      showMessage('error', t('common.error'), t('nutrition.maxPreferencesError'));
      return;
    }

    // Mostrar modal de confirmación
    setShowConfirmGenerateModal(true);
  };

  const confirmAndGeneratePlan = async () => {
    if (!user?.id) return;

    setShowConfirmGenerateModal(false);
    setShowGeneratePlanModal(false);
    setIsInitializing(true);

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

      // Generar el plan con IA y guardarlo en nutrition_plans
      const planId = await generateAINutritionPlan();

      if (planId) {
        setGeneratedPlanId(planId);
        setShowActivatePlanModal(true);
      }
    } catch (err: any) {
      console.error('Error generating plan:', err);
      showMessage('error', t('common.error'), t('nutrition.regenerateError'));
    } finally {
      setIsInitializing(false);
    }
  };

  const generateAINutritionPlan = async (): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      // Calcular macros basados en los datos del usuario
      const weight = userWeightKg || 70;
      const height = parseFloat(userHeight) || 170;
      const bodyFat = bodyFatPercentage ? parseFloat(bodyFatPercentage) : null;
      const muscleMass = muscleMassPercentage ? parseFloat(muscleMassPercentage) : null;

      // Calcular BMR usando Katch-McArdle si tenemos body fat, sino Mifflin-St Jeor
      let bmr: number;
      if (bodyFat && muscleMass) {
        // Katch-McArdle (más preciso con composición corporal)
        const leanMass = weight * (1 - bodyFat / 100);
        bmr = 370 + (21.6 * leanMass);
      } else {
        // Mifflin-St Jeor (aproximación)
        const age = 30; // Edad por defecto si no se tiene
        if (userSex === 'male') {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
      }

      // Factor de actividad basado en nivel de fitness
      const activityFactors: Record<string, number> = {
        beginner: 1.4,
        intermediate: 1.6,
        advanced: 1.75,
      };
      const activityFactor = activityFactors[fitnessLevel] || 1.5;
      const tdee = Math.round(bmr * activityFactor);

      // Ajustar calorías según objetivo
      let targetCalories: number;
      let proteinPerKg: number;
      let fatPercentage: number;

      switch (nutritionGoal) {
        case 'lose_fat':
          targetCalories = Math.round(tdee * 0.8); // Déficit del 20%
          proteinPerKg = 2.2; // Alto para preservar músculo
          fatPercentage = 0.25;
          break;
        case 'gain_muscle':
          targetCalories = Math.round(tdee * 1.1); // Superávit del 10%
          proteinPerKg = 2.0;
          fatPercentage = 0.25;
          break;
        default: // maintain
          targetCalories = tdee;
          proteinPerKg = 1.8;
          fatPercentage = 0.30;
      }

      const proteinGrams = Math.round(weight * proteinPerKg);
      const fatGrams = Math.round((targetCalories * fatPercentage) / 9);
      const carbsGrams = Math.round((targetCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4);

      // Crear el plan en nutrition_plans
      const planName = t('nutrition.aiGeneratedPlan') + ' - ' + new Date().toLocaleDateString();

      const { data: newPlan, error: planError } = await supabase
        .from('nutrition_plans')
        .insert({
          user_id: user.id,
          plan_name: planName,
          description: t('nutrition.aiPlanDescription'),
          is_ai_generated: true,
          is_active: false,
          total_weeks: 1,
        })
        .select('id')
        .single();

      if (planError) {
        console.error('Error creating plan:', planError);
        throw planError;
      }

      // Crear la semana
      const { data: weekData, error: weekError } = await supabase
        .from('nutrition_plan_weeks')
        .insert({
          plan_id: newPlan.id,
          week_number: 1,
          name: t('nutrition.week') + ' 1',
        })
        .select('id')
        .single();

      if (weekError) {
        console.error('Error creating week:', weekError);
        throw weekError;
      }

      // Crear 7 días
      const dayNames = [
        t('weekDays.monday'),
        t('weekDays.tuesday'),
        t('weekDays.wednesday'),
        t('weekDays.thursday'),
        t('weekDays.friday'),
        t('weekDays.saturday'),
        t('weekDays.sunday'),
      ];

      for (let i = 0; i < 7; i++) {
        const { data: dayData, error: dayError } = await supabase
          .from('nutrition_plan_days')
          .insert({
            week_id: weekData.id,
            day_number: i + 1,
            name: dayNames[i],
            target_calories: targetCalories,
            target_protein: proteinGrams,
            target_carbs: carbsGrams,
            target_fats: fatGrams,
          })
          .select('id')
          .single();

        if (dayError) {
          console.error('Error creating day:', dayError);
          throw dayError;
        }

        // Crear comidas para cada día
        const mealNames = [
          t('nutrition.breakfast'),
          t('nutrition.lunch'),
          t('nutrition.dinner'),
          t('nutrition.snack') + ' 1',
          t('nutrition.snack') + ' 2',
          t('nutrition.snack') + ' 3',
        ];

        for (let j = 0; j < mealsPerDay; j++) {
          await supabase
            .from('nutrition_plan_meals')
            .insert({
              day_id: dayData.id,
              meal_number: j + 1,
              name: mealNames[j] || `${t('nutrition.meal')} ${j + 1}`,
            });
        }
      }

      return newPlan.id;
    } catch (err) {
      console.error('Error generating AI plan:', err);
      throw err;
    }
  };

  const handleActivateGeneratedPlan = async (activate: boolean) => {
    if (!user?.id || !generatedPlanId) return;

    setShowActivatePlanModal(false);

    if (activate) {
      try {
        // Desactivar otros planes activos
        await supabase
          .from('nutrition_plans')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Activar el nuevo plan
        await supabase
          .from('nutrition_plans')
          .update({ is_active: true })
          .eq('id', generatedPlanId);

        showMessage('success', t('nutrition.planActivated'), t('nutrition.planActivatedMessage'));

        // Navegar al detalle del plan
        router.push(`/(tabs)/nutrition/plan-detail?id=${generatedPlanId}` as any);
      } catch (err) {
        console.error('Error activating plan:', err);
        showMessage('error', t('common.error'), t('nutrition.activationError'));
      }
    } else {
      showMessage('success', t('nutrition.planSaved'), t('nutrition.planSavedToLibrary'));
    }

    setGeneratedPlanId(null);
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
        const typedPlanData2 = planData as { userData?: any; fitness_level?: string; goals?: string[]; available_days?: number; days_per_week?: number } | null;
        workoutPlanData = {
          fitness_level: typedPlanData2?.userData?.fitness_level || typedPlanData2?.fitness_level,
          goals: typedPlanData2?.userData?.goals || typedPlanData2?.goals || [],
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

      showMessage('success', t('nutrition.ready'), t('nutrition.mealPlanGenerated'));
      loadNutritionData();
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      showMessage('error', t('common.error'), t('nutrition.regenerateError'));
    } finally {
      setIsInitializing(false);
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
   * Verificar si un plan de IA necesita renovación semanal
   * Solo se llama cuando el usuario hace clic en "Ver Plan"
   * 
   * Retorna true si:
   * - El plan tiene múltiples semanas
   * - La semana actual del plan ha terminado (comparando con activated_at)
   * - No se ha completado la renovación para esta transición de semana
   */
  const checkIfAIPlanNeedsRenewal = async (activePlan: {
    id: string;
    is_ai_generated: boolean;
    activated_at: string | null;
    total_weeks?: number;
    current_week_number?: number;
    renewal_completed?: boolean;
    last_renewal_date?: string | null;
  }): Promise<boolean> => {
    try {
      // Si no es plan de IA o no tiene fecha de activación, no necesita renovación
      if (!activePlan.is_ai_generated || !activePlan.activated_at) {
        return false;
      }

      // Si es un plan de 1 semana, no necesita renovación
      const totalWeeks = activePlan.total_weeks || 1;
      if (totalWeeks <= 1) {
        return false;
      }

      const today = new Date();
      const activatedAt = new Date(activePlan.activated_at);

      // Calcular cuántos días han pasado desde la activación
      const daysSinceActivation = Math.floor((today.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Calcular en qué semana debería estar el usuario (1-indexed)
      const expectedWeekNumber = Math.min(Math.floor(daysSinceActivation / 7) + 1, totalWeeks);
      const currentWeek = activePlan.current_week_number || 1;

      // Si la semana esperada es mayor que la actual, necesita renovación
      if (expectedWeekNumber > currentWeek) {
        // Verificar si ya se completó la renovación para esta transición
        const todayStr = today.toISOString().split('T')[0];

        // Calcular el lunes de esta semana para comparar
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() + diff);
        const thisMondayStr = thisMonday.toISOString().split('T')[0];

        // Si ya se completó la renovación esta semana, no mostrar el modal
        if (activePlan.renewal_completed && activePlan.last_renewal_date === thisMondayStr) {
          return false;
        }

        return true; // Necesita renovación
      }

      return false;
    } catch (err) {
      console.error('Error checking if AI plan needs renewal:', err);
      return false;
    }
  };

  /**
   * Manejar "Repetir Semana" en el modal de renovación de IA
   */
  const handleAIRepeatWeek = async () => {
    if (!user?.id || !aiPlanRenewalData) return;

    try {
      const today = new Date();
      const thisMondayStr = today.toISOString().split('T')[0];
      const planId = aiPlanRenewalData.planId;

      // Marcar renovación como completada
      await supabase
        .from('nutrition_plans')
        .update({
          renewal_completed: true,
          last_renewal_date: thisMondayStr,
        })
        .eq('id', planId);

      // Cerrar modal y limpiar estado
      setShowAIRenewalModal(false);
      setAIPlanRenewalData(null);

      // Navegar al plan después de cerrar el modal
      setTimeout(() => {
        router.push(`/(tabs)/nutrition/plan-detail?id=${planId}` as any);
      }, 300);
    } catch (err) {
      console.error('Error repeating week:', err);
      setShowAIRenewalModal(false);
      setAIPlanRenewalData(null);
      showMessage('error', t('common.error'), t('common.errorOccurred'));
    }
  };

  /**
   * Manejar "Ajustar Plan" en el modal de renovación de IA
   */
  const handleAIAdjustPlan = async (metrics: {
    weight: number;
    bodyFat?: number;
    muscleMass?: number;
  }) => {
    if (!user?.id || !aiPlanRenewalData) return;

    try {
      const { planId, initialWeight, nutritionGoal } = aiPlanRenewalData;

      // Calcular ajuste basado en el objetivo y el cambio de peso
      const weightChange = initialWeight ? metrics.weight - initialWeight : 0;
      const adjustmentResult = calculateMacroAdjustment(
        nutritionGoal || 'maintain',
        weightChange,
        initialWeight || metrics.weight
      );

      // Obtener el plan actual para duplicar la última semana con ajustes
      const { data: currentPlan, error: planError } = await supabase
        .from('nutrition_plans')
        .select(`
          id,
          total_weeks,
          current_week_number,
          nutrition_plan_weeks (
            id,
            week_number,
            nutrition_plan_days (
              id,
              day_number,
              day_name,
              target_calories,
              target_protein,
              target_carbs,
              target_fat
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (planError || !currentPlan) throw new Error('Plan not found');

      // Obtener la semana actual para copiar su estructura
      const weeks = currentPlan.nutrition_plan_weeks || [];
      const currentWeek = weeks.find((w: any) => w.week_number === currentPlan.current_week_number) || weeks[0];

      if (!currentWeek) throw new Error('Current week not found');

      // Crear nueva semana con macros ajustados
      const newWeekNumber = currentPlan.total_weeks + 1;

      const { data: newWeek, error: weekError } = await supabase
        .from('nutrition_plan_weeks')
        .insert({
          plan_id: planId,
          week_number: newWeekNumber,
        })
        .select('id')
        .single();

      if (weekError || !newWeek) throw weekError;

      // Crear días con macros ajustados
      for (const day of currentWeek.nutrition_plan_days || []) {
        const adjustedCalories = Math.round(day.target_calories * adjustmentResult.calorieMultiplier);
        const adjustedCarbs = Math.round(day.target_carbs * adjustmentResult.carbMultiplier);
        const adjustedFat = Math.round(day.target_fat * adjustmentResult.fatMultiplier);
        // Proteína se mantiene igual para preservar músculo
        const adjustedProtein = day.target_protein;

        await supabase
          .from('nutrition_plan_days')
          .insert({
            week_id: newWeek.id,
            day_number: day.day_number,
            day_name: day.day_name,
            target_calories: adjustedCalories,
            target_protein: adjustedProtein,
            target_carbs: adjustedCarbs,
            target_fat: adjustedFat,
          });
      }

      // Actualizar el plan
      const today = new Date();
      const thisMondayStr = today.toISOString().split('T')[0];

      await supabase
        .from('nutrition_plans')
        .update({
          total_weeks: newWeekNumber,
          current_week_number: newWeekNumber,
          renewal_completed: true,
          last_renewal_date: thisMondayStr,
          initial_weight_kg: metrics.weight, // Actualizar peso inicial para la próxima semana
          initial_body_fat: metrics.bodyFat || null,
          initial_muscle_mass: metrics.muscleMass || null,
        })
        .eq('id', planId);

      // Actualizar perfil del usuario
      await supabase
        .from('user_profiles')
        .update({
          weight: metrics.weight,
          body_fat_percentage: metrics.bodyFat || null,
          muscle_percentage: metrics.muscleMass || null,
        })
        .eq('user_id', user.id);

      // Cerrar modal y limpiar estado
      setShowAIRenewalModal(false);
      setAIPlanRenewalData(null);

      // Recargar datos
      loadActivePlanTargets();

      // Navegar al plan después de cerrar el modal
      setTimeout(() => {
        router.push(`/(tabs)/nutrition/plan-detail?id=${planId}` as any);
      }, 300);
    } catch (err) {
      console.error('Error adjusting plan:', err);
      setShowAIRenewalModal(false);
      setAIPlanRenewalData(null);
      showMessage('error', t('common.error'), t('common.errorOccurred'));
    }
  };

  /**
   * Calcular el ajuste de macros basado en el objetivo y cambio de peso
   */
  const calculateMacroAdjustment = (
    goal: 'lose_fat' | 'maintain' | 'gain_muscle',
    weightChange: number,
    currentWeight: number
  ): { calorieMultiplier: number; carbMultiplier: number; fatMultiplier: number; explanation: string } => {
    const weightChangePercent = (weightChange / currentWeight) * 100;

    switch (goal) {
      case 'lose_fat':
        // Objetivo: perder 0.5-1% del peso por semana
        if (weightChangePercent < -1) {
          // Perdió más del 1% - muy rápido
          return { calorieMultiplier: 1.08, carbMultiplier: 1.10, fatMultiplier: 1.05, explanation: 'loseFatFastProgress' };
        } else if (weightChangePercent >= -0.5 && weightChangePercent <= 0) {
          // Perdió menos del 0.5% - muy lento
          return { calorieMultiplier: 0.92, carbMultiplier: 0.90, fatMultiplier: 0.95, explanation: 'loseFatSlowProgress' };
        } else if (weightChangePercent > 0) {
          // Ganó peso - reducir más
          return { calorieMultiplier: 0.88, carbMultiplier: 0.85, fatMultiplier: 0.90, explanation: 'loseFatSlowProgress' };
        }
        // Rango ideal
        return { calorieMultiplier: 1, carbMultiplier: 1, fatMultiplier: 1, explanation: 'loseFatGoodProgress' };

      case 'gain_muscle':
        // Objetivo: ganar 0.25-0.5% del peso por semana
        if (weightChangePercent > 1) {
          // Ganó más del 1% - muy rápido (probablemente grasa)
          return { calorieMultiplier: 0.95, carbMultiplier: 0.95, fatMultiplier: 0.90, explanation: 'gainMuscleFastProgress' };
        } else if (weightChangePercent < 0.25) {
          // Ganó muy poco o perdió peso
          return { calorieMultiplier: 1.08, carbMultiplier: 1.10, fatMultiplier: 1.05, explanation: 'gainMuscleSlowProgress' };
        }
        // Rango ideal
        return { calorieMultiplier: 1, carbMultiplier: 1, fatMultiplier: 1, explanation: 'gainMuscleGoodProgress' };

      case 'maintain':
      default:
        // Objetivo: mantener peso (±0.5kg)
        if (weightChange > 0.5) {
          // Ganó peso
          return { calorieMultiplier: 0.95, carbMultiplier: 0.95, fatMultiplier: 0.95, explanation: 'maintainGained' };
        } else if (weightChange < -0.5) {
          // Perdió peso
          return { calorieMultiplier: 1.05, carbMultiplier: 1.05, fatMultiplier: 1.05, explanation: 'maintainLost' };
        }
        // Estable
        return { calorieMultiplier: 1, carbMultiplier: 1, fatMultiplier: 1, explanation: 'maintainGood' };
    }
  };

  /**
   * Generar mensaje de ajuste para mostrar al usuario
   */
  const getAdjustmentMessage = (
    goal: 'lose_fat' | 'maintain' | 'gain_muscle',
    weightChange: number,
    adjustment: { calorieMultiplier: number; explanation: string }
  ): string => {
    const changeText = weightChange > 0
      ? `+${weightChange.toFixed(1)} kg`
      : `${weightChange.toFixed(1)} kg`;

    const adjustmentPercent = Math.round((adjustment.calorieMultiplier - 1) * 100);
    const adjustmentText = adjustmentPercent > 0
      ? `+${adjustmentPercent}%`
      : `${adjustmentPercent}%`;

    return t(`nutrition.${adjustment.explanation}`) +
      (adjustmentPercent !== 0 ? ` (${t('nutrition.calories')}: ${adjustmentText})` : '');
  };

  /**
   * Función para navegar al plan activo (nuevo sistema o viejo)
   * Solo aquí se verifica si el plan de IA necesita renovación
   */
  const handleNavigateToPlan = async (weekStart?: string) => {
    if (!user?.id) return;

    try {
      // Verificar si hay un plan de IA activo que necesite renovación
      const { data: activePlan, error } = await supabase
        .from('nutrition_plans')
        .select('id, is_ai_generated, activated_at, initial_weight_kg, nutrition_goal, renewal_completed, last_renewal_date, current_week_number, total_weeks')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && activePlan?.id) {
        // Si es un plan de IA, verificar si necesita renovación
        if (activePlan.is_ai_generated) {
          const needsRenewal = await checkIfAIPlanNeedsRenewal(activePlan);

          if (needsRenewal) {
            // Mostrar modal de renovación en lugar de navegar
            const validGoals = ['lose_fat', 'maintain', 'gain_muscle'] as const;
            const nutritionGoal = validGoals.includes(activePlan.nutrition_goal as any)
              ? (activePlan.nutrition_goal as 'lose_fat' | 'maintain' | 'gain_muscle')
              : null;

            setAIPlanRenewalData({
              planId: activePlan.id,
              activatedAt: activePlan.activated_at,
              initialWeight: activePlan.initial_weight_kg,
              nutritionGoal: nutritionGoal,
            });
            setShowAIRenewalModal(true);
            return;
          }
        }

        // Hay un plan activo y no necesita renovación, navegar a plan-detail
        router.push(`/(tabs)/nutrition/plan-detail?id=${activePlan.id}` as any);
        return;
      }
    } catch (err) {
      console.error('Error checking active plan:', err);
    }

    // Si no hay plan en el nuevo sistema, usar el viejo sistema
    if (pendingWeeklyRenewal) {
      setShowWeeklyRenewalModal(true);
      return;
    }

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

      // PRIMERO: Verificar si hay un plan activo en nutrition_plans
      const { data: activePlan, error: activePlanError } = await supabase
        .from('nutrition_plans')
        .select(`
          id,
          nutrition_plan_weeks (
            id,
            week_number,
            nutrition_plan_days (
              id,
              day_number,
              day_name,
              target_calories,
              target_protein,
              target_carbs,
              target_fat,
              nutrition_plan_meals (
                id,
                meal_order,
                nutrition_plan_meal_foods (
                  calculated_calories,
                  calculated_protein,
                  calculated_carbs,
                  calculated_fat
                )
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (activePlan && !activePlanError) {
        // Hay un plan activo - usar sus valores
        // Usar selectedDate para calcular el día de la semana
        const targetDate = new Date(selectedDate + 'T12:00:00');
        const dayOfWeek = targetDate.getDay(); // 0 = domingo, 1 = lunes, etc.
        // Convertir a formato 1-7 donde 1 = lunes
        const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

        // Buscar el día correspondiente en el plan
        const weeks = activePlan.nutrition_plan_weeks || [];
        const currentWeek = weeks[0]; // Usar la primera semana por ahora

        if (currentWeek) {
          const days = currentWeek.nutrition_plan_days || [];
          const todayPlan = days.find((d: any) => d.day_number === dayNumber) || days[0];

          if (todayPlan) {
            // Calcular totales sumando los alimentos de las comidas (igual que plan-detail.tsx)
            let totalCalories = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;

            todayPlan.nutrition_plan_meals?.forEach((meal: any) => {
              meal.nutrition_plan_meal_foods?.forEach((food: any) => {
                totalCalories += food.calculated_calories || 0;
                totalProtein += food.calculated_protein || 0;
                totalCarbs += food.calculated_carbs || 0;
                totalFat += food.calculated_fat || 0;
              });
            });

            // Si hay alimentos, usar los totales calculados; si no, usar los targets guardados
            const hasFood = totalCalories > 0 || totalProtein > 0 || totalCarbs > 0 || totalFat > 0;

            // Crear target con los valores del plan activo
            setTodayTarget({
              calories: hasFood ? Math.round(totalCalories) : (todayPlan.target_calories || 0),
              protein_g: hasFood ? Math.round(totalProtein) : (todayPlan.target_protein || 0),
              carbs_g: hasFood ? Math.round(totalCarbs) : (todayPlan.target_carbs || 0),
              fats_g: hasFood ? Math.round(totalFat) : (todayPlan.target_fat || 0),
            } as NutritionTarget);
          }
        }
      } else {
        // No hay plan activo, usar el sistema anterior (nutrition_targets)
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
      showMessage('error', t('common.error'), t('nutrition.loadNutritionError'));
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

      showMessage('success', t('nutrition.ready'), t('nutrition.planInitialized'));
    } catch (err) {
      console.error('Error initializing week:', err);
      showMessage('error', t('common.error'), t('nutrition.initError'));
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

  const handleShare = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Datos Diarios (usando el estado actual que ya tiene el plan aplicado)
      const totals = calculateConsumed();

      // Asegurar que tenemos un target válido
      const dailyCaloriesTarget = todayTarget?.calories || 2000;
      const dailyProteinTarget = todayTarget?.protein_g || 0;
      const dailyCarbsTarget = todayTarget?.carbs_g || 0;
      const dailyFatTarget = todayTarget?.fats_g || 0;

      // 2. Datos Semanales
      // Obtener últimas 7 fechas
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      const startDate = days[0];
      const endDate = days[6];

      // Intentar obtener targets de base de datos primero (para usuarios sin plan activo o historial)
      const { data: dbTargets } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      // Obtener logs
      const { data: logsData } = await supabase
        .from('meal_logs')
        .select('datetime, calories')
        .eq('user_id', user.id)
        .gte('datetime', `${startDate}T00:00:00`)
        .lte('datetime', `${endDate}T23:59:59`);

      // Mapear datos semanales
      const weeklyData = days.map(dateStr => {
        // Primero buscar en targets guardados
        let targetCals = dbTargets?.find(t => t.date === dateStr)?.calories;

        // Si no hay target guardado y es el día de hoy, usar el del estado (que viene del plan activo)
        if (!targetCals && dateStr === selectedDate) {
          targetCals = dailyCaloriesTarget;
        }

        // Si sigue sin haber target (días pasados con plan activo pero sin registro en nutrition_targets),
        // podríamos usar el target de hoy como aproximación o fallback a 2000
        if (!targetCals) {
          targetCals = dailyCaloriesTarget > 0 ? dailyCaloriesTarget : 2000;
        }

        // Filtrar logs
        const logs = logsData?.filter(l => l.datetime && l.datetime.startsWith(dateStr));
        const consumedCals = logs?.reduce((acc, log) => acc + (log.calories || 0), 0) || 0;

        const dateObj = new Date(dateStr + 'T12:00:00');
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });

        return {
          day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          date: dateStr,
          calories: Math.round(consumedCals),
          caloriesTarget: Math.round(targetCals),
          protein: 0,
          proteinTarget: 0,
          carbs: 0,
          carbsTarget: 0,
          fat: 0,
          fatTarget: 0
        };
      });

      const shareData = {
        // Datos Diarios
        calories: Math.round(totals.calories),
        caloriesTarget: Math.round(dailyCaloriesTarget),
        protein: Math.round(totals.protein_g),
        proteinTarget: Math.round(dailyProteinTarget),
        carbs: Math.round(totals.carbs_g),
        carbsTarget: Math.round(dailyCarbsTarget),
        fat: Math.round(totals.fats_g),
        fatTarget: Math.round(dailyFatTarget),
        date: formatDate(selectedDate),
        waterMl: todayWater,

        // Datos Semanales
        weeklyData
      };

      router.push({
        pathname: '/(tabs)/share-nutrition',
        params: { data: JSON.stringify(shareData) }
      });

    } catch (error) {
      console.error('Error preparing share data', error);
      Alert.alert(t('common.error'), 'No se pudo cargar la información para compartir');
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-social-outline" size={24} color="#ffb300" />
          </TouchableOpacity>
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
              style={styles.actionCard}
              onPress={() => {
                router.push('/(tabs)/nutrition/select-plan-type' as any);
              }}
            >
              <Ionicons name="create" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.generatePlan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/plans-library' as any)}
            >
              <Ionicons name="library" size={32} color="#ffb300" />
              <Text style={styles.actionText}>{t('nutritionIndex.plansLibrary')}</Text>
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

      {/* Modal de renovación semanal para planes de IA */}
      {aiPlanRenewalData && (
        <AIWeeklyRenewalModal
          visible={showAIRenewalModal}
          onClose={() => {
            setShowAIRenewalModal(false);
            setAIPlanRenewalData(null);
          }}
          onRepeatWeek={handleAIRepeatWeek}
          onAdjustPlan={handleAIAdjustPlan}
          userId={user?.id || ''}
          planId={aiPlanRenewalData.planId}
          activatedAt={aiPlanRenewalData.activatedAt}
          initialWeight={aiPlanRenewalData.initialWeight}
          nutritionGoal={aiPlanRenewalData.nutritionGoal}
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
        visible={selectionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectionModalVisible(false);
          setShowSelectionModal(false);
          setModalReady(false);
        }}
      >
        <View style={styles.selectionModalOverlay}>
          <View style={styles.selectionModalContent}>
            <Text style={styles.selectionModalTitle}>{t('nutrition.howToCreatePlan')}</Text>
            <Text style={styles.selectionModalSubtitle}>
              {t('nutrition.chooseMethod')}
            </Text>

            {/* Opción 1: Crear plan personalizado */}
            <TouchableOpacity
              style={[styles.selectionOption, styles.selectionOptionPrimary, !modalReady && { opacity: 0.7 }]}
              onPress={() => {
                if (!modalReady) return;
                console.log('Option 1 pressed - Custom plan');
                setSelectionModalVisible(false);
                setShowSelectionModal(false);
                setModalReady(false);
                setTimeout(() => {
                  router.push('/(tabs)/nutrition/custom-plan-setup' as any);
                }, 100);
              }}
              activeOpacity={0.8}
              disabled={!modalReady}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="create-outline" size={28} color="#ffb300" />
              </View>
              <Text style={styles.selectionOptionTitlePrimary}>{t('nutrition.createCustomPlan')}</Text>
              <Text style={styles.selectionOptionDescriptionPrimary}>
                {t('nutrition.createCustomPlanDesc')}
              </Text>
            </TouchableOpacity>

            {/* Opción 2: Generar plan con IA */}
            <TouchableOpacity
              style={[styles.selectionOption, styles.selectionOptionSecondary, !modalReady && { opacity: 0.7 }]}
              onPress={async () => {
                if (!modalReady) return;
                console.log('Option 2 pressed - AI plan');
                setSelectionModalVisible(false);
                setShowSelectionModal(false);
                setModalReady(false);
                await loadProfileDataForAI();
                setTimeout(() => {
                  setShowGeneratePlanModal(true);
                }, 100);
              }}
              activeOpacity={0.8}
              disabled={!modalReady}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="sparkles" size={28} color="#ffb300" />
              </View>
              <Text style={styles.selectionOptionTitleSecondary}>{t('nutrition.generateWithAI')}</Text>
              <Text style={styles.selectionOptionDescriptionSecondary}>
                {t('nutrition.generateWithAIDesc')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectionModalCloseButton, !modalReady && { opacity: 0.7 }]}
              onPress={() => {
                if (!modalReady) return;
                console.log('Cancel pressed');
                setSelectionModalVisible(false);
                setShowSelectionModal(false);
                setModalReady(false);
              }}
              activeOpacity={0.7}
              disabled={!modalReady}
            >
              <Text style={styles.selectionModalCloseButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
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
        <View style={styles.generatePlanModalOverlay}>
          <View style={styles.generatePlanModalContent}>
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
              {/* Datos del perfil */}
              <View style={styles.generatePlanSection}>
                <Text style={styles.generatePlanSectionTitle}>📊 {t('nutrition.yourData')}</Text>
                <View style={styles.profileDataCard}>
                  {/* Fila 1: Sexo y Altura */}
                  <View style={styles.profileDataRow}>
                    <View style={styles.profileDataHalf}>
                      <Text style={styles.profileDataLabel}>{t('nutrition.sex')}</Text>
                      <View style={styles.profileDataValueBox}>
                        <Text style={styles.profileDataValue}>
                          {userSex === 'male' ? t('profile.male') : t('profile.female')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.profileDataHalf}>
                      <Text style={styles.profileDataLabel}>{t('nutrition.height')}</Text>
                      <View style={styles.profileDataValueBox}>
                        <Text style={styles.profileDataValue}>
                          {heightUnit === 'ft'
                            ? formatHeight(parseFloat(userHeight) || 0, 'ft')
                            : `${userHeight || 0} cm`
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                  {/* Fila 2: Peso */}
                  <View style={styles.profileDataRowWeight}>
                    <Text style={styles.profileDataLabel}>{t('nutrition.weight')}</Text>
                    <View style={styles.weightInputBox}>
                      <TextInput
                        style={styles.weightInputText}
                        value={displayWeight}
                        onChangeText={handleWeightChange}
                        onBlur={handleWeightBlur}
                        keyboardType="numeric"
                        placeholder={weightUnit === 'lb' ? '150' : '70'}
                        placeholderTextColor="#555"
                      />
                      <Text style={styles.weightUnitText}>{weightUnit}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Objetivo Nutricional */}
              <View style={styles.generatePlanSection}>
                <Text style={styles.generatePlanSectionTitle}>🎯 {t('nutrition.nutritionGoal')}</Text>
                <View style={styles.goalOptionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      nutritionGoal === 'lose_fat' && styles.goalOptionActive,
                    ]}
                    onPress={() => setNutritionGoal('lose_fat')}
                  >
                    <Ionicons
                      name="flame"
                      size={24}
                      color={nutritionGoal === 'lose_fat' ? '#000' : '#f44336'}
                    />
                    <Text style={[
                      styles.goalOptionText,
                      nutritionGoal === 'lose_fat' && styles.goalOptionTextActive,
                    ]}>{t('nutrition.loseFat')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      nutritionGoal === 'maintain' && styles.goalOptionActive,
                    ]}
                    onPress={() => setNutritionGoal('maintain')}
                  >
                    <Ionicons
                      name="sync"
                      size={24}
                      color={nutritionGoal === 'maintain' ? '#000' : '#2196F3'}
                    />
                    <Text style={[
                      styles.goalOptionText,
                      nutritionGoal === 'maintain' && styles.goalOptionTextActive,
                    ]}>{t('nutrition.maintain')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      nutritionGoal === 'gain_muscle' && styles.goalOptionActive,
                    ]}
                    onPress={() => setNutritionGoal('gain_muscle')}
                  >
                    <Ionicons
                      name="barbell"
                      size={24}
                      color={nutritionGoal === 'gain_muscle' ? '#000' : '#4CAF50'}
                    />
                    <Text style={[
                      styles.goalOptionText,
                      nutritionGoal === 'gain_muscle' && styles.goalOptionTextActive,
                    ]}>{t('nutrition.gainMuscle')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nivel de Fitness */}
              <View style={styles.generatePlanSection}>
                <Text style={styles.generatePlanSectionTitle}>💪 {t('nutrition.fitnessLevel')}</Text>
                <View style={styles.goalOptionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      fitnessLevel === 'beginner' && styles.goalOptionActive,
                    ]}
                    onPress={() => setFitnessLevel('beginner')}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      fitnessLevel === 'beginner' && styles.goalOptionTextActive,
                    ]}>{t('nutrition.beginner')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      fitnessLevel === 'intermediate' && styles.goalOptionActive,
                    ]}
                    onPress={() => setFitnessLevel('intermediate')}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      fitnessLevel === 'intermediate' && styles.goalOptionTextActive,
                    ]}>{t('nutrition.intermediate')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      fitnessLevel === 'advanced' && styles.goalOptionActive,
                    ]}
                    onPress={() => setFitnessLevel('advanced')}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      fitnessLevel === 'advanced' && styles.goalOptionTextActive,
                    ]}>{t('nutrition.advanced')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Composición corporal (opcional) */}
              <View style={styles.generatePlanSection}>
                <Text style={styles.generatePlanSectionTitle}>📐 {t('nutrition.bodyComposition')}</Text>
                <Text style={styles.optionalLabel}>{t('nutrition.optional')}</Text>
                <View style={styles.bodyCompRow}>
                  <View style={styles.bodyCompItem}>
                    <Text style={styles.bodyCompLabel}>{t('nutrition.bodyFat')}</Text>
                    <View style={styles.bodyCompInputContainer}>
                      <TextInput
                        style={styles.bodyCompInput}
                        value={bodyFatPercentage}
                        onChangeText={setBodyFatPercentage}
                        keyboardType="numeric"
                        placeholder="15"
                        placeholderTextColor="#666"
                      />
                      <Text style={styles.bodyCompUnit}>%</Text>
                    </View>
                  </View>
                  <View style={styles.bodyCompItem}>
                    <Text style={styles.bodyCompLabel}>{t('nutrition.muscleMass')}</Text>
                    <View style={styles.bodyCompInputContainer}>
                      <TextInput
                        style={styles.bodyCompInput}
                        value={muscleMassPercentage}
                        onChangeText={setMuscleMassPercentage}
                        keyboardType="numeric"
                        placeholder="35"
                        placeholderTextColor="#666"
                      />
                      <Text style={styles.bodyCompUnit}>%</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.precisionNote}>
                  <Ionicons name="information-circle" size={16} color="#ffb300" />
                  <Text style={styles.precisionNoteText}>
                    {t('nutrition.precisionNote')}
                  </Text>
                </View>
              </View>

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
                    <Text style={styles.generatePlanButtonText}>{t('nutrition.generatePlan')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
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

      {/* Modal de mensajes personalizado */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="fade"
        onRequestClose={closeMessageModal}
      >
        <View style={styles.messageModalOverlay}>
          <View style={styles.messageModalContent}>
            <View style={styles.messageModalIcon}>
              <Ionicons
                name={
                  messageModalData?.type === 'success' ? 'checkmark-circle' :
                    messageModalData?.type === 'error' ? 'alert-circle' : 'information-circle'
                }
                size={60}
                color={
                  messageModalData?.type === 'success' ? '#4CAF50' :
                    messageModalData?.type === 'error' ? '#f44336' : '#ffb300'
                }
              />
            </View>
            <Text style={styles.messageModalTitle}>{messageModalData?.title}</Text>
            <Text style={styles.messageModalText}>{messageModalData?.message}</Text>
            <TouchableOpacity
              style={styles.messageModalButton}
              onPress={closeMessageModal}
            >
              <Text style={styles.messageModalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para generar plan */}
      <Modal
        visible={showConfirmGenerateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmGenerateModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="sparkles" size={48} color="#ffb300" />
            </View>
            <Text style={styles.confirmModalTitle}>{t('nutrition.generateNewPlan')}</Text>
            <Text style={styles.confirmModalText}>{t('nutrition.generateNewPlanConfirm')}</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setShowConfirmGenerateModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalConfirmButton}
                onPress={confirmAndGeneratePlan}
              >
                <Ionicons name="create" size={20} color="#000" />
                <Text style={styles.confirmModalConfirmText}>{t('common.generate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para activar plan generado */}
      <Modal
        visible={showActivatePlanModal}
        transparent
        animationType="fade"
        onRequestClose={() => handleActivateGeneratedPlan(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.confirmModalTitle}>{t('nutrition.planGenerated')}</Text>
            <Text style={styles.confirmModalText}>{t('nutrition.activatePlanQuestion')}</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => handleActivateGeneratedPlan(false)}
              >
                <Text style={styles.confirmModalCancelText}>{t('nutrition.saveOnly')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalConfirmButton}
                onPress={() => handleActivateGeneratedPlan(true)}
              >
                <Ionicons name="flash" size={20} color="#000" />
                <Text style={styles.confirmModalConfirmText}>{t('nutrition.activate')}</Text>
              </TouchableOpacity>
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
  profileDataCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  profileDataRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  profileDataHalf: {
    flex: 1,
  },
  profileDataRowWeight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileDataLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileDataValueBox: {
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  profileDataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  weightInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
    minWidth: 120,
  },
  weightInputText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 2,
  },
  weightUnitText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  goalOptionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  goalOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalOptionActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  goalOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginTop: 6,
    textAlign: 'center',
  },
  goalOptionTextActive: {
    color: '#000',
  },
  optionalLabel: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 12,
  },
  bodyCompRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bodyCompItem: {
    flex: 1,
  },
  bodyCompLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  bodyCompInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  bodyCompInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    paddingVertical: 12,
    textAlign: 'center',
  },
  bodyCompUnit: {
    fontSize: 14,
    color: '#888',
  },
  precisionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  precisionNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  messageModalIcon: {
    marginBottom: 20,
  },
  messageModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageModalText: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  messageModalButton: {
    backgroundColor: '#ffb300',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    minWidth: 150,
    alignItems: 'center',
  },
  messageModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
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
  // Estilos del modal de confirmación
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  confirmModalIcon: {
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalCancelButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  confirmModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  confirmModalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffb300',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmModalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
  },
});

