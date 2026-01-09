// ============================================================================
// APP TOUR - Tour inicial de bienvenida con slides
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Modal, StatusBar } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../contexts/TutorialContext';

const { width } = Dimensions.get('window');

interface SlideConfig {
  key: string;
  titleKey: string;
  textKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
}

interface Slide extends SlideConfig {
  title: string;
  text: string;
}

const slideConfigs: SlideConfig[] = [
  {
    key: 'welcome',
    titleKey: 'tutorial.initialTour.slide1Title',
    textKey: 'tutorial.initialTour.slide1Text',
    icon: 'barbell',
    iconColor: '#ffb300',
    backgroundColor: '#0a0a0a',
  },
  {
    key: 'features',
    titleKey: 'tutorial.initialTour.slide2Title',
    textKey: 'tutorial.initialTour.slide2Text',
    icon: 'fitness',
    iconColor: '#4CAF50',
    backgroundColor: '#0a0a0a',
  },
  {
    key: 'start',
    titleKey: 'tutorial.initialTour.slide3Title',
    textKey: 'tutorial.initialTour.slide3Text',
    icon: 'rocket',
    iconColor: '#2196F3',
    backgroundColor: '#0a0a0a',
  },
];

interface AppTourProps {
  onDone: () => void;
}

export function AppTour({ onDone }: AppTourProps) {
  const { t } = useTranslation();
  const { completeInitialTour } = useTutorial();

  const slides = useMemo(() => slideConfigs.map(slide => ({
    ...slide,
    title: t(slide.titleKey),
    text: t(slide.textKey),
  })), [t]);

  const handleDone = async () => {
    await completeInitialTour();
    onDone();
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
          <Ionicons name={item.icon} size={100} color={item.iconColor} />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.text}>{item.text}</Text>
      </View>
    );
  };

  const renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons name="arrow-forward" size={24} color="#ffffff" />
      </View>
    );
  };

  const renderDoneButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons name="checkmark" size={24} color="#ffffff" />
      </View>
    );
  };

  const renderSkipButton = () => {
    return (
      <View style={styles.skipButton}>
        <Text style={styles.skipButtonText}>{t('common.skip')}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <AppIntroSlider
        data={slides}
        renderItem={renderSlide}
        onDone={handleDone}
        onSkip={handleDone}
        renderNextButton={renderNextButton}
        renderDoneButton={renderDoneButton}
        renderSkipButton={renderSkipButton}
        showSkipButton
        dotStyle={styles.dotStyle}
        activeDotStyle={styles.activeDotStyle}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#0a0a0a',
  },
  iconContainer: {
    marginBottom: 60,
    padding: 30,
    borderRadius: 80,
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 17,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 30,
    maxWidth: 400,
  },
  buttonCircle: {
    width: 50,
    height: 50,
    backgroundColor: '#ffb300',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffb300',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#cccccc',
    fontSize: 17,
    fontWeight: '600',
  },
  dotStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDotStyle: {
    backgroundColor: '#ffb300',
    width: 24,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

