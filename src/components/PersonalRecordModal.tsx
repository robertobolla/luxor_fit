import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { 
  savePersonalRecord, 
  getExercisePRHistory, 
  getExercisePR,
  formatWeight,
  formatPRDate,
  type PersonalRecord,
  type PRHistoryItem
} from '@/services/personalRecords';

interface PersonalRecordModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  workoutPlanId?: string;
  dayName?: string;
}

export default function PersonalRecordModal({
  visible,
  onClose,
  exerciseName,
  workoutPlanId,
  dayName
}: PersonalRecordModalProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('1');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<PRHistoryItem[]>([]);
  const [currentPR, setCurrentPR] = useState<PersonalRecord | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible]);

  const loadHistory = async () => {
    if (!user?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const [historyResult, prResult] = await Promise.all([
        getExercisePRHistory(user.id, exerciseName),
        getExercisePR(user.id, exerciseName)
      ]);

      if (historyResult.success) {
        setHistory(historyResult.data || []);
      }

      if (prResult.success && prResult.data) {
        setCurrentPR(prResult.data);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!user?.id) return;

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);
    const setsNum = parseInt(sets);

    if (isNaN(weightNum) || isNaN(repsNum) || isNaN(setsNum) || weightNum <= 0 || repsNum <= 0 || setsNum <= 0) {
      Alert.alert('Error', 'Por favor ingresa valores válidos para peso, repeticiones y series');
      return;
    }

    setIsLoading(true);
    try {
      const result = await savePersonalRecord({
        user_id: user.id,
        exercise_name: exerciseName,
        workout_plan_id: workoutPlanId,
        day_name: dayName,
        date: new Date().toISOString().split('T')[0],
        weight_kg: weightNum,
        reps: repsNum,
        sets: setsNum,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        Alert.alert(
          '¡Record Guardado!',
          result.data?.is_pr 
            ? '🎉 ¡Nuevo record personal! ¡Felicitaciones!' 
            : 'Record guardado exitosamente',
          [{ text: 'OK', onPress: () => {
            setWeight('');
            setReps('');
            setSets('1');
            setNotes('');
            loadHistory();
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar el record');
      }
    } catch (error) {
      console.error('Error guardando record:', error);
      Alert.alert('Error', 'Error inesperado al guardar el record');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAddTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Agregar Mejor Serie</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Peso (kg)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder="Ej: 80"
          keyboardType="numeric"
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Repeticiones</Text>
        <TextInput
          style={styles.input}
          value={reps}
          onChangeText={setReps}
          placeholder="Ej: 8"
          keyboardType="numeric"
          returnKeyType="next"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Series</Text>
        <TextInput
          style={styles.input}
          value={sets}
          onChangeText={setSets}
          placeholder="Ej: 3"
          keyboardType="numeric"
          returnKeyType="done"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej: Muy difícil, necesito mejorar técnica..."
          multiline
          numberOfLines={3}
          returnKeyType="done"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.disabledButton]}
        onPress={handleSaveRecord}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Ionicons name="trophy" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>Guardar Record</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Historial de Records</Text>
        {currentPR && (
          <View style={styles.prBadge}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={styles.prBadgeText}>PR: {formatWeight(currentPR.weight_kg)} x {currentPR.reps}</Text>
          </View>
        )}
      </View>

      {isLoadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color="#666" />
          <Text style={styles.emptyTitle}>Sin records aún</Text>
          <Text style={styles.emptyDescription}>
            Agrega tu primera serie para comenzar a trackear tu progreso
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {history.map((record, index) => (
            <View key={record.id} style={[
              styles.historyItem,
              record.is_pr && styles.prItem
            ]}>
              <View style={styles.historyItemHeader}>
                <View style={styles.historyItemInfo}>
                  <Text style={styles.historyWeight}>
                    {formatWeight(record.weight_kg)} x {record.reps}
                  </Text>
                  <Text style={styles.historyDate}>
                    {formatPRDate(record.date)}
                  </Text>
                </View>
                {record.is_pr && (
                  <View style={styles.prIcon}>
                    <Ionicons name="trophy" size={20} color="#FFD700" />
                  </View>
                )}
              </View>
              
              {record.sets > 1 && (
                <Text style={styles.historySets}>
                  {record.sets} series
                </Text>
              )}
              
              {record.notes && (
                <Text style={styles.historyNotes}>
                  "{record.notes}"
                </Text>
              )}
              
              {record.day_name && (
                <Text style={styles.historyWorkout}>
                  {record.day_name}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>{exerciseName}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'add' && styles.activeTab]}
            onPress={() => setActiveTab('add')}
          >
            <Ionicons 
              name="add-circle" 
              size={20} 
              color={activeTab === 'add' ? '#00D4AA' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'add' && styles.activeTabText
            ]}>
              Agregar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons 
              name="time" 
              size={20} 
              color={activeTab === 'history' ? '#00D4AA' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText
            ]}>
              Historial
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'add' ? renderAddTab() : renderHistoryTab()}
      </View>
    </Modal>
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
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#00D4AA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#ffffff',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  prBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  prItem: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD70010',
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyItemInfo: {
    flex: 1,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  prIcon: {
    marginLeft: 12,
  },
  historySets: {
    fontSize: 14,
    color: '#00D4AA',
    marginTop: 8,
  },
  historyNotes: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
    marginTop: 8,
  },
  historyWorkout: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
});
