import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../src/services/supabase';
import { computeAndSaveTargets, createOrUpdateMealPlan, getNutritionProfile } from '../src/services/nutrition';

export default function ProfileEditScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados del formulario
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [availableDays, setAvailableDays] = useState<number>(3);
  
  // Datos originales para detectar cambios
  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setWeight(data.weight?.toString() || '');
        setHeight(data.height?.toString() || '');
        setAge(data.age?.toString() || '');
        setSelectedGoal(data.goals?.[0] || 'general_health');
        setSelectedActivity(data.activity_types?.[0] || 'mixed');
        if (typeof (data as any).available_days === 'number') {
          setAvailableDays((data as any).available_days);
        } else {
          setAvailableDays(3);
        }
        setOriginalData(data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = () => {
    if (!originalData) return false;
    
    return (
      weight !== (originalData.weight?.toString() || '') ||
      height !== (originalData.height?.toString() || '') ||
      age !== (originalData.age?.toString() || '') ||
      selectedGoal !== (originalData.goals?.[0] || 'general_health') ||
      selectedActivity !== (originalData.activity_types?.[0] || 'mixed') ||
      availableDays !== ((originalData as any).available_days ?? 3)
    );
  };

  const hasNutritionImpact = () => {
    if (!originalData) return false;
    
    // Cualquier cambio en el perfil puede afectar nutrición
    // Incluyendo edad (afecta BMR), peso, altura, objetivo, actividad
    return (
      weight !== (originalData.weight?.toString() || '') ||
      height !== (originalData.height?.toString() || '') ||
      age !== (originalData.age?.toString() || '') ||
      selectedGoal !== (originalData.goals?.[0] || 'general_health') ||
      selectedActivity !== (originalData.activity_types?.[0] || 'mixed')
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validaciones
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age);

    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 300) {
      Alert.alert('Error', 'El peso debe ser entre 1 y 300 kg.');
      return;
    }

    if (isNaN(heightNum) || heightNum <= 0 || heightNum > 250) {
      Alert.alert('Error', 'La altura debe ser entre 1 y 250 cm.');
      return;
    }

    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      Alert.alert('Error', 'La edad debe ser entre 13 y 120 años.');
      return;
    }

    if (!hasChanges()) {
      Alert.alert('Sin cambios', 'No has realizado ningún cambio.');
      return;
    }

    // Si hay cambios que afectan nutrición, preguntar
    if (hasNutritionImpact()) {
      // Verificar si tiene perfil de nutrición
      const nutritionProfile = await getNutritionProfile(user.id);
      
      if (nutritionProfile) {
        Alert.alert(
          'Actualizar plan de nutrición',
          'Los cambios que realizaste afectan tu plan de nutrición. ¿Deseas guardar los cambios y adaptar tu dieta?',
          [
            {
              text: 'Cancelar cambios',
              style: 'cancel',
              onPress: () => {
                // No hacer nada, mantener datos originales
                Alert.alert('Cambios cancelados', 'Tu perfil y dieta se mantienen sin cambios.');
              },
            },
            {
              text: 'Guardar y adaptar dieta',
              onPress: async () => {
                await saveProfileAndAdaptDiet(weightNum, heightNum, ageNum);
              },
            },
          ]
        );
      } else {
        // No tiene perfil de nutrición, guardar directamente
        await saveProfile(weightNum, heightNum, ageNum);
      }
    } else {
      // Cambios que no afectan nutrición, guardar directamente
      await saveProfile(weightNum, heightNum, ageNum);
    }
  };

  const saveProfile = async (weightNum: number, heightNum: number, ageNum: number) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          weight: weightNum,
          height: heightNum,
          age: ageNum,
          goals: [selectedGoal],
          activity_types: [selectedActivity],
          available_days: availableDays,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('¡Guardado!', 'Tu perfil ha sido actualizado.');
      router.back();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileAndAdaptDiet = async (weightNum: number, heightNum: number, ageNum: number) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // 1. Guardar perfil actualizado
      const { error } = await supabase
        .from('user_profiles')
        .update({
          weight: weightNum,
          height: heightNum,
          age: ageNum,
          goals: [selectedGoal],
          activity_types: [selectedActivity],
          available_days: availableDays,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Recalcular targets de nutrición
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);

      // Borrar y recalcular targets de esta semana
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        await supabase
          .from('nutrition_targets')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateStr);
        
        await computeAndSaveTargets(user.id, dateStr);
      }

      // 3. Regenerar plan de comidas
      const mondayStr = monday.toISOString().split('T')[0];
      
      await supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start', mondayStr);

      await createOrUpdateMealPlan(user.id, mondayStr);

      Alert.alert('¡Todo listo!', 'Tu perfil y plan de nutrición han sido actualizados.');
      router.back();
    } catch (err: any) {
      console.error('Error saving and adapting:', err);
      Alert.alert('Error', 'Hubo un problema al actualizar. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  const goals = [
    { value: 'weight_loss', label: 'Perder peso', icon: 'trending-down' },
    { value: 'muscle_gain', label: 'Ganar músculo', icon: 'fitness' },
    { value: 'strength', label: 'Aumentar fuerza', icon: 'barbell' },
    { value: 'endurance', label: 'Resistencia', icon: 'bicycle' },
    { value: 'general_health', label: 'Salud general', icon: 'heart' },
  ];

  const activities = [
    { value: 'cardio', label: 'Cardio', icon: 'walk' },
    { value: 'strength', label: 'Fuerza', icon: 'barbell' },
    { value: 'yoga', label: 'Yoga', icon: 'leaf' },
    { value: 'hiit', label: 'HIIT', icon: 'flame' },
    { value: 'sports', label: 'Deportes', icon: 'football' },
    { value: 'mixed', label: 'Mixto', icon: 'shuffle' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Datos Básicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Datos Básicos</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="70"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Altura (cm)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder="175"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Edad</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor="#666666"
              />
            </View>
          </View>
        </View>

        {/* Objetivo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Objetivo Principal</Text>
          <View style={styles.optionsGrid}>
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                style={[
                  styles.optionCard,
                  selectedGoal === goal.value && styles.optionCardActive,
                ]}
                onPress={() => setSelectedGoal(goal.value)}
              >
                <Ionicons
                  name={goal.icon as any}
                  size={32}
                  color={selectedGoal === goal.value ? '#00D4AA' : '#888888'}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    selectedGoal === goal.value && styles.optionLabelActive,
                  ]}
                >
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tipo de Actividad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 Tipo de Actividad</Text>
          <View style={styles.optionsGrid}>
            {activities.map((activity) => (
              <TouchableOpacity
                key={activity.value}
                style={[
                  styles.optionCard,
                  selectedActivity === activity.value && styles.optionCardActive,
                ]}
                onPress={() => setSelectedActivity(activity.value)}
              >
                <Ionicons
                  name={activity.icon as any}
                  size={32}
                  color={selectedActivity === activity.value ? '#00D4AA' : '#888888'}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    selectedActivity === activity.value && styles.optionLabelActive,
                  ]}
                >
                  {activity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Días de entrenamiento por semana */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Días de entrenamiento por semana</Text>
          <View style={styles.daysGrid}>
            {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, availableDays === d && styles.dayChipActive]}
                onPress={() => setAvailableDays(d)}
              >
                <Text style={[styles.dayChipText, availableDays === d && styles.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || !hasChanges()) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || !hasChanges()}
        >
          {isSaving ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>
                {hasChanges() ? 'Guardar Cambios' : 'Sin Cambios'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {hasNutritionImpact() && hasChanges() && (
          <Text style={styles.warningText}>
            ⚠️ Estos cambios afectarán tu plan de nutrición
          </Text>
        )}
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    marginTop: 12,
    fontSize: 16,
    color: '#888888',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  optionCardActive: {
    borderColor: '#00D4AA',
    backgroundColor: '#0f2a25',
  },
  optionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    textAlign: 'center',
  },
  optionLabelActive: {
    color: '#00D4AA',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  dayChipActive: {
    borderColor: '#00D4AA',
    backgroundColor: '#0f2a25',
  },
  dayChipText: {
    color: '#888888',
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#00D4AA',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  warningText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFA500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

