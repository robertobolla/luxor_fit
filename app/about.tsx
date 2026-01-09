import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function AboutScreen() {
  const { t } = useTranslation();

  const openURL = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('about.cantOpenURL'));
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(t('common.error'), t('about.errorOpeningURL'));
    }
  };

  const legalLinks = [
    {
      id: 'disclaimer',
      title: t('about.medicalDisclaimer'),
      icon: 'warning-outline' as const,
      url: 'https://luxor-fitness.gitbook.io/docs/legal/descargo-de-responsabilidad',
      color: '#FF9800',
    },
    {
      id: 'terms',
      title: t('about.termsAndConditions'),
      icon: 'document-text-outline' as const,
      url: 'https://luxor-fitness.gitbook.io/docs/legal/terminos-y-condiciones',
      color: '#ffb300',
    },
    {
      id: 'privacy',
      title: t('about.privacyPolicy'),
      icon: 'shield-checkmark-outline' as const,
      url: 'https://luxor-fitness.gitbook.io/docs/legal/politica-de-privacidad',
      color: '#4CAF50',
    },
  ];

  const supportLinks = [
    {
      id: 'help',
      title: t('about.helpCenter'),
      icon: 'help-circle-outline' as const,
      onPress: () => router.push('/help'),
    },
    {
      id: 'email',
      title: t('about.contactEmail'),
      subtitle: 'soporte@luxorfitnessapp.com',
      icon: 'mail-outline' as const,
      onPress: () => Linking.openURL('mailto:soporte@luxorfitnessapp.com'),
    },
    {
      id: 'website',
      title: t('about.website'),
      subtitle: 'luxorfitnessapp.com',
      icon: 'globe-outline' as const,
      onPress: () => openURL('https://luxorfitnessapp.com', 'Website'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('about.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* App Info Section */}
        <View style={styles.appInfoSection}>
          <View style={styles.appIconContainer}>
            <Ionicons name="fitness" size={64} color="#ffb300" />
          </View>
          <Text style={styles.appName}>Luxor Fitness</Text>
          <Text style={styles.appVersion}>v1.0.8</Text>
          <Text style={styles.appDescription}>
            {t('about.appDescription')}
          </Text>
        </View>

        {/* Medical Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="medical" size={24} color="#FF9800" />
          <View style={styles.disclaimerTextContainer}>
            <Text style={styles.disclaimerTitle}>{t('about.importantNotice')}</Text>
            <Text style={styles.disclaimerText}>
              {t('about.medicalDisclaimerText')}
            </Text>
          </View>
        </View>

        {/* Legal Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.legalDocuments')}</Text>
          <View style={styles.linksCard}>
            {legalLinks.map((link, index) => (
              <React.Fragment key={link.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => openURL(link.url, link.title)}
                >
                  <View style={styles.linkLeft}>
                    <Ionicons name={link.icon} size={24} color={link.color} />
                    <Text style={styles.linkLabel}>{link.title}</Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#666" />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Support & Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.supportContact')}</Text>
          <View style={styles.linksCard}>
            {supportLinks.map((link, index) => (
              <React.Fragment key={link.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={link.onPress}
                >
                  <View style={styles.linkLeft}>
                    <Ionicons name={link.icon} size={24} color="#ffb300" />
                    <View style={styles.linkTextContainer}>
                      <Text style={styles.linkLabel}>{link.title}</Text>
                      {link.subtitle && (
                        <Text style={styles.linkSubtitle}>{link.subtitle}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Luxor Fitness</Text>
          <Text style={styles.footerText}>{t('common.allRightsReserved')}</Text>
          <Text style={styles.footerText}>{t('about.madeWithLove')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  appIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffb300',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 24,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    alignItems: 'flex-start',
  },
  disclaimerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  linksCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  linkLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
  linkSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginLeft: 52,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

