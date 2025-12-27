// ============================================================================
// APP TOUR - Tour inicial de bienvenida con slides
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial } from '../contexts/TutorialContext';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
}

const slides: Slide[] = [
  {
    key: 'welcome',
    title: 'Bienvenido a Luxor Fitness',
    text: 'Tu compañero personal para alcanzar tus objetivos de fitness con inteligencia artificial',
    icon: 'barbell',
    iconColor: '#ffb300',
    backgroundColor: '#0a0a0a',
  },
  {
    key: 'features',
    title: '3 Pilares de tu éxito',
    text: 'Entrenamiento personalizado, nutrición con IA, y seguimiento de progreso en tiempo real',
    icon: 'fitness',
    iconColor: '#4CAF50',
    backgroundColor: '#0a0a0a',
  },
  {
    key: 'start',
    title: '¡Comencemos!',
    text: 'Te guiaremos paso a paso para que aproveches todas las funcionalidades',
    icon: 'rocket',
    iconColor: '#2196F3',
    backgroundColor: '#0a0a0a',
  },
];

interface AppTourProps {
  onDone: () => void;
}

export function AppTour({ onDone }: AppTourProps) {
  const { completeInitialTour } = useTutorial();

  const handleDone = async () => {
    await completeInitialTour();
    onDone();
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={120} color={item.iconColor} />
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
        <Text style={styles.skipButtonText}>Saltar</Text>
      </View>
    );
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonCircle: {
    width: 44,
    height: 44,
    backgroundColor: '#ffb300',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#ffffff',
    fontSize: 16,
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

