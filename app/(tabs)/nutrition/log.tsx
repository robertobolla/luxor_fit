// ============================================================================
// MEAL LOG SCREEN
// ============================================================================

import React, { useState } from 'react';
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { logMeal, logWater, calculateFoodMacros } from '../../../src/services/nutrition';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';

export default function MealLogScreen() {
  const { user } = useUser();
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

  const handleCalculateWithAI = async () => {
    if (!mealName.trim() || !weightGrams) {
      Alert.alert('Error', 'Ingresa el nombre del alimento y su peso.');
      return;
    }

    const weight = parseInt(weightGrams);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'El peso debe ser un número positivo.');
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateFoodMacros(mealName, weight);

      if (result.success && result.data) {
        setCalories(result.data.calories.toString());
        setProtein(result.data.protein_g.toString());
        setCarbs(result.data.carbs_g.toString());
        setFats(result.data.fats_g.toString());
        Alert.alert('✅ ¡Calculado!', 'Los macros se calcularon automáticamente con IA.');
      } else {
        Alert.alert('Error', result.error || 'No se pudieron calcular los macros.');
      }
    } catch (err: any) {
      console.error('Error calculating macros:', err);
      Alert.alert('Error', err.message || 'Error inesperado.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleLogMeal = async () => {
    if (!user?.id) return;

    if (!mealName.trim() || !calories || !protein || !carbs || !fats) {
      Alert.alert('Error', 'Completa todos los campos.');
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
        Alert.alert('¡Guardado!', 'Comida registrada correctamente.', [
          { text: 'OK', onPress: () => router.push('/(tabs)/nutrition' as any) },
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
        'Error de conexión',
        'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        `No se pudo registrar la comida: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleLogWater = async () => {
    if (!user?.id) return;

    if (!waterAmount || parseInt(waterAmount) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de agua (ml).');
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await logWater(user.id, today, parseInt(waterAmount));

      if (result.success) {
        Alert.alert('¡Guardado!', 'Agua registrada correctamente.', [
          { text: 'OK', onPress: () => router.push('/(tabs)/nutrition' as any) },
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo registrar el agua.');
      }
    } catch (err: any) {
      console.error('Error logging water:', err);
      Alert.alert('Error', err.message || 'Error inesperado.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isWaterLog) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LoadingOverlay visible={isSaving} message="Guardando agua..." />
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
            <Text style={styles.headerTitle}>Registrar Agua</Text>
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
            <Text style={styles.inputLabel}>Cantidad (ml)</Text>
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
              {isSaving ? 'Guardando...' : 'Registrar Agua'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LoadingOverlay visible={isSaving || isRetrying} message="Guardando comida..." />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition' as any)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Comida</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre del alimento</Text>
            <TextInput
              style={styles.input}
              value={mealName}
              onChangeText={setMealName}
              placeholder="Ej: Pechuga de pollo"
              placeholderTextColor="#666666"
            />
            <Text style={styles.helperText}>
              💡 Ingresa un alimento a la vez para cálculos precisos
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Peso (gramos)</Text>
            <TextInput
              style={styles.input}
              value={weightGrams}
              onChangeText={setWeightGrams}
              placeholder="Ej: 300"
              placeholderTextColor="#666666"
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Peso del alimento cocido (o especifica "crudo")
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.aiButton, isCalculating && styles.aiButtonDisabled]}
            onPress={handleCalculateWithAI}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#1a1a1a" />
                <Text style={styles.aiButtonText}>Calcular con IA</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o ingresa manualmente</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.macroInputsRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Calorías</Text>
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
              <Text style={styles.inputLabel}>Proteína (g)</Text>
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
              <Text style={styles.inputLabel}>Carbos (g)</Text>
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
              <Text style={styles.inputLabel}>Grasas (g)</Text>
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
              <Text style={styles.saveButtonText}>Guardando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Registrar Comida</Text>
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
});

