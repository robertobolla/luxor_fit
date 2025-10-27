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
import { router } from 'expo-router';
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

export default function NutritionSettingsScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [fastingWindow, setFastingWindow] = useState('');
  const [isFasting, setIsFasting] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const profile = await getNutritionProfile(user.id);
      if (profile) {
        setMealsPerDay(profile.meals_per_day);
        setFastingWindow(profile.fasting_window || '');
        setIsFasting(!!profile.fasting_window);
        setCustomPrompts(profile.custom_prompts || []);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateFastingWindow = (window: string): boolean => {
    if (!window) return true; // Vacío es válido si no hace ayuno
    const regex = /^\d{1,2}-\d{1,2}$/;
    if (!regex.test(window)) return false;

    const [start, end] = window.split('-').map(Number);
    return start >= 0 && start <= 23 && end >= 0 && end <= 23 && start !== end;
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validaciones
    if (mealsPerDay < 1 || mealsPerDay > 6) {
      Alert.alert('Error', 'Las comidas por día deben estar entre 1 y 6.');
      return;
    }

    if (isFasting && !validateFastingWindow(fastingWindow)) {
      Alert.alert(
        'Error',
        'La ventana de ayuno debe tener el formato HH-HH (ej: 12-20) con horas válidas (0-23).'
      );
      return;
    }

    if (customPrompts.length > 10) {
      Alert.alert('Error', 'Máximo 10 preferencias personalizadas.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await upsertNutritionProfile(user.id, {
        meals_per_day: mealsPerDay,
        fasting_window: isFasting ? fastingWindow : null,
        custom_prompts: customPrompts,
      });

      if (result.success) {
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
                
                router.back();
              },
            },
            {
              text: 'Sí',
              onPress: async () => {
                try {
                  setIsSaving(true);
                  
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

                  // Regenerar targets
                  for (let i = 0; i < 7; i++) {
                    const date = new Date(monday);
                    date.setDate(monday.getDate() + i);
                    const dateStr = date.toISOString().split('T')[0];
                    await computeAndSaveTargets(user.id, dateStr);
                  }

                  // Regenerar plan
                  await createOrUpdateMealPlan(user.id, mondayStr);

                  Alert.alert('¡Listo!', 'Tu nuevo plan de comidas ha sido generado.');
                  router.back();
                } catch (err: any) {
                  console.error('Error regenerating plan:', err);
                  Alert.alert('Error', 'No se pudo regenerar el plan. Intenta nuevamente.');
                } finally {
                  setIsSaving(false);
                }
              },
            },
          ]
        );
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00D4AA" />
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuración</Text>
          <View style={{ width: 24 }} />
        </View>

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
                color={mealsPerDay <= 1 ? '#444444' : '#00D4AA'}
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
                color={mealsPerDay >= 6 ? '#444444' : '#00D4AA'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ayuno intermitente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Ayuno Intermitente</Text>
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setIsFasting(!isFasting)}
          >
            <Text style={styles.toggleLabel}>¿Haces ayuno intermitente?</Text>
            <View style={[styles.toggle, isFasting && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isFasting && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          {isFasting && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ventana de alimentación (HH-HH)</Text>
              <Text style={styles.inputHelper}>Ejemplo: 12-20 (comer de 12pm a 8pm)</Text>
              <TextInput
                style={styles.input}
                value={fastingWindow}
                onChangeText={setFastingWindow}
                placeholder="12-20"
                placeholderTextColor="#666666"
                keyboardType="default"
              />
            </View>
          )}
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
    borderColor: '#00D4AA',
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#00D4AA',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
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
    borderColor: '#00D4AA',
  },
  addButton: {
    position: 'absolute',
    right: 8,
    top: 40,
    backgroundColor: '#00D4AA',
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
    borderColor: '#00D4AA',
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
    backgroundColor: '#00D4AA',
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
    color: '#00D4AA',
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
    borderColor: '#00D4AA',
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
    color: '#00D4AA',
  },
  activityOptionDesc: {
    fontSize: 13,
    color: '#888888',
  },
});

