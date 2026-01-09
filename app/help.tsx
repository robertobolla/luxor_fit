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
import { useTranslation } from 'react-i18next';

type SupportOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
};

const getSupportOptions = (t: any): SupportOption[] => [
  {
    id: 'suggestion',
    title: t('help.suggestion'),
    description: t('help.suggestionDesc'),
    icon: 'bulb-outline',
    placeholder: t('help.suggestionPlaceholder'),
  },
  {
    id: 'bug',
    title: t('help.bugReport'),
    description: t('help.bugReportDesc'),
    icon: 'bug-outline',
    placeholder: t('help.bugReportPlaceholder'),
  },
  {
    id: 'help',
    title: t('help.getHelp'),
    description: t('help.getHelpDesc'),
    icon: 'help-circle-outline',
    placeholder: t('help.getHelpPlaceholder'),
  },
];

export default function HelpScreen() {
  const { t } = useTranslation();
  const supportOptions = getSupportOptions(t);

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
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Custom Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.customHeaderTitle}>{t('help.title')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Ionicons name="chatbubbles" size={64} color="#ffb300" />
            <Text style={styles.headerTitle}>{t('help.helpTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('help.selectOption')}
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
            <Text style={styles.contactText}>{t('help.supportEmail')}</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t('help.responseTime')}
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 4,
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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

