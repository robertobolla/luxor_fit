// ============================================================================
// MEAL LOG SCREEN
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import { logMeal, logWater, calculateFoodMacros, FOOD_DATABASE } from '../../../src/services/nutrition';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';

// Interfaz para los alimentos
interface FoodItem {
  id: number;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  category: string;
  tags?: string[];
}

export default function MealLogScreen() {
  const { user } = useUser();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const isWaterLog = params.type === 'water';

  const [mealName, setMealName] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [waterAmount, setWaterAmount] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Filtrar alimentos basándose en el texto ingresado (mínimo 3 caracteres)
  const filteredFoods = useMemo(() => {
    if (mealName.length < 3 || selectedFood) return [];
    const searchTerm = mealName.toLowerCase().trim();
    return FOOD_DATABASE.filter((food: FoodItem) => 
      food.name.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limitar a 8 sugerencias
  }, [mealName, selectedFood]);

  // Manejar selección de un alimento de la lista
  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setMealName(food.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  // Calcular macros basándose en el alimento seleccionado y el peso
  const calculateFromDatabase = () => {
    if (!selectedFood || !weightGrams) {
      Alert.alert(t('common.error'), t('nutrition.enterFoodAndWeight'));
      return;
    }

    const weight = parseInt(weightGrams);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert(t('common.error'), t('nutrition.weightMustBePositive'));
      return;
    }

    // Calcular macros proporcionalmente al peso
    const factor = weight / 100;
    const calculatedCalories = Math.round(selectedFood.calories_per_100g * factor);
    const calculatedProtein = Math.round(selectedFood.protein_per_100g * factor * 10) / 10;
    const calculatedCarbs = Math.round(selectedFood.carbs_per_100g * factor * 10) / 10;
    const calculatedFats = Math.round(selectedFood.fats_per_100g * factor * 10) / 10;

    setCalories(calculatedCalories.toString());
    setProtein(calculatedProtein.toString());
    setCarbs(calculatedCarbs.toString());
    setFats(calculatedFats.toString());

    Alert.alert(t('nutrition.calculated'), t('nutrition.macrosCalculatedWithAI'));
  };

  const handleCalculate = async () => {
    if (!mealName.trim() || !weightGrams) {
      Alert.alert(t('common.error'), t('nutrition.enterFoodAndWeight'));
      return;
    }

    const weight = parseInt(weightGrams);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert(t('common.error'), t('nutrition.weightMustBePositive'));
      return;
    }

    // Si hay un alimento seleccionado del banco de datos, usar sus valores
    if (selectedFood) {
      calculateFromDatabase();
      return;
    }

    // Si no hay alimento seleccionado, usar IA como fallback
    setIsCalculating(true);
    try {
      const result = await calculateFoodMacros(mealName, weight);

      if (result.success && result.data) {
        setCalories(result.data.calories.toString());
        setProtein(result.data.protein_g.toString());
        setCarbs(result.data.carbs_g.toString());
        setFats(result.data.fats_g.toString());
        Alert.alert(t('nutrition.calculated'), t('nutrition.macrosCalculatedWithAI'));
      } else {
        Alert.alert(t('common.error'), result.error || t('nutrition.couldNotCalculateMacros'));
      }
    } catch (err: any) {
      console.error('Error calculating macros:', err);
      Alert.alert(t('common.error'), err.message || t('errors.unknownError'));
    } finally {
      setIsCalculating(false);
    }
  };

  const handleLogMeal = async () => {
    if (!user?.id) return;

    if (!mealName.trim() || !calories || !protein || !carbs || !fats) {
      Alert.alert(t('common.error'), t('nutrition.completeAllFields'));
      return;
    }

    setIsSaving(true);
    
    // Lógica de retry manual para capturar valores actuales
    const maxRetries = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 0);
        
        const result = await logMeal(
          user.id,
          { name: mealName, weight_grams: parseInt(weightGrams) || 0 },
          {
            calories: parseInt(calories),
            protein_g: parseInt(protein),
            carbs_g: parseInt(carbs),
            fats_g: parseInt(fats),
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'No se pudo registrar la comida');
        }

        // Éxito
        setIsSaving(false);
        setIsRetrying(false);
        Alert.alert(t('nutrition.saved'), t('nutrition.mealLoggedCorrectly'), [
          { text: t('common.ok'), onPress: () => router.push('/(tabs)/nutrition' as any) },
        ]);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxRetries) {
          const delay = 2000 * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Todos los intentos fallaron
    setIsSaving(false);
    setIsRetrying(false);
    
    // Mostrar mensaje de error más específico
    const errorMessage = lastError?.message || 'Error desconocido';
    const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout');
    
    if (isNetworkError) {
      Alert.alert(
        t('errors.networkError'),
        t('errors.networkErrorMessage'),
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        t('common.error'),
        `${t('nutrition.couldNotLogMeal')}: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleLogWater = async () => {
    if (!user?.id) return;

    if (!waterAmount || parseInt(waterAmount) <= 0) {
      Alert.alert(t('common.error'), t('nutrition.enterValidWaterAmount'));
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await logWater(user.id, today, parseInt(waterAmount));

      if (result.success) {
        Alert.alert(t('nutrition.saved'), t('nutrition.waterLoggedCorrectly'), [
          { text: t('common.ok'), onPress: () => router.push('/(tabs)/nutrition' as any) },
        ]);
      } else {
        Alert.alert(t('common.error'), result.error || t('nutrition.couldNotLogWater'));
      }
    } catch (err: any) {
      console.error('Error logging water:', err);
      Alert.alert(t('common.error'), err.message || t('errors.unknownError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isWaterLog) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LoadingOverlay visible={isSaving} message={t('commonUI.savingWater')} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.headerTitle}>
  {t('nutrition.registerWater')}
</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.waterIconContainer}>
            <Ionicons name="water" size={80} color="#ffb300" />
          </View>

          <View style={styles.quickButtons}>
            {[250, 500, 750, 1000].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickButton}
                onPress={() => setWaterAmount(amount.toString())}
              >
                <Text style={styles.quickButtonText}>{amount} ml</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
  {t('nutrition.waterAmount')}
</Text>
            <TextInput
              style={styles.input}
              value={waterAmount}
              onChangeText={setWaterAmount}
              placeholder="Ej: 500"
              placeholderTextColor="#666666"
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleLogWater}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
            )}
       <Text style={styles.saveButtonText}>
  {isSaving ? t('common.saving') : t('nutrition.logWater')}
</Text>

          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LoadingOverlay visible={isSaving || isRetrying} message={t('commonUI.savingMeal')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition' as any)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('nutrition.logMeal')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('mealLog.details')}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('mealLog.foodName')}</Text>
            <View style={styles.inputWithSuggestions}>
              <TextInput
                style={styles.input}
                value={mealName}
                onChangeText={(text) => {
                  setMealName(text);
                  setSelectedFood(null); // Limpiar selección si el usuario escribe
                  setShowSuggestions(text.length >= 3);
                }}
                onFocus={() => setShowSuggestions(mealName.length >= 3 && !selectedFood)}
                placeholder={t('mealLog.foodNamePlaceholder')}
                placeholderTextColor="#666666"
              />
              {selectedFood && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => {
                    setSelectedFood(null);
                    setMealName('');
                    setCalories('');
                    setProtein('');
                    setCarbs('');
                    setFats('');
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Lista de sugerencias */}
            {showSuggestions && filteredFoods.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {filteredFoods.map((food: FoodItem) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectFood(food)}
                  >
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName}>{food.name}</Text>
                      <Text style={styles.suggestionMacros}>
                        {food.calories_per_100g} kcal | P: {food.protein_per_100g}g | C: {food.carbs_per_100g}g | G: {food.fats_per_100g}g
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {selectedFood ? (
              <View style={styles.selectedFoodBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.selectedFoodText}>
                  Alimento del banco de datos
                </Text>
              </View>
            ) : (
              <Text style={styles.helperText}>
                {t('mealLog.hint')}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('mealLog.weight')}</Text>
            <TextInput
              style={styles.input}
              value={weightGrams}
              onChangeText={setWeightGrams}
              placeholder={t('mealLog.weightPlaceholder')}
              placeholderTextColor="#666666"
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              {t('mealLog.weightHint')}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.aiButton, isCalculating && styles.aiButtonDisabled]}
            onPress={handleCalculate}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <>
                <Ionicons name="calculator" size={20} color="#1a1a1a" />
                <Text style={styles.aiButtonText}>{t('mealLog.calculateWithAI')}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('mealLog.orManually')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.macroInputsRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{t('nutrition.calories')}</Text>

              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                placeholder="500"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{t('nutrition.protein')}</Text>
            <TextInput
                style={styles.input}
                value={protein}
                onChangeText={setProtein}
                placeholder="30"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.macroInputsRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{t('nutrition.carbs')}</Text>
            <TextInput
                style={styles.input}
                value={carbs}
                onChangeText={setCarbs}
                placeholder="50"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{t('nutrition.fats')}</Text>
            <TextInput
                style={styles.input}
                value={fats}
                onChangeText={setFats}
                placeholder="15"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (isSaving || isRetrying) && styles.saveButtonDisabled]}
          onPress={handleLogMeal}
          disabled={isSaving || isRetrying}
        >
          {(isSaving || isRetrying) ? (
            <>
              <ActivityIndicator size="small" color="#1a1a1a" />
              <Text style={styles.saveButtonText}>{t('mealLog.savingButtonText')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>{t('mealLog.registerMeal')}</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
  helperText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  macroInputsRow: {
    flexDirection: 'row',
    gap: 12,
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
  waterIconContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  quickButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  inputWithSuggestions: {
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 16,
    padding: 4,
  },
  suggestionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
    maxHeight: 280,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionMacros: {
    color: '#888',
    fontSize: 12,
  },
  selectedFoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  selectedFoodText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
});

