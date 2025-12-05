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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../src/services/supabase';
import { computeAndSaveTargets, createOrUpdateMealPlan, getNutritionProfile } from '../src/services/nutrition';
import { validateUsernameFormat } from '../src/utils/formValidation';
import { ConfirmModal } from '../src/components/CustomModal';

export default function ProfileEditScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados del formulario
  const [username, setUsername] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNutritionConfirm, setShowNutritionConfirm] = useState(false);
  
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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }

      if (data) {
        setUsername(data.username || '');
        setWeight(data.weight?.toString() || '');
        setHeight(data.height?.toString() || '');
        setAge(data.age?.toString() || '');
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
      username !== (originalData.username || '') ||
      weight !== (originalData.weight?.toString() || '') ||
      height !== (originalData.height?.toString() || '') ||
      age !== (originalData.age?.toString() || '')
    );
  };

  const hasNutritionImpact = () => {
    if (!originalData) return false;
    
    // Cualquier cambio en el perfil puede afectar nutrición
    // Incluyendo edad (afecta BMR), peso, altura
    return (
      weight !== (originalData.weight?.toString() || '') ||
      height !== (originalData.height?.toString() || '') ||
      age !== (originalData.age?.toString() || '')
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validar username solo si cambió y no está vacío
    const trimmedUsername = username.trim();
    const originalUsername = originalData?.username || '';
    
    if (trimmedUsername !== originalUsername) {
      // Si el username cambió, validar
      if (!trimmedUsername || trimmedUsername.length === 0) {
        Alert.alert('Error', 'El nombre de usuario es requerido');
        return;
      }
      
      const usernameValidation = validateUsernameFormat(trimmedUsername);
      if (!usernameValidation.isValid) {
        Alert.alert('Error', usernameValidation.error || 'El nombre de usuario no es válido');
        setUsernameError(usernameValidation.error || '');
        return;
      }
      
      // Verificar que el username no esté en uso
      try {
        const { data: existingUsername, error: checkError } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', trimmedUsername.toLowerCase())
          .neq('user_id', user.id)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error verificando username:', checkError);
          Alert.alert('Error', 'No se pudo verificar el nombre de usuario. Intenta nuevamente.');
          return;
        }
        
        if (existingUsername) {
          Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor elige otro.');
          setUsernameError('Este nombre de usuario ya está en uso');
          return;
        }
      } catch (checkErr: any) {
        console.error('Error verificando username:', checkErr);
        Alert.alert('Error', 'No se pudo verificar el nombre de usuario. Intenta nuevamente.');
        return;
      }
    }

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
      const updateData: any = {
        weight: weightNum,
        height: heightNum,
        age: ageNum,
        updated_at: new Date().toISOString(),
      };
      
      // Solo actualizar username si cambió y no está vacío
      const trimmedUsername = username.trim().toLowerCase();
      const originalUsername = (originalData?.username || '').trim().toLowerCase();
      
      if (trimmedUsername !== originalUsername && trimmedUsername.length > 0) {
        updateData.username = trimmedUsername;
      } else if (trimmedUsername !== originalUsername && trimmedUsername.length === 0 && originalUsername.length > 0) {
        // Si el usuario está intentando borrar el username, no permitirlo
        Alert.alert('Error', 'El nombre de usuario es requerido y no puede estar vacío.');
        setIsSaving(false);
        return;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error de Supabase al guardar perfil:', error);
        throw new Error(error.message || 'Error al actualizar el perfil en la base de datos');
      }

      Alert.alert('¡Guardado!', 'Tu perfil ha sido actualizado.');
      router.push('/(tabs)/dashboard' as any);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      const errorMessage = err.message || 'No se pudo guardar el perfil.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileAndAdaptDiet = async (weightNum: number, heightNum: number, ageNum: number) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // 1. Guardar perfil actualizado
      const updateData: any = {
        weight: weightNum,
        height: heightNum,
        age: ageNum,
        updated_at: new Date().toISOString(),
      };
      
      // Solo actualizar username si cambió y no está vacío
      const trimmedUsername = username.trim().toLowerCase();
      const originalUsername = (originalData?.username || '').trim().toLowerCase();
      
      if (trimmedUsername !== originalUsername && trimmedUsername.length > 0) {
        updateData.username = trimmedUsername;
      } else if (trimmedUsername !== originalUsername && trimmedUsername.length === 0 && originalUsername.length > 0) {
        // Si el usuario está intentando borrar el username, no permitirlo
        Alert.alert('Error', 'El nombre de usuario es requerido y no puede estar vacío.');
        setIsSaving(false);
        return;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error de Supabase al guardar perfil:', error);
        throw new Error(error.message || 'Error al actualizar el perfil en la base de datos');
      }

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
      router.push('/(tabs)/dashboard' as any);
    } catch (err: any) {
      console.error('Error saving and adapting:', err);
      const errorMessage = err.message || 'Hubo un problema al actualizar. Intenta nuevamente.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header - Fuera del ScrollView para que siempre sea accesible */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          onPress={() => {
            if (hasChanges()) {
              setShowExitConfirm(true);
            } else {
              router.push('/(tabs)/dashboard' as any);
            }
          }} 
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Datos Básicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Datos Básicos</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre de usuario</Text>
            <Text style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
              Este será tu identificador único en la red social
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16, marginRight: 4 }}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1 }, usernameError && styles.inputError]}
                value={username}
                onChangeText={async (text) => {
                  const lowerText = text.toLowerCase().trim();
                  setUsername(lowerText);
                  setUsernameError('');
                  
                  if (lowerText.length > 0) {
                    const validation = validateUsernameFormat(lowerText);
                    if (!validation.isValid) {
                      setUsernameError(validation.error || '');
                      return;
                    }
                    
                    // Verificar disponibilidad
                    setCheckingUsername(true);
                    try {
                      const { data } = await supabase
                        .from('user_profiles')
                        .select('username')
                        .eq('username', lowerText)
                        .neq('user_id', user?.id || '')
                        .maybeSingle();
                      
                      if (data) {
                        setUsernameError('Este nombre de usuario ya está en uso');
                      }
                    } catch (error) {
                      console.error('Error verificando username:', error);
                    } finally {
                      setCheckingUsername(false);
                    }
                  }
                }}
                placeholder="juan_fitness"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {checkingUsername && (
                <ActivityIndicator size="small" color="#666" style={{ marginLeft: 8 }} />
              )}
            </View>
            {usernameError && (
              <Text style={{ color: '#ff4444', fontSize: 12, marginTop: 4 }}>{usernameError}</Text>
            )}
            {!usernameError && username.length >= 3 && !checkingUsername && username !== (originalData?.username || '') && (
              <Text style={{ color: '#4CAF50', fontSize: 12, marginTop: 4 }}>✓ Disponible</Text>
            )}
          </View>
          
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

      {/* Modal de confirmación al salir */}
      <ConfirmModal
        visible={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="¿Descartar cambios?"
        message="Tienes cambios sin guardar. ¿Estás seguro de que quieres salir sin guardar?"
        confirmText="Descartar"
        cancelText="Cancelar"
        confirmButtonStyle="danger"
        onConfirm={() => router.push('/(tabs)/dashboard' as any)}
      />

      {/* Modal de confirmación para adaptar nutrición */}
      <ConfirmModal
        visible={showNutritionConfirm}
        onClose={() => setShowNutritionConfirm(false)}
        title="Actualizar plan de nutrición"
        message="Los cambios que realizaste afectan tu plan de nutrición. ¿Deseas guardar los cambios y adaptar tu dieta?"
        confirmText="Guardar y adaptar"
        cancelText="Solo guardar"
        onConfirm={async () => {
          if (!user?.id) return;
          const weightNum = parseFloat(weight);
          const heightNum = parseFloat(height);
          const ageNum = parseInt(age);
          await saveProfileAndAdaptDiet(weightNum, heightNum, ageNum);
        }}
      />
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
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
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
    borderColor: '#ffb300',
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
    borderColor: '#ffb300',
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
    color: '#ffb300',
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
    borderColor: '#ffb300',
    backgroundColor: '#0f2a25',
  },
  dayChipText: {
    color: '#888888',
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#ffb300',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#ffb300',
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

