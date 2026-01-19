import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function SelectPlanTypeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nutrition.howToCreatePlan')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {t('nutrition.chooseMethod')}
        </Text>

        {/* Opción 1: Crear plan personalizado */}
        <TouchableOpacity
          style={[styles.option, styles.optionPrimary]}
          onPress={() => {
            router.replace('/(tabs)/nutrition/custom-plan-setup' as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="create-outline" size={32} color="#ffb300" />
          </View>
          <Text style={styles.optionTitle}>{t('nutrition.createCustomPlan')}</Text>
          <Text style={styles.optionDescription}>
            {t('nutrition.createCustomPlanDesc')}
          </Text>
        </TouchableOpacity>

        {/* Opción 2: Generar plan con IA */}
        <TouchableOpacity
          style={[styles.option, styles.optionSecondary]}
          onPress={() => {
            router.replace('/(tabs)/nutrition/generate-ai-plan' as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="sparkles" size={32} color="#ffb300" />
          </View>
          <Text style={styles.optionTitle}>{t('nutrition.generateWithAI')}</Text>
          <Text style={styles.optionDescription}>
            {t('nutrition.generateWithAIDesc')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  option: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: '#1a1a1a',
  },
  optionPrimary: {
    borderColor: '#ffb300',
  },
  optionSecondary: {
    borderColor: '#ffb300',
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
