// ============================================================================
// AI WEEKLY RENEWAL MODAL - Modal para renovar planes de IA semanalmente
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/services/supabase';

interface AIWeeklyRenewalModalProps {
  visible: boolean;
  onClose: () => void;
  onRepeatWeek: () => Promise<void>;
  onAdjustPlan: (metrics: {
    weight: number;
    bodyFat?: number;
    muscleMass?: number;
  }) => Promise<void>;
  userId: string;
  planId: string;
  activatedAt: string | null;
  initialWeight: number | null;
  nutritionGoal: 'lose_fat' | 'maintain' | 'gain_muscle' | null;
}

type RenewalScenario = 'too_early' | 'low_adherence' | 'good_adherence';

const MIN_DAYS_FOR_ADJUSTMENT = 4;
const MIN_ADHERENCE_PERCENTAGE = 70;

export default function AIWeeklyRenewalModal({
  visible,
  onClose,
  onRepeatWeek,
  onAdjustPlan,
  userId,
  planId,
  activatedAt,
  initialWeight,
  nutritionGoal,
}: AIWeeklyRenewalModalProps) {
  const { t } = useTranslation();
  
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  
  const [adherence, setAdherence] = useState<number>(0);
  const [daysActive, setDaysActive] = useState<number>(0);
  const [daysWithLogs, setDaysWithLogs] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determinar escenario
  const scenario: RenewalScenario = useMemo(() => {
    if (daysActive < MIN_DAYS_FOR_ADJUSTMENT) return 'too_early';
    if (adherence < MIN_ADHERENCE_PERCENTAGE) return 'low_adherence';
    return 'good_adherence';
  }, [daysActive, adherence]);

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calcular días activos
      const activatedDate = activatedAt ? new Date(activatedAt) : new Date();
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - activatedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysActive(diffDays);

      // Calcular adherencia (días con registros de alimentos en los últimos 7 días)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      const { data: logsData, error: logsError } = await supabase
        .from('meal_logs')
        .select('datetime')
        .eq('user_id', userId)
        .gte('datetime', `${weekAgoStr}T00:00:00`)
        .lte('datetime', `${todayStr}T23:59:59`);

      if (logsError) throw logsError;

      // Contar días únicos con registros
      const uniqueDays = new Set<string>();
      (logsData || []).forEach((log: { datetime: string }) => {
        const date = log.datetime.split('T')[0];
        uniqueDays.add(date);
      });

      const daysLogged = uniqueDays.size;
      setDaysWithLogs(daysLogged);
      setAdherence(Math.round((daysLogged / 7) * 100));

      // Cargar métricas actuales del usuario
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('weight, body_fat_percentage, muscle_percentage')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        if (profileData.weight) setWeight(String(profileData.weight));
        if (profileData.body_fat_percentage) setBodyFat(String(profileData.body_fat_percentage));
        if (profileData.muscle_percentage) setMuscleMass(String(profileData.muscle_percentage));
      }
    } catch (err) {
      console.error('Error loading renewal data:', err);
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepeatWeek = async () => {
    setIsProcessing(true);
    try {
      await onRepeatWeek();
    } catch (err) {
      console.error('Error repeating week:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustPlan = async () => {
    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      setError(t('nutrition.enterWeight'));
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      await onAdjustPlan({
        weight: weightNum,
        bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
        muscleMass: muscleMass ? parseFloat(muscleMass) : undefined,
      });
    } catch (err) {
      console.error('Error adjusting plan:', err);
      setError(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getAdherenceColor = () => {
    if (adherence >= 70) return '#4CAF50';
    if (adherence >= 50) return '#ffb300';
    return '#FF6B6B';
  };

  const renderTooEarlyContent = () => (
    <View style={styles.scenarioContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="time-outline" size={48} color="#ffb300" />
      </View>
      <Text style={styles.scenarioTitle}>{t('nutrition.renewalTooEarly')}</Text>
      <Text style={styles.scenarioMessage}>
        {t('nutrition.renewalTooEarlyMessage', { days: daysActive })}
      </Text>
      <Text style={styles.scenarioRecommendation}>
        {t('nutrition.renewalTooEarlyRecommendation')}
      </Text>
    </View>
  );

  const renderLowAdherenceContent = () => (
    <View style={styles.scenarioContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
      </View>
      <Text style={styles.scenarioTitle}>{t('nutrition.lowAdherence')}</Text>
      
      {/* Barra de adherencia */}
      <View style={styles.adherenceCard}>
        <View style={styles.adherenceHeader}>
          <Text style={styles.adherencePercent}>{adherence}%</Text>
          <Text style={styles.adherenceDays}>
            {daysWithLogs}/7 {t('nutrition.daysLogged') || 'días con registro'}
          </Text>
        </View>
        <View style={styles.adherenceBar}>
          <View 
            style={[
              styles.adherenceBarFill, 
              { width: `${adherence}%`, backgroundColor: getAdherenceColor() }
            ]} 
          />
          <View style={[styles.adherenceThreshold, { left: '70%' }]} />
        </View>
        <Text style={styles.adherenceThresholdLabel}>
          {t('nutrition.minRequired') || 'Mínimo requerido'}: 70%
        </Text>
      </View>

      <Text style={styles.scenarioMessage}>
        {t('nutrition.lowAdherenceMessage', { percentage: adherence })}
      </Text>
      <Text style={styles.scenarioRecommendation}>
        {t('nutrition.lowAdherenceRecommendation')}
      </Text>
    </View>
  );

  const renderGoodAdherenceContent = () => (
    <View style={styles.scenarioContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
      </View>
      <Text style={styles.scenarioTitle}>{t('nutrition.goodAdherence')}</Text>
      
      {/* Barra de adherencia */}
      <View style={styles.adherenceCard}>
        <View style={styles.adherenceHeader}>
          <Text style={styles.adherencePercent}>{adherence}%</Text>
          <Text style={[styles.adherenceBadge, { backgroundColor: '#4CAF50' }]}>
            {t('nutrition.excellent') || 'Excelente'}
          </Text>
        </View>
        <View style={styles.adherenceBar}>
          <View 
            style={[
              styles.adherenceBarFill, 
              { width: `${adherence}%`, backgroundColor: '#4CAF50' }
            ]} 
          />
        </View>
      </View>

      <Text style={styles.scenarioMessage}>
        {t('nutrition.goodAdherenceMessage', { percentage: adherence })}
      </Text>

      {/* Formulario de métricas */}
      <View style={styles.metricsSection}>
        <Text style={styles.metricsSectionTitle}>
          {t('nutrition.enterCurrentMetrics')}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('nutrition.currentWeightRequired')} *
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="70.5"
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>
          {initialWeight && (
            <Text style={styles.inputHint}>
              {t('nutrition.initialWeight') || 'Peso inicial'}: {initialWeight} kg
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('nutrition.bodyFatOptional')}
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="18.5"
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
            <Text style={styles.inputUnit}>%</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('nutrition.muscleMassOptional')}
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={muscleMass}
              onChangeText={setMuscleMass}
              placeholder="42.0"
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
            <Text style={styles.inputUnit}>%</Text>
          </View>
        </View>
      </View>

      {/* Nota importante */}
      <View style={styles.importantNote}>
        <Ionicons name="information-circle" size={20} color="#ffb300" />
        <Text style={styles.importantNoteText}>
          {t('nutrition.registryImportantNote')}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {t('nutrition.weeklyRenewalTitle')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('nutrition.weeklyRenewalSubtitle')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffb300" />
                <Text style={styles.loadingText}>
                  {t('common.loading') || 'Cargando...'}
                </Text>
              </View>
            ) : (
              <>
                {scenario === 'too_early' && renderTooEarlyContent()}
                {scenario === 'low_adherence' && renderLowAdherenceContent()}
                {scenario === 'good_adherence' && renderGoodAdherenceContent()}
              </>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer con botones */}
          {!isLoading && (
            <View style={styles.footer}>
              {scenario === 'good_adherence' ? (
                <>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleRepeatWeek}
                    disabled={isProcessing}
                  >
                    <Ionicons name="refresh" size={20} color="#ffb300" />
                    <Text style={styles.secondaryButtonText}>
                      {t('nutrition.repeatWeek')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
                    onPress={handleAdjustPlan}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={20} color="#000" />
                        <Text style={styles.primaryButtonText}>
                          {t('nutrition.adjustPlan')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.fullWidthButton, isProcessing && styles.buttonDisabled]}
                  onPress={handleRepeatWeek}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="#000" />
                      <Text style={styles.fullWidthButtonText}>
                        {t('nutrition.repeatWeek')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  scenarioContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  scenarioMessage: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  scenarioRecommendation: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  adherenceCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginVertical: 16,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherencePercent: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  adherenceDays: {
    fontSize: 14,
    color: '#888',
  },
  adherenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  adherenceBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  adherenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherenceThreshold: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 16,
    backgroundColor: '#fff',
  },
  adherenceThresholdLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  metricsSection: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 20,
  },
  metricsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputUnit: {
    paddingRight: 14,
    fontSize: 14,
    color: '#666',
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  importantNote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  importantNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#ffb300',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffb300',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  fullWidthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    gap: 8,
  },
  fullWidthButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
