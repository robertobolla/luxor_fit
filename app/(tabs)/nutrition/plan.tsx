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
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { getMealPlan, FOOD_DATABASE } from '../../../src/services/nutrition';
import { supabase } from '../../../src/services/supabase';
import { WeekPlan, DayPlan, MealOption } from '../../../src/types/nutrition';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';
import { useLoadingState } from '../../../src/hooks/useLoadingState';
import { EmptyNutrition } from '../../../src/components/EmptyStates';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function MealPlanScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams<{ weekStart?: string }>();
  const { isLoading, setLoading: setIsLoading, executeAsync } = useLoadingState(true);
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMealOptions, setSelectedMealOptions] = useState<Record<string, number>>({});
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dailyTarget, setDailyTarget] = useState<{ calories: number; protein_g: number; carbs_g: number; fats_g: number } | null>(null);
  const [weekStartDate, setWeekStartDate] = useState<string | null>(null);
  const [isWeekPast, setIsWeekPast] = useState(false);
  const [showNoPlanModal, setShowNoPlanModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWeekPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.weekStart]);

  // Cargar objetivo del día al cambiar de día
  useEffect(() => {
    const loadTargetForSelectedDay = async () => {
      if (!user?.id) return;

      // Calcular fecha del día seleccionado basado en el lunes de la semana seleccionada
      const monday = weekStartDate ? new Date(weekStartDate) : (() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const mondayDate = new Date(today);
        mondayDate.setDate(today.getDate() + diff);
        return mondayDate;
      })();
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
  }, [selectedDay, user?.id, weekStartDate]);

  const loadWeekPlan = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Usar weekStart del parámetro si está disponible, sino usar la semana actual
      let mondayStr: string;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Calcular lunes de la semana actual
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(today.getDate() + diff);
      const currentWeekMondayStr = currentWeekMonday.toISOString().split('T')[0];
      
      if (params.weekStart) {
        mondayStr = params.weekStart;
        setWeekStartDate(mondayStr);
        
        // Verificar si la semana ya pasó
        const weekEnd = new Date(mondayStr);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        const isPast = todayStr > weekEndStr;
        setIsWeekPast(isPast);
        
        // Verificar si la semana es futura (después del domingo de la semana actual)
        const currentWeekEnd = new Date(currentWeekMonday);
        currentWeekEnd.setDate(currentWeekMonday.getDate() + 6);
        const currentWeekEndStr = currentWeekEnd.toISOString().split('T')[0];
        const isFuture = mondayStr > currentWeekEndStr;
        
        if (isFuture) {
          // Semana futura - mostrar modal y no cargar nada
          setWeekPlan(null);
          setShowNoPlanModal(true);
          setIsLoading(false);
          return;
        }
      } else {
        // Obtener lunes de esta semana
        mondayStr = currentWeekMondayStr;
        setWeekStartDate(mondayStr);
        setIsWeekPast(false);
      }

      // Verificar si realmente existe un plan en la base de datos
      const { data: planExists } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', mondayStr)
        .maybeSingle();

      let plan = await getMealPlan(user.id, mondayStr);

      // Si no existe plan en la base de datos
      if (!planExists && !plan) {
        // Si la semana ya pasó, mostrar modal
        if (isWeekPast) {
          setWeekPlan(null);
          setShowNoPlanModal(true);
          setIsLoading(false);
          return;
        }
        // Si la semana es actual (no pasada), intentar generar uno
        // NOTA: Las semanas futuras ya fueron filtradas arriba
        try {
          const { computeAndSaveTargets, createOrUpdateMealPlan, clearNutritionCache } = await import('../../../src/services/nutrition');
          
          // Limpiar caché para forzar regeneración completa
          clearNutritionCache(user.id);
          
          // Asegurar target del lunes (mínimo requerido por el generador)
          await computeAndSaveTargets(user.id, mondayStr);
          // Generar plan de la semana completo (7 días)
          const result = await createOrUpdateMealPlan(user.id, mondayStr);
          if (result.success) {
            plan = await getMealPlan(user.id, mondayStr);
            console.log('✅ Plan generado con 7 días completos');
          }
        } catch (regenErr) {
          console.error('Error generating meal plan automatically:', regenErr);
          setWeekPlan(null);
          setIsLoading(false);
          return;
        }
      } else if (plan && Object.keys(plan).length < 7) {
        // Si el plan existe pero está incompleto, solo regenerarlo si la semana no ha pasado
        if (!isWeekPast) {
          try {
            const { computeAndSaveTargets, createOrUpdateMealPlan, clearNutritionCache } = await import('../../../src/services/nutrition');
            const { supabase } = await import('../../../src/services/supabase');
            
            // Limpiar caché para forzar regeneración completa
            clearNutritionCache(user.id);
            
            // Borrar plan existente incompleto
            await supabase
              .from('meal_plans')
              .delete()
              .eq('user_id', user.id)
              .eq('week_start', mondayStr);
            console.log('🗑️ Plan incompleto eliminado, regenerando...');
            
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

      // Usar weekStart del parámetro o estado si está disponible, sino usar la semana actual
      let mondayStr: string;
      if (weekStartDate) {
        mondayStr = weekStartDate;
      } else {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        mondayStr = monday.toISOString().split('T')[0];
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
            <Ionicons name="swap-horizontal" size={20} color="#ffb300" />
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
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>Cargando plan...</Text>
      </SafeAreaView>
    );
  }

  if (!weekPlan && !showNoPlanModal) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LoadingOverlay visible={true} message="Cargando plan..." fullScreen />
      </SafeAreaView>
    );
  }

  // Si no hay plan y el modal está visible, renderizar el modal
  if (!weekPlan && showNoPlanModal) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Modal
          visible={showNoPlanModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowNoPlanModal(false);
            router.back();
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="calendar-outline" size={48} color="#FFD93D" />
              </View>
              <Text style={styles.modalTitle}>Plan No Disponible</Text>
              <Text style={styles.modalMessage}>
                {(() => {
                  // Verificar si es semana futura
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0];
                  const dayOfWeek = today.getDay();
                  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  const currentWeekMonday = new Date(today);
                  currentWeekMonday.setDate(today.getDate() + diff);
                  const currentWeekEnd = new Date(currentWeekMonday);
                  currentWeekEnd.setDate(currentWeekMonday.getDate() + 6);
                  const currentWeekEndStr = currentWeekEnd.toISOString().split('T')[0];
                  
                  if (weekStartDate && weekStartDate > currentWeekEndStr) {
                    return 'Esta semana aún no está disponible. El plan de la próxima semana se generará automáticamente el lunes siguiente basado en los datos de la semana actual.';
                  }
                  return 'No existe un plan de comidas para esta semana. Esto puede deberse a que:';
                })()}
              </Text>
              {(() => {
                // Solo mostrar razones si no es semana futura
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const dayOfWeek = today.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const currentWeekMonday = new Date(today);
                currentWeekMonday.setDate(today.getDate() + diff);
                const currentWeekEnd = new Date(currentWeekMonday);
                currentWeekEnd.setDate(currentWeekMonday.getDate() + 6);
                const currentWeekEndStr = currentWeekEnd.toISOString().split('T')[0];
                
                if (weekStartDate && weekStartDate > currentWeekEndStr) {
                  return null; // No mostrar razones para semanas futuras
                }
                
                return (
                  <View style={styles.modalReasons}>
                    <Text style={styles.modalReason}>• Aún no habías generado un plan para esta semana</Text>
                    <Text style={styles.modalReason}>• No tenías la app instalada en ese momento</Text>
                    <Text style={styles.modalReason}>• La semana ya finalizó y no se puede generar retroactivamente</Text>
                  </View>
                );
              })()}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowNoPlanModal(false);
                  router.back();
                }}
              >
                <Text style={styles.modalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
            style={[styles.aiButton, isWeekPast && styles.aiButtonDisabled]}
            disabled={isWeekPast}
          >
            <Ionicons name="sparkles" size={22} color={isWeekPast ? "#666666" : "#FFD700"} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/nutrition/settings' as any)}
            style={styles.adjustButton}
          >
            <Ionicons name="options-outline" size={22} color="#ffb300" />
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

      {/* Modal: No hay plan para esta semana */}
      <Modal
        visible={showNoPlanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowNoPlanModal(false);
          router.back();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="calendar-outline" size={48} color="#FFD93D" />
            </View>
            <Text style={styles.modalTitle}>Plan No Disponible</Text>
            <Text style={styles.modalMessage}>
              No existe un plan de comidas para esta semana. Esto puede deberse a que:
            </Text>
            <View style={styles.modalReasons}>
              <Text style={styles.modalReason}>• Aún no habías generado un plan para esta semana</Text>
              <Text style={styles.modalReason}>• No tenías la app instalada en ese momento</Text>
              <Text style={styles.modalReason}>• La semana ya finalizó y no se puede generar retroactivamente</Text>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowNoPlanModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
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
  aiButtonDisabled: {
    opacity: 0.5,
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
    backgroundColor: '#ffb300',
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
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
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
    borderColor: '#ffb300',
  },
  mealType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
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
    color: '#ffb300',
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
    borderColor: '#ffb300',
    gap: 8,
  },
  replaceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffb300',
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
    borderColor: '#ffb300',
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
    backgroundColor: '#ffb300',
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
    borderColor: '#ffb300',
  },
  dailySummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
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
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalReasons: {
    marginTop: 16,
    marginBottom: 24,
    gap: 8,
  },
  modalReason: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#ffb300',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});

