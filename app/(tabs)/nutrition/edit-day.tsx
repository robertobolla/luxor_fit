import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useUnitsStore, conversions } from '@/store/unitsStore';

interface Food {
  id: string;
  name_es: string;
  name_en: string;
  food_type: string;
  quantity_type: 'grams' | 'units';
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  calories_per_unit: number | null;
  protein_per_unit: number | null;
  carbs_per_unit: number | null;
  fat_per_unit: number | null;
  image_url: string | null;
}

interface MealFood {
  id: string;
  food: Food;
  quantity: number;
  quantityUnit: 'grams' | 'units';
  calculatedCalories: number;
  calculatedProtein: number;
  calculatedCarbs: number;
  calculatedFat: number;
}

interface Meal {
  id: string;
  order: number;
  name: string;
  foods: MealFood[];
}

const FOOD_TYPES = [
  { key: 'proteins', icon: '🥩', color: '#f44336' },
  { key: 'carbohydrates', icon: '🍚', color: '#2196F3' },
  { key: 'vegetables', icon: '🥬', color: '#4CAF50' },
  { key: 'fruits', icon: '🍎', color: '#FF9800' },
  { key: 'dairy', icon: '🧀', color: '#FFC107' },
  { key: 'legumes', icon: '🫘', color: '#795548' },
  { key: 'nuts_seeds', icon: '🥜', color: '#8D6E63' },
  { key: 'fats_oils', icon: '🫒', color: '#9E9E9E' },
  { key: 'prepared_meals', icon: '🍕', color: '#E91E63' },
  { key: 'beverages', icon: '🥤', color: '#00BCD4' },
  { key: 'supplements', icon: '💊', color: '#9C27B0' },
  { key: 'other', icon: '🍽️', color: '#607D8B' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function EditDayScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const { weightUnit } = useUnitsStore();
  
  const dayId = params.dayId as string;
  const dayName = params.dayName as string;
  const targetCalories = parseInt(params.targetCalories as string) || 2000;
  const targetProtein = parseInt(params.targetProtein as string) || 150;
  const targetCarbs = parseInt(params.targetCarbs as string) || 200;
  const targetFat = parseInt(params.targetFat as string) || 70;
  const isNewPlan = params.isNewPlan === 'true';
  const existingDayDbId = params.dbDayId as string | undefined;

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Food selector modal states
  const [showFoodTypeModal, setShowFoodTypeModal] = useState(false);
  const [showFoodListModal, setShowFoodListModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedFoodType, setSelectedFoodType] = useState<string | null>(null);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');

  // Meal name edit modal
  const [showMealNameModal, setShowMealNameModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealNameInput, setMealNameInput] = useState('');

  // Calculate current totals
  const currentTotals = meals.reduce(
    (acc, meal) => {
      meal.foods.forEach(food => {
        acc.calories += food.calculatedCalories;
        acc.protein += food.calculatedProtein;
        acc.carbs += food.calculatedCarbs;
        acc.fat += food.calculatedFat;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Load existing day data if editing
  useEffect(() => {
    if (existingDayDbId) {
      loadExistingDayData();
    }
  }, [existingDayDbId]);

  const loadExistingDayData = async () => {
    if (!existingDayDbId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nutrition_plan_meals')
        .select(`
          id,
          meal_order,
          meal_name,
          nutrition_plan_meal_foods (
            id,
            food_id,
            quantity,
            quantity_unit,
            calculated_calories,
            calculated_protein,
            calculated_carbs,
            calculated_fat,
            foods (*)
          )
        `)
        .eq('day_id', existingDayDbId)
        .order('meal_order', { ascending: true });

      if (error) throw error;

      const loadedMeals: Meal[] = (data || []).map((m: any) => ({
        id: m.id,
        order: m.meal_order,
        name: m.meal_name,
        foods: (m.nutrition_plan_meal_foods || []).map((f: any) => ({
          id: f.id,
          food: f.foods,
          quantity: f.quantity,
          quantityUnit: f.quantity_unit,
          calculatedCalories: f.calculated_calories,
          calculatedProtein: f.calculated_protein,
          calculatedCarbs: f.calculated_carbs,
          calculatedFat: f.calculated_fat,
        })),
      }));

      setMeals(loadedMeals);
    } catch (err) {
      console.error('Error loading day data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMeal = () => {
    const newMeal: Meal = {
      id: generateId(),
      order: meals.length + 1,
      name: `${t('editDay.meal')} ${meals.length + 1}`,
      foods: [],
    };
    setMeals([...meals, newMeal]);
  };

  const removeMeal = (mealId: string) => {
    Alert.alert(
      t('editDay.removeMeal'),
      t('editDay.removeMealConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            setMeals(prev =>
              prev
                .filter(m => m.id !== mealId)
                .map((m, idx) => ({ ...m, order: idx + 1 }))
            );
          },
        },
      ]
    );
  };

  const openMealNameEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setMealNameInput(meal.name);
    setShowMealNameModal(true);
  };

  const saveMealName = () => {
    if (!editingMeal) return;
    setMeals(prev =>
      prev.map(m =>
        m.id === editingMeal.id ? { ...m, name: mealNameInput || m.name } : m
      )
    );
    setShowMealNameModal(false);
    setEditingMeal(null);
  };

  const openFoodSelector = (mealId: string) => {
    setSelectedMealId(mealId);
    setShowFoodTypeModal(true);
  };

  const selectFoodType = async (foodType: string) => {
    setSelectedFoodType(foodType);
    setShowFoodTypeModal(false);
    setShowFoodListModal(true);
    setFoodSearchQuery('');
    await loadFoodsByType(foodType);
  };

  const loadFoodsByType = async (foodType: string) => {
    setLoadingFoods(true);
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('food_type', foodType)
        .eq('status', 'complete')
        .order('name_es', { ascending: true });

      if (error) throw error;
      setFoods(data || []);
    } catch (err) {
      console.error('Error loading foods:', err);
      Alert.alert(t('common.error'), t('editDay.loadFoodsError'));
    } finally {
      setLoadingFoods(false);
    }
  };

  const filteredFoods = foods.filter(food => {
    const name = i18n.language === 'es' ? food.name_es : food.name_en;
    return name.toLowerCase().includes(foodSearchQuery.toLowerCase());
  });

  const selectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantity(food.quantity_type === 'units' ? '1' : '100');
    setShowFoodListModal(false);
    setShowQuantityModal(true);
  };

  const calculateMacros = (food: Food, qty: number) => {
    if (food.quantity_type === 'units') {
      return {
        calories: Math.round((food.calories_per_unit || 0) * qty),
        protein: Math.round((food.protein_per_unit || 0) * qty * 10) / 10,
        carbs: Math.round((food.carbs_per_unit || 0) * qty * 10) / 10,
        fat: Math.round((food.fat_per_unit || 0) * qty * 10) / 10,
      };
    } else {
      const factor = qty / 100;
      return {
        calories: Math.round((food.calories_per_100g || 0) * factor),
        protein: Math.round((food.protein_per_100g || 0) * factor * 10) / 10,
        carbs: Math.round((food.carbs_per_100g || 0) * factor * 10) / 10,
        fat: Math.round((food.fat_per_100g || 0) * factor * 10) / 10,
      };
    }
  };

  const addFoodToMeal = () => {
    if (!selectedFood || !selectedMealId) return;

    const qty = parseFloat(quantity) || (selectedFood.quantity_type === 'units' ? 1 : 100);
    const macros = calculateMacros(selectedFood, qty);

    const mealFood: MealFood = {
      id: generateId(),
      food: selectedFood,
      quantity: qty,
      quantityUnit: selectedFood.quantity_type,
      calculatedCalories: macros.calories,
      calculatedProtein: macros.protein,
      calculatedCarbs: macros.carbs,
      calculatedFat: macros.fat,
    };

    setMeals(prev =>
      prev.map(meal =>
        meal.id === selectedMealId
          ? { ...meal, foods: [...meal.foods, mealFood] }
          : meal
      )
    );

    setShowQuantityModal(false);
    setSelectedFood(null);
    setSelectedMealId(null);
  };

  const removeFoodFromMeal = (mealId: string, foodId: string) => {
    setMeals(prev =>
      prev.map(meal =>
        meal.id === mealId
          ? { ...meal, foods: meal.foods.filter(f => f.id !== foodId) }
          : meal
      )
    );
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage > 105) return '#f44336'; // Over
    if (percentage >= 90) return '#4CAF50'; // Good
    return '#ffb300'; // Under
  };

  const handleSave = async () => {
    // For now, just go back - in the full implementation, 
    // this would save to the database
    router.back();
  };

  const getFoodName = (food: Food) => {
    return i18n.language === 'es' ? food.name_es : food.name_en;
  };

  const getQuantityLabel = (food: Food) => {
    if (food.quantity_type === 'units') {
      return t('editDay.units');
    }
    return weightUnit === 'lb' ? 'oz' : 'g';
  };

  const renderMacroProgress = (
    label: string,
    current: number,
    target: number,
    color: string,
    unit: string = 'g'
  ) => {
    const percentage = getProgressPercentage(current, target);
    const progressColor = getProgressColor(current, target);

    return (
      <View style={styles.macroProgressItem}>
        <View style={styles.macroProgressHeader}>
          <Text style={[styles.macroProgressLabel, { color }]}>{label}</Text>
          <Text style={styles.macroProgressValue}>
            {Math.round(current)}{unit} / {target}{unit}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: progressColor },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderMealCard = (meal: Meal) => (
    <View key={meal.id} style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <TouchableOpacity
          style={styles.mealTitleRow}
          onPress={() => openMealNameEdit(meal)}
        >
          <Text style={styles.mealNumber}>{meal.order}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Ionicons name="pencil" size={14} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeMeal(meal.id)}>
          <Ionicons name="trash-outline" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>

      {meal.foods.length === 0 ? (
        <Text style={styles.emptyMealText}>{t('editDay.noFoodsYet')}</Text>
      ) : (
        <View style={styles.foodsList}>
          {meal.foods.map(mealFood => (
            <View key={mealFood.id} style={styles.foodItem}>
              {mealFood.food.image_url ? (
                <Image
                  source={{ uri: mealFood.food.image_url }}
                  style={styles.foodImage}
                />
              ) : (
                <View style={styles.foodImagePlaceholder}>
                  <Ionicons name="restaurant" size={16} color="#666" />
                </View>
              )}
              <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={1}>
                  {getFoodName(mealFood.food)}
                </Text>
                <Text style={styles.foodQuantity}>
                  {mealFood.quantity}{' '}
                  {mealFood.quantityUnit === 'units' ? t('editDay.units') : 'g'}
                </Text>
              </View>
              <View style={styles.foodMacros}>
                <Text style={styles.foodCalories}>{mealFood.calculatedCalories} kcal</Text>
                <Text style={styles.foodMacroDetail}>
                  P: {mealFood.calculatedProtein}g | C: {mealFood.calculatedCarbs}g | F: {mealFood.calculatedFat}g
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeFoodFromMeal(meal.id, mealFood.id)}
                style={styles.removeFoodButton}
              >
                <Ionicons name="close-circle" size={22} color="#f44336" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addFoodButton}
        onPress={() => openFoodSelector(meal.id)}
      >
        <Ionicons name="add" size={18} color="#ffb300" />
        <Text style={styles.addFoodButtonText}>{t('editDay.addFood')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{dayName}</Text>
          <Text style={styles.headerSubtitle}>{targetCalories} kcal</Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Macro progress */}
        <View style={styles.macroProgressSection}>
          <Text style={styles.sectionTitle}>{t('editDay.dailyProgress')}</Text>
          {renderMacroProgress(
            '🔥 ' + t('nutrition.calories'),
            currentTotals.calories,
            targetCalories,
            '#ffb300',
            ''
          )}
          {renderMacroProgress(
            t('nutrition.protein'),
            currentTotals.protein,
            targetProtein,
            '#4CAF50'
          )}
          {renderMacroProgress(
            t('nutrition.carbs'),
            currentTotals.carbs,
            targetCarbs,
            '#2196F3'
          )}
          {renderMacroProgress(
            t('nutrition.fats'),
            currentTotals.fat,
            targetFat,
            '#FF9800'
          )}
        </View>

        {/* Meals */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('editDay.meals')}</Text>
          </View>

          {meals.map(renderMealCard)}

          <TouchableOpacity style={styles.addMealButton} onPress={addMeal}>
            <Ionicons name="add-circle" size={24} color="#ffb300" />
            <Text style={styles.addMealButtonText}>{t('editDay.addMeal')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Food Type Selector Modal */}
      <Modal
        visible={showFoodTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFoodTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.foodTypeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('editDay.selectFoodType')}</Text>
              <TouchableOpacity onPress={() => setShowFoodTypeModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.foodTypeGrid}>
              <View style={styles.foodTypeRow}>
                {FOOD_TYPES.map((type, index) => (
                  <TouchableOpacity
                    key={type.key}
                    style={styles.foodTypeItem}
                    onPress={() => selectFoodType(type.key)}
                  >
                    <View style={[styles.foodTypeIcon, { backgroundColor: type.color + '20' }]}>
                      <Text style={styles.foodTypeEmoji}>{type.icon}</Text>
                    </View>
                    <Text style={styles.foodTypeLabel}>{t(`foodTypes.${type.key}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Food List Modal */}
      <Modal
        visible={showFoodListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFoodListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.foodListModalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowFoodListModal(false);
                setShowFoodTypeModal(true);
              }}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedFoodType && t(`foodTypes.${selectedFoodType}`)}
              </Text>
              <TouchableOpacity onPress={() => setShowFoodListModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                value={foodSearchQuery}
                onChangeText={setFoodSearchQuery}
                placeholder={t('editDay.searchFood')}
                placeholderTextColor="#666"
              />
            </View>

            {loadingFoods ? (
              <View style={styles.loadingFoods}>
                <ActivityIndicator size="large" color="#ffb300" />
              </View>
            ) : (
              <ScrollView style={styles.foodListScroll}>
                {filteredFoods.map(food => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.foodListItem}
                    onPress={() => selectFood(food)}
                  >
                    {food.image_url ? (
                      <Image
                        source={{ uri: food.image_url }}
                        style={styles.foodListImage}
                      />
                    ) : (
                      <View style={styles.foodListImagePlaceholder}>
                        <Ionicons name="restaurant" size={24} color="#666" />
                      </View>
                    )}
                    <View style={styles.foodListInfo}>
                      <Text style={styles.foodListName}>{getFoodName(food)}</Text>
                      <Text style={styles.foodListMacros}>
                        {food.quantity_type === 'units'
                          ? `${food.calories_per_unit} kcal / ${t('editDay.unit')}`
                          : `${food.calories_per_100g} kcal / 100g`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
                {filteredFoods.length === 0 && (
                  <Text style={styles.noFoodsText}>{t('editDay.noFoodsFound')}</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Quantity Modal */}
      <Modal
        visible={showQuantityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuantityModal(false)}
      >
        <View style={styles.quantityModalOverlay}>
          <View style={styles.quantityModalContent}>
            {selectedFood && (
              <>
                <View style={styles.quantityModalHeader}>
                  {selectedFood.image_url ? (
                    <Image
                      source={{ uri: selectedFood.image_url }}
                      style={styles.quantityFoodImage}
                    />
                  ) : (
                    <View style={styles.quantityFoodImagePlaceholder}>
                      <Ionicons name="restaurant" size={40} color="#666" />
                    </View>
                  )}
                  <Text style={styles.quantityFoodName}>{getFoodName(selectedFood)}</Text>
                </View>

                <View style={styles.quantityInputContainer}>
                  <Text style={styles.quantityLabel}>{t('editDay.quantity')}</Text>
                  <View style={styles.quantityInputRow}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const current = parseFloat(quantity) || 0;
                        const step = selectedFood.quantity_type === 'units' ? 1 : 25;
                        if (current > step) setQuantity((current - step).toString());
                      }}
                    >
                      <Ionicons name="remove" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                    />
                    <Text style={styles.quantityUnit}>{getQuantityLabel(selectedFood)}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const current = parseFloat(quantity) || 0;
                        const step = selectedFood.quantity_type === 'units' ? 1 : 25;
                        setQuantity((current + step).toString());
                      }}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Calculated macros preview */}
                <View style={styles.calculatedMacros}>
                  {(() => {
                    const macros = calculateMacros(selectedFood, parseFloat(quantity) || 0);
                    return (
                      <>
                        <View style={styles.calculatedMacroItem}>
                          <Text style={styles.calculatedMacroValue}>{macros.calories}</Text>
                          <Text style={styles.calculatedMacroLabel}>kcal</Text>
                        </View>
                        <View style={styles.calculatedMacroItem}>
                          <Text style={[styles.calculatedMacroValue, { color: '#4CAF50' }]}>
                            {macros.protein}g
                          </Text>
                          <Text style={styles.calculatedMacroLabel}>{t('nutrition.protein')}</Text>
                        </View>
                        <View style={styles.calculatedMacroItem}>
                          <Text style={[styles.calculatedMacroValue, { color: '#2196F3' }]}>
                            {macros.carbs}g
                          </Text>
                          <Text style={styles.calculatedMacroLabel}>{t('nutrition.carbs')}</Text>
                        </View>
                        <View style={styles.calculatedMacroItem}>
                          <Text style={[styles.calculatedMacroValue, { color: '#FF9800' }]}>
                            {macros.fat}g
                          </Text>
                          <Text style={styles.calculatedMacroLabel}>{t('nutrition.fats')}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>

                <View style={styles.quantityModalActions}>
                  <TouchableOpacity
                    style={styles.quantityCancelButton}
                    onPress={() => setShowQuantityModal(false)}
                  >
                    <Text style={styles.quantityCancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quantityAddButton}
                    onPress={addFoodToMeal}
                  >
                    <Ionicons name="add" size={20} color="#000" />
                    <Text style={styles.quantityAddButtonText}>{t('editDay.add')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Meal Name Edit Modal */}
      <Modal
        visible={showMealNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMealNameModal(false)}
      >
        <View style={styles.mealNameModalOverlay}>
          <View style={styles.mealNameModalContent}>
            <Text style={styles.mealNameModalTitle}>{t('editDay.editMealName')}</Text>
            <TextInput
              style={styles.mealNameInput}
              value={mealNameInput}
              onChangeText={setMealNameInput}
              placeholder={t('editDay.mealNamePlaceholder')}
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.mealNameModalActions}>
              <TouchableOpacity
                style={styles.mealNameCancelButton}
                onPress={() => setShowMealNameModal(false)}
              >
                <Text style={styles.mealNameCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mealNameSaveButton}
                onPress={saveMealName}
              >
                <Text style={styles.mealNameSaveButtonText}>{t('common.save')}</Text>
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
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  saveButton: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroProgressSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  macroProgressItem: {
    marginBottom: 12,
  },
  macroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroProgressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroProgressValue: {
    fontSize: 12,
    color: '#888',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealsSection: {
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mealNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffb300',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  emptyMealText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  foodsList: {
    gap: 8,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  foodImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  foodImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  foodQuantity: {
    fontSize: 12,
    color: '#888',
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffb300',
  },
  foodMacroDetail: {
    fontSize: 10,
    color: '#666',
  },
  removeFoodButton: {
    padding: 4,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
  },
  addFoodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffb300',
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
  },
  addMealButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  foodTypeModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  foodTypeGrid: {
    paddingHorizontal: 16,
  },
  foodTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  foodTypeItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  foodTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodTypeEmoji: {
    fontSize: 28,
  },
  foodTypeLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  foodListModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    height: '85%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  loadingFoods: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodListScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foodListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  foodListImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  foodListImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodListInfo: {
    flex: 1,
  },
  foodListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  foodListMacros: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  noFoodsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  quantityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  quantityModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
  },
  quantityModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityFoodImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  quantityFoodImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityFoodName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  quantityInputContainer: {
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
    textAlign: 'center',
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 100,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#ffb300',
    paddingVertical: 8,
  },
  quantityUnit: {
    fontSize: 16,
    color: '#888',
    width: 30,
  },
  calculatedMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  calculatedMacroItem: {
    alignItems: 'center',
  },
  calculatedMacroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffb300',
  },
  calculatedMacroLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  quantityModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  quantityCancelButtonText: {
    fontSize: 16,
    color: '#888',
  },
  quantityAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffb300',
  },
  quantityAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  mealNameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mealNameModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  mealNameModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  mealNameInput: {
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  mealNameModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  mealNameCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  mealNameCancelButtonText: {
    fontSize: 14,
    color: '#888',
  },
  mealNameSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ffb300',
    alignItems: 'center',
  },
  mealNameSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
