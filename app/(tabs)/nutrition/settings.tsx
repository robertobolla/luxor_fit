// ============================================================================
// NUTRITION SETTINGS SCREEN
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import {
  getNutritionProfile,
  upsertNutritionProfile,
  createOrUpdateMealPlan,
  computeAndSaveTargets,
} from '../../../src/services/nutrition';
import { NutritionProfile } from '../../../src/types/nutrition';
import { supabase } from '../../../src/services/supabase';
import { FitnessGoal } from '../../../src/types';

export default function NutritionSettingsScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [activePlanData, setActivePlanData] = useState<any>(null);
  
  // Campos para cuando useActivePlan === 'false'
  const [dietGoal, setDietGoal] = useState<FitnessGoal | null>(null);
  const [trainingDays, setTrainingDays] = useState(3);
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [musclePercentage, setMusclePercentage] = useState('');
  
  // Campos para cuando useActivePlan === 'true' (solo composición corporal)
  const [activePlanBodyFat, setActivePlanBodyFat] = useState('');
  const [activePlanMuscle, setActivePlanMuscle] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  // Efecto separado para cargar datos del plan activo cuando cambian los parámetros
  useEffect(() => {
    if (params.useActivePlan === 'true' && params.activePlanData) {
      try {
        const planData = JSON.parse(params.activePlanData as string);
        setActivePlanData(planData);
      } catch (e) {
        console.error('Error parseando activePlanData:', e);
      }
    } else if (params.useActivePlan === 'false') {
      // Si viene con useActivePlan=false, limpiar los datos del plan activo
      setActivePlanData(null);
    }
  }, [params.useActivePlan, params.activePlanData]);

  const loadProfile = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const profile = await getNutritionProfile(user.id);
      if (profile) {
        setMealsPerDay(profile.meals_per_day);
        // Filtrar el hash del perfil que se guarda internamente
        const prompts = (profile.custom_prompts || []).filter((p: string) => 
          !p.startsWith('__PROFILE_HASH__:')
        );
        setCustomPrompts(prompts);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validaciones
    if (mealsPerDay < 1 || mealsPerDay > 6) {
      Alert.alert('Error', 'Las comidas por día deben estar entre 1 y 6.');
      return;
    }

    if (customPrompts.length > 10) {
      Alert.alert('Error', 'Máximo 10 preferencias personalizadas.');
      return;
    }

    // Validar objetivo cuando no hay plan activo
    if (!activePlanData && params.useActivePlan === 'false' && !dietGoal) {
      Alert.alert('Error', 'Por favor selecciona un objetivo para tu dieta.');
      return;
    }

    setIsSaving(true);
    try {
      // Obtener el perfil actual para preservar el hash del perfil
      const currentProfile = await getNutritionProfile(user.id);
      const existingHash = currentProfile?.custom_prompts?.find((p: string) => 
        p.startsWith('__PROFILE_HASH__:')
      );
      
      // Combinar las preferencias del usuario con el hash del perfil (si existe)
      const promptsToSave = existingHash 
        ? [...customPrompts, existingHash]
        : customPrompts;

      const result = await upsertNutritionProfile(user.id, {
        meals_per_day: mealsPerDay,
        fasting_window: null,
        custom_prompts: promptsToSave,
      });

      if (result.success) {
        // Si viene con plan activo, preguntar si quiere generar directamente
        if (activePlanData) {
          Alert.alert(
            '¿Generar nuevo plan?',
            '¿Estás seguro de generar un nuevo plan? Se borrarán los datos del plan nutricional anterior.',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
                onPress: () => {
                  router.push('/(tabs)/nutrition' as any);
                },
              },
              {
                text: 'Generar',
                style: 'destructive',
                onPress: async () => {
                  // Obtener el plan activo completo
                  const { data: activePlan } = await supabase
                    .from('workout_plans')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                  if (activePlan) {
                    await regenerateMealPlan(true, activePlan);
                  }
                },
              },
            ]
          );
        } else {
          // Preguntar si quiere regenerar el plan
          Alert.alert(
            '¡Guardado!',
            '¿Deseas crear un nuevo plan de comidas con la nueva configuración?',
            [
              {
                text: 'No',
                style: 'cancel',
                onPress: async () => {
                  // Aunque no regenere el plan, recalcular targets
                  try {
                    const today = new Date();
                    const dayOfWeek = today.getDay();
                    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(today);
                    monday.setDate(today.getDate() + diff);
                    
                    // Recalcular targets para esta semana
                    for (let i = 0; i < 7; i++) {
                      const date = new Date(monday);
                      date.setDate(monday.getDate() + i);
                      const dateStr = date.toISOString().split('T')[0];
                      
                      // Borrar target existente
                      await supabase
                        .from('nutrition_targets')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('date', dateStr);
                      
                      // Regenerar target con datos actualizados
                      await computeAndSaveTargets(user.id, dateStr);
                    }
                    
                    console.log('✅ Targets recalculados');
                  } catch (err) {
                    console.error('Error recalculando targets:', err);
                  }
                  
                  router.push('/(tabs)/nutrition' as any);
                },
              },
              {
                text: 'Sí',
                onPress: async () => {
                  // Si el usuario ya eligió "con objetivos diferentes" (useActivePlan = false),
                  // no volver a preguntar, generar directamente
                  if (params.useActivePlan === 'false') {
                    await regenerateMealPlan(false, null);
                    return;
                  }

                  // Si vino sin especificar, preguntar
                  try {
                    // Verificar si hay plan activo
                    const { data: activePlan } = await supabase
                      .from('workout_plans')
                      .select('*')
                      .eq('user_id', user.id)
                      .eq('is_active', true)
                      .maybeSingle();

                    // Preguntar qué método quiere usar
                    Alert.alert(
                      'Generar Plan de Nutrición',
                      '¿Quieres generar tu dieta basada en tu plan de entrenamiento activo o con objetivos diferentes?',
                      [
                        {
                          text: 'Basada en plan activo',
                          onPress: async () => {
                            if (activePlan) {
                              await regenerateMealPlan(true, activePlan);
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
                          },
                        },
                        {
                          text: 'Con objetivos diferentes',
                          onPress: async () => {
                            // Usar datos del perfil actual
                            await regenerateMealPlan(false, null);
                          },
                        },
                        {
                          text: 'Cancelar',
                          style: 'cancel',
                        },
                      ]
                    );
                  } catch (err: any) {
                    console.error('Error checking active plan:', err);
                    // Si hay error, continuar con regeneración normal
                    await regenerateMealPlan(false, null);
                  }
                },
              },
            ]
          );
        }
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar la configuración.');
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message || 'Error inesperado al guardar.');
    } finally {
      setIsSaving(false);
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

  const regenerateMealPlan = async (useActivePlan: boolean, activePlan: any) => {
    if (!user?.id) return;

    try {
      setIsSaving(true);
      
      // Obtener lunes de esta semana
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = monday.toISOString().split('T')[0];

      // Extraer datos del plan activo si se usa, o datos del formulario si no hay plan activo
      let workoutPlanData = null;
      let bodyCompositionData: { body_fat_percentage?: number; muscle_percentage?: number } | null = null;
      
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
        
        // Agregar composición corporal si se proporcionó
        if (activePlanBodyFat.trim()) {
          const bodyFat = parseFloat(activePlanBodyFat);
          if (!isNaN(bodyFat) && bodyFat >= 0 && bodyFat <= 100) {
            bodyCompositionData = { ...bodyCompositionData, body_fat_percentage: bodyFat };
          }
        }
        if (activePlanMuscle.trim()) {
          const muscle = parseFloat(activePlanMuscle);
          if (!isNaN(muscle) && muscle >= 0 && muscle <= 100) {
            bodyCompositionData = { ...bodyCompositionData, muscle_percentage: muscle };
          }
        }
        
        console.log('📋 Usando datos del plan activo para generar dieta:', workoutPlanData);
      } else {
        // Cuando no hay plan activo, usar datos del formulario
        if (dietGoal) {
          workoutPlanData = {
            goals: [dietGoal],
            available_days: trainingDays,
          };
        }
        
        // Agregar composición corporal si se proporcionó
        if (bodyFatPercentage.trim()) {
          const bodyFat = parseFloat(bodyFatPercentage);
          if (!isNaN(bodyFat) && bodyFat >= 0 && bodyFat <= 100) {
            bodyCompositionData = { ...bodyCompositionData, body_fat_percentage: bodyFat };
          }
        }
        if (musclePercentage.trim()) {
          const muscle = parseFloat(musclePercentage);
          if (!isNaN(muscle) && muscle >= 0 && muscle <= 100) {
            bodyCompositionData = { ...bodyCompositionData, muscle_percentage: muscle };
          }
        }
      }
      
      // Actualizar perfil del usuario temporalmente con composición corporal si se proporcionó
      if (bodyCompositionData && Object.keys(bodyCompositionData).length > 0) {
        try {
          const updateData: any = {};
          if (bodyCompositionData.body_fat_percentage !== undefined) {
            updateData.body_fat_percentage = bodyCompositionData.body_fat_percentage;
          }
          if (bodyCompositionData.muscle_percentage !== undefined) {
            updateData.muscle_percentage = bodyCompositionData.muscle_percentage;
          }
          
          await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', user.id);
          
          console.log('✅ Perfil actualizado con composición corporal:', updateData);
        } catch (err) {
          console.error('⚠️ Error actualizando composición corporal (continuando de todas formas):', err);
        }
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
      router.push('/(tabs)/nutrition' as any);
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      Alert.alert('Error', 'No se pudo regenerar el plan. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
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
              // Navegar directamente a nutrition
              router.push('/(tabs)/nutrition' as any);
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuración</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Información del Plan Activo */}
        {activePlanData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Plan de Entrenamiento Activo</Text>
            <Text style={styles.sectionHelper}>
              Estos son los parámetros que se usarán para generar tu nuevo plan de nutrición:
            </Text>
            <View style={styles.activePlanCard}>
              <View style={styles.activePlanRow}>
                <Text style={styles.activePlanLabel}>Nivel de Fitness:</Text>
                <Text style={styles.activePlanValue}>
                  {activePlanData.fitness_level === 'beginner' ? 'Principiante' :
                   activePlanData.fitness_level === 'intermediate' ? 'Intermedio' :
                   activePlanData.fitness_level === 'advanced' ? 'Avanzado' :
                   activePlanData.fitness_level || 'N/A'}
                </Text>
              </View>
              <View style={styles.activePlanRow}>
                <Text style={styles.activePlanLabel}>Objetivos:</Text>
                <View style={styles.activePlanTagsContainer}>
                  {(activePlanData.goals || []).map((goal: string, index: number) => {
                    const goalMap: { [key: string]: string } = {
                      weight_loss: 'Bajar grasa',
                      muscle_gain: 'Ganar músculo',
                      strength: 'Aumentar fuerza',
                      endurance: 'Mejorar resistencia',
                      flexibility: 'Flexibilidad',
                      general_fitness: 'Forma general',
                    };
                    return (
                      <View key={index} style={styles.activePlanTag}>
                        <Text style={styles.activePlanTagText}>{goalMap[goal] || goal}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.activePlanRow}>
                <Text style={styles.activePlanLabel}>Tipos de Actividad:</Text>
                <View style={styles.activePlanTagsContainer}>
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
                      <View key={index} style={styles.activePlanTag}>
                        <Text style={styles.activePlanTagText}>{activityMap[activity] || activity}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.activePlanRow}>
                <Text style={styles.activePlanLabel}>Días por Semana:</Text>
                <Text style={styles.activePlanValue}>{activePlanData.available_days || 0} días</Text>
              </View>
              <View style={styles.activePlanRow}>
                <Text style={styles.activePlanLabel}>Duración por Sesión:</Text>
                <Text style={styles.activePlanValue}>{activePlanData.session_duration || 0} minutos</Text>
              </View>
            </View>
          </View>
        )}

        {/* Campos de composición corporal cuando hay plan activo */}
        {activePlanData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Composición Corporal (Opcional)</Text>
            <Text style={styles.sectionHelper}>
              Esta información ayuda a personalizar mejor tu plan nutricional
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Grasa corporal (%)</Text>
              <TextInput
                style={styles.input}
                value={activePlanBodyFat}
                onChangeText={setActivePlanBodyFat}
                placeholder="15"
                placeholderTextColor="#666666"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Masa muscular (%)</Text>
              <TextInput
                style={styles.input}
                value={activePlanMuscle}
                onChangeText={setActivePlanMuscle}
                placeholder="40"
                placeholderTextColor="#666666"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Campos cuando NO hay plan activo (objetivos diferentes) */}
        {!activePlanData && params.useActivePlan === 'false' && (
          <>
            {/* Objetivo de la dieta */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Objetivo de la Dieta</Text>
              <Text style={styles.sectionHelper}>
                Selecciona el objetivo principal para tu plan nutricional
              </Text>
              <View style={styles.optionsContainer}>
                {Object.values(FitnessGoal).map((goal) => {
                  const goalLabels: { [key: string]: string } = {
                    [FitnessGoal.WEIGHT_LOSS]: 'Bajar grasa',
                    [FitnessGoal.MUSCLE_GAIN]: 'Ganar músculo',
                    [FitnessGoal.STRENGTH]: 'Aumentar fuerza',
                    [FitnessGoal.ENDURANCE]: 'Mejorar resistencia',
                    [FitnessGoal.FLEXIBILITY]: 'Flexibilidad',
                    [FitnessGoal.GENERAL_FITNESS]: 'Forma general',
                  };
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[
                        styles.optionButton,
                        dietGoal === goal && styles.optionButtonSelected
                      ]}
                      onPress={() => setDietGoal(goal)}
                    >
                      <Text style={[
                        styles.optionText,
                        dietGoal === goal && styles.optionTextSelected
                      ]}>
                        {goalLabels[goal] || goal}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Días de entrenamiento */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Días de Entrenamiento por Semana</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setTrainingDays(Math.max(1, trainingDays - 1))}
                  disabled={trainingDays <= 1}
                >
                  <Ionicons
                    name="remove-circle"
                    size={32}
                    color={trainingDays <= 1 ? '#444444' : '#ffb300'}
                  />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{trainingDays}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setTrainingDays(Math.min(7, trainingDays + 1))}
                  disabled={trainingDays >= 7}
                >
                  <Ionicons
                    name="add-circle"
                    size={32}
                    color={trainingDays >= 7 ? '#444444' : '#ffb300'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Composición corporal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Composición Corporal (Opcional)</Text>
              <Text style={styles.sectionHelper}>
                Esta información ayuda a personalizar mejor tu plan nutricional
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Grasa corporal (%)</Text>
                <TextInput
                  style={styles.input}
                  value={bodyFatPercentage}
                  onChangeText={setBodyFatPercentage}
                  placeholder="15"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Masa muscular (%)</Text>
                <TextInput
                  style={styles.input}
                  value={musclePercentage}
                  onChangeText={setMusclePercentage}
                  placeholder="40"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        {/* Comidas por día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Comidas por Día</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setMealsPerDay(Math.max(1, mealsPerDay - 1))}
              disabled={mealsPerDay <= 1}
            >
              <Ionicons
                name="remove-circle"
                size={32}
                color={mealsPerDay <= 1 ? '#444444' : '#ffb300'}
              />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{mealsPerDay}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Preferencias Personalizadas</Text>
          <Text style={styles.sectionHelper}>
            Estas preferencias afectarán tu plan de comidas. Ejemplos: "prefiero platos rápidos",
            "evitar picantes", "más opciones con pescado", "budget bajo".
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newPrompt}
              onChangeText={setNewPrompt}
              placeholder="Ej: prefiero comidas rápidas"
              placeholderTextColor="#666666"
              maxLength={80}
              onSubmitEditing={addPrompt}
            />
            <TouchableOpacity style={styles.addButton} onPress={addPrompt}>
              <Ionicons name="add" size={24} color="#ffffff" />
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

          <Text style={styles.promptsCount}>
            {customPrompts.length} / 10 preferencias
          </Text>
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardar Configuración</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 50 }} />
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  sectionHelper: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    lineHeight: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  stepperButton: {
    padding: 8,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginHorizontal: 40,
    minWidth: 60,
    textAlign: 'center',
  },
  inputContainer: {
    marginTop: 16,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  inputHelper: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  addButton: {
    position: 'absolute',
    right: 8,
    top: 40,
    backgroundColor: '#ffb300',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  promptChip: {
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
  promptText: {
    fontSize: 14,
    color: '#ffffff',
  },
  promptsCount: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
    textAlign: 'right',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  inputUnit: {
    fontSize: 18,
    color: '#ffb300',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  activityOptions: {
    gap: 12,
  },
  activityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  activityOptionActive: {
    borderColor: '#ffb300',
    backgroundColor: '#0f2a25',
  },
  activityOptionContent: {
    flex: 1,
  },
  activityOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  activityOptionLabelActive: {
    color: '#ffb300',
  },
  activityOptionDesc: {
    fontSize: 13,
    color: '#888888',
  },
  activePlanCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  activePlanRow: {
    marginBottom: 16,
  },
  activePlanLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 8,
  },
  activePlanValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  activePlanTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  activePlanTag: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  activePlanTagText: {
    fontSize: 14,
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  optionButtonSelected: {
    borderColor: '#ffb300',
    backgroundColor: '#0f2a25',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  optionTextSelected: {
    color: '#ffb300',
  },
});

