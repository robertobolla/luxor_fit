import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { router, Stack } from 'expo-router';
import { smartNotificationService } from '../src/services/smartNotifications';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

interface NotificationSettings {
  enabled: boolean;
  workoutReminders: boolean;
  streakCelebrations: boolean;
  weeklyGoals: boolean;
  optimalTiming: boolean;
  prReminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export default function NotificationSettingsScreen() {
  const { user } = useUser();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    workoutReminders: true,
    streakCelebrations: true,
    weeklyGoals: true,
    optimalTiming: false,
    prReminders: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('notifications.permissionsRequired'),
          t('notifications.enableInSettings'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
    }
  };

  const loadNotificationSettings = async () => {
    // En una implementación real, cargarías desde AsyncStorage o Supabase
    // Por ahora usamos valores por defecto
    console.log('📱 Cargando configuración de notificaciones');
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Guardar en AsyncStorage o Supabase
      console.log('💾 Guardando configuración:', settings);
      
      // Si las notificaciones están deshabilitadas, cancelar todas
      if (!settings.enabled && user?.id) {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduledNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
        console.log('🗑️ Todas las notificaciones canceladas (notificaciones deshabilitadas)');
      }
      // Si están habilitadas, reprogramar notificaciones inteligentes
      else if (settings.enabled && user?.id) {
        await smartNotificationService.scheduleSmartNotifications(user.id);
      }
      
      Alert.alert(t('common.success'), t('notifications.settingsSaved'));
    } catch (error) {
      console.error('Error guardando configuración:', error);
      Alert.alert(t('common.error'), t('notifications.settingsSaveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      await smartNotificationService.sendImmediateNotification(
        user?.id || '',
        'workout_completed'
      );
      Alert.alert(t('notifications.notificationSent'), t('notifications.checkCenter'));
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Si se desactiva "enabled", desactivar todas las demás opciones
      if (key === 'enabled' && value === false) {
        newSettings.workoutReminders = false;
        newSettings.streakCelebrations = false;
        newSettings.weeklyGoals = false;
        newSettings.optimalTiming = false;
        newSettings.prReminders = false;
      }
      
      // Si se activa "enabled", activar las opciones más importantes por defecto
      if (key === 'enabled' && value === true) {
        newSettings.workoutReminders = true;
        newSettings.streakCelebrations = true;
        newSettings.prReminders = true;
        // weeklyGoals y optimalTiming se mantienen como estaban
      }
      
      return newSettings;
    });
  };

  const updateQuietHours = (key: 'enabled' | 'start' | 'end', value: any) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  const SettingRow = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon 
  }: {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#ffb300" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#ffb300' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <SafeAreaView style={styles.container}>
        {/* Custom Header */}
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.customHeaderTitle}>{t('notifications.settingsTitle')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('notifications.smartNotifications')}</Text>
            <Text style={styles.subtitle}>
              {t('notifications.smartSubtitle')}
            </Text>
          </View>

      {/* Configuración General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notifications.generalSettings')}</Text>
        
        <SettingRow
          title={t('notifications.enabled')}
          subtitle={t('notifications.enabledSubtitle')}
          value={settings.enabled}
          onValueChange={(value) => updateSetting('enabled', value)}
          icon="notifications"
        />
      </View>

      {/* Tipos de Notificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notifications.notificationTypes')}</Text>
        
        <SettingRow
          title={t('notifications.workoutReminders')}
          subtitle={t('notifications.workoutRemindersSubtitle')}
          value={settings.workoutReminders}
          onValueChange={(value) => updateSetting('workoutReminders', value)}
          icon="fitness"
        />

        <SettingRow
          title={t('notifications.streakCelebrations')}
          subtitle={t('notifications.streakCelebrationsSubtitle')}
          value={settings.streakCelebrations}
          onValueChange={(value) => updateSetting('streakCelebrations', value)}
          icon="flame"
        />

        <SettingRow
          title={t('notifications.weeklyGoals')}
          subtitle={t('notifications.weeklyGoalsSubtitle')}
          value={settings.weeklyGoals}
          onValueChange={(value) => updateSetting('weeklyGoals', value)}
          icon="target"
        />

        <SettingRow
          title={t('notifications.optimalTiming')}
          subtitle={t('notifications.optimalTimingSubtitle')}
          value={settings.optimalTiming}
          onValueChange={(value) => updateSetting('optimalTiming', value)}
          icon="time"
        />

        <SettingRow
          title={t('notifications.prReminders')}
          subtitle={t('notifications.prRemindersSubtitle')}
          value={settings.prReminders}
          onValueChange={(value) => updateSetting('prReminders', value)}
          icon="trophy"
        />
      </View>

      {/* Horarios Silenciosos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('notifications.quietHours')}</Text>
        
        <SettingRow
          title={t('notifications.quietHoursEnabled')}
          subtitle={t('notifications.quietHoursSubtitle')}
          value={settings.quietHours.enabled}
          onValueChange={(value) => updateQuietHours('enabled', value)}
          icon="moon"
        />

        {settings.quietHours.enabled && (
          <View style={styles.timeSettings}>
            <Text style={styles.timeLabel}>{t('notifications.from')}</Text>
            <TouchableOpacity style={styles.timeButton}>
              <Text style={styles.timeText}>{settings.quietHours.start}</Text>
            </TouchableOpacity>
            
            <Text style={styles.timeLabel}>{t('notifications.until')}</Text>
            <TouchableOpacity style={styles.timeButton}>
              <Text style={styles.timeText}>{settings.quietHours.end}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Acciones */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.testButton}
          onPress={testNotification}
        >
          <Ionicons name="send" size={20} color="#ffb300" />
          <Text style={styles.testButtonText}>{t('notifications.testNotification')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? t('common.loading') : t('notifications.saveSettings')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Información adicional */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>{t('notifications.howItWorks')}</Text>
        <Text style={styles.infoText}>
          {t('notifications.howItWorksText')}
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
    backgroundColor: '#1a1a1a',
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#2a2a2a',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: 2,
  },
  timeSettings: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 16,
    color: '#ffffff',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  testButtonText: {
    fontSize: 16,
    color: '#ffb300',
    marginLeft: 8,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#ffb300',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoSection: {
    backgroundColor: '#2a2a2a',
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
});
