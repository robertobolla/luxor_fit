// ============================================================================
// EXERCISE SET TRACKER
// ============================================================================
// Componente para registrar todas las series de un ejercicio
// Muestra historial del último entrenamiento del mismo músculo

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';
import { useUnitsStore, getWeightInUserUnit, getWeightFromUserUnit } from '../../src/store/unitsStore';

// Componente separado para el input de peso que maneja su propio estado
interface WeightInputProps {
  weightKg: number | null;
  weightUnit: 'kg' | 'lb';
  onChangeWeight: (valueInKg: number | null) => void;
}

function WeightInput({ weightKg, weightUnit, onChangeWeight }: WeightInputProps) {
  // Estado local para el texto del input
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Sincronizar el valor inicial cuando el componente se monta o cuando cambia weightKg desde fuera
  useEffect(() => {
    if (!isFocused) {
      if (weightKg !== null && weightKg !== undefined) {
        const displayValue = getWeightInUserUnit(weightKg, weightUnit);
        // Mostrar sin decimales innecesarios
        const formatted = displayValue % 1 === 0 ? displayValue.toString() : displayValue.toFixed(1);
        setInputValue(formatted);
      } else {
        setInputValue('');
      }
    }
  }, [weightKg, weightUnit, isFocused]);

  const handleChangeText = useCallback((text: string) => {
    // Permitir solo números y un punto decimal
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos
    const parts = cleaned.split('.');
    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    
    setInputValue(finalValue);

    // Convertir a kg y notificar al padre
    if (finalValue === '' || finalValue === '.') {
      onChangeWeight(null);
    } else {
      const numValue = parseFloat(finalValue);
      if (!isNaN(numValue)) {
        const weightInKg = getWeightFromUserUnit(numValue, weightUnit);
        onChangeWeight(weightInKg);
      }
    }
  }, [weightUnit, onChangeWeight]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Formatear el valor al perder el foco
    if (weightKg !== null && weightKg !== undefined) {
      const displayValue = getWeightInUserUnit(weightKg, weightUnit);
      const formatted = displayValue % 1 === 0 ? displayValue.toString() : displayValue.toFixed(1);
      setInputValue(formatted);
    }
  }, [weightKg, weightUnit]);

  return (
    <TextInput
      style={styles.input}
      keyboardType="decimal-pad"
      placeholder="0"
      placeholderTextColor="#555"
      value={inputValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

interface ExerciseSet {
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
}

interface PreviousSet {
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
}

interface SetTypeInfo {
  type: 'warmup' | 'normal' | 'failure' | 'drop';
  reps: number | null;
  rir: number | null;
}

interface ExerciseSetTrackerProps {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  defaultSets: number; // Cantidad de series por defecto del plan
  usesTime?: boolean; // Si el ejercicio usa tiempo en lugar de reps
  sessionId?: string; // ID de la sesión actual
  setTypes?: SetTypeInfo[]; // Tipos de cada serie (para excluir calentamiento)
  onSetsChange?: (sets: ExerciseSet[]) => void;
  onSave?: () => void; // Callback cuando se guardan los sets
  planId?: string; // ID del plan de entrenamiento
  dayName?: string; // Nombre del día (ej: 'day_1')
}

export function ExerciseSetTracker({
  userId,
  exerciseId,
  exerciseName,
  defaultSets,
  usesTime = false,
  sessionId,
  setTypes = [],
  onSetsChange,
  onSave,
  planId,
  dayName,
}: ExerciseSetTrackerProps) {
  const { weightUnit } = useUnitsStore();
  const weightUnitLabel = weightUnit === 'kg' ? 'KG' : 'LB';
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [previousSets, setPreviousSets] = useState<PreviousSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Ref para controlar si debemos notificar cambios al padre
  // Solo notificamos cuando el usuario interactúa, no en la carga inicial
  const shouldNotifyParent = React.useRef(false);
  const isInitialLoad = React.useRef(true);

  // Notificar al padre cuando los sets cambien (solo si el usuario interactuó)
  useEffect(() => {
    if (shouldNotifyParent.current && !isInitialLoad.current) {
      onSetsChange?.(sets);
      shouldNotifyParent.current = false;
    }
  }, [sets, onSetsChange]);

  useEffect(() => {
    loadTodaySetsOrInitialize();
    loadPreviousSets();
  }, [defaultSets, exerciseId]);

  // Cargar las series (si existen) o inicializar vacías
  const loadTodaySetsOrInitialize = async () => {
    try {
      console.log('🔍 Cargando series con:', { userId, exerciseId, planId, dayName });
      
      // Construir la query base
      let query = supabase
        .from('exercise_sets')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId);

      // Si tenemos planId y dayName, buscar por día de rutina (nuevo comportamiento)
      if (planId && dayName) {
        console.log('📋 Modo día de rutina: Buscando por plan+día');
        query = query
          .eq('workout_plan_id', planId)
          .eq('day_name', dayName);
      } else {
        // Si no, buscar por fecha (comportamiento original para compatibilidad)
        console.log('📅 Modo fecha: Buscando por día de calendario');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        query = query
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);
      }

      const { data, error } = await query.order('set_number', { ascending: true });

      if (error) {
        console.error('Error loading sets:', error);
        initializeSets();
        return;
      }

      if (data && data.length > 0) {
        // Hay series guardadas, cargarlas
        const loadedSets: ExerciseSet[] = data.map(set => ({
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
          duration_seconds: set.duration_seconds,
        }));
        setSets(loadedSets);
        // Marcar que la carga inicial terminó (después de un pequeño delay para evitar race conditions)
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
        console.log('✅ Series cargadas:', loadedSets.length);
      } else {
        // No hay series guardadas, inicializar vacías
        console.log('ℹ️ No hay series guardadas, inicializando vacías');
        initializeSets();
        // Marcar que la carga inicial terminó
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      }
    } catch (err) {
      console.error('Error loading sets:', err);
      initializeSets();
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
    }
  };

  // Inicializar las series con la cantidad por defecto (EXCLUYENDO calentamiento)
  const initializeSets = () => {
    const initialSets: ExerciseSet[] = [];
    
    // Si hay información de tipos de series, filtrar las de calentamiento
    if (setTypes.length > 0) {
      // Crear solo sets para las series que NO son de calentamiento
      setTypes.forEach((setType, index) => {
        if (setType.type !== 'warmup') {
          initialSets.push({
            set_number: index + 1, // Mantener el número de serie original
            reps: null,
            weight_kg: null,
            duration_seconds: null,
          });
        }
      });
    } else {
      // Si no hay información de tipos, crear todas las series por defecto
      for (let i = 1; i <= defaultSets; i++) {
        initialSets.push({
          set_number: i,
          reps: null,
          weight_kg: null,
          duration_seconds: null,
        });
      }
    }
    
    setSets(initialSets);
    // ⚠️ NO llamar onSetsChange aquí para evitar setState durante render
    // onSetsChange se llamará cuando el usuario modifique algo
  };

  // Cargar series del último entrenamiento anterior de este ejercicio
  const loadPreviousSets = async () => {
    try {
      setLoading(true);
      
      console.log('📊 Cargando valores anteriores para:', { exerciseId, planId, dayName });
      
      // Construir query base
      let query = supabase
        .from('exercise_sets')
        .select('set_number, reps, weight_kg, created_at, workout_plan_id, day_name')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId);

      // Si tenemos planId y dayName, buscar el historial excluyendo el día de rutina actual
      if (planId && dayName) {
        console.log('📋 Buscando historial: última vez que hiciste este ejercicio (sin importar cuándo)');
        
        // Obtener TODOS los registros y filtrar en el código
        // (más simple y confiable que hacer OR complejo en la query)
        // Después filtraremos los que NO sean del día de rutina actual
      } else {
        // Si no hay plan/día, buscar entrenamientos ANTES de hoy (comportamiento original)
        console.log('📅 Buscando historial: antes de hoy');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        query = query.lt('created_at', `${today}T00:00:00`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('set_number', { ascending: true })
        .limit(20); // Limitar para obtener las últimas series

      if (error) {
        console.error('Error loading previous sets:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('📦 Datos encontrados:', data.length, 'registros');
        
        // Si tenemos plan+día, filtrar para excluir el día de rutina actual
        let filteredData = data;
        if (planId && dayName) {
          filteredData = data.filter(set => {
            // EXCLUIR explícitamente las series del día actual
            const isCurrentDay = set.workout_plan_id === planId && set.day_name === dayName;
            if (isCurrentDay) {
              console.log('⏭️ Excluyendo serie del día actual:', set.set_number);
              return false; // ❌ NO incluir en "valores anteriores"
            }
            
            // INCLUIR todas las demás:
            // 1. No tiene plan_id (registro histórico)
            // 2. Tiene un plan_id diferente (otro plan)
            // 3. Tiene el mismo plan pero día diferente
            return true;
          });
          console.log('🔍 Filtrados (excluyendo día actual):', filteredData.length, 'registros de', data.length, 'totales');
        }
        
        // Agrupar por created_at para obtener solo el último entrenamiento
        // Como ordenamos por created_at desc, todos los primeros registros son del último entrenamiento
        const uniqueSets: PreviousSet[] = [];
        const seenSetNumbers = new Set<number>();
        
        for (const set of filteredData) {
          if (!seenSetNumbers.has(set.set_number)) {
            uniqueSets.push({
              set_number: set.set_number,
              reps: set.reps,
              weight_kg: set.weight_kg,
            });
            seenSetNumbers.add(set.set_number);
          }
        }
        
        setPreviousSets(uniqueSets);
        
        // Log mejorado para debugging
        if (planId && dayName) {
          console.log(`✅ Valores anteriores cargados: última vez que hiciste "${exerciseId}"`, {
            series: uniqueSets.length,
            primeraSerie: uniqueSets[0] ? `${uniqueSets[0].reps} reps @ ${uniqueSets[0].weight_kg}kg` : 'N/A'
          });
        } else {
          console.log('✅ Valores anteriores: último entrenamiento antes de hoy:', uniqueSets.length, 'series');
        }
      } else {
        if (planId && dayName) {
          console.log('ℹ️ Primera vez haciendo este ejercicio, no hay valores anteriores');
        } else {
          console.log('ℹ️ No hay entrenamientos anteriores para este ejercicio');
        }
      }
    } catch (err) {
      console.error('Error loading previous sets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar una serie específica
  const updateSet = (setNumber: number, field: 'reps' | 'weight_kg' | 'duration_seconds', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    // Marcar que debemos notificar al padre (se hará en el useEffect)
    shouldNotifyParent.current = true;
    
    setSets(prevSets => 
      prevSets.map(set => 
        set.set_number === setNumber
          ? { ...set, [field]: numValue }
          : set
      )
      );
  };

  // Agregar una nueva serie
  const addSet = () => {
    // Obtener el número de serie máximo actual y agregar 1
    const maxSetNumber = sets.length > 0 ? Math.max(...sets.map(s => s.set_number)) : 0;
    const newSetNumber = maxSetNumber + 1;
    
    const newSet: ExerciseSet = {
      set_number: newSetNumber,
      reps: null,
      weight_kg: null,
      duration_seconds: null,
    };
    
    // Marcar que debemos notificar al padre (se hará en el useEffect)
    shouldNotifyParent.current = true;
    
    setSets(prevSets => [...prevSets, newSet]);
  };

  // Eliminar una serie
  const removeSet = (setNumber: number) => {
    if (sets.length <= 1) return; // No permitir eliminar si solo hay una serie
    
    // Marcar que debemos notificar al padre (se hará en el useEffect)
    shouldNotifyParent.current = true;
    
    setSets(prevSets => 
      // Simplemente filtrar la serie eliminada sin renumerar
      // Los números de serie se mantienen consistentes con el plan original
      prevSets.filter(set => set.set_number !== setNumber)
    );
  };

  // Obtener el dato anterior para una serie específica
  const getPreviousData = (setNumber: number, field: 'reps' | 'weight_kg'): string => {
    const previousSet = previousSets.find(s => s.set_number === setNumber);
    if (!previousSet || previousSet[field] === null) return '-';
    
    // Si es peso, convertir a la unidad del usuario
    if (field === 'weight_kg' && previousSet.weight_kg !== null) {
      const weightInUserUnit = getWeightInUserUnit(previousSet.weight_kg, weightUnit);
      return weightInUserUnit.toFixed(1);
    }
    
    return previousSet[field]!.toString();
  };

  // Guardar todas las series en la base de datos
  const saveSets = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      // Filtrar solo los sets que tienen datos (reps o weight) Y NO SON de calentamiento
      const setsToSave = sets.filter((set) => {
        const hasData = set.reps !== null || set.weight_kg !== null || set.duration_seconds !== null;
        // Buscar el tipo de serie usando el set_number (no el índice del array)
        const setTypeInfo = setTypes[set.set_number - 1]; // set_number es 1-indexed
        const isWarmup = setTypeInfo?.type === 'warmup';
        return hasData && !isWarmup; // Solo guardar si tiene datos Y NO es calentamiento
      });

      if (setsToSave.length === 0) {
        Alert.alert('Sin datos', 'No hay datos para guardar. Ingresa al menos una serie con reps o peso.');
        return;
      }

      // 1. Eliminar las series existentes para este ejercicio
      console.log('🗑️ Eliminando series anteriores...');
      
      let deleteQuery = supabase
        .from('exercise_sets')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId);

      // Si tenemos planId y dayName, eliminar por día de rutina (nuevo comportamiento)
      if (planId && dayName) {
        console.log('📋 Modo día de rutina: Eliminando por plan+día');
        deleteQuery = deleteQuery
          .eq('workout_plan_id', planId)
          .eq('day_name', dayName);
      } else {
        // Si no, eliminar solo las de hoy (comportamiento original)
        console.log('📅 Modo fecha: Eliminando por día de calendario');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        deleteQuery = deleteQuery
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Error eliminando series anteriores:', deleteError);
        // Continuar de todos modos, puede que no hayan series previas
      }

      // 2. Preparar los datos para insertar
      const setsData = setsToSave.map(set => ({
        user_id: userId,
        workout_session_id: sessionId || null,
        workout_plan_id: planId || null, // Agregar plan_id
        day_name: dayName || null, // Agregar day_name
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        set_number: set.set_number,
        reps: set.reps,
        weight_kg: set.weight_kg,
        duration_seconds: set.duration_seconds,
        notes: null,
      }));

      console.log('💾 Guardando series:', setsData);

      // 3. Insertar las nuevas series
      const { error } = await supabase
        .from('exercise_sets')
        .insert(setsData);

      if (error) {
        console.error('Error guardando series:', error);
        Alert.alert('Error', 'Error al guardar las series. Por favor intenta de nuevo.');
        return;
      }

      console.log('✅ Series guardadas correctamente');
      setSaveSuccess(true);
      
      // Ocultar el mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      // Llamar al callback si existe
      onSave?.();
      
    } catch (err) {
      console.error('Error guardando series:', err);
      Alert.alert('Error', 'Error al guardar las series. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#ffb300" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabla de series */}
      <View style={styles.table}>
        {/* Encabezado de columnas */}
        <View style={styles.tableHeader}>
          <View style={[styles.headerCell, styles.setNumberCell]}>
            <Text style={styles.headerText}>#</Text>
          </View>
          <View style={[styles.headerCell, styles.previousCell]}>
            <Text style={styles.headerText}>ANT.</Text>
            <Text style={styles.headerText}>REPS</Text>
          </View>
          <View style={[styles.headerCell, styles.previousCell]}>
            <Text style={styles.headerText}>ANT.</Text>
            <Text style={styles.headerText}>{weightUnitLabel}</Text>
          </View>
          <View style={[styles.headerCell, styles.inputCell]}>
            <Text style={styles.headerText}>{usesTime ? 'SEG' : 'REPS'}</Text>
          </View>
          <View style={[styles.headerCell, styles.inputCell]}>
            <Text style={styles.headerText}>{weightUnitLabel}</Text>
          </View>
          <View style={[styles.headerCell, styles.actionCell]} />
        </View>

        {/* Filas de series */}
        <ScrollView style={styles.tableBody}>
          {sets.map((set, index) => (
            <View key={set.set_number} style={styles.tableRow}>
              {/* Número de serie - Mostrar numeración secuencial (1, 2, 3...) */}
              <View style={[styles.cell, styles.setNumberCell]}>
                <Text style={styles.setNumberText}>{index + 1}</Text>
              </View>

              {/* Anterior REPS */}
              <View style={[styles.cell, styles.previousCell]}>
                <Text style={styles.previousText}>
                  {getPreviousData(set.set_number, 'reps')}
                </Text>
              </View>

              {/* Anterior KG */}
              <View style={[styles.cell, styles.previousCell]}>
                <Text style={styles.previousText}>
                  {getPreviousData(set.set_number, 'weight_kg')}
                </Text>
              </View>

              {/* Input REPS o SEGUNDOS */}
              <View style={[styles.cell, styles.inputCell]}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#555"
                  value={usesTime 
                    ? (set.duration_seconds?.toString() || '') 
                    : (set.reps?.toString() || '')
                  }
                  onChangeText={(value) => 
                    updateSet(set.set_number, usesTime ? 'duration_seconds' : 'reps', value)
                  }
                />
              </View>

              {/* Input KG/LB */}
              <View style={[styles.cell, styles.inputCell]}>
                <WeightInput
                  weightKg={set.weight_kg}
                  weightUnit={weightUnit}
                  onChangeWeight={(valueInKg) => {
                    updateSet(set.set_number, 'weight_kg', valueInKg !== null ? valueInKg.toString() : '');
                  }}
                />
              </View>

              {/* Botón eliminar */}
              <View style={[styles.cell, styles.actionCell]}>
                <TouchableOpacity
                  onPress={() => removeSet(set.set_number)}
                  disabled={sets.length <= 1}
                  style={styles.deleteButton}
                >
                  <Ionicons 
                    name="trash-outline" 
                    size={20} 
                    color={sets.length <= 1 ? '#333' : '#ff4444'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Botones de acciones */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.addButton} onPress={addSet}>
          <Ionicons name="add-circle-outline" size={20} color="#ffb300" />
          <Text style={styles.addButtonText}>Agregar Serie</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.saveButton, 
            saving && styles.saveButtonDisabled,
            saveSuccess && styles.saveButtonSuccess
          ]} 
          onPress={saveSets}
          disabled={saving}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardando...</Text>
            </>
          ) : saveSuccess ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={[styles.saveButtonText, styles.saveButtonTextSuccess]}>¡Guardado!</Text>
            </>
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardar Series</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 8,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  setsCount: {
    fontSize: 14,
    color: '#888',
  },
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffb300',
    textAlign: 'center',
    lineHeight: 13,
  },
  setNumberCell: {
    width: 35,
  },
  previousCell: {
    width: 55,
  },
  inputCell: {
    flex: 1,
  },
  actionCell: {
    width: 40,
  },
  setNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  previousText: {
    fontSize: 14,
    color: '#888',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
  },
  deleteButton: {
    padding: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    borderRadius: 8,
    padding: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#555',
  },
  saveButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  saveButtonTextSuccess: {
    color: '#ffffff',
  },
});

