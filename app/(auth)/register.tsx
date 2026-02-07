import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useOAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { LanguageSelector } from '../../src/components/LanguageSelector';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startTikTokOAuth } = useOAuth({ strategy: 'oauth_tiktok' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const handleOAuthSignIn = async (provider: 'google' | 'tiktok' | 'apple') => {
    try {
      setIsLoading(true);
      const startOAuth = provider === 'google' ? startGoogleOAuth : provider === 'apple' ? startAppleOAuth : startTikTokOAuth;
      const { createdSessionId, setActive: setActiveSession } = await startOAuth();

      if (createdSessionId && setActiveSession) {
        await setActiveSession({ session: createdSessionId });
        router.replace('/onboarding');
      } else {
        Alert.alert(
          t('common.error'),
          t('auth.authenticationFailed')
        );
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));

      const errorMessage = err.errors?.[0]?.message
        || err.errors?.[0]?.longMessage
        || err.message
        || `Error al conectar con ${provider}. Verifica tu configuración.`;

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Botones OAuth */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleOAuthSignIn('apple')}
              disabled={isLoading}
            >
              <View style={styles.oauthButtonContent}>
                <Ionicons name="logo-apple" size={24} color="#ffffff" />
                <Text style={styles.oauthButtonText}>{t('auth.continueWithApple')}</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthSignIn('google')}
            disabled={isLoading}
          >
            <View style={styles.oauthButtonContent}>
              <Ionicons name="logo-google" size={24} color="#ffffff" />
              <Text style={styles.oauthButtonText}>{t('auth.continueWithGoogle')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthSignIn('tiktok')}
            disabled={isLoading}
          >
            <View style={styles.oauthButtonContent}>
              <Ionicons name="logo-tiktok" size={24} color="#ffffff" />
              <Text style={styles.oauthButtonText}>{t('auth.continueWithTiktok')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Selector de idioma en la parte inferior */}
        <View style={styles.languageContainerBottom}>
          <LanguageSelector style="compact" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  languageContainerBottom: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffb300',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#ffb300',
  },
  buttonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  linkText: {
    color: '#ffb300',
    fontSize: 16,
    fontWeight: '600',
  },
  oauthButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  oauthButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  oauthButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
});
