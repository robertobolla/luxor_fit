import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { LanguageSelector } from '../src/components/LanguageSelector';
import { ConfirmModal } from '../src/components/CustomModal';
import { supabase } from '../src/services/supabase';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      // 1. Eliminar todos los datos del usuario en Supabase
      // Las tablas con foreign keys se eliminarán automáticamente gracias a ON DELETE CASCADE
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error al eliminar datos de Supabase:', deleteError);
        throw new Error('No se pudieron eliminar los datos del usuario');
      }

      // 2. Eliminar la cuenta de Clerk
      try {
        await user.delete();
      } catch (clerkError) {
        console.error('Error al eliminar cuenta de Clerk:', clerkError);
        // Continuar con el logout incluso si falla la eliminación de Clerk
      }

      // 3. Cerrar sesión y redirigir
      await signOut();
      
      // 4. Redirigir al login
      router.replace('/(auth)/login');

      Alert.alert(
        t('settings.accountDeleted'),
        t('settings.accountDeletedMessage'),
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error al eliminar cuenta:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('settings.deleteAccountError')
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sección de Idioma */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="language" size={24} color="#ffb300" />
                <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              </View>
              <LanguageSelector />
            </View>
          </View>
        </View>

        {/* Sección de Unidades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.units')}</Text>
          <View style={styles.settingCard}>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="speedometer" size={24} color="#ffb300" />
                <Text style={styles.settingLabel}>{t('settings.metric')}</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{t('settings.metric')}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.settingCard}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setShowDeleteModal(true)}
              disabled={isDeleting}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash" size={24} color="#F44336" />
                <Text style={[styles.settingLabel, { color: '#F44336' }]}>
                  {t('settings.deleteAccount')}
                </Text>
              </View>
              {isDeleting ? (
                <ActivityIndicator color="#F44336" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
          <View style={styles.settingCard}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => router.push('/about')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle" size={24} color="#ffb300" />
                <Text style={styles.settingLabel}>{t('about.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer con versión */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Luxor Fitness v1.0.8</Text>
          <Text style={styles.footerText}>© 2025 Luxor Fitness. {t('common.allRightsReserved')}</Text>
        </View>
      </ScrollView>

      {/* Modal de confirmación para eliminar cuenta */}
      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountConfirmTitle')}
        message={t('settings.deleteAccountConfirmMessage')}
        confirmText={t('settings.deleteAccountConfirm')}
        cancelText={t('common.cancel')}
        confirmButtonStyle="danger"
        onConfirm={handleDeleteAccount}
      />
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginLeft: 52,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});


