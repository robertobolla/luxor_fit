import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIWorkoutAdapterService } from '../services/aiWorkoutAdapter';

interface AIWorkoutAdaptationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (adaptedPlan: any) => void;
  workoutPlan: any;
  userId: string;
}

export const AIWorkoutAdaptationModal: React.FC<AIWorkoutAdaptationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  workoutPlan,
  userId,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions] = useState([
    "No incluyas ejercicios de pecho plano porque me duele por una lesión",
    "Cambia todos los ejercicios de piernas por ejercicios de peso corporal",
    "Reduce las series a 2 por ejercicio porque tengo poco tiempo",
    "Agrega más ejercicios de core y estabilidad",
    "Elimina los ejercicios que requieren mancuernas",
    "Incluye más ejercicios de estiramiento y movilidad",
    "Cambia los ejercicios de espalda por alternativas sin peso",
    "Agrega ejercicios de rehabilitación para hombro",
  ]);

  const handleAdaptWorkout = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Por favor escribe una instrucción para adaptar tu entrenamiento.');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await AIWorkoutAdapterService.adaptWorkoutPlan({
        workoutPlanId: workoutPlan.id,
        userId,
        adaptationPrompt: prompt.trim(),
        currentPlan: workoutPlan.plan_data,
      });

      if (result.success) {
        Alert.alert(
          '¡Éxito!',
          result.message,
          [
            {
              text: 'Ver Plan Adaptado',
              onPress: () => {
                onSuccess(result.adaptedPlan);
                onClose();
              },
            },
            {
              text: 'Cerrar',
              onPress: onClose,
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error adaptando entrenamiento:', error);
      Alert.alert('Error', 'No se pudo adaptar el entrenamiento. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Adaptar con IA</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Descripción */}
          <View style={styles.descriptionContainer}>
            <Ionicons name="bulb" size={24} color="#ffb300" />
            <Text style={styles.description}>
              Describe cómo quieres adaptar tu entrenamiento. La IA modificará tu plan actual según tus necesidades específicas.
            </Text>
          </View>

          {/* Input de prompt */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Instrucciones para la IA:</Text>
            <TextInput
              style={styles.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Ej: No incluyas ejercicios de pecho plano porque me duele por una lesión"
              placeholderTextColor="#666666"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Sugerencias */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>💡 Sugerencias:</Text>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Ionicons name="arrow-forward" size={16} color="#ffb300" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Información adicional */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color="#888888" />
            <Text style={styles.infoText}>
              La IA mantendrá la estructura de tu plan pero adaptará ejercicios, series, repeticiones y otros aspectos según tus instrucciones.
            </Text>
          </View>
        </ScrollView>

        {/* Botón de acción */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.adaptButton, isLoading && styles.adaptButtonDisabled]}
            onPress={handleAdaptWorkout}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#ffffff" />
                <Text style={styles.adaptButtonText}>Adaptar Entrenamiento</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  description: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 100,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 8,
    lineHeight: 18,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    marginLeft: 8,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  adaptButton: {
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  adaptButtonDisabled: {
    backgroundColor: '#666666',
  },
  adaptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
