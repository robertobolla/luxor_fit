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
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const suggestions = [
    t('aiAdaptation.suggestion1'),
    t('aiAdaptation.suggestion2'),
    t('aiAdaptation.suggestion3'),
    t('aiAdaptation.suggestion4'),
    t('aiAdaptation.suggestion5'),
    t('aiAdaptation.suggestion6'),
    t('aiAdaptation.suggestion7'),
    t('aiAdaptation.suggestion8'),
  ];

  const handleAdaptWorkout = async () => {
    if (!prompt.trim()) {
      Alert.alert(t('common.error'), t('aiAdaptation.emptyPrompt'));
      return;
    }

    setIsLoading(true);
    
    try {
      // Obtener el idioma actual del usuario
      const currentLanguage = i18n.language.startsWith('en') ? 'en' : 'es';

      const result = await AIWorkoutAdapterService.adaptWorkoutPlan({
        workoutPlanId: workoutPlan.id,
        userId,
        adaptationPrompt: prompt.trim(),
        currentPlan: workoutPlan.plan_data,
        language: currentLanguage,
      });

      if (result.success) {
        Alert.alert(
          t('aiAdaptation.success'),
          result.message,
          [
            {
              text: t('aiAdaptation.viewAdaptedPlan'),
              onPress: () => {
                onSuccess(result.adaptedPlan);
                onClose();
              },
            },
            {
              text: t('aiAdaptation.close'),
              onPress: onClose,
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), result.message);
      }
    } catch (error) {
      console.error('Error adaptando entrenamiento:', error);
      Alert.alert(t('common.error'), t('aiAdaptation.adaptError'));
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
          <Text style={styles.title}>{t('aiAdaptation.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Descripción */}
          <View style={styles.descriptionContainer}>
            <Ionicons name="bulb" size={24} color="#ffb300" />
            <Text style={styles.description}>
              {t('aiAdaptation.description')}
            </Text>
          </View>

          {/* Input de prompt */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('aiAdaptation.instructionsLabel')}</Text>
            <TextInput
              style={styles.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder={t('aiAdaptation.placeholder')}
              placeholderTextColor="#666666"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Sugerencias */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>{t('aiAdaptation.suggestionsTitle')}</Text>
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
              {t('aiAdaptation.infoText')}
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
                <Text style={styles.adaptButtonText}>{t('aiAdaptation.adaptButton')}</Text>
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
