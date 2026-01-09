// ============================================================================
// PLAN EXPIRATION MODAL - Modal que aparece cuando un plan de entrenamiento finaliza
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlanExpirationModalProps {
  visible: boolean;
  planName: string;
  timesRepeated: number;
  onRepeat: () => void;
  onChooseAnother: () => void;
}

export function PlanExpirationModal({
  visible,
  planName,
  timesRepeated,
  onRepeat,
  onChooseAnother,
}: PlanExpirationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Icono */}
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={64} color="#FFB300" />
          </View>

          {/* Título */}
          <Text style={styles.title}>¡Plan Finalizado!</Text>

          {/* Mensaje */}
          <Text style={styles.message}>
            Has completado el plan <Text style={styles.planName}>"{planName}"</Text>
          </Text>

          {timesRepeated > 0 && (
            <Text style={styles.repeatBadge}>
              🔁 Completado {timesRepeated} {timesRepeated === 1 ? 'vez' : 'veces'} anteriormente
            </Text>
          )}

          <Text style={styles.question}>¿Qué deseas hacer?</Text>

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.repeatButton]}
              onPress={onRepeat}
            >
              <Ionicons name="refresh" size={24} color="#1a1a1a" />
              <Text style={styles.repeatButtonText}>Repetir este plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.chooseButton]}
              onPress={onChooseAnother}
            >
              <Ionicons name="list" size={24} color="#FFB300" />
              <Text style={styles.chooseButtonText}>Elegir otro plan</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            * Si repites el plan, comenzará una nueva semana y se sumará al contador de repeticiones
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#FFB300',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFB300',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  planName: {
    color: '#FFB300',
    fontWeight: 'bold',
  },
  repeatBadge: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  repeatButton: {
    backgroundColor: '#FFB300',
  },
  repeatButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  chooseButton: {
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  chooseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB300',
  },
  note: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});



