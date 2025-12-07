// ============================================================================
// EXERCISE SET TRACKER
// ============================================================================
// Componente para registrar todas las series de un ejercicio
// Muestra historial del último entrenamiento del mismo músculo

import React, { useState, useEffect } from 'react';
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
import { supabase } from '../services/supabase';

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
}: ExerciseSetTrackerProps) {
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [previousSets, setPreviousSets] = useState<PreviousSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadTodaySetsOrInitialize();
    loadPreviousSets();
  }, [defaultSets, exerciseId]);

  // Cargar las series de hoy (si existen) o inicializar vacías
  const loadTodaySetsOrInitialize = async () => {
    try {
      // Intentar cargar las series guardadas hoy
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('set_number', { ascending: true });

      if (error) {
        console.error('Error loading today sets:', error);
        initializeSets();
        return;
      }

      if (data && data.length > 0) {
        // Hay series guardadas hoy, cargarlas (ya deberían estar sin calentamiento)
        const loadedSets: ExerciseSet[] = data.map(set => ({
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
          duration_seconds: set.duration_seconds,
        }));
        setSets(loadedSets);
        onSetsChange?.(loadedSets);
        console.log('✅ Series de hoy cargadas:', loadedSets.length);
      } else {
        // No hay series guardadas hoy, inicializar vacías (sin calentamiento)
        initializeSets();
      }
    } catch (err) {
      console.error('Error loading today sets:', err);
      initializeSets();
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
    onSetsChange?.(initialSets);
  };

  // Cargar series del último entrenamiento del mismo músculo (EXCLUYENDO hoy)
  const loadPreviousSets = async () => {
    try {
      setLoading(true);
      
      // Obtener fecha de hoy para excluirla
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Buscar el último entrenamiento de este ejercicio ANTES de hoy
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('set_number, reps, weight_kg')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .lt('created_at', `${today}T00:00:00`) // Solo entrenamientos ANTES de hoy
        .order('created_at', { ascending: false })
        .order('set_number', { ascending: true })
        .limit(20); // Limitar para obtener las últimas series

      if (error) {
        console.error('Error loading previous sets:', error);
        return;
      }

      if (data && data.length > 0) {
        // Agrupar por created_at para obtener solo el último entrenamiento
        // Como ordenamos por created_at desc, todos los primeros registros son del último entrenamiento
        const uniqueSets: PreviousSet[] = [];
        const seenSetNumbers = new Set<number>();
        
        for (const set of data) {
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
        console.log('✅ Series anteriores cargadas (último entrenamiento ANTES de hoy):', uniqueSets.length);
      } else {
        console.log('ℹ️ No hay entrenamientos anteriores para este ejercicio');
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
    
    setSets(prevSets => {
      const newSets = prevSets.map(set => 
        set.set_number === setNumber
          ? { ...set, [field]: numValue }
          : set
      );
      onSetsChange?.(newSets);
      return newSets;
    });
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
    
    setSets(prevSets => {
      const newSets = [...prevSets, newSet];
      onSetsChange?.(newSets);
      return newSets;
    });
  };

  // Eliminar una serie
  const removeSet = (setNumber: number) => {
    if (sets.length <= 1) return; // No permitir eliminar si solo hay una serie
    
    setSets(prevSets => {
      // Simplemente filtrar la serie eliminada sin renumerar
      // Los números de serie se mantienen consistentes con el plan original
      const filtered = prevSets.filter(set => set.set_number !== setNumber);
      onSetsChange?.(filtered);
      return filtered;
    });
  };

  // Obtener el dato anterior para una serie específica
  const getPreviousData = (setNumber: number, field: 'reps' | 'weight_kg'): string => {
    const previousSet = previousSets.find(s => s.set_number === setNumber);
    if (!previousSet || previousSet[field] === null) return '-';
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

      // 1. Primero, eliminar las series existentes de hoy para este ejercicio
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { error: deleteError } = await supabase
        .from('exercise_sets')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (deleteError) {
        console.error('Error eliminando series anteriores:', deleteError);
        // Continuar de todos modos, puede que no hayan series previas
      }

      // 2. Preparar los datos para insertar
      const setsData = setsToSave.map(set => ({
        user_id: userId,
        workout_session_id: sessionId || null,
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
            <Text style={styles.headerText}>KG</Text>
          </View>
          <View style={[styles.headerCell, styles.inputCell]}>
            <Text style={styles.headerText}>{usesTime ? 'SEG' : 'REPS'}</Text>
          </View>
          <View style={[styles.headerCell, styles.inputCell]}>
            <Text style={styles.headerText}>KG</Text>
          </View>
          <View style={[styles.headerCell, styles.actionCell]} />
        </View>

        {/* Filas de series */}
        <ScrollView style={styles.tableBody}>
          {sets.map((set) => (
            <View key={set.set_number} style={styles.tableRow}>
              {/* Número de serie */}
              <View style={[styles.cell, styles.setNumberCell]}>
                <Text style={styles.setNumberText}>{set.set_number}</Text>
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

              {/* Input KG */}
              <View style={[styles.cell, styles.inputCell]}>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#555"
                  value={set.weight_kg?.toString() || ''}
                  onChangeText={(value) => updateSet(set.set_number, 'weight_kg', value)}
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

