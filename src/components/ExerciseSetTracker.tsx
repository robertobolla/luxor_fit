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

interface ExerciseSetTrackerProps {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  defaultSets: number; // Cantidad de series por defecto del plan
  usesTime?: boolean; // Si el ejercicio usa tiempo en lugar de reps
  sessionId?: string; // ID de la sesión actual
  onSetsChange?: (sets: ExerciseSet[]) => void;
}

export function ExerciseSetTracker({
  userId,
  exerciseId,
  exerciseName,
  defaultSets,
  usesTime = false,
  sessionId,
  onSetsChange,
}: ExerciseSetTrackerProps) {
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [previousSets, setPreviousSets] = useState<PreviousSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSets();
    loadPreviousSets();
  }, [defaultSets, exerciseId]);

  // Inicializar las series con la cantidad por defecto
  const initializeSets = () => {
    const initialSets: ExerciseSet[] = [];
    for (let i = 1; i <= defaultSets; i++) {
      initialSets.push({
        set_number: i,
        reps: null,
        weight_kg: null,
        duration_seconds: null,
      });
    }
    setSets(initialSets);
    onSetsChange?.(initialSets);
  };

  // Cargar series del último entrenamiento del mismo músculo
  const loadPreviousSets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_last_muscle_workout_sets', {
        p_user_id: userId,
        p_exercise_id: exerciseId,
        p_current_session_id: sessionId || null,
      });

      if (error) {
        console.error('Error loading previous sets:', error);
        return;
      }

      if (data && data.length > 0) {
        setPreviousSets(data);
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
    const newSetNumber = sets.length + 1;
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
      const filtered = prevSets.filter(set => set.set_number !== setNumber);
      // Renumerar las series
      const renumbered = filtered.map((set, index) => ({
        ...set,
        set_number: index + 1,
      }));
      onSetsChange?.(renumbered);
      return renumbered;
    });
  };

  // Obtener el dato anterior para una serie específica
  const getPreviousData = (setNumber: number, field: 'reps' | 'weight_kg'): string => {
    const previousSet = previousSets.find(s => s.set_number === setNumber);
    if (!previousSet || previousSet[field] === null) return '-';
    return previousSet[field]!.toString();
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
        <Text style={styles.setsCount}>{sets.length} {sets.length === 1 ? 'serie' : 'series'}</Text>
      </View>

      {/* Tabla de series */}
      <View style={styles.table}>
        {/* Encabezado de columnas */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.setNumberCell]}>#</Text>
          <Text style={[styles.headerCell, styles.previousCell]}>
            ANTERIOR{'\n'}REPS
          </Text>
          <Text style={[styles.headerCell, styles.previousCell]}>
            ANTERIOR{'\n'}KG
          </Text>
          <Text style={[styles.headerCell, styles.inputCell]}>
            {usesTime ? 'SEG' : 'REPS'}
          </Text>
          <Text style={[styles.headerCell, styles.inputCell]}>KG</Text>
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

      {/* Botón agregar serie */}
      <TouchableOpacity style={styles.addButton} onPress={addSet}>
        <Ionicons name="add-circle-outline" size={24} color="#ffb300" />
        <Text style={styles.addButtonText}>Agregar Serie</Text>
      </TouchableOpacity>
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffb300',
    textAlign: 'center',
  },
  setNumberCell: {
    width: 40,
  },
  previousCell: {
    flex: 1,
  },
  inputCell: {
    flex: 1.2,
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
  addButton: {
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

