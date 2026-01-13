// ============================================================================
// NOTIFICATION BELL COMPONENT - Sistema de Notificaciones
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { acceptSharedWorkout, rejectSharedWorkout } from '../services/sharedWorkoutService';
import { acceptSharedNutritionPlan, rejectSharedNutritionPlan } from '../services/sharedNutritionService';
import { Alert } from 'react-native';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  sender_name: string;
  related_id?: string;
  created_at: string;
  is_read: boolean;
}

export default function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_user_notifications', { p_user_id: user.id });

      if (error) {
        // Silently fail if RPC doesn't exist - notifications feature might not be set up
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: Notification) => !n.is_read).length);
    } catch (error: any) {
      // Silently fail - notifications feature might not be configured
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Cargar al montar y cuando se enfoca la pantalla
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // Auto-actualizar cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Marcar como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .rpc('mark_notification_as_read', { p_notification_id: notificationId });

      if (error) throw error;

      // Actualizar localmente
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  };

  // Aceptar plan compartido desde notificación
  const handleAcceptPlan = async (notification: Notification) => {
    if (!user?.id || !notification.related_id) return;

    try {
      // Buscar el shared_workout o shared_nutrition_plan correspondiente
      if (notification.notification_type === 'workout_plan') {
        const { data: sharedWorkout } = await supabase
          .from('shared_workouts')
          .select('*')
          .eq('workout_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (!sharedWorkout) {
          Alert.alert('Error', 'Plan de entrenamiento no encontrado');
          return;
        }

        Alert.alert(
          'Aceptar plan de entrenamiento',
          '¿Deseas activarlo como tu plan actual?',
          [
            {
              text: 'Solo aceptar',
              onPress: async () => {
                const result = await acceptSharedWorkout(sharedWorkout.id, user.id, false);
                if (result.success) {
                  markAsRead(notification.id);
                  loadNotifications();
                } else {
                  Alert.alert('Error', result.error || 'No se pudo aceptar el plan');
                }
              },
            },
            {
              text: 'Aceptar y activar',
              onPress: async () => {
                const result = await acceptSharedWorkout(sharedWorkout.id, user.id, true);
                if (result.success) {
                  Alert.alert('Éxito', 'Plan de entrenamiento aceptado y activado');
                  markAsRead(notification.id);
                  loadNotifications();
                } else {
                  Alert.alert('Error', result.error || 'No se pudo aceptar el plan');
                }
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
      } else if (notification.notification_type === 'nutrition_plan') {
        const { data: sharedPlan } = await supabase
          .from('shared_nutrition_plans')
          .select('*')
          .eq('nutrition_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (!sharedPlan) {
          Alert.alert('Error', 'Plan nutricional no encontrado');
          return;
        }

        Alert.alert(
          'Aceptar plan nutricional',
          '¿Deseas activarlo como tu plan actual?',
          [
            {
              text: 'Solo aceptar',
              onPress: async () => {
                const result = await acceptSharedNutritionPlan(sharedPlan.id, user.id, false);
                if (result.success) {
                  markAsRead(notification.id);
                  loadNotifications();
                } else {
                  Alert.alert('Error', result.error || 'No se pudo aceptar el plan');
                }
              },
            },
            {
              text: 'Aceptar y activar',
              onPress: async () => {
                const result = await acceptSharedNutritionPlan(sharedPlan.id, user.id, true);
                if (result.success) {
                  Alert.alert('Éxito', 'Plan nutricional aceptado y activado');
                  markAsRead(notification.id);
                  loadNotifications();
                } else {
                  Alert.alert('Error', result.error || 'No se pudo aceptar el plan');
                }
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error accepting plan:', error);
      Alert.alert('Error', 'No se pudo procesar la solicitud');
    }
  };

  // Rechazar plan compartido desde notificación
  const handleRejectPlan = async (notification: Notification) => {
    if (!user?.id || !notification.related_id) return;

    try {
      if (notification.notification_type === 'workout_plan') {
        const { data: sharedWorkout } = await supabase
          .from('shared_workouts')
          .select('*')
          .eq('workout_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (!sharedWorkout) {
          Alert.alert('Error', 'Plan de entrenamiento no encontrado');
          return;
        }

        Alert.alert('Rechazar plan', '¿Estás seguro de que deseas rechazar este plan?', [
          {
            text: 'Rechazar',
            style: 'destructive',
            onPress: async () => {
              const result = await rejectSharedWorkout(sharedWorkout.id, user.id);
              if (result.success) {
                markAsRead(notification.id);
                loadNotifications();
              } else {
                Alert.alert('Error', result.error || 'No se pudo rechazar el plan');
              }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else if (notification.notification_type === 'nutrition_plan') {
        const { data: sharedPlan } = await supabase
          .from('shared_nutrition_plans')
          .select('*')
          .eq('nutrition_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (!sharedPlan) {
          Alert.alert('Error', 'Plan nutricional no encontrado');
          return;
        }

        Alert.alert('Rechazar plan', '¿Estás seguro de que deseas rechazar este plan?', [
          {
            text: 'Rechazar',
            style: 'destructive',
            onPress: async () => {
              const result = await rejectSharedNutritionPlan(sharedPlan.id, user.id);
              if (result.success) {
                markAsRead(notification.id);
                loadNotifications();
              } else {
                Alert.alert('Error', result.error || 'No se pudo rechazar el plan');
              }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      }
    } catch (error: any) {
      console.error('Error rejecting plan:', error);
      Alert.alert('Error', 'No se pudo procesar la solicitud');
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .rpc('mark_all_notifications_as_read', { p_user_id: user.id });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  // Formatear tiempo relativo
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Renderizar mensaje con links
  const renderMessageWithLinks = (text: string) => {
    // Por ahora retornamos el texto simple
    // En el futuro se puede parsear [texto](url) para hacer links clickeables
    return text;
  };

  return (
    <>
      {/* Botón de Notificaciones */}
      <TouchableOpacity
        onPress={() => {
          setIsModalVisible(true);
          loadNotifications();
        }}
        style={styles.bellButton}
      >
        <Ionicons name="notifications-outline" size={32} color="#ffb300" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal de Notificaciones */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
            🔔 {t('notifications.title')}
</Text>

              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={styles.markAllButton}
                  >
                    <Text style={styles.markAllText}>Marcar todas</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de Notificaciones */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F7931E" />
                <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
                </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={64} color="#666" />
                <Text style={styles.emptyText}>No tienes notificaciones</Text>
                <Text style={styles.emptySubtext}>
  {t('notifications.emptySubtext')}
</Text>
              </View>
            ) : (
              <ScrollView style={styles.notificationsList}>
                {notifications.map((notification) => {
                  const isPlanNotification = notification.notification_type === 'workout_plan' || 
                                            notification.notification_type === 'nutrition_plan';
                  const isPendingPlan = isPlanNotification && 
                                      (notification.title.includes('compartido') || 
                                       notification.title.includes('Plan'));

                  return (
                    <View
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.is_read && styles.notificationUnread,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.notificationContentWrapper}
                        onPress={() => {
                          if (!notification.is_read && !isPendingPlan) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        <View style={styles.notificationIcon}>
                          <Ionicons
                            name={notification.is_read ? "mail-open-outline" : "mail-unread-outline"}
                            size={24}
                            color={notification.is_read ? "#666" : "#F7931E"}
                          />
                        </View>
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationHeader}>
                            <Text style={styles.notificationSender}>
                              {notification.sender_name}
                            </Text>
                            {!notification.is_read && (
                              <View style={styles.unreadDot} />
                            )}
                          </View>
                          <Text style={styles.notificationTitle}>
                            {notification.title}
                          </Text>
                          <Text style={styles.notificationMessage}>
                            {renderMessageWithLinks(notification.message)}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {getRelativeTime(notification.created_at)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {isPendingPlan && !notification.is_read && (
                        <View style={styles.planActions}>
                          <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => handleAcceptPlan(notification)}
                          >
                            <Ionicons name="checkmark" size={16} color="#ffffff" />
                            <Text style={styles.acceptButtonText}>Aceptar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={() => handleRejectPlan(notification)}
                          >
                            <Ionicons name="close" size={16} color="#ffffff" />
                            <Text style={styles.rejectButtonText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 2,
    borderTopColor: '#F7931E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(247, 147, 30, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F7931E',
  },
  markAllText: {
    color: '#F7931E',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  notificationUnread: {
    backgroundColor: 'rgba(247, 147, 30, 0.05)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationSender: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F7931E',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationContentWrapper: {
    flexDirection: 'row',
    flex: 1,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

