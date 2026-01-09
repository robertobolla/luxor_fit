// ============================================================================
// HELP MODAL - Modal con lista de tutoriales disponibles
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../contexts/TutorialContext';
import { router } from 'expo-router';

interface Tutorial {
  id: string;
  screen: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const getTutorials = (t: any): Tutorial[] => [
  {
    id: 'home',
    screen: 'HOME',
    title: t('helpCenter.homeTitle'),
    description: t('helpCenter.homeDesc'),
    icon: 'home',
    route: '/(tabs)/home',
  },
  {
    id: 'workout',
    screen: 'WORKOUT',
    title: t('helpCenter.workoutTitle'),
    description: t('helpCenter.workoutDesc'),
    icon: 'barbell',
    route: '/(tabs)/workout',
  },
  {
    id: 'custom_plan',
    screen: 'CUSTOM_PLAN',
    title: t('helpCenter.customPlanTitle'),
    description: t('helpCenter.customPlanDesc'),
    icon: 'create',
    route: '/(tabs)/workout/custom-plan-days',
  },
  {
    id: 'nutrition',
    screen: 'NUTRITION',
    title: t('helpCenter.nutritionTitle'),
    description: t('helpCenter.nutritionDesc'),
    icon: 'restaurant',
    route: '/(tabs)/nutrition',
  },
  {
    id: 'progress',
    screen: 'PROGRESS',
    title: t('helpCenter.progressTitle'),
    description: t('helpCenter.progressDesc'),
    icon: 'trending-up',
    route: '/(tabs)/dashboard',
  },
  {
    id: 'profile',
    screen: 'PROFILE',
    title: t('helpCenter.profileTitle'),
    description: t('helpCenter.profileDesc'),
    icon: 'person',
    route: '/(tabs)/profile',
  },
];

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const { t } = useTranslation();
  const tutorials = getTutorials(t);
  const { hasCompletedTutorial, resetAllTutorials, resetTutorial } = useTutorial();

  const handleTutorialPress = async (tutorial: Tutorial) => {
    // Marcar como no completado para que se muestre de nuevo
    await resetTutorial(tutorial.screen);
    onClose();
    // Navegar a la pantalla correspondiente
    setTimeout(() => {
      router.push(tutorial.route as any);
    }, 300);
  };

  const handleResetAll = async () => {
    await resetAllTutorials();
    onClose();
    // Opcional: Mostrar mensaje de confirmación
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="help-circle" size={28} color="#ffb300" />
              <Text style={styles.headerTitle}>{t('helpCenter.title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Descripción */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                {t('helpCenter.selectTutorial')}
              </Text>
            </View>

            {/* Lista de tutoriales */}
            {tutorials.map((tutorial) => {
              const completed = hasCompletedTutorial(tutorial.screen);
              return (
                <TouchableOpacity
                  key={tutorial.id}
                  style={styles.tutorialCard}
                  onPress={() => handleTutorialPress(tutorial)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tutorialIconContainer}>
                    <Ionicons name={tutorial.icon} size={32} color="#ffb300" />
                  </View>
                  <View style={styles.tutorialInfo}>
                    <View style={styles.tutorialTitleRow}>
                      <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
                      {completed && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                          <Text style={styles.completedBadgeText}>{t('helpCenter.watched')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              );
            })}

            {/* Botón para resetear todos */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetAll}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color="#ff6b6b" />
              <Text style={styles.resetButtonText}>{t('helpCenter.resetAll')}</Text>
            </TouchableOpacity>

            {/* Sección de soporte adicional */}
            <View style={styles.supportSection}>
              <Text style={styles.supportTitle}>{t('helpCenter.needHelp')}</Text>
              <TouchableOpacity
                style={styles.supportButton}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    router.push('/help' as any);
                  }, 300);
                }}
              >
                <Ionicons name="mail" size={20} color="#ffb300" />
                <Text style={styles.supportButtonText}>{t('helpCenter.contactSupport')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  content: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  descriptionContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#cccccc',
    lineHeight: 22,
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tutorialIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 2,
    fontWeight: '600',
  },
  tutorialDescription: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 8,
  },
  supportSection: {
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  supportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffb300',
    marginLeft: 8,
  },
});

