import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { supabase, callRpcWithRetry } from '@/services/supabase';
import { useUnitsStore, conversions, formatHeight } from '@/store/unitsStore';
import { getNutritionProfile, upsertNutritionProfile } from '@/services/nutrition';

export default function GenerateAIPlanScreen() {
  const { user } = useUser();
  const { t } = useTranslation();
  const { weightUnit, heightUnit } = useUnitsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userWeightKg, setUserWeightKg] = useState(0);
  const [displayWeight, setDisplayWeight] = useState('');
  const [userHeight, setUserHeight] = useState('');
  const [userSex, setUserSex] = useState<'male' | 'female'>('male');
  const [nutritionGoal, setNutritionGoal] = useState<'lose_fat' | 'gain_muscle' | 'maintain'>('maintain');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [muscleMassPercentage, setMuscleMassPercentage] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState('');

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadProfileData();
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('weight, height, gender')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const weightKg = profile.weight || 0;
        const heightCm = profile.height || 0;

        setUserWeightKg(weightKg);
        setUserHeight(heightCm.toString());
        setUserSex(profile.gender === 'female' ? 'female' : 'male');

        // Mostrar peso en la unidad del usuario
        if (weightUnit === 'lb') {
          const weightLb = conversions.kgToLb(weightKg);
          setDisplayWeight(weightLb > 0 ? weightLb.toFixed(1) : '');
        } else {
          setDisplayWeight(weightKg > 0 ? weightKg.toFixed(1) : '');
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeightChange = (value: string) => {
    setDisplayWeight(value);
  };

  const handleWeightBlur = async () => {
    if (!user?.id || !displayWeight) return;

    const inputValue = parseFloat(displayWeight);
    if (isNaN(inputValue) || inputValue <= 0) return;

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
    if (!newPrompt.trim()) return;
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

  const showMessage = (type: 'success' | 'error', title: string, message: string) => {
    setMessageModalData({ type, title, message });
    setShowMessageModal(true);
  };

  const handleGenerate = () => {
    if (mealsPerDay < 1 || mealsPerDay > 6) {
      showMessage('error', t('common.error'), t('nutrition.mealsPerDayError'));
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAndGenerate = async () => {
    if (!user?.id) return;

    setShowConfirmModal(false);
    setIsGenerating(true);

    try {
      // Guardar configuración
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

      // Generar el plan
      const planId = await generatePlan();

      if (planId) {
        setGeneratedPlanId(planId);
        setShowActivateModal(true);
      }
    } catch (err: any) {
      console.error('Error generating plan:', err);
      showMessage('error', t('common.error'), t('nutrition.regenerateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePlan = async (): Promise<string | null> => {
    if (!user?.id) return null;

    const weight = userWeightKg || 70;
    const height = parseFloat(userHeight) || 170;
    const bodyFat = bodyFatPercentage ? parseFloat(bodyFatPercentage) : null;

    // Calcular BMR
    let bmr: number;
    if (bodyFat) {
      const leanMass = weight * (1 - bodyFat / 100);
      bmr = 370 + (21.6 * leanMass);
    } else {
      const age = 30;
      if (userSex === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      }
    }

    const activityFactors: Record<string, number> = {
      beginner: 1.4,
      intermediate: 1.6,
      advanced: 1.75,
    };
    const tdee = Math.round(bmr * (activityFactors[fitnessLevel] || 1.5));

    let targetCalories: number;
    let proteinPerKg: number;
    let fatPerKg: number; // Grasas en g/kg (mínimo esencial)

    // Orden de prioridad: 1) Proteína, 2) Grasas (esenciales), 3) Carbos (resto)
    switch (nutritionGoal) {
      case 'lose_fat':
        targetCalories = Math.round(tdee * 0.8);
        proteinPerKg = 2.2; // Alta proteína para preservar músculo
        fatPerKg = 0.8; // Mínimo esencial (0.6-1 g/kg)
        break;
      case 'gain_muscle':
        targetCalories = Math.round(tdee * 1.1);
        proteinPerKg = 2.0;
        fatPerKg = 1.0; // Un poco más para hormonas anabólicas
        break;
      default: // maintain
        targetCalories = tdee;
        proteinPerKg = 1.8;
        fatPerKg = 0.9; // Punto medio
    }

    // 1. Calcular PROTEÍNA primero (esencial para músculo)
    const proteinGrams = Math.round(weight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    // 2. Calcular GRASAS segundo (esenciales para hormonas y sistema nervioso)
    // Mínimo: fatPerKg g/kg, pero verificar que sea al menos 20% de calorías
    const fatGramsMin = Math.round(weight * fatPerKg);
    const fatCaloriesMin = fatGramsMin * 9;
    const fatCalories20Percent = targetCalories * 0.20;
    // Usar el mayor entre el mínimo por kg y el 20% de calorías
    const fatCaloriesFinal = Math.max(fatCaloriesMin, fatCalories20Percent);
    const fatGrams = Math.round(fatCaloriesFinal / 9);

    // 3. Calcular CARBOHIDRATOS con las calorías restantes
    const remainingCalories = targetCalories - proteinCalories - (fatGrams * 9);
    const carbsGrams = Math.max(50, Math.round(remainingCalories / 4)); // Mínimo 50g para función cerebral

    // Obtener alimentos del banco de datos
    const { data: allFoods, error: foodsError } = await supabase
      .from('foods')
      .select('*')
      .eq('status', 'complete');

    if (foodsError) {
      console.error('Error loading foods:', foodsError);
    }

    const foods = allFoods || [];

    // Agrupar alimentos por tipo
    const foodsByType: Record<string, any[]> = {};
    foods.forEach((food: any) => {
      if (!foodsByType[food.food_type]) {
        foodsByType[food.food_type] = [];
      }
      foodsByType[food.food_type].push(food);
    });

    const planName = t('nutrition.aiGeneratedPlan') + ' - ' + new Date().toLocaleDateString();

    const dayNames = [
      t('weekDays.monday'), t('weekDays.tuesday'), t('weekDays.wednesday'),
      t('weekDays.thursday'), t('weekDays.friday'), t('weekDays.saturday'), t('weekDays.sunday'),
    ];

    // Función para calcular cantidad y macros de un alimento
    const calculateFoodQuantity = (food: any, targetMacro: number, macroType: 'calories' | 'protein' | 'carbs' | 'fat') => {
      const macroPerUnit = macroType === 'calories' ? food.calories :
        macroType === 'protein' ? food.protein_g :
          macroType === 'carbs' ? food.carbs_g : food.fat_g;

      if (macroPerUnit <= 0) return { quantity: 0, unit: food.quantity_type };

      if (food.quantity_type === 'units') {
        const units = Math.max(1, Math.round(targetMacro / macroPerUnit));
        return { quantity: units, unit: 'units' };
      } else {
        const grams = Math.round((targetMacro / macroPerUnit) * 100);
        return { quantity: Math.max(30, Math.min(grams, 300)), unit: 'grams' };
      }
    };

    // Función para calcular macros según cantidad
    const calculateMacros = (food: any, quantity: number) => {
      if (food.quantity_type === 'units') {
        return {
          calories: Math.round(food.calories * quantity),
          protein: Math.round(food.protein_g * quantity * 10) / 10,
          carbs: Math.round(food.carbs_g * quantity * 10) / 10,
          fat: Math.round(food.fat_g * quantity * 10) / 10,
        };
      } else {
        const factor = quantity / 100;
        return {
          calories: Math.round(food.calories * factor),
          protein: Math.round(food.protein_g * factor * 10) / 10,
          carbs: Math.round(food.carbs_g * factor * 10) / 10,
          fat: Math.round(food.fat_g * factor * 10) / 10,
        };
      }
    };

    // Función para seleccionar alimentos para una comida con macros precisos
    const selectFoodsForMeal = (mealIndex: number, totalMeals: number) => {
      const mealFoods: any[] = [];

      const isMainMeal = mealIndex < 3;
      const mealFactor = isMainMeal ? 0.3 : 0.1 / Math.max(1, totalMeals - 3);
      const adjustedFactor = totalMeals <= 3 ? 1 / totalMeals : mealFactor;

      const targetCaloriesMeal = Math.round(targetCalories * adjustedFactor);
      const targetProteinMeal = Math.round(proteinGrams * adjustedFactor);
      const targetFatMeal = Math.round(fatGrams * adjustedFactor);
      const targetCarbsMeal = Math.round(carbsGrams * adjustedFactor);

      let currentCalories = 0;
      let currentProtein = 0;
      let currentFat = 0;
      let currentCarbs = 0;

      // 1. PROTEÍNA
      const proteins = foodsByType['proteins'] || [];
      if (proteins.length > 0) {
        const protein = proteins[Math.floor(Math.random() * proteins.length)];
        const { quantity, unit } = calculateFoodQuantity(protein, targetProteinMeal, 'protein');
        const macros = calculateMacros(protein, quantity);

        mealFoods.push({ food: protein, quantity, unit });
        currentCalories += macros.calories;
        currentProtein += macros.protein;
        currentCarbs += macros.carbs;
        currentFat += macros.fat;
      }

      // 2. GRASAS
      const remainingFat = Math.max(0, targetFatMeal - currentFat);
      if (remainingFat > 5) {
        const fats = foodsByType['fats'] || [];
        const nuts = foodsByType['nuts'] || [];
        const dairy = foodsByType['dairy'] || [];
        const fatSources = [...fats, ...nuts, ...dairy.filter((d: any) => d.fat_g > 5)];

        if (fatSources.length > 0) {
          const fatFood = fatSources[Math.floor(Math.random() * fatSources.length)];
          const { quantity, unit } = calculateFoodQuantity(fatFood, remainingFat, 'fat');
          const macros = calculateMacros(fatFood, quantity);

          mealFoods.push({ food: fatFood, quantity, unit });
          currentCalories += macros.calories;
          currentProtein += macros.protein;
          currentCarbs += macros.carbs;
          currentFat += macros.fat;
        }
      }

      // 3. CARBOHIDRATOS
      const remainingCarbs = Math.max(0, targetCarbsMeal - currentCarbs);
      if (remainingCarbs > 10) {
        const carbs = [...(foodsByType['carbohydrates'] || []), ...(foodsByType['cereals'] || []), ...(foodsByType['legumes'] || [])];
        if (carbs.length > 0) {
          const carb = carbs[Math.floor(Math.random() * carbs.length)];
          const { quantity, unit } = calculateFoodQuantity(carb, remainingCarbs, 'carbs');
          const macros = calculateMacros(carb, quantity);

          mealFoods.push({ food: carb, quantity, unit });
          currentCalories += macros.calories;
          currentCarbs += macros.carbs;
        }
      }

      // 4. VERDURAS
      const veggies = foodsByType['vegetables'] || [];
      if (veggies.length > 0 && isMainMeal) {
        const veggie = veggies[Math.floor(Math.random() * veggies.length)];
        const quantity = veggie.quantity_type === 'units' ? 1 : 150;
        const macros = calculateMacros(veggie, quantity);

        mealFoods.push({ food: veggie, quantity, unit: veggie.quantity_type });
        currentCalories += macros.calories;
        currentCarbs += macros.carbs;
      }

      // 5. EXTRAS
      const fruits = foodsByType['fruits'] || [];

      if (mealIndex === 0 && fruits.length > 0) {
        const fruit = fruits[Math.floor(Math.random() * fruits.length)];
        const quantity = fruit.quantity_type === 'units' ? 1 : 100;
        mealFoods.push({ food: fruit, quantity, unit: fruit.quantity_type });
      }

      if (mealIndex >= 3) {
        if (fruits.length > 0) {
          const fruit = fruits[Math.floor(Math.random() * fruits.length)];
          const quantity = fruit.quantity_type === 'units' ? 1 : 100;
          mealFoods.push({ food: fruit, quantity, unit: fruit.quantity_type });
        }
      }

      return mealFoods;
    };

    // Estructura para el RPC
    const weeks: any[] = [];
    const days: any[] = [];

    // Generar días
    for (let i = 0; i < 7; i++) {
      const mealNames = [
        t('nutrition.breakfast'), t('nutrition.lunch'), t('nutrition.dinner'),
        t('nutrition.snack') + ' 1', t('nutrition.snack') + ' 2', t('nutrition.snack') + ' 3',
      ];

      const dayMeals: any[] = [];

      // PASO 1: Generar todos los alimentos del día
      const allDayFoods: { mealIndex: number; food: any; quantity: number; unit: string }[] = [];

      for (let j = 0; j < mealsPerDay; j++) {
        if (foods.length > 0) {
          const mealFoods = selectFoodsForMeal(j, mealsPerDay);
          for (const { food, quantity, unit } of mealFoods) {
            allDayFoods.push({ mealIndex: j, food, quantity, unit });
          }
        }
      }

      // PASO 2: Calcular totales actuales del día
      let currentTotalCalories = 0;
      for (const item of allDayFoods) {
        const macros = calculateMacros(item.food, item.quantity);
        currentTotalCalories += macros.calories;
      }

      // PASO 3: Calcular factor de ajuste
      const adjustmentFactor = currentTotalCalories > 0 ? targetCalories / currentTotalCalories : 1;
      const limitedFactor = Math.max(0.5, Math.min(adjustmentFactor, 2.0));

      // PASO 4: Construir estructura de comidas
      for (let j = 0; j < mealsPerDay; j++) {
        const mealFoodsForThisMeal = allDayFoods.filter(f => f.mealIndex === j);
        const foodsForMealJson: any[] = [];

        for (const { food, quantity, unit } of mealFoodsForThisMeal) {
          let adjustedQuantity = quantity * limitedFactor;

          if (unit === 'units') {
            adjustedQuantity = Math.max(1, Math.round(adjustedQuantity));
          } else {
            adjustedQuantity = Math.max(20, Math.round(adjustedQuantity / 5) * 5);
          }

          const macros = calculateMacros(food, adjustedQuantity);

          foodsForMealJson.push({
            foodId: food.id,
            quantity: adjustedQuantity,
            quantityUnit: unit,
            calculatedCalories: macros.calories,
            calculatedProtein: macros.protein,
            calculatedCarbs: macros.carbs,
            calculatedFat: macros.fat
          });
        }

        dayMeals.push({
          mealOrder: j + 1,
          mealName: mealNames[j] || `${t('nutrition.meal')} ${j + 1}`,
          foods: foodsForMealJson
        });
      }

      days.push({
        dayNumber: i + 1,
        dayName: dayNames[i],
        targetCalories: targetCalories,
        targetProtein: proteinGrams,
        targetCarbs: carbsGrams,
        targetFat: fatGrams,
        meals: dayMeals
      });
    }

    weeks.push({
      weekNumber: 1,
      days: days
    });

    console.log('Sending plan to RPC:', { planName, weeksCount: weeks.length });

    // Llamar al RPC con retry logic
    const { data: rpcResult, error: rpcError } = await callRpcWithRetry('create_complete_nutrition_plan', {
      p_plan_name: planName,
      p_description: t('nutrition.aiPlanDescription'),
      p_is_active: false,
      p_is_ai_generated: true,
      p_weeks: weeks as any as any
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw rpcError;
    }

    // El RPC retorna jsonb { success: true, plan_id: '...' }
    // supabase-js lo devuelve como data.
    const result = rpcResult as any;
    if (result && result.plan_id) {
      return result.plan_id;
    } else {
      throw new Error('RPC did not return plan_id');
    }
  };

  const handleActivate = async (activate: boolean) => {
    if (!user?.id || !generatedPlanId) return;

    setShowActivateModal(false);

    if (activate) {
      try {
        await supabase
          .from('nutrition_plans')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);

        await supabase
          .from('nutrition_plans')
          .update({ is_active: true })
          .eq('id', generatedPlanId);

        router.replace(`/(tabs)/nutrition/plan-detail?id=${generatedPlanId}` as any);
      } catch (err) {
        console.error('Error activating plan:', err);
        showMessage('error', t('common.error'), t('nutrition.activationError'));
      }
    } else {
      showMessage('success', t('nutrition.planSaved'), t('nutrition.planSavedToLibrary'));
      setTimeout(() => {
        router.back();
      }, 1500);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nutrition.generatePlan')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Datos del perfil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 {t('nutrition.yourData')}</Text>
          <View style={styles.profileDataCard}>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 {t('nutrition.nutritionGoal')}</Text>
          <View style={styles.goalOptionsContainer}>
            {(['lose_fat', 'maintain', 'gain_muscle'] as const).map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[styles.goalOption, nutritionGoal === goal && styles.goalOptionActive]}
                onPress={() => setNutritionGoal(goal)}
              >
                <Ionicons
                  name={goal === 'lose_fat' ? 'flame' : goal === 'maintain' ? 'sync' : 'barbell'}
                  size={24}
                  color={nutritionGoal === goal ? '#000' : goal === 'lose_fat' ? '#f44336' : goal === 'maintain' ? '#2196F3' : '#4CAF50'}
                />
                <Text style={[styles.goalOptionText, nutritionGoal === goal && styles.goalOptionTextActive]}>
                  {t(`nutrition.${goal === 'lose_fat' ? 'loseFat' : goal === 'maintain' ? 'maintain' : 'gainMuscle'}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nivel de Fitness */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 {t('nutrition.fitnessLevel')}</Text>
          <View style={styles.goalOptionsContainer}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.goalOption, fitnessLevel === level && styles.goalOptionActive]}
                onPress={() => setFitnessLevel(level)}
              >
                <Text style={[styles.goalOptionText, fitnessLevel === level && styles.goalOptionTextActive]}>
                  {t(`nutrition.${level}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Composición corporal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📐 {t('nutrition.bodyComposition')}</Text>
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
            <Text style={styles.precisionNoteText}>{t('nutrition.precisionNote')}</Text>
          </View>
        </View>

        {/* Comidas por día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ {t('nutrition.mealsPerDay')}</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              onPress={() => setMealsPerDay(Math.max(1, mealsPerDay - 1))}
              disabled={mealsPerDay <= 1}
            >
              <Ionicons name="remove-circle" size={32} color={mealsPerDay <= 1 ? '#444' : '#ffb300'} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{mealsPerDay}</Text>
            <TouchableOpacity
              onPress={() => setMealsPerDay(Math.min(6, mealsPerDay + 1))}
              disabled={mealsPerDay >= 6}
            >
              <Ionicons name="add-circle" size={32} color={mealsPerDay >= 6 ? '#444' : '#ffb300'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferencias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ {t('nutrition.preferencesTitle')}</Text>
          <Text style={styles.helperText}>{t('nutrition.preferencesHelper')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newPrompt}
              onChangeText={setNewPrompt}
              placeholder={t('nutrition.preferencesPlaceholder')}
              placeholderTextColor="#666"
              maxLength={80}
              onSubmitEditing={addPrompt}
            />
            <TouchableOpacity style={styles.addButton} onPress={addPrompt}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.promptsList}>
            {customPrompts.map((prompt, index) => (
              <View key={index} style={styles.promptChip}>
                <Text style={styles.promptText}>{prompt}</Text>
                <TouchableOpacity onPress={() => removePrompt(index)}>
                  <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.promptsCount}>{customPrompts.length} / 10</Text>
        </View>

        {/* Botón generar */}
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <>
              <Ionicons name="sparkles" size={24} color="#1a1a1a" />
              <Text style={styles.generateButtonText}>{t('nutrition.generatePlan')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de confirmación */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="sparkles" size={48} color="#ffb300" />
            <Text style={styles.modalTitle}>{t('nutrition.generateNewPlan')}</Text>
            <Text style={styles.modalText}>{t('nutrition.generateNewPlanConfirm')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmAndGenerate}>
                <Ionicons name="create" size={20} color="#000" />
                <Text style={styles.modalConfirmText}>{t('common.generate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de activar */}
      <Modal visible={showActivateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={48} color="#ffb300" />
            <Text style={styles.modalTitle}>{t('nutrition.planGenerated')}</Text>
            <Text style={styles.modalText}>{t('nutrition.activatePlanQuestion')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => handleActivate(false)}>
                <Text style={styles.modalCancelText}>{t('nutrition.saveOnly')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActivateButton} onPress={() => handleActivate(true)}>
                <Ionicons name="flash" size={18} color="#000" />
                <Text style={styles.modalActivateText}>{t('common.activate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de mensaje */}
      <Modal visible={showMessageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name={messageModalData?.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={48}
              color={messageModalData?.type === 'success' ? '#4CAF50' : '#f44336'}
            />
            <Text style={styles.modalTitle}>{messageModalData?.title}</Text>
            <Text style={styles.modalText}>{messageModalData?.message}</Text>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowMessageModal(false)}
            >
              <Text style={styles.modalConfirmText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  profileDataCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#333' },
  profileDataRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  profileDataHalf: { flex: 1 },
  profileDataRowWeight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileDataLabel: { fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase' },
  profileDataValueBox: { backgroundColor: '#0d0d0d', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  profileDataValue: { fontSize: 16, fontWeight: '600', color: '#fff' },
  weightInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d0d0d', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#ffb300', minWidth: 120 },
  weightInputText: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', minWidth: 60, paddingVertical: 2 },
  weightUnitText: { fontSize: 14, color: '#888', marginLeft: 4 },
  goalOptionsContainer: { flexDirection: 'row', gap: 10 },
  goalOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 8, backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  goalOptionActive: { backgroundColor: '#ffb300', borderColor: '#ffb300' },
  goalOptionText: { fontSize: 11, fontWeight: '600', color: '#fff', marginTop: 6, textAlign: 'center' },
  goalOptionTextActive: { color: '#000' },
  optionalLabel: { fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: -8, marginBottom: 12 },
  bodyCompRow: { flexDirection: 'row', gap: 12 },
  bodyCompItem: { flex: 1 },
  bodyCompLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  bodyCompInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#333' },
  bodyCompInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff', paddingVertical: 12, textAlign: 'center' },
  bodyCompUnit: { fontSize: 14, color: '#888' },
  precisionNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255, 179, 0, 0.1)', borderRadius: 8, padding: 12, marginTop: 12, gap: 8 },
  precisionNoteText: { flex: 1, fontSize: 12, color: '#ccc', lineHeight: 18 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#ffb300' },
  stepperValue: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginHorizontal: 40 },
  helperText: { fontSize: 14, color: '#888', marginBottom: 16, lineHeight: 20 },
  inputContainer: { marginTop: 8, position: 'relative' },
  input: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 16, paddingRight: 50, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#ffb300' },
  addButton: { position: 'absolute', right: 8, top: 8, backgroundColor: '#ffb300', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  promptsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  promptChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#ffb300', gap: 8 },
  promptText: { fontSize: 14, color: '#fff' },
  promptsCount: { fontSize: 12, color: '#888', marginTop: 8, textAlign: 'right' },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffb300', borderRadius: 12, padding: 16, gap: 8, marginTop: 10 },
  generateButtonDisabled: { opacity: 0.6 },
  generateButtonText: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 24, padding: 32, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 16, marginBottom: 12 },
  modalText: { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelButton: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#999' },
  modalConfirmButton: { flex: 1, flexDirection: 'row', backgroundColor: '#ffb300', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#000' },
  modalActivateButton: { flex: 1, flexDirection: 'row', backgroundColor: '#ffb300', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  modalActivateText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
