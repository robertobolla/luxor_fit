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
          'Permisos requeridos',
          'Las notificaciones están deshabilitadas. Puedes habilitarlas en la configuración del dispositivo.',
          [{ text: 'OK' }]
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
      
      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
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
      Alert.alert('Notificación enviada', 'Revisa tu centro de notificaciones');
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
        <Ionicons name={icon as any} size={24} color="#00D4AA" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#00D4AA' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Notificaciones',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { color: '#ffffff' }
        }} 
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Notificaciones Inteligentes</Text>
            <Text style={styles.subtitle}>
              Recibe recordatorios personalizados basados en tu adherencia y progreso
            </Text>
          </View>

      {/* Configuración General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración General</Text>
        
        <SettingRow
          title="Notificaciones habilitadas"
          subtitle="Activar/desactivar todas las notificaciones"
          value={settings.enabled}
          onValueChange={(value) => updateSetting('enabled', value)}
          icon="notifications"
        />
      </View>

      {/* Tipos de Notificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipos de Notificaciones</Text>
        
        <SettingRow
          title="Recordatorios de entrenamiento"
          subtitle="Te avisa cuando llevas días sin entrenar"
          value={settings.workoutReminders}
          onValueChange={(value) => updateSetting('workoutReminders', value)}
          icon="fitness"
        />

        <SettingRow
          title="Celebraciones de racha"
          subtitle="Felicitaciones por días consecutivos"
          value={settings.streakCelebrations}
          onValueChange={(value) => updateSetting('streakCelebrations', value)}
          icon="flame"
        />

        <SettingRow
          title="Recordatorios de meta semanal"
          subtitle="Te ayuda a cumplir tus objetivos semanales"
          value={settings.weeklyGoals}
          onValueChange={(value) => updateSetting('weeklyGoals', value)}
          icon="target"
        />

        <SettingRow
          title="Horario óptimo"
          subtitle="Sugerencias basadas en tu horario habitual"
          value={settings.optimalTiming}
          onValueChange={(value) => updateSetting('optimalTiming', value)}
          icon="time"
        />

        <SettingRow
          title="Recordatorios de PR"
          subtitle="Motivación para superar tus records"
          value={settings.prReminders}
          onValueChange={(value) => updateSetting('prReminders', value)}
          icon="trophy"
        />
      </View>

      {/* Horarios Silenciosos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horarios Silenciosos</Text>
        
        <SettingRow
          title="Activar horarios silenciosos"
          subtitle="No recibir notificaciones en horarios específicos"
          value={settings.quietHours.enabled}
          onValueChange={(value) => updateQuietHours('enabled', value)}
          icon="moon"
        />

        {settings.quietHours.enabled && (
          <View style={styles.timeSettings}>
            <Text style={styles.timeLabel}>Desde:</Text>
            <TouchableOpacity style={styles.timeButton}>
              <Text style={styles.timeText}>{settings.quietHours.start}</Text>
            </TouchableOpacity>
            
            <Text style={styles.timeLabel}>Hasta:</Text>
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
          <Ionicons name="send" size={20} color="#00D4AA" />
          <Text style={styles.testButtonText}>Probar notificación</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Guardando...' : 'Guardar configuración'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Información adicional */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>💡 Cómo funcionan las notificaciones inteligentes</Text>
        <Text style={styles.infoText}>
          • Analizamos tu patrón de entrenamiento y adherencia{'\n'}
          • Te enviamos recordatorios solo cuando los necesitas{'\n'}
          • Celebramos tus logros y rachas{'\n'}
          • Respetamos tus horarios silenciosos{'\n'}
          • Evitamos el spam con cooldowns inteligentes
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
    color: '#00D4AA',
    marginLeft: 8,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#00D4AA',
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
