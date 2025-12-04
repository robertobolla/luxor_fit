import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../src/services/supabase';

type SetType = 'warmup' | 'normal' | 'failure' | 'drop' | 'rir';

interface SetInfo {
  type: SetType;
  reps: number | null; // null para series al fallo
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number[]; // Mantener para compatibilidad
  setTypes?: SetInfo[]; // Nuevo campo para tipos de series
}

export default function CustomPlanDayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parsear parámetros con validación
  const parseDayNumber = (value: string | undefined): number => {
    if (!value) return 1;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 1 : parsed;
  };

  const parseSafeJSON = (value: string | undefined, defaultValue: any): any => {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Error parseando JSON:', e);
      return defaultValue;
    }
  };

  const dayNumber = parseDayNumber(params.dayNumber as string);
  const equipment = parseSafeJSON(params.equipment as string, []);
  const dayData = parseSafeJSON(params.dayData as string, { exercises: [] });

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dayName, setDayName] = useState<string>(`Día ${dayNumber}`);
  const [isEditingDayName, setIsEditingDayName] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState<string[]>([]);
  const [setTypes, setSetTypes] = useState<SetInfo[]>([]);
  
  // Estados para el modal de cambio de tipo de serie
  const [showSetTypeModal, setShowSetTypeModal] = useState(false);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number>(-1);

  // Resetear estado cuando cambia el dayNumber
  useEffect(() => {
    setExercises([]);
    setDayName(`Día ${dayNumber}`);
    setIsEditingDayName(false);
    setEditingExercise(null);
    setSets('');
    setReps([]);
  }, [dayNumber]);

  useEffect(() => {
    if (editingExercise) {
      setSets(editingExercise.sets.toString());
      setReps(editingExercise.reps.map(r => r.toString()));
      
      // Cargar tipos de series o crear por defecto
      if (editingExercise.setTypes && editingExercise.setTypes.length > 0) {
        setSetTypes(editingExercise.setTypes);
      } else {
        // Crear tipos de series por defecto (todas normales)
        const defaultSetTypes: SetInfo[] = editingExercise.reps.map((rep, idx) => ({
          type: 'normal',
          reps: rep,
        }));
        setSetTypes(defaultSetTypes);
      }
    } else {
      setSetTypes([]);
    }
  }, [editingExercise]);

  const handleAddExercise = () => {
    router.push({
      pathname: '/(tabs)/workout/custom-plan-select-exercise',
      params: {
        equipment: JSON.stringify(equipment),
        dayNumber: dayNumber.toString(),
        daysPerWeek: params.daysPerWeek as string || '',
        dayData: JSON.stringify({ dayNumber, exercises }),
      },
    });
  };

  const handleSetsChange = (text: string) => {
    const numSets = parseInt(text) || 0;
    setSets(text);
    
    // Ajustar array de reps
    const newReps = [...reps];
    while (newReps.length < numSets) {
      newReps.push('');
    }
    while (newReps.length > numSets) {
      newReps.pop();
    }
    setReps(newReps);
    
    // Ajustar array de tipos de series
    const newSetTypes = [...setTypes];
    while (newSetTypes.length < numSets) {
      newSetTypes.push({ type: 'normal', reps: null });
    }
    while (newSetTypes.length > numSets) {
      newSetTypes.pop();
    }
    setSetTypes(newSetTypes);
  };

  const handleRepsChange = (index: number, text: string) => {
    const newReps = [...reps];
    newReps[index] = text;
    setReps(newReps);
    
    // Actualizar también el tipo de serie
    const newSetTypes = [...setTypes];
    if (newSetTypes[index]) {
      newSetTypes[index] = {
        ...newSetTypes[index],
        reps: parseInt(text) || null,
      };
      setSetTypes(newSetTypes);
    }
  };

  const getSetLabel = (setType: SetInfo, index: number): string => {
    switch (setType.type) {
      case 'warmup':
        return 'W';
      case 'failure':
        return 'F';
      case 'drop':
        return 'D';
      case 'rir':
        return `${index + 1}`;
      case 'normal':
      default:
        return `${index + 1}`;
    }
  };

  const handleSetTypeClick = (index: number) => {
    setSelectedSetIndex(index);
    setShowSetTypeModal(true);
  };

  const handleChangeSetType = (newType: SetType) => {
    const newSetTypes = [...setTypes];
    const currentReps = newSetTypes[selectedSetIndex]?.reps || null;
    
    newSetTypes[selectedSetIndex] = {
      type: newType,
      reps: newType === 'failure' ? null : currentReps,
    };
    
    setSetTypes(newSetTypes);
    
    // Si es al fallo, limpiar las reps en el input
    if (newType === 'failure') {
      const newReps = [...reps];
      newReps[selectedSetIndex] = '';
      setReps(newReps);
    }
    
    setShowSetTypeModal(false);
    setSelectedSetIndex(-1);
  };

  const handleRemoveSet = () => {
    if (selectedSetIndex === -1) return;
    
    // Eliminar la serie del índice seleccionado
    const newReps = reps.filter((_, idx) => idx !== selectedSetIndex);
    const newSetTypes = setTypes.filter((_, idx) => idx !== selectedSetIndex);
    
    setReps(newReps);
    setSetTypes(newSetTypes);
    setSets(newReps.length.toString());
    
    setShowSetTypeModal(false);
    setSelectedSetIndex(-1);
  };

  const handleSaveExercise = () => {
    if (!editingExercise) return;
    
    const numSets = parseInt(sets) || 0;
    if (numSets === 0) {
      Alert.alert('Error', 'Debes ingresar al menos 1 serie');
      return;
    }

    // Validar que todas las series tengan reps (excepto las de fallo)
    for (let i = 0; i < setTypes.length; i++) {
      const setType = setTypes[i];
      if (setType.type !== 'failure') {
        const repsValue = parseInt(reps[i]);
        if (!repsValue || repsValue === 0) {
          Alert.alert('Error', `Debes ingresar repeticiones para la serie ${i + 1}`);
          return;
        }
      }
    }

    // Actualizar setTypes con las reps finales
    const finalSetTypes = setTypes.map((st, idx) => ({
      type: st.type,
      reps: st.type === 'failure' ? null : (parseInt(reps[idx]) || 0),
    }));

    // Mantener compatibilidad con repsArray
    const repsArray = finalSetTypes.map(st => st.reps || 0);

    const updatedExercises = exercises.map(ex =>
      ex.id === editingExercise.id
        ? { ...ex, sets: numSets, reps: repsArray, setTypes: finalSetTypes }
        : ex
    );
    setExercises(updatedExercises);
    setEditingExercise(null);
    setSets('');
    setReps([]);
    setSetTypes([]);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert(
      'Eliminar ejercicio',
      '¿Estás seguro de que quieres eliminar este ejercicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setExercises(exercises.filter(ex => ex.id !== exerciseId));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Guardar los ejercicios del día en AsyncStorage para que la pantalla de días los pueda leer
    try {
      const dayDataToSave = {
        dayNumber,
        name: dayName,
        exercises,
      };
      await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
      
      // Navegar de vuelta a la pantalla de días
      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          daysPerWeek: params.daysPerWeek as string || '',
          equipment: JSON.stringify(equipment),
        },
      });
    } catch (error) {
      console.error('Error saving day data:', error);
      // En caso de error, intentar navegar de todas formas
      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          daysPerWeek: params.daysPerWeek as string || '',
          equipment: JSON.stringify(equipment),
        },
      });
    }
  };

  // Cargar datos del día y detectar cuando se selecciona un ejercicio
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      const loadDayData = async () => {
        try {
          // Primero verificar si hay datos pasados por parámetros
          const paramDayData = parseSafeJSON(params.dayData as string, {});
          if (paramDayData.dayNumber === dayNumber && paramDayData.exercises) {
            if (isMounted) {
              setExercises(paramDayData.exercises || []);
              if (paramDayData.name) {
                setDayName(paramDayData.name);
              }
            }
          }
          
          // Luego cargar desde AsyncStorage (sobrescribe si existe)
          const dayDataStr = await AsyncStorage.getItem(`day_${dayNumber}_data`);
          if (dayDataStr) {
            const savedDayData = parseSafeJSON(dayDataStr, {});
            // Verificar que los datos guardados correspondan al día correcto
            if (savedDayData.dayNumber === dayNumber && isMounted) {
              if (savedDayData.name) {
                setDayName(savedDayData.name);
              } else {
                setDayName(`Día ${dayNumber}`);
              }
              if (savedDayData.exercises) {
                setExercises(savedDayData.exercises);
              } else {
                setExercises([]);
              }
            }
          } else if (isMounted) {
            // Si no hay datos guardados, usar los valores por defecto
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
          }
        } catch (error) {
          console.error('Error loading day data:', error);
          // En caso de error, usar valores por defecto
          if (isMounted) {
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
          }
        }
      };

      const checkSelectedExercise = async (currentExercises: Exercise[]) => {
        try {
          const selectedExerciseData = await AsyncStorage.getItem('selectedExercise');
          if (selectedExerciseData && isMounted) {
            const selectedExercise = parseSafeJSON(selectedExerciseData, null);
            if (!selectedExercise) return;
            // Agregar el ejercicio a la lista con valores por defecto
            const newExercise: Exercise = {
              id: selectedExercise.id || `${Date.now()}_${Math.random()}`,
              name: selectedExercise.name,
              sets: selectedExercise.sets || 3,
              reps: selectedExercise.reps || [10, 10, 10],
            };
            
            // Verificar que no esté ya agregado usando los ejercicios actuales
            const exerciseExists = currentExercises.find(ex => ex.id === newExercise.id && ex.name === newExercise.name);
            if (!exerciseExists) {
              const updatedExercises = [...currentExercises, newExercise];
              
              // Actualizar el estado
              if (isMounted) {
                setExercises(updatedExercises);
              }
              
              // Guardar inmediatamente en AsyncStorage para evitar pérdida de datos
              try {
                const currentDayName = dayName || `Día ${dayNumber}`;
                const dayDataToSave = {
                  dayNumber,
                  name: currentDayName,
                  exercises: updatedExercises,
                };
                await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
              } catch (error) {
                console.error('Error saving updated day data:', error);
              }
              
              // Abrir modal de edición inmediatamente para configurar series y repeticiones
              setTimeout(() => {
                if (isMounted) {
                  setEditingExercise(newExercise);
                }
              }, 100);
            }
            
            // Limpiar el storage después de usarlo
            await AsyncStorage.removeItem('selectedExercise');
          }
        } catch (error) {
          console.error('Error loading selected exercise:', error);
        }
      };
      
      // Primero cargar datos, luego verificar si hay un ejercicio seleccionado
      const initialize = async () => {
        let loadedExercises: Exercise[] = [];
        
        // Cargar datos primero
        try {
          // Primero verificar si hay datos pasados por parámetros
          const paramDayData = parseSafeJSON(params.dayData as string, {});
          if (paramDayData.dayNumber === dayNumber && paramDayData.exercises) {
            loadedExercises = paramDayData.exercises || [];
            if (isMounted && paramDayData.name) {
              setDayName(paramDayData.name);
            }
          }
          
          // Luego cargar desde AsyncStorage (sobrescribe si existe)
          const dayDataStr = await AsyncStorage.getItem(`day_${dayNumber}_data`);
          if (dayDataStr) {
            const savedDayData = parseSafeJSON(dayDataStr, {});
            // Verificar que los datos guardados correspondan al día correcto
            if (savedDayData.dayNumber === dayNumber) {
              loadedExercises = savedDayData.exercises || [];
              if (isMounted) {
                if (savedDayData.name) {
                  setDayName(savedDayData.name);
                } else {
                  setDayName(`Día ${dayNumber}`);
                }
                setExercises(loadedExercises);
              }
            }
          } else if (isMounted && loadedExercises.length === 0) {
            // Si no hay datos guardados, usar los valores por defecto
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
          } else if (isMounted) {
            setExercises(loadedExercises);
          }
        } catch (error) {
          console.error('Error loading day data:', error);
          // En caso de error, usar valores por defecto
          if (isMounted) {
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
            loadedExercises = [];
          }
        }
        
        // Ahora verificar si hay un ejercicio seleccionado usando los ejercicios cargados
        await checkSelectedExercise(loadedExercises);
      };
      
      initialize();
      
      return () => {
        isMounted = false;
      };
    }, [dayNumber, params.dayData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Intentar volver atrás, si falla navegar a custom-plan-days
            try {
              if (router.canGoBack && router.canGoBack()) {
                router.back();
              } else {
                throw new Error('Cannot go back');
              }
            } catch (error) {
              // Si no hay pantalla anterior, navegar a custom-plan-days
              router.push({
                pathname: '/(tabs)/workout/custom-plan-days',
                params: {
                  daysPerWeek: params.daysPerWeek as string || '',
                  equipment: JSON.stringify(equipment),
                },
              });
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        {isEditingDayName ? (
          <TextInput
            style={styles.dayNameInput}
            value={dayName}
            onChangeText={setDayName}
            onBlur={async () => {
              setIsEditingDayName(false);
              // Guardar el nombre del día en AsyncStorage cuando se sale del campo
              try {
                const dayDataStr = await AsyncStorage.getItem(`day_${dayNumber}_data`);
                if (dayDataStr) {
                  const dayData = parseSafeJSON(dayDataStr, { dayNumber, exercises: [] });
                  dayData.name = dayName.trim() || `Día ${dayNumber}`;
                  await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayData));
                } else {
                  // Si no hay datos guardados, crear un nuevo objeto
                  const dayDataToSave = {
                    dayNumber,
                    name: dayName.trim() || `Día ${dayNumber}`,
                    exercises: exercises,
                  };
                  await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                }
              } catch (error) {
                console.error('Error saving day name:', error);
              }
            }}
            onSubmitEditing={async () => {
              setIsEditingDayName(false);
              // Guardar el nombre del día en AsyncStorage cuando se presiona Enter
              try {
                const dayDataStr = await AsyncStorage.getItem(`day_${dayNumber}_data`);
                if (dayDataStr) {
                  const dayData = parseSafeJSON(dayDataStr, { dayNumber, exercises: [] });
                  dayData.name = dayName.trim() || `Día ${dayNumber}`;
                  await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayData));
                } else {
                  // Si no hay datos guardados, crear un nuevo objeto
                  const dayDataToSave = {
                    dayNumber,
                    name: dayName.trim() || `Día ${dayNumber}`,
                    exercises: exercises,
                  };
                  await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                }
              } catch (error) {
                console.error('Error saving day name:', error);
              }
            }}
            autoFocus
            placeholder={`Día ${dayNumber}`}
            placeholderTextColor="#999"
          />
        ) : (
          <TouchableOpacity
            style={styles.dayNameContainer}
            onPress={() => setIsEditingDayName(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle}>{dayName}</Text>
            <Ionicons name="create-outline" size={16} color="#ffb300" style={styles.editIcon} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>No hay ejercicios agregados</Text>
            <Text style={styles.emptyStateSubtext}>
              Agrega ejercicios para este día
            </Text>
          </View>
        ) : (
          <View style={styles.exercisesList}>
            {exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => setEditingExercise(exercise)}
                      style={styles.editButton}
                    >
                      <Ionicons name="create-outline" size={20} color="#ffb300" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExercise(exercise.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseDetailText}>
                    {exercise.sets} series
                  </Text>
                  <View style={styles.repsContainer}>
                    {(exercise.setTypes || []).map((setInfo, idx) => {
                      const label = (() => {
                        switch (setInfo.type) {
                          case 'warmup': return 'W';
                          case 'failure': return 'F';
                          case 'drop': return 'D';
                          case 'rir': return `${idx + 1} RIR`;
                          default: return `${idx + 1}`;
                        }
                      })();
                      
                      const repsText = setInfo.type === 'failure' 
                        ? 'al fallo' 
                        : setInfo.type === 'rir'
                        ? `${setInfo.reps || 0} RIR`
                        : `${setInfo.reps || 0} reps`;
                      
                      return (
                        <Text key={idx} style={styles.repText}>
                          {label}: {repsText}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddExercise}
        >
          <Ionicons name="add-circle" size={24} color="#ffb300" />
          <Text style={styles.addButtonText}>Agregar Ejercicio</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para editar series y repeticiones */}
      <Modal
        visible={editingExercise !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingExercise(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditingExercise(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>
                  Configurar {editingExercise?.name}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Número de series</Text>
                  <TextInput
                    style={styles.input}
                    value={sets}
                    onChangeText={handleSetsChange}
                    keyboardType="number-pad"
                    placeholder="Ej: 3"
                  />
                </View>

                {parseInt(sets) > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Repeticiones por serie</Text>
                    {Array.from({ length: parseInt(sets) || 0 }).map((_, idx) => {
                      const setType = setTypes[idx];
                      const isFailure = setType?.type === 'failure';
                      const setLabel = setType ? getSetLabel(setType, idx) : `${idx + 1}`;
                      
                      return (
                        <View key={idx} style={styles.repInputRow}>
                          <TouchableOpacity
                            style={styles.setTypeButton}
                            onPress={() => handleSetTypeClick(idx)}
                          >
                            <Text style={styles.setTypeButtonText}>{setLabel}</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.repInput, isFailure && styles.repInputDisabled]}
                            value={isFailure ? 'Al fallo' : (reps[idx] || '')}
                            onChangeText={(text) => handleRepsChange(idx, text)}
                            keyboardType="number-pad"
                            placeholder="0"
                            editable={!isFailure}
                          />
                          <Text style={styles.repLabel}>
                            {setType?.type === 'rir' ? 'RIR' : 'reps'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setEditingExercise(null);
                      setSets('');
                      setReps([]);
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={handleSaveExercise}
                  >
                    <Text style={styles.modalButtonSaveText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para seleccionar tipo de serie */}
      <Modal
        visible={showSetTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSetTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.setTypeModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSetTypeModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.setTypeModalContent}
          >
            <Text style={styles.setTypeModalTitle}>Seleccionar Tipo de Serie</Text>
            
            <TouchableOpacity
              style={styles.setTypeOption}
              onPress={() => handleChangeSetType('warmup')}
            >
              <View style={[styles.setTypeIcon, styles.setTypeIconWarmup]}>
                <Text style={styles.setTypeIconText}>W</Text>
              </View>
              <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>Serie de Calentamiento</Text>
                <Text style={styles.setTypeOptionDesc}>Peso ligero para activar músculos</Text>
              </View>
              <Ionicons name="information-circle-outline" size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.setTypeOption}
              onPress={() => handleChangeSetType('normal')}
            >
              <View style={[styles.setTypeIcon, styles.setTypeIconNormal]}>
                <Text style={styles.setTypeIconText}>1</Text>
              </View>
              <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>Serie Normal</Text>
                <Text style={styles.setTypeOptionDesc}>Serie estándar con repeticiones</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.setTypeOption}
              onPress={() => handleChangeSetType('failure')}
            >
              <View style={[styles.setTypeIcon, styles.setTypeIconFailure]}>
                <Text style={styles.setTypeIconText}>F</Text>
              </View>
              <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>Serie al Fallo</Text>
                <Text style={styles.setTypeOptionDesc}>Hasta no poder más</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.setTypeOption}
              onPress={() => handleChangeSetType('drop')}
            >
              <View style={[styles.setTypeIcon, styles.setTypeIconDrop]}>
                <Text style={styles.setTypeIconText}>D</Text>
              </View>
              <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>Serie Drop</Text>
                <Text style={styles.setTypeOptionDesc}>Reducir peso y continuar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.setTypeOption}
              onPress={() => handleChangeSetType('rir')}
            >
              <View style={[styles.setTypeIcon, styles.setTypeIconRIR]}>
                <Text style={styles.setTypeIconText}>R</Text>
              </View>
              <View style={styles.setTypeInfo}>
                <Text style={styles.setTypeOptionText}>RIR (Reps In Reserve)</Text>
                <Text style={styles.setTypeOptionDesc}>Reps que faltan para el fallo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.setTypeOption, styles.setTypeOptionDelete]}
              onPress={handleRemoveSet}
            >
              <Ionicons name="trash-outline" size={24} color="#ff4444" />
              <Text style={[styles.setTypeOptionText, styles.setTypeOptionTextDelete]}>
                Eliminar Serie
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dayNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dayNameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  editIcon: {
    marginLeft: 4,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffb300',
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  exercisesList: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  exerciseDetails: {
    gap: 8,
  },
  exerciseDetailText: {
    fontSize: 14,
    color: '#ffb300',
    fontWeight: '600',
  },
  repsContainer: {
    gap: 4,
    marginTop: 4,
  },
  repText: {
    fontSize: 14,
    color: '#ccc',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  repInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  repLabel: {
    fontSize: 14,
    color: '#ccc',
    minWidth: 70,
  },
  repInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonSave: {
    backgroundColor: '#ffb300',
  },
  modalButtonCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  setTypeButton: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  repInputDisabled: {
    backgroundColor: '#333',
    color: '#888',
  },
  setTypeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  setTypeModalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  setTypeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  setTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  setTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeIconWarmup: {
    backgroundColor: '#ffb300',
  },
  setTypeIconNormal: {
    backgroundColor: '#4CAF50',
  },
  setTypeIconFailure: {
    backgroundColor: '#ff4444',
  },
  setTypeIconDrop: {
    backgroundColor: '#9C27B0',
  },
  setTypeIconRIR: {
    backgroundColor: '#2196F3',
  },
  setTypeIconText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  setTypeInfo: {
    flex: 1,
  },
  setTypeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  setTypeOptionDesc: {
    fontSize: 13,
    color: '#888',
  },
  setTypeOptionDelete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    justifyContent: 'center',
    gap: 8,
  },
  setTypeOptionTextDelete: {
    color: '#ff4444',
    flex: 0,
  },
});

