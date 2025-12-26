// ============================================================================
// HELP & SUPPORT SCREEN - Pantalla de ayuda y soporte
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type SupportOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
};

const supportOptions: SupportOption[] = [
  {
    id: 'suggestion',
    title: 'Enviar sugerencias',
    description: 'Comparte tus ideas para mejorar la app',
    icon: 'bulb-outline',
    placeholder: 'Cuéntanos tu idea o sugerencia para mejorar Fitness Luxor App. ¡Todas las ideas son bienvenidas!',
  },
  {
    id: 'bug',
    title: 'Informe de errores',
    description: 'Reporta un problema o error en la app',
    icon: 'bug-outline',
    placeholder: 'Describe el error que encontraste: ¿Qué estabas haciendo? ¿Qué esperabas que pasara? ¿Qué pasó en realidad?',
  },
  {
    id: 'help',
    title: 'Consigue ayuda',
    description: 'Obtén asistencia con dudas o problemas',
    icon: 'help-circle-outline',
    placeholder: '¿En qué podemos ayudarte? Describe tu pregunta o problema con el mayor detalle posible.',
  },
];

export default function HelpScreen() {
  const handleOptionPress = (option: SupportOption) => {
    router.push({
      pathname: '/support-form',
      params: {
        type: option.id,
        title: option.title,
        placeholder: option.placeholder,
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ayuda y soporte',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: ' ',
          headerBackTitleVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Ionicons name="chatbubbles" size={64} color="#ffb300" />
            <Text style={styles.headerTitle}>¿Cómo podemos ayudarte?</Text>
            <Text style={styles.headerSubtitle}>
              Selecciona una opción para contactarnos
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {supportOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  index === supportOptions.length - 1 && styles.optionCardLast,
                ]}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name={option.icon} size={32} color="#ffb300" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666666" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            <Ionicons name="mail" size={20} color="#888888" />
            <Text style={styles.contactText}>soporte@luxorfitnessapp.com</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Respondemos todas las consultas en un plazo de 24-48 horas
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionCardLast: {
    marginBottom: 0,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#888888',
  },
  footer: {
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

