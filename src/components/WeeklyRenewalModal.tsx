// ============================================================================
// WEEKLY RENEWAL MODAL - Modal para renovar plan semanal
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '@/services/supabase';

interface WeeklyRenewalModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (metrics: {
    weight: number;
    bodyFat?: number;
    muscle?: number;
    adherence: number;
  }) => Promise<void>;
  userId: string;
  lastWeekStart: string;
  lastWeekEnd: string;
}

type MealLogRow = {
  datetime: string; // ISO
  calories: number | null;
  protein_g: number | null;
};

type NutritionTargetRow = {
  date: string; // YYYY-MM-DD
  calories: number;
  protein_g: number;
};

type UserProfileMetricsRow = {
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_percentage: number | null;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function WeeklyRenewalModal({
  visible,
  onClose,
  onGenerate,
  userId,
  lastWeekStart,
  lastWeekEnd,
}: WeeklyRenewalModalProps) {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');

  // 👇 mantenemos el estado como nullable, pero NUNCA lo usamos directo para width
  const [adherence, setAdherence] = useState<number | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingAdherence, setIsLoadingAdherence] = useState(true);

  useEffect(() => {
    if (visible) {
      loadWeeklyAdherence();
      loadCurrentMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, lastWeekStart, lastWeekEnd, userId]);

  // ✅ porcentaje seguro 0..100 para UI (evita "null%")
  const adherencePct = useMemo(() => clamp(adherence ?? 0, 0, 100), [adherence]);

  const adherenceColor = useMemo(() => {
    if (adherencePct >= 70) return '#4caf50';
    if (adherencePct >= 50) return '#ffb300';
    return '#FF6B6B';
  }, [adherencePct]);

  const adherenceText = useMemo(() => {
    if (adherencePct >= 70) return 'Excelente';
    if (adherencePct >= 50) return 'Buena';
    return 'Baja';
  }, [adherencePct]);

  // Cargar adherencia de la semana pasada
  const loadWeeklyAdherence = async () => {
    setIsLoadingAdherence(true);
    try {
      // Logs
      const { data: logsData, error: logsError } = await supabase
        .from('meal_logs')
        .select('datetime, calories, protein_g')
        .eq('user_id', userId)
        .gte('datetime', `${lastWeekStart}T00:00:00`)
        .lte('datetime', `${lastWeekEnd}T23:59:59`);

      if (logsError) {
        console.error('Error loading logs:', logsError);
      }

      // Targets
      const { data: targetsData, error: targetsError } = await supabase
        .from('nutrition_targets')
        .select('date, calories, protein_g')
        .eq('user_id', userId)
        .gte('date', lastWeekStart)
        .lte('date', lastWeekEnd);

      if (targetsError) {
        console.error('Error loading targets:', targetsError);
      }

      const logs = (logsData ?? []) as MealLogRow[];
      const targets = (targetsData ?? []) as NutritionTargetRow[];

      if (!targets.length) {
        setAdherence(0);
        return;
      }

      // Agrupar logs por día
      const logsByDay: Record<string, { calories: number; protein: number }> = {};
      logs.forEach((log) => {
        const date = String(log.datetime).split('T')[0];
        if (!logsByDay[date]) logsByDay[date] = { calories: 0, protein: 0 };
        logsByDay[date].calories += log.calories ?? 0;
        logsByDay[date].protein += log.protein_g ?? 0;
      });

      // Calcular adherencia por día
      let totalAdherence = 0;
      let daysWithTarget = 0;

      targets.forEach((target) => {
        const dayLogs = logsByDay[target.date];
        if (!dayLogs) return;

        daysWithTarget++;

        // Calorías (±200)
        const calorieDiff = Math.abs(dayLogs.calories - target.calories);
        const calorieAdherence =
          calorieDiff <= 200 ? 100 : Math.max(0, 100 - (calorieDiff - 200) / 10);

        // Proteína (±20g)
        const proteinDiff = Math.abs(dayLogs.protein - target.protein_g);
        const proteinAdherence =
          proteinDiff <= 20 ? 100 : Math.max(0, 100 - (proteinDiff - 20) / 2);

        const dayAdherence = (calorieAdherence + proteinAdherence) / 2;
        totalAdherence += dayAdherence;
      });

      const avgAdherence =
        daysWithTarget > 0 ? Math.round(totalAdherence / daysWithTarget) : 0;

      setAdherence(clamp(avgAdherence, 0, 100));
    } catch (error) {
      console.error('Error loading weekly adherence:', error);
      setAdherence(0);
    } finally {
      setIsLoadingAdherence(false);
    }
  };

  // Cargar métricas actuales del usuario
  const loadCurrentMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('weight, body_fat_percentage, muscle_percentage')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading current metrics:', error);
        return;
      }

      const profileData = data as UserProfileMetricsRow | null;

      if (profileData) {
        setWeight(profileData.weight != null ? String(profileData.weight) : '');
        setBodyFat(
          profileData.body_fat_percentage != null ? String(profileData.body_fat_percentage) : ''
        );
        setMuscle(
          profileData.muscle_percentage != null ? String(profileData.muscle_percentage) : ''
        );
      }
    } catch (error) {
      console.error('Error loading current metrics:', error);
    }
  };

  const handleGenerate = async () => {
    const weightNum = parseFloat(weight);
    if (!weight || Number.isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Debes ingresar tu peso actual.');
      return;
    }

    const bodyFatNum = bodyFat ? parseFloat(bodyFat) : undefined;
    if (bodyFat && (Number.isNaN(bodyFatNum!) || bodyFatNum! < 0 || bodyFatNum! > 100)) {
      Alert.alert('Error', 'El porcentaje de grasa corporal debe estar entre 0 y 100.');
      return;
    }

    const muscleNum = muscle ? parseFloat(muscle) : undefined;
    if (muscle && (Number.isNaN(muscleNum!) || muscleNum! < 0 || muscleNum! > 100)) {
      Alert.alert('Error', 'El porcentaje de masa muscular debe estar entre 0 y 100.');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate({
        weight: weightNum,
        bodyFat: bodyFatNum,
        muscle: muscleNum,
        adherence: adherencePct, // ✅ siempre number
      });
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo generar el plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nueva Semana 🎯</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Adherencia */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adherencia Semana Pasada</Text>
              {isLoadingAdherence ? (
                <ActivityIndicator size="small" color="#ffb300" />
              ) : (
                <View style={styles.adherenceCard}>
                  <View style={styles.adherenceHeader}>
                    <Text style={styles.adherencePercent}>{adherencePct}%</Text>
                    <View style={[styles.adherenceBadge, { backgroundColor: adherenceColor }]}>
                      <Text style={styles.adherenceBadgeText}>{adherenceText}</Text>
                    </View>
                  </View>

                  <View style={styles.adherenceBar}>
                    <View
                      style={[
                        styles.adherenceBarFill,
                        { width: `${adherencePct}%`, backgroundColor: adherenceColor },
                      ]}
                    />
                  </View>

                  <Text style={styles.adherenceDescription}>
                    {adherencePct >= 70
                      ? '¡Excelente trabajo! Mantén tu plan actual.'
                      : adherencePct >= 50
                      ? 'Buen progreso, pero hay margen de mejora.'
                      : 'Intenta seguir más de cerca el plan esta semana.'}
                  </Text>
                </View>
              )}
            </View>

            {/* Métricas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actualiza tus Métricas</Text>
              <Text style={styles.sectionDescription}>
                Ingresa tus métricas actuales para ajustar tu plan nutricional.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso (kg) *</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Ej: 75.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Grasa Corporal (%) - Opcional</Text>
                <TextInput
                  style={styles.input}
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder="Ej: 18.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Masa Muscular (%) - Opcional</Text>
                <TextInput
                  style={styles.input}
                  value={muscle}
                  onChangeText={setMuscle}
                  placeholder="Ej: 42.3"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#ffb300" />
              <Text style={styles.infoText}>
                Tu plan se ajustará automáticamente según tu progreso y adherencia.
              </Text>
            </View>
          </ScrollView>

          {/* Warning */}
          {!isLoadingAdherence && adherencePct < 50 && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={20} color="#ff9500" />
              <Text style={styles.warningText}>
                Con una adherencia baja ({adherencePct}%), si solo ingresas tu peso, se mantendrá el
                mismo plan. Para ajustes más precisos, registra también tu grasa corporal y masa muscular.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.generateButtonText}>Generar Plan de la Semana</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Cerrar (no podré ver el plan semanal)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  adherenceCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherencePercent: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  adherenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adherenceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  adherenceBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  adherenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherenceDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#ffb300',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  generateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#ff9500',
    lineHeight: 18,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
});
