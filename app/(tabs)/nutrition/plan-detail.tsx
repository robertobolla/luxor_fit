import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';

interface MealFood {
  id: string;
  food_id: string;
  quantity: number;
  quantity_unit: string;
  calculated_calories: number;
  calculated_protein: number;
  calculated_carbs: number;
  calculated_fat: number;
  foods: {
    id: string;
    name_es: string;
    name_en: string;
    image_url: string | null;
  };
}

interface Meal {
  id: string;
  meal_order: number;
  meal_name: string;
  nutrition_plan_meal_foods: MealFood[];
}

interface Day {
  id: string;
  day_number: number;
  day_name: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  nutrition_plan_meals: Meal[];
}

interface Week {
  id: string;
  week_number: number;
  nutrition_plan_days: Day[];
}

interface NutritionPlan {
  id: string;
  plan_name: string;
  description: string | null;
  is_active: boolean;
  is_ai_generated: boolean;
  total_weeks: number;
  created_at: string;
  updated_at: string;
  nutrition_plan_weeks: Week[];
}

export default function PlanDetailScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const params = useLocalSearchParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPlanDetail();
  }, [planId]);

  const loadPlanDetail = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('nutrition_plans')
        .select(`
          *,
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
                  foods (
                    id,
                    name_es,
                    name_en,
                    image_url
                  )
                )
              )
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      // Sort weeks and days
      if (data) {
        data.nutrition_plan_weeks = data.nutrition_plan_weeks
          .sort((a: Week, b: Week) => a.week_number - b.week_number)
          .map((week: Week) => ({
            ...week,
            nutrition_plan_days: week.nutrition_plan_days
              .sort((a: Day, b: Day) => a.day_number - b.day_number)
              .map((day: Day) => ({
                ...day,
                nutrition_plan_meals: day.nutrition_plan_meals
                  .sort((a: Meal, b: Meal) => a.meal_order - b.meal_order),
              })),
          }));
      }

      setPlan(data);

      // Expand first week by default
      if (data?.nutrition_plan_weeks?.length > 0) {
        setExpandedWeeks(new Set([data.nutrition_plan_weeks[0].id]));
      }
    } catch (err) {
      console.error('Error loading plan:', err);
      Alert.alert(t('common.error'), t('planDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const handleActivatePlan = async () => {
    if (!plan || !user?.id) return;

    setActivating(true);
    try {
      // Deactivate all plans
      await (supabase as any)
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Activate this plan
      const { error } = await (supabase as any)
        .from('nutrition_plans')
        .update({ is_active: true })
        .eq('id', plan.id);

      if (error) throw error;

      setPlan({ ...plan, is_active: true });
      setShowOptionsModal(false);
      Alert.alert(t('common.success'), t('planDetail.planActivated'));
    } catch (err) {
      console.error('Error activating plan:', err);
      Alert.alert(t('common.error'), t('planDetail.activateError'));
    } finally {
      setActivating(false);
    }
  };

  const handleDeletePlan = () => {
    if (!plan) return;

    Alert.alert(
      t('planDetail.deletePlan'),
      t('planDetail.deleteConfirm', { name: plan.plan_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await (supabase as any)
                .from('nutrition_plans')
                .delete()
                .eq('id', plan.id);

              if (error) throw error;

              Alert.alert(t('common.success'), t('planDetail.planDeleted'));
              router.back();
            } catch (err) {
              console.error('Error deleting plan:', err);
              Alert.alert(t('common.error'), t('planDetail.deleteError'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getFoodName = (food: { name_es: string; name_en: string }) => {
    return i18n.language === 'es' ? food.name_es : food.name_en;
  };

  const calculateDayTotals = (day: Day) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    
    day.nutrition_plan_meals?.forEach(meal => {
      meal.nutrition_plan_meal_foods?.forEach(food => {
        calories += food.calculated_calories || 0;
        protein += food.calculated_protein || 0;
        carbs += food.calculated_carbs || 0;
        fat += food.calculated_fat || 0;
      });
    });

    return { calories, protein, carbs, fat };
  };

  const renderMeal = (meal: Meal) => (
    <View key={meal.id} style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealOrderBadge}>
          <Text style={styles.mealOrderText}>{meal.meal_order}</Text>
        </View>
        <Text style={styles.mealName}>{meal.meal_name}</Text>
      </View>

      {meal.nutrition_plan_meal_foods?.length === 0 ? (
        <Text style={styles.emptyMealText}>{t('planDetail.noFoods')}</Text>
      ) : (
        <View style={styles.foodsList}>
          {meal.nutrition_plan_meal_foods?.map(mealFood => (
            <View key={mealFood.id} style={styles.foodItem}>
              {mealFood.foods?.image_url ? (
                <Image
                  source={{ uri: mealFood.foods.image_url }}
                  style={styles.foodImage}
                />
              ) : (
                <View style={styles.foodImagePlaceholder}>
                  <Ionicons name="restaurant" size={14} color="#666" />
                </View>
              )}
              <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={1}>
                  {mealFood.foods ? getFoodName(mealFood.foods) : 'Unknown'}
                </Text>
                <Text style={styles.foodQuantity}>
                  {mealFood.quantity} {mealFood.quantity_unit === 'units' ? t('editDay.units') : 'g'}
                </Text>
              </View>
              <View style={styles.foodMacros}>
                <Text style={styles.foodCalories}>{mealFood.calculated_calories} kcal</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderDay = (day: Day) => {
    const isExpanded = expandedDays.has(day.id);
    const totals = calculateDayTotals(day);

    return (
      <View key={day.id} style={styles.dayCard}>
        <TouchableOpacity
          style={styles.dayHeader}
          onPress={() => toggleDay(day.id)}
        >
          <View style={styles.dayHeaderLeft}>
            <View style={styles.dayNumberBadge}>
              <Text style={styles.dayNumberText}>{day.day_number}</Text>
            </View>
            <View style={styles.dayHeaderInfo}>
              <Text style={styles.dayName}>{day.day_name}</Text>
              <View style={styles.dayMacrosRow}>
                <Text style={[styles.dayMacroItem, { color: '#ffb300' }]}>{totals.calories}</Text>
                <Text style={[styles.dayMacroUnit, { color: '#ffb300' }]}>kcal</Text>
                <Text style={styles.dayMacroDot}>•</Text>
                <Text style={[styles.dayMacroItem, { color: '#4CAF50' }]}>{Math.round(totals.protein)}</Text>
                <Text style={[styles.dayMacroUnit, { color: '#4CAF50' }]}>g P</Text>
                <Text style={styles.dayMacroDot}>•</Text>
                <Text style={[styles.dayMacroItem, { color: '#2196F3' }]}>{Math.round(totals.carbs)}</Text>
                <Text style={[styles.dayMacroUnit, { color: '#2196F3' }]}>g C</Text>
                <Text style={styles.dayMacroDot}>•</Text>
                <Text style={[styles.dayMacroItem, { color: '#FF9800' }]}>{Math.round(totals.fat)}</Text>
                <Text style={[styles.dayMacroUnit, { color: '#FF9800' }]}>g F</Text>
              </View>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#888"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.dayContent}>
            {day.nutrition_plan_meals?.length === 0 ? (
              <Text style={styles.noMealsText}>{t('planDetail.noMeals')}</Text>
            ) : (
              day.nutrition_plan_meals?.map(renderMeal)
            )}
          </View>
        )}
      </View>
    );
  };

  const renderWeek = (week: Week) => {
    const isExpanded = expandedWeeks.has(week.id);

    return (
      <View key={week.id} style={styles.weekCard}>
        <TouchableOpacity
          style={styles.weekHeader}
          onPress={() => toggleWeek(week.id)}
        >
          <View style={styles.weekHeaderLeft}>
            <Ionicons name="calendar" size={22} color="#ffb300" />
            <Text style={styles.weekTitle}>
              {t('planDetail.week')} {week.week_number}
            </Text>
          </View>
          <View style={styles.weekHeaderRight}>
            <Text style={styles.weekDaysCount}>
              {week.nutrition_plan_days?.length || 0} {t('planDetail.days')}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#888"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.weekContent}>
            {week.nutrition_plan_days?.map(renderDay)}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffb300" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('planDetail.notFound')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{plan.plan_name}</Text>
          {plan.is_active && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#ffb300" />
              <Text style={styles.activeBadgeText}>{t('planDetail.active')}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Info */}
        <View style={styles.planInfoCard}>
          {plan.description && (
            <Text style={styles.planDescription}>{plan.description}</Text>
          )}
          <View style={styles.planStats}>
            <View style={styles.planStat}>
              <Text style={styles.planStatValue}>{plan.total_weeks}</Text>
              <Text style={styles.planStatLabel}>{t('planDetail.weeks')}</Text>
            </View>
            {plan.is_ai_generated && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color="#ffb300" />
                <Text style={styles.aiBadgeText}>{t('planDetail.aiGenerated')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weeks */}
        {plan.nutrition_plan_weeks?.map(renderWeek)}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(tabs)/nutrition/edit-plan?id=${plan.id}` as any)}
        >
          <Ionicons name="create-outline" size={20} color="#ffb300" />
          <Text style={styles.editButtonText}>{t('planDetail.edit')}</Text>
        </TouchableOpacity>

        {!plan.is_active && (
          <TouchableOpacity
            style={styles.activateButton}
            onPress={handleActivatePlan}
            disabled={activating}
          >
            {activating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#000" />
                <Text style={styles.activateButtonText}>{t('planDetail.activate')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('planDetail.options')}</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                router.push(`/(tabs)/nutrition/edit-plan?id=${plan.id}` as any);
              }}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
              <Text style={styles.modalOptionText}>{t('planDetail.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                // TODO: Implement duplicate
                setShowOptionsModal(false);
              }}
            >
              <Ionicons name="copy-outline" size={22} color="#fff" />
              <Text style={styles.modalOptionText}>{t('planDetail.duplicate')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                // TODO: Navigate to AI adaptation
                setShowOptionsModal(false);
              }}
            >
              <Ionicons name="sparkles" size={22} color="#ffb300" />
              <Text style={[styles.modalOptionText, { color: '#ffb300' }]}>
                {t('planDetail.adaptWithAI')}
              </Text>
            </TouchableOpacity>

            {!plan.is_active && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleActivatePlan}
                disabled={activating}
              >
                {activating ? (
                  <ActivityIndicator size="small" color="#ffb300" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={22} color="#ffb300" />
                )}
                <Text style={[styles.modalOptionText, { color: '#ffb300' }]}>
                  {t('planDetail.activate')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleDeletePlan}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#f44336" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#f44336" />
              )}
              <Text style={[styles.modalOptionText, { color: '#f44336' }]}>
                {t('planDetail.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </SafeAreaView>
    </>
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
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    color: '#ffb300',
  },
  optionsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  planInfoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  planDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
    lineHeight: 20,
  },
  planStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  planStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffb300',
  },
  planStatLabel: {
    fontSize: 14,
    color: '#888',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffb300',
  },
  weekCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  weekHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  weekHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekDaysCount: {
    fontSize: 13,
    color: '#888',
  },
  weekContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dayCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dayNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  dayHeaderInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  dayMacrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  dayMacroItem: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayMacroUnit: {
    fontSize: 10,
    color: '#888',
    marginLeft: 2,
  },
  dayMacroDot: {
    fontSize: 10,
    color: '#444',
    marginHorizontal: 5,
  },
  dayContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  targetComparison: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  noMealsText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  mealCard: {
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  mealOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealOrderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffb300',
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyMealText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 8,
  },
  foodsList: {
    gap: 6,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foodImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  foodImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 13,
    color: '#fff',
  },
  foodQuantity: {
    fontSize: 11,
    color: '#666',
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffb300',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffb300',
  },
  activateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ffb300',
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#fff',
  },
});
