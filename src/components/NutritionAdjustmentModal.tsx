import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NutritionAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  adjustment: {
    calories: number;
    caloriesChange: number;
    explanation: string;
    educationalMessage: string;
  } | null;
}

export default function NutritionAdjustmentModal({
  visible,
  onClose,
  adjustment,
}: NutritionAdjustmentModalProps) {
  if (!adjustment) return null;

  const getIcon = () => {
    if (adjustment.explanation.includes('✅')) return 'checkmark-circle';
    if (adjustment.explanation.includes('⚠️')) return 'warning';
    if (adjustment.explanation.includes('📈')) return 'trending-up';
    if (adjustment.explanation.includes('📉')) return 'trending-down';
    if (adjustment.explanation.includes('🐌')) return 'timer';
    return 'information-circle';
  };

  const getColor = () => {
    if (adjustment.explanation.includes('✅')) return '#00D4AA';
    if (adjustment.explanation.includes('⚠️')) return '#FFA500';
    return '#00D4AA';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={[styles.iconContainer, { backgroundColor: getColor() + '20' }]}>
            <Ionicons name={getIcon()} size={48} color={getColor()} />
          </View>

          <Text style={styles.title}>Ajuste de Tu Plan Nutricional</Text>
          <Text style={styles.subtitle}>{adjustment.explanation}</Text>

          <ScrollView style={styles.messageContainer}>
            <Text style={styles.messageTitle}>💡 Lo que esto significa:</Text>
            <Text style={styles.message}>{adjustment.educationalMessage}</Text>
          </ScrollView>

          <View style={styles.caloriesContainer}>
            <View style={styles.caloriesCard}>
              <Text style={styles.caloriesLabel}>Nuevas Calorías Diarias</Text>
              <Text style={styles.caloriesValue}>{adjustment.calories} kcal</Text>
              {adjustment.caloriesChange !== 0 && (
                <Text style={[styles.caloriesChange, {
                  color: adjustment.caloriesChange > 0 ? '#FFA500' : '#00D4AA'
                }]}>
                  {adjustment.caloriesChange > 0 ? '+' : ''}{adjustment.caloriesChange} kcal
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  messageContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4AA',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 22,
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  caloriesCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 4,
  },
  caloriesChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
});

