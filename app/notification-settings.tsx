import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { smartNotificationService } from '../services/smartNotifications';
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
      
      // Reprogramar notificaciones si están habilitadas
      if (settings.enabled && user?.id) {
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
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
    <ScrollView style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    color: '#1A1A1A',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timeSettings: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginBottom: 20,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
