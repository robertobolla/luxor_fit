// ============================================================================
// NUTRITION HOME SCREEN
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
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';
import {
  computeAndSaveTargets,
  createOrUpdateMealPlan,
  getNutritionProfile,
  applyWeeklyAdjustment,
} from '../../../src/services/nutrition';
import { useNutritionStore } from '../../../src/store/nutritionStore';
import { NutritionTarget, MealLog } from '../../../src/types/nutrition';

export default function NutritionHomeScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayTarget, setTodayTarget] = useState<NutritionTarget | null>(null);
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [todayWater, setTodayWater] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadNutritionData();
      checkProfileChanges();
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
      const { data: waterData } = await supabase
        .from('hydration_logs')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      setTodayWater(waterData?.water_ml || 0);

      // Cargar target del día seleccionado
      const { data: targetData } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

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
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('weight, height, goals, activity_types, birthdate, gender')
        .eq('user_id', user.id)
        .single();

      if (error || !profileData) return;

      // Crear un hash del perfil relevante para nutrición
      const currentProfileHash = JSON.stringify({
        weight: profileData.weight,
        height: profileData.height,
        goals: profileData.goals,
        activity_types: profileData.activity_types,
        age: profileData.birthdate,
        gender: profileData.gender,
      });

      // Obtener el hash anterior (guardado en localStorage/AsyncStorage)
      const { data: nutritionProfile } = await supabase
        .from('nutrition_profiles')
        .select('custom_prompts')
        .eq('user_id', user.id)
        .single();

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

  const loadNutritionData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Verificar si existe perfil nutricional
      const profile = await getNutritionProfile(user.id);
      if (!profile) {
        // Redirigir a settings para configurar
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
        setIsLoading(false);
        return;
      }

      // Cargar target del día
      const { data: targetData } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (!targetData) {
        // No hay target, inicializar
        await initializeWeek();
      } else {
        setTodayTarget(targetData as NutritionTarget);
        
        // Verificar si existe plan de comidas para esta semana
        const dayOfWeek = new Date().getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date();
        monday.setDate(new Date().getDate() + diff);
        const mondayStr = monday.toISOString().split('T')[0];
        
        const { data: planData } = await supabase
          .from('meal_plans')
          .select('id')
          .eq('user_id', user.id)
          .eq('week_start', mondayStr)
          .single();
        
        if (!planData) {
          // No hay plan, generarlo
          console.log('📋 No se encontró plan de comidas, generando...');
          await createOrUpdateMealPlan(user.id, mondayStr);
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
      const { data: waterData } = await supabase
        .from('hydration_logs')
        .select('water_ml')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      setTodayWater(waterData?.water_ml || 0);
    } catch (err) {
      console.error('Error loading nutrition data:', err);
    } finally {
      setIsLoading(false);
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
        await applyWeeklyAdjustment(user.id);
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
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>
          {isInitializing ? 'Generando tu plan nutricional...' : 'Cargando...'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nutrición</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition/settings' as any)}>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Macros del día */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 {formatDate(selectedDate)}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
                <Ionicons name="chevron-back" size={20} color="#00D4AA" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)} 
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>{new Date(selectedDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavButton}>
                <Ionicons name="chevron-forward" size={20} color="#00D4AA" />
              </TouchableOpacity>
              {selectedDate === new Date().toISOString().split('T')[0] && (
                <TouchableOpacity 
                onPress={async () => {
                // Forzar recálculo de targets
                if (!user?.id) return;
                
                Alert.alert(
                  'Recalcular calorías',
                  '¿Quieres recalcular tus calorías y macros con tu perfil actual?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Sí, recalcular',
                      onPress: async () => {
                        setIsInitializing(true);
                        try {
                          const today = new Date();
                          const dayOfWeek = today.getDay();
                          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                          const monday = new Date(today);
                          monday.setDate(today.getDate() + diff);

                          console.log('🔄 Recalculando targets para la semana...');

                          // Primero, actualizar el hash del perfil para forzar sincronización
                          const { data: profileData } = await supabase
                            .from('user_profiles')
                            .select('weight, height, goals, activity_types, birthdate, gender')
                            .eq('user_id', user.id)
                            .single();

                          if (profileData) {
                            const currentProfileHash = JSON.stringify({
                              weight: profileData.weight,
                              height: profileData.height,
                              goals: profileData.goals,
                              activity_types: profileData.activity_types,
                              age: profileData.birthdate,
                              gender: profileData.gender,
                            });
                            
                            console.log('📝 Datos del perfil actual:', profileData);
                            
                            // Guardar el nuevo hash
                            const nutritionProfile = await getNutritionProfile(user.id);
                            if (nutritionProfile) {
                              const customPrompts = nutritionProfile.custom_prompts || [];
                              const filteredPrompts = customPrompts.filter((p: string) => 
                                !p.startsWith('__PROFILE_HASH__:')
                              );
                              filteredPrompts.push(`__PROFILE_HASH__:${currentProfileHash}`);
                              
                              await supabase
                                .from('nutrition_profiles')
                                .update({ custom_prompts: filteredPrompts })
                                .eq('user_id', user.id);
                            }
                          }

                          // Borrar targets de esta semana
                          for (let i = 0; i < 7; i++) {
                            const date = new Date(monday);
                            date.setDate(monday.getDate() + i);
                            const dateStr = date.toISOString().split('T')[0];
                            
                            const { error: deleteError } = await supabase
                              .from('nutrition_targets')
                              .delete()
                              .eq('user_id', user.id)
                              .eq('date', dateStr);
                            
                            if (deleteError) {
                              console.error(`Error borrando target ${dateStr}:`, deleteError);
                            } else {
                              console.log(`✅ Target borrado: ${dateStr}`);
                            }
                            
                            const result = await computeAndSaveTargets(user.id, dateStr);
                            console.log(`📊 Target recalculado para ${dateStr}:`, result.target);
                          }

                          Alert.alert('¡Listo!', 'Tus calorías han sido recalculadas con tu perfil actual. Verifica los logs.');
                          
                          // Esperar un momento antes de recargar
                          setTimeout(() => {
                            loadNutritionData();
                          }, 500);
                        } catch (err) {
                          console.error('❌ Error recalculando:', err);
                          Alert.alert('Error', 'No se pudo recalcular.');
                        } finally {
                          setIsInitializing(false);
                        }
                      },
                    },
                  ]
                );
              }}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={20} color="#00D4AA" />
            </TouchableOpacity>
              )}
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
                    backgroundColor: '#00D4AA',
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
            <Ionicons name="chevron-forward" size={20} color="#00D4AA" />
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
                        <Ionicons name="checkmark" size={20} color="#00D4AA" />
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
            <Ionicons name="water" size={40} color="#00D4AA" />
            <Text style={styles.waterText}>
              {todayWater} / {targetWater} ml
            </Text>
            <TouchableOpacity
              style={styles.addWaterButton}
              onPress={() => router.push(`/(tabs)/nutrition/log?type=water&date=${selectedDate}` as any)}
            >
              <Ionicons name="add-circle" size={28} color="#00D4AA" />
              <Text style={styles.addWaterText}>Agregar agua</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/plan' as any)}
            >
              <Ionicons name="restaurant" size={32} color="#00D4AA" />
              <Text style={styles.actionText}>Ver Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/(tabs)/nutrition/log?date=${selectedDate}` as any)}
            >
              <Ionicons name="add-circle-outline" size={32} color="#00D4AA" />
              <Text style={styles.actionText}>Registrar Comida</Text>
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <Text style={styles.actionSubtext}>Para el día seleccionado</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/grocery' as any)}
            >
              <Ionicons name="cart" size={32} color="#00D4AA" />
              <Text style={styles.actionText}>Lista de Compras</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/nutrition/lessons' as any)}
            >
              <Ionicons name="school" size={32} color="#00D4AA" />
              <Text style={styles.actionText}>Academia</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  macrosCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#00D4AA',
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
    borderColor: '#00D4AA',
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
    color: '#00D4AA',
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
    borderColor: '#00D4AA',
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
    color: '#00D4AA',
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
    color: '#00D4AA',
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
    borderTopColor: '#00D4AA',
  },
  detailButtonText: {
    color: '#00D4AA',
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
    borderColor: '#00D4AA',
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
    backgroundColor: '#00D4AA',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});

