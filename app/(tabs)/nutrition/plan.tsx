// ============================================================================
// MEAL PLAN SCREEN
// ============================================================================

import React, { useEffect, useState } from 'react';
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
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { getMealPlan, FOOD_DATABASE } from '../../../src/services/nutrition';
import { supabase } from '../../../src/services/supabase';
import { WeekPlan, DayPlan, MealOption } from '../../../src/types/nutrition';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function MealPlanScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMealOptions, setSelectedMealOptions] = useState<Record<string, number>>({});
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dailyTarget, setDailyTarget] = useState<{ calories: number; protein_g: number; carbs_g: number; fats_g: number } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadWeekPlan();
    }
  }, [user]);

  // Cargar objetivo del día al cambiar de día
  useEffect(() => {
    const loadTargetForSelectedDay = async () => {
      if (!user?.id) return;

      // Calcular fecha del día seleccionado basado en el lunes
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const selectedDate = new Date(monday);
      selectedDate.setDate(monday.getDate() + selectedDay);
      const selectedStr = selectedDate.toISOString().split('T')[0];

      try {
        // 1) Intentar leer directamente de nutrition_targets
        const { data: targetRow, error } = await supabase
          .from('nutrition_targets')
          .select('calories, protein_g, carbs_g, fats_g')
          .eq('user_id', user.id)
          .eq('date', selectedStr)
          .maybeSingle();

        if (error) {
          console.warn('No target found, will compute:', error?.message);
        }

        if (targetRow) {
          setDailyTarget({
            calories: targetRow.calories,
            protein_g: targetRow.protein_g,
            carbs_g: targetRow.carbs_g,
            fats_g: targetRow.fats_g,
          });
          return;
        }

        // 2) Si no existe, calcular y guardar, luego leer
        const { computeAndSaveTargets } = await import('../../../src/services/nutrition');
        const res = await computeAndSaveTargets(user.id, selectedStr);
        if (res.success && res.target) {
          setDailyTarget({
            calories: res.target.calories,
            protein_g: res.target.protein_g,
            carbs_g: res.target.carbs_g,
            fats_g: res.target.fats_g,
          });
        }
      } catch (e) {
        console.error('Error loading daily target:', e);
      }
    };

    loadTargetForSelectedDay();
  }, [selectedDay, user?.id]);

  const loadWeekPlan = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Obtener lunes de esta semana
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = monday.toISOString().split('T')[0];

      let plan = await getMealPlan(user.id, mondayStr);

      // Si no existe plan o tiene menos de 7 días, regenerarlo automáticamente
      if (!plan || Object.keys(plan).length < 7) {
        try {
          const { computeAndSaveTargets, createOrUpdateMealPlan, clearNutritionCache } = await import('../../../src/services/nutrition');
          const { supabase } = await import('../../../src/services/supabase');
          
          // Limpiar caché para forzar regeneración completa
          clearNutritionCache(user.id);
          
          // Borrar plan existente si tiene menos de 7 días
          if (plan && Object.keys(plan).length < 7) {
            await supabase
              .from('meal_plans')
              .delete()
              .eq('user_id', user.id)
              .eq('week_start', mondayStr);
            console.log('🗑️ Plan incompleto eliminado, regenerando...');
          }
          
          // Asegurar target del lunes (mínimo requerido por el generador)
          await computeAndSaveTargets(user.id, mondayStr);
          // Generar plan de la semana completo (7 días)
          const result = await createOrUpdateMealPlan(user.id, mondayStr);
          if (result.success) {
            plan = await getMealPlan(user.id, mondayStr);
            console.log('✅ Plan regenerado con 7 días completos');
          }
        } catch (regenErr) {
          console.error('Error regenerating meal plan automatically:', regenErr);
        }
      }

      setWeekPlan(plan);
    } catch (err) {
      console.error('Error loading meal plan:', err);
      Alert.alert('Error', 'No se pudo cargar el plan de comidas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAdjustment = async () => {
    if (!user?.id) return;
    
    if (!aiPrompt.trim()) {
      Alert.alert('Error', 'Por favor escribe una instrucción para la IA.');
      return;
    }

    setShowAIModal(false);
    setIsLoading(true);

    try {
      // Obtener perfil actual
      const { getNutritionProfile, upsertNutritionProfile, computeAndSaveTargets, createOrUpdateMealPlan, clearNutritionCache } = await import('../../../src/services/nutrition');
      const { supabase } = await import('../../../src/services/supabase');
      
      // Limpiar caché para forzar recálculo
      clearNutritionCache(user.id);
      
      const currentProfile = await getNutritionProfile(user.id);
      
      if (!currentProfile) {
        Alert.alert('Error', 'No se pudo cargar tu perfil de nutrición.');
        setIsLoading(false);
        return;
      }

      const updatedPrompts = [...(currentProfile.custom_prompts || []), aiPrompt.trim()];

      // Guardar el nuevo prompt
      await upsertNutritionProfile(user.id, {
        meals_per_day: currentProfile.meals_per_day,
        fasting_window: currentProfile.fasting_window,
        custom_prompts: updatedPrompts,
      });

      // Obtener lunes de esta semana
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

      // Regenerar targets de forma optimizada
      console.log('🔄 Regenerando targets para la semana...');
      const targetPromises = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        targetPromises.push(computeAndSaveTargets(user.id, dateStr));
      }
      
      // Ejecutar todos los targets en paralelo
      await Promise.all(targetPromises);
      console.log('✅ Targets regenerados exitosamente');

      // Regenerar plan con el nuevo prompt
      await createOrUpdateMealPlan(user.id, mondayStr);

      // Recargar el plan
      const plan = await import('../../../src/services/nutrition').then(m => m.getMealPlan(user.id, mondayStr));
      setWeekPlan(plan);

      Alert.alert(
        '¡Plan actualizado!', 
        'Tu plan de comidas ha sido regenerado con tus nuevas preferencias.'
      );
      setAiPrompt('');
    } catch (err: any) {
      console.error('Error adjusting plan:', err);
      Alert.alert('Error', 'No se pudo ajustar el plan. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFoodName = (foodId: number): string => {
    const food = FOOD_DATABASE.find(f => f.id === foodId);
    return food ? food.name : `Alimento #${foodId}`;
  };

  const renderMeal = (mealType: string, meals: MealOption[] | undefined) => {
    if (!meals || meals.length === 0) return null;

    const key = `${DAYS[selectedDay]}-${mealType}`;
    const selectedIndex = selectedMealOptions[key] || 0;
    const meal = meals[selectedIndex];

    // Validar que el meal existe y tiene las propiedades necesarias
    if (!meal || !meal.name) {
      console.warn(`Meal undefined for ${mealType} on day ${selectedDay}:`, meal);
      return (
        <View style={styles.mealCard} key={mealType}>
          <Text style={styles.mealType}>
            {{
              breakfast: '🍳 Desayuno',
              lunch: '🍽️ Almuerzo',
              dinner: '🌙 Cena',
              snacks: '🥤 Snack',
            }[mealType]}
          </Text>
          <Text style={styles.mealName}>Comida no disponible</Text>
          <Text style={styles.errorText}>Error al cargar esta comida. Intenta regenerar el plan.</Text>
        </View>
      );
    }

    const mealTypeLabel = {
      breakfast: '🍳 Desayuno',
      lunch: '🍽️ Almuerzo',
      dinner: '🌙 Cena',
      snacks: '🥤 Snack',
    }[mealType];

    return (
      <View style={styles.mealCard} key={mealType}>
        <Text style={styles.mealType}>{mealTypeLabel}</Text>
        <Text style={styles.mealName}>
          {meals.length > 1 ? `Opción ${selectedIndex + 1}: ` : ''}{meal.name}
        </Text>
        
        {/* Ingredientes detallados */}
        <View style={styles.ingredientsSection}>
          <Text style={styles.ingredientsTitle}>Ingredientes:</Text>
          {meal.items && meal.items.length > 0 ? (
            meal.items.map((item, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={styles.ingredientBullet}>•</Text>
                <Text style={styles.ingredientText}>
                  {getFoodName(item.food_id)}: {item.grams}g {item.food_id <= 10 ? '(crudo)' : item.food_id <= 18 ? '(cocido)' : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.errorText}>No hay ingredientes disponibles</Text>
          )}
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{meal.calories || 0}</Text>
            <Text style={styles.macroLabel}>kcal</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{meal.protein_g || 0}g</Text>
            <Text style={styles.macroLabel}>proteína</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{meal.carbs_g || 0}g</Text>
            <Text style={styles.macroLabel}>carbos</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{meal.fats_g || 0}g</Text>
            <Text style={styles.macroLabel}>grasas</Text>
          </View>
        </View>

        {meals.length > 1 && (
          <TouchableOpacity
            style={styles.replaceButton}
            onPress={() => {
              const nextIndex = (selectedIndex + 1) % meals.length;
              setSelectedMealOptions({ ...selectedMealOptions, [key]: nextIndex });
            }}
          >
            <Ionicons name="swap-horizontal" size={20} color="#00D4AA" />
            <Text style={styles.replaceText}>Cambiar comida ({selectedIndex + 1}/{meals.length})</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Cargando plan...</Text>
      </SafeAreaView>
    );
  }

  if (!weekPlan) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>No se encontró un plan de comidas.</Text>
        <Text style={styles.errorSubtext}>Ve a Configuración para generar tu plan.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const dayPlan = weekPlan[DAYS[selectedDay] as keyof WeekPlan];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Semanal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowAIModal(true)}
            style={styles.aiButton}
          >
            <Ionicons name="sparkles" size={22} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/nutrition/settings' as any)}
            style={styles.adjustButton}
          >
            <Ionicons name="options-outline" size={22} color="#00D4AA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
        {DAYS.map((day, index) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayButton, selectedDay === index && styles.dayButtonActive]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[styles.dayButtonText, selectedDay === index && styles.dayButtonTextActive]}>
              {DAY_NAMES[index].substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.selectedDayTitle}>{DAY_NAMES[selectedDay]}</Text>
        
        {/* Objetivo diario: eliminado el cuadro visual duplicado. El Resumen usa este valor internamente. */}

        {/* Resumen del día = mismo dato que Objetivo del día (fuente: nutrition_targets). */}
        {(() => {
          const dayKey = DAYS[selectedDay] as keyof WeekPlan;
          const currentDayPlan = weekPlan[dayKey];
          
          if (!currentDayPlan) return null;
          
          // Calcular totales del día
          const totals = {
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fats_g: 0
          };
          
          const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
          mealTypes.forEach(mealType => {
            const meals = currentDayPlan[mealType];
            if (meals && meals.length > 0) {
              const key = `${dayKey}-${mealType}`;
              const selectedIndex = selectedMealOptions[key] || 0;
              const meal = meals[selectedIndex];
              if (meal) {
                totals.calories += meal.calories || 0;
                totals.protein_g += meal.protein_g || 0;
                totals.carbs_g += meal.carbs_g || 0;
                totals.fats_g += meal.fats_g || 0;
              }
            }
          });
          
          // Si existe dailyTarget, usarlo para el resumen (misma fuente que "Hoy").
          const summary = dailyTarget || totals;

          return (
            <View style={styles.dailySummaryCard}>
              <Text style={styles.dailySummaryTitle}>Resumen del día</Text>
              <View style={styles.dailySummaryGrid}>
                <View style={styles.dailySummaryItem}>
                  <Text style={styles.dailySummaryValue}>{summary.calories}</Text>
                  <Text style={styles.dailySummaryLabel}>kcal</Text>
                </View>
                <View style={styles.dailySummaryItem}>
                  <Text style={styles.dailySummaryValue}>{summary.protein_g}g</Text>
                  <Text style={styles.dailySummaryLabel}>proteína</Text>
                </View>
                <View style={styles.dailySummaryItem}>
                  <Text style={styles.dailySummaryValue}>{summary.carbs_g}g</Text>
                  <Text style={styles.dailySummaryLabel}>carbos</Text>
                </View>
                <View style={styles.dailySummaryItem}>
                  <Text style={styles.dailySummaryValue}>{summary.fats_g}g</Text>
                  <Text style={styles.dailySummaryLabel}>grasas</Text>
                </View>
              </View>
            </View>
          );
        })()}
        
        {renderMeal('breakfast', dayPlan.breakfast)}
        {renderMeal('lunch', dayPlan.lunch)}
        {renderMeal('dinner', dayPlan.dinner)}
        {dayPlan.snacks && renderMeal('snacks', dayPlan.snacks)}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modal de IA */}
      <Modal
        visible={showAIModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlayTouchable} 
            activeOpacity={1}
            onPress={() => setShowAIModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Ionicons name="sparkles" size={28} color="#FFD700" />
                <Text style={styles.modalTitle}>Ajustar Plan con IA</Text>
                <TouchableOpacity onPress={() => setShowAIModal(false)}>
                  <Ionicons name="close" size={28} color="#888888" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Escribe una instrucción para ajustar tu plan de comidas:
              </Text>

              <TextInput
                style={styles.promptInput}
                placeholder="Ej: Más opciones con pescado, comidas más rápidas..."
                placeholderTextColor="#666666"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAIModal(false);
                    setAiPrompt('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAIAdjustment}
                >
                  <Ionicons name="sparkles" size={20} color="#1a1a1a" />
                  <Text style={styles.confirmButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backIconButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  aiButton: {
    padding: 8,
  },
  adjustButton: {
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
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  daySelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 70,
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  dayButtonActive: {
    backgroundColor: '#00D4AA',
    borderColor: '#00D4AA',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  dayButtonTextActive: {
    color: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  selectedDayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  mealType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  ingredientsSection: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4AA',
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  ingredientBullet: {
    fontSize: 14,
    color: '#888888',
    marginRight: 8,
    marginTop: 2,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  macroLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D4AA',
    gap: 8,
  },
  replaceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4AA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginLeft: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 16,
    lineHeight: 20,
  },
  promptInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
  },
  confirmButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dailySummaryCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  dailySummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 16,
    textAlign: 'center',
  },
  dailySummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dailySummaryItem: {
    alignItems: 'center',
  },
  dailySummaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dailySummaryLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
});

