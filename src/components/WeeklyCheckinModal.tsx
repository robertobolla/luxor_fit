import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  performWeeklyCheckin,
  CheckinStatus,
  BodyMeasurement,
  calculateWeeklyChanges,
} from '@/services/weeklyCheckinService';

interface WeeklyCheckinModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  checkinStatus: CheckinStatus;
  onCheckinComplete: () => void;
}

export default function WeeklyCheckinModal({
  visible,
  onClose,
  userId,
  checkinStatus,
  onCheckinComplete,
}: WeeklyCheckinModalProps) {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [checkinResult, setCheckinResult] = useState<any>(null);

  // Pre-rellenar con última medida si existe
  useEffect(() => {
    if (visible && checkinStatus.lastCheckin) {
      const last = checkinStatus.lastCheckin;
      setWeight(last.weight_kg.toString());
      if (last.body_fat_percentage) setBodyFat(last.body_fat_percentage.toString());
      if (last.muscle_percentage) setMuscle(last.muscle_percentage.toString());
    } else if (visible) {
      // Limpiar campos si es primera vez
      setWeight('');
      setBodyFat('');
      setMuscle('');
      setNotes('');
    }
    setShowResults(false);
  }, [visible, checkinStatus]);

  const handleSubmit = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Error', 'Por favor ingresa tu peso actual');
      return;
    }

    setIsLoading(true);
    try {
      const measurement = {
        weight_kg: parseFloat(weight),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        muscle_percentage: muscle ? parseFloat(muscle) : null,
        notes: notes || null,
        source: 'manual',
      };

      const result = await performWeeklyCheckin(userId, measurement);

      if (result.success) {
        setCheckinResult(result);
        setShowResults(true);
      } else {
        Alert.alert('Error', result.error || 'No se pudo completar el check-in');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (showResults) {
      onCheckinComplete();
    }
    setShowResults(false);
    onClose();
  };

  const getWeightChangeEmoji = (change: number) => {
    if (Math.abs(change) < 0.1) return '➡️';
    return change > 0 ? '📈' : '📉';
  };

  const getWeightChangeColor = (change: number) => {
    if (Math.abs(change) < 0.1) return '#999';
    // Esto depende del objetivo del usuario, pero por ahora:
    return change < 0 ? '#4ecdc4' : '#ff6b6b';
  };

  if (!visible) return null;

  // Pantalla de resultados
  if (showResults && checkinResult) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.resultContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={80} color="#4ecdc4" />
                <Text style={styles.successTitle}>¡Check-in Completado!</Text>
                <Text style={styles.successSubtitle}>Tus datos han sido registrados</Text>
              </View>

              {/* Cambios semanales */}
              {checkinResult.changes && (
                <View style={styles.changesSection}>
                  <Text style={styles.sectionTitle}>📊 Cambios esta semana</Text>
                  
                  <View style={styles.changeCard}>
                    <Ionicons name="fitness" size={24} color="#ffb300" />
                    <View style={styles.changeInfo}>
                      <Text style={styles.changeLabel}>Peso</Text>
                      <View style={styles.changeRow}>
                        <Text style={styles.changeValue}>
                          {checkinResult.changes.weight_change_kg > 0 ? '+' : ''}
                          {checkinResult.changes.weight_change_kg.toFixed(1)} kg
                        </Text>
                        <Text style={styles.changeEmoji}>
                          {getWeightChangeEmoji(checkinResult.changes.weight_change_kg)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {checkinResult.changes.body_fat_change !== null && (
                    <View style={styles.changeCard}>
                      <Ionicons name="water" size={24} color="#4ecdc4" />
                      <View style={styles.changeInfo}>
                        <Text style={styles.changeLabel}>Grasa Corporal</Text>
                        <View style={styles.changeRow}>
                          <Text style={styles.changeValue}>
                            {checkinResult.changes.body_fat_change > 0 ? '+' : ''}
                            {checkinResult.changes.body_fat_change.toFixed(1)}%
                          </Text>
                          <Text style={styles.changeEmoji}>
                            {getWeightChangeEmoji(-checkinResult.changes.body_fat_change)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {checkinResult.changes.muscle_change !== null && (
                    <View style={styles.changeCard}>
                      <Ionicons name="barbell" size={24} color="#ff6b6b" />
                      <View style={styles.changeInfo}>
                        <Text style={styles.changeLabel}>Masa Muscular</Text>
                        <View style={styles.changeRow}>
                          <Text style={styles.changeValue}>
                            {checkinResult.changes.muscle_change > 0 ? '+' : ''}
                            {checkinResult.changes.muscle_change.toFixed(1)}%
                          </Text>
                          <Text style={styles.changeEmoji}>
                            {getWeightChangeEmoji(checkinResult.changes.muscle_change)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Ajuste de dieta */}
              {checkinResult.adjustment && (
                <View style={styles.adjustmentSection}>
                  <Text style={styles.sectionTitle}>🍽️ Ajuste de Dieta</Text>
                  
                  <View style={styles.adjustmentCard}>
                    <View style={styles.caloriesRow}>
                      <Text style={styles.caloriesLabel}>Nuevas calorías diarias:</Text>
                      <Text style={styles.caloriesValue}>
                        {checkinResult.adjustment.calories} kcal
                      </Text>
                    </View>
                    
                    {checkinResult.adjustment.caloriesChange !== 0 && (
                      <View style={styles.changeIndicator}>
                        <Ionicons 
                          name={checkinResult.adjustment.caloriesChange > 0 ? 'arrow-up' : 'arrow-down'} 
                          size={16} 
                          color={checkinResult.adjustment.caloriesChange > 0 ? '#4ecdc4' : '#ff6b6b'} 
                        />
                        <Text style={[
                          styles.changeText,
                          { color: checkinResult.adjustment.caloriesChange > 0 ? '#4ecdc4' : '#ff6b6b' }
                        ]}>
                          {checkinResult.adjustment.caloriesChange > 0 ? '+' : ''}
                          {checkinResult.adjustment.caloriesChange} kcal
                        </Text>
                      </View>
                    )}

                    <Text style={styles.explanation}>
                      {checkinResult.adjustment.explanation}
                    </Text>

                    {checkinResult.adjustment.educationalMessage && (
                      <View style={styles.educationalBox}>
                        <Ionicons name="bulb-outline" size={20} color="#ffb300" />
                        <Text style={styles.educationalText}>
                          {checkinResult.adjustment.educationalMessage}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {!checkinResult.adjustment && checkinResult.changes && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={24} color="#ffb300" />
                  <Text style={styles.infoText}>
                    Necesitas al menos 2 semanas de datos para que el sistema pueda ajustar tu dieta automáticamente.
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>¡Entendido!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // Pantalla de ingreso de datos
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="calendar" size={24} color="#ffb300" />
              <Text style={styles.title}>Check-in Semanal</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {checkinStatus.lastCheckin && (
              <View style={styles.lastCheckinBox}>
                <Text style={styles.lastCheckinTitle}>Última medida:</Text>
                <Text style={styles.lastCheckinText}>
                  {checkinStatus.lastCheckin.weight_kg} kg
                  {checkinStatus.lastCheckin.body_fat_percentage && 
                    ` • ${checkinStatus.lastCheckin.body_fat_percentage}% grasa`}
                  {checkinStatus.lastCheckin.muscle_percentage && 
                    ` • ${checkinStatus.lastCheckin.muscle_percentage}% músculo`}
                </Text>
                <Text style={styles.lastCheckinDate}>
                  Hace {checkinStatus.weeksSinceLastCheckin} {checkinStatus.weeksSinceLastCheckin === 1 ? 'semana' : 'semanas'}
                </Text>
              </View>
            )}

            <Text style={styles.description}>
              Registra tus medidas para ajustar tu plan de nutrición automáticamente según tu progreso.
            </Text>

            {/* Peso (obligatorio) */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="fitness" size={20} color="#ffb300" />
                <Text style={styles.inputLabel}>Peso actual *</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Ej: 75.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#666"
                />
                <Text style={styles.unit}>kg</Text>
              </View>
            </View>

            {/* Grasa corporal (opcional) */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="water" size={20} color="#4ecdc4" />
                <Text style={styles.inputLabel}>Grasa corporal (opcional)</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder="Ej: 18.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#666"
                />
                <Text style={styles.unit}>%</Text>
              </View>
              <Text style={styles.hint}>
                Usa una báscula de bioimpedancia o un plicómetro
              </Text>
            </View>

            {/* Masa muscular (opcional) */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="barbell" size={20} color="#ff6b6b" />
                <Text style={styles.inputLabel}>Masa muscular (opcional)</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={muscle}
                  onChangeText={setMuscle}
                  placeholder="Ej: 42.0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#666"
                />
                <Text style={styles.unit}>%</Text>
              </View>
              <Text style={styles.hint}>
                Disponible en básculas de bioimpedancia
              </Text>
            </View>

            {/* Notas */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="document-text-outline" size={20} color="#999" />
                <Text style={styles.inputLabel}>Notas (opcional)</Text>
              </View>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="¿Cómo te sientes esta semana?"
                multiline
                numberOfLines={3}
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Completar Check-in</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  resultContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lastCheckinBox: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  lastCheckinTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  lastCheckinText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastCheckinDate: {
    fontSize: 13,
    color: '#666',
  },
  description: {
    fontSize: 15,
    color: '#999',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  unit: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
    width: 40,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#4ecdc4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  changesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  changeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  changeInfo: {
    flex: 1,
  },
  changeLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  changeEmoji: {
    fontSize: 24,
  },
  adjustmentSection: {
    marginBottom: 24,
  },
  adjustmentCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  caloriesLabel: {
    fontSize: 15,
    color: '#999',
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  changeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  explanation: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 16,
  },
  educationalBox: {
    flexDirection: 'row',
    backgroundColor: '#3a3a3a',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  educationalText: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#3a3a3a',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#cccccc',
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: '#4ecdc4',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});

