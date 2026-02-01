// ============================================================================
// NOTIFICATION BELL COMPONENT - Sistema de Notificaciones
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { acceptSharedWorkout, rejectSharedWorkout } from '../services/sharedWorkoutService';
import { acceptSharedNutritionPlan, rejectSharedNutritionPlan } from '../services/sharedNutritionService';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  sender_name: string;
  related_id?: string;
  created_at: string;
  is_read: boolean;
  // Estado del plan compartido asociado (si existe)
  shared_status?: 'pending' | 'accepted' | 'rejected' | 'active' | null;
}

// Tipo para la vista de confirmación
interface ConfirmViewState {
  active: boolean;
  type: 'workout' | 'nutrition' | 'reject' | null;
  notification: Notification | null;
  sharedId: string | null;
  receiverId: string | null;
  isLoading: boolean;
}

export default function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  
  // IDs de notificaciones que se vieron en esta sesión del modal
  const viewedNotificationIds = useRef<Set<string>>(new Set());
  
  // Estado para la vista de confirmación (dentro del mismo modal)
  const [confirmView, setConfirmView] = useState<ConfirmViewState>({
    active: false,
    type: null,
    notification: null,
    sharedId: null,
    receiverId: null,
    isLoading: false,
  });

  // Verificar el estado de los planes compartidos para una lista de notificaciones
  const enrichNotificationsWithSharedStatus = useCallback(async (notifs: Notification[]): Promise<Notification[]> => {
    if (!user?.id) return notifs;
    
    const enriched = [...notifs];
    
    for (let i = 0; i < enriched.length; i++) {
      const notification = enriched[i];
      const type = notification.notification_type;
      
      // Solo verificar para notificaciones de tipo compartido (nuevas o legacy)
      const isWorkoutShared = type === 'workout_plan_shared' || type === 'workout_plan';
      const isNutritionShared = type === 'nutrition_plan_shared' || type === 'nutrition_plan';
      
      if ((isWorkoutShared || isNutritionShared) && notification.related_id) {
        try {
          if (isWorkoutShared) {
            const { data: sharedWorkout } = await supabase
              .from('shared_workouts')
              .select('status')
              .eq('workout_plan_id', notification.related_id)
              .eq('receiver_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            enriched[i] = {
              ...notification,
              shared_status: (sharedWorkout as any)?.status || null,
            };
          } else {
            const { data: sharedNutrition } = await (supabase as any)
              .from('shared_nutrition_plans')
              .select('status')
              .eq('nutrition_plan_id', notification.related_id)
              .eq('receiver_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            enriched[i] = {
              ...notification,
              shared_status: sharedNutrition?.status || null,
            };
          }
        } catch (e) {
          // Silently fail, keep notification as is
        }
      }
    }
    
    return enriched;
  }, [user?.id]);

  // Cargar notificaciones (sin mostrar loading si ya hay datos)
  const loadNotifications = useCallback(async (showLoading: boolean = true) => {
    if (!user?.id) return;

    try {
      if (showLoading && notifications.length === 0) {
        setLoading(true);
      }
      
      const { data, error, status } = await supabase
        .rpc('get_user_notifications', { p_user_id: user.id });

      // Si hay error transitorio, reintentar una vez
      const isTransientError = error && (
        !status || status === 401 || status === 406 || status === 0 || status >= 500
      );

      if (isTransientError) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: retryData, error: retryError } = await supabase
          .rpc('get_user_notifications', { p_user_id: user.id });

        if (!retryError && retryData) {
          const enrichedData = await enrichNotificationsWithSharedStatus(retryData);
          setNotifications(enrichedData);
          setUnreadCount(enrichedData.filter((n: Notification) => !n.is_read).length);
        }
        return;
      }

      if (!error && data) {
        const enrichedData = await enrichNotificationsWithSharedStatus(data);
        setNotifications(enrichedData);
        setUnreadCount(enrichedData.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error: any) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user?.id, notifications.length, enrichNotificationsWithSharedStatus]);

  // Cargar al montar
  useEffect(() => {
    loadNotifications(true);
  }, [user?.id]);

  // Recargar cuando se enfoca la pantalla (solo si el modal está cerrado)
  useFocusEffect(
    useCallback(() => {
      if (!isModalVisible) {
        loadNotifications(false);
      }
    }, [isModalVisible])
  );

  // Auto-actualizar solo cuando el modal está cerrado (evita parpadeo)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isModalVisible) {
        loadNotifications(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isModalVisible]);

  // Marcar una notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.rpc('mark_notification_as_read', { p_notification_id: notificationId });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  };

  // Marcar todas las notificaciones vistas como leídas (al cerrar el modal)
  const markViewedAsRead = async () => {
    if (viewedNotificationIds.current.size === 0) return;
    
    const idsToMark = Array.from(viewedNotificationIds.current);
    const unreadIds = idsToMark.filter(id => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.is_read;
    });
    
    if (unreadIds.length === 0) return;

    // Actualizar localmente primero
    setNotifications(prev =>
      prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - unreadIds.length));

    // Actualizar en la base de datos
    try {
      for (const id of unreadIds) {
        await supabase.rpc('mark_notification_as_read', { p_notification_id: id });
      }
    } catch (error) {
      console.error('Error marcando notificaciones como leídas:', error);
    }
    
    // Limpiar el set
    viewedNotificationIds.current.clear();
  };

  // Abrir modal
  const openModal = () => {
    viewedNotificationIds.current.clear();
    setIsModalVisible(true);
  };

  // Cerrar modal
  const closeModal = async () => {
    // Si estamos en vista de confirmación, primero volver a la lista
    if (confirmView.active) {
      setConfirmView({
        active: false,
        type: null,
        notification: null,
        sharedId: null,
        receiverId: null,
        isLoading: false,
      });
      return;
    }
    
    // Marcar las vistas como leídas y cerrar
    await markViewedAsRead();
    setIsModalVisible(false);
  };

  // Registrar notificación como vista
  const registerAsViewed = (notificationId: string) => {
    viewedNotificationIds.current.add(notificationId);
  };

  // Aceptar plan compartido desde notificación
  const handleAcceptPlan = async (notification: Notification) => {
    if (!user?.id || !notification.related_id) return;

    try {
      const type = notification.notification_type;
      const isWorkout = type === 'workout_plan_shared' || type === 'workout_plan';
      
      if (isWorkout) {
        let { data: sharedWorkout } = await supabase
          .from('shared_workouts')
          .select('*')
          .eq('workout_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sharedWorkout) {
          const { data: altSearch } = await supabase
            .from('shared_workouts')
            .select('*')
            .eq('workout_plan_id', notification.related_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (altSearch) sharedWorkout = altSearch;
        }

        if (!sharedWorkout) {
          Alert.alert('Error', t('notifications.planNotFound'));
          return;
        }

        const receiverId = sharedWorkout.receiver_id || user.id;
        
        // Mostrar vista de confirmación
        setConfirmView({
          active: true,
          type: 'workout',
          notification,
          sharedId: sharedWorkout.id,
          receiverId,
          isLoading: false,
        });
        
      } else {
        // Nutrition plan (type === 'nutrition_plan_shared' || type === 'nutrition_plan')
        let { data: sharedPlan } = await (supabase as any)
          .from('shared_nutrition_plans')
          .select('*')
          .eq('nutrition_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sharedPlan) {
          const { data: altSearch } = await (supabase as any)
            .from('shared_nutrition_plans')
            .select('*')
            .eq('nutrition_plan_id', notification.related_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (altSearch) sharedPlan = altSearch;
        }

        if (!sharedPlan) {
          Alert.alert('Error', t('notifications.planNotFound'));
          return;
        }

        const nutritionReceiverId = sharedPlan?.receiver_id || user.id;

        setConfirmView({
          active: true,
          type: 'nutrition',
          notification,
          sharedId: sharedPlan?.id,
          receiverId: nutritionReceiverId,
          isLoading: false,
        });
      }
    } catch (error: any) {
      console.error('Error accepting plan:', error);
      Alert.alert('Error', t('notifications.processError'));
    }
  };
  
  // Procesar aceptación del plan
  const processAcceptPlan = async (activate: boolean) => {
    if (!confirmView.sharedId || !confirmView.receiverId || !confirmView.notification) return;
    
    setConfirmView(prev => ({ ...prev, isLoading: true }));
    
    try {
      let result;
      if (confirmView.type === 'workout') {
        result = await acceptSharedWorkout(confirmView.sharedId, confirmView.receiverId, activate);
      } else {
        result = await acceptSharedNutritionPlan(confirmView.sharedId, confirmView.receiverId, activate);
      }
      
      if (result.success) {
        markAsRead(confirmView.notification.id);
        loadNotifications(false);
        // Volver a la lista de notificaciones
        setConfirmView({
          active: false,
          type: null,
          notification: null,
          sharedId: null,
          receiverId: null,
          isLoading: false,
        });
      } else {
        Alert.alert('Error', result.error || t('notifications.acceptError'));
        setConfirmView(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error processing plan:', error);
      Alert.alert('Error', t('notifications.processError'));
      setConfirmView(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Rechazar plan compartido desde notificación
  const handleRejectPlan = async (notification: Notification) => {
    if (!user?.id || !notification.related_id) return;

    try {
      const type = notification.notification_type;
      const isWorkout = type === 'workout_plan_shared' || type === 'workout_plan';
      
      if (isWorkout) {
        let { data: sharedWorkout } = await supabase
          .from('shared_workouts')
          .select('*')
          .eq('workout_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sharedWorkout) {
          const { data: altSearch } = await supabase
            .from('shared_workouts')
            .select('*')
            .eq('workout_plan_id', notification.related_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (altSearch) sharedWorkout = altSearch;
        }

        if (!sharedWorkout) {
          Alert.alert('Error', t('notifications.planNotFound'));
          return;
        }

        const workoutReceiverId = sharedWorkout.receiver_id || user.id;

        setConfirmView({
          active: true,
          type: 'reject',
          notification,
          sharedId: sharedWorkout.id,
          receiverId: workoutReceiverId,
          isLoading: false,
        });
        
      } else {
        // Nutrition plan (type === 'nutrition_plan_shared' || type === 'nutrition_plan')
        let { data: sharedPlan } = await (supabase as any)
          .from('shared_nutrition_plans')
          .select('*')
          .eq('nutrition_plan_id', notification.related_id)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!sharedPlan) {
          const { data: altSearch } = await (supabase as any)
            .from('shared_nutrition_plans')
            .select('*')
            .eq('nutrition_plan_id', notification.related_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (altSearch) sharedPlan = altSearch;
        }

        if (!sharedPlan) {
          Alert.alert('Error', t('notifications.planNotFound'));
          return;
        }

        const nutritionReceiverId = sharedPlan?.receiver_id || user.id;

        setConfirmView({
          active: true,
          type: 'reject',
          notification,
          sharedId: sharedPlan?.id,
          receiverId: nutritionReceiverId,
          isLoading: false,
        });
      }
    } catch (error: any) {
      console.error('Error rejecting plan:', error);
      Alert.alert('Error', t('notifications.processError'));
    }
  };
  
  // Procesar rechazo del plan
  const processRejectPlan = async () => {
    if (!confirmView.sharedId || !confirmView.receiverId || !confirmView.notification) return;
    
    setConfirmView(prev => ({ ...prev, isLoading: true }));
    
    try {
      let result;
      const isWorkout = confirmView.notification.notification_type === 'workout_plan';
      
      if (isWorkout) {
        result = await rejectSharedWorkout(confirmView.sharedId, confirmView.receiverId);
      } else {
        result = await rejectSharedNutritionPlan(confirmView.sharedId, confirmView.receiverId);
      }
      
      if (result.success) {
        markAsRead(confirmView.notification.id);
        loadNotifications(false);
        setConfirmView({
          active: false,
          type: null,
          notification: null,
          sharedId: null,
          receiverId: null,
          isLoading: false,
        });
      } else {
        Alert.alert('Error', result.error || t('notifications.rejectError'));
        setConfirmView(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error rejecting plan:', error);
      Alert.alert('Error', t('notifications.processError'));
      setConfirmView(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Cancelar vista de confirmación
  const cancelConfirmView = () => {
    if (confirmView.isLoading) return;
    setConfirmView({
      active: false,
      type: null,
      notification: null,
      sharedId: null,
      receiverId: null,
      isLoading: false,
    });
  };

  // Formatear tiempo relativo
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.now') || 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Renderizar vista de confirmación
  const renderConfirmView = () => (
    <View style={styles.confirmViewContainer}>
      {/* Botón volver */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={cancelConfirmView}
        disabled={confirmView.isLoading}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
        <Text style={styles.backButtonText}>{t('common.back') ?? 'Volver'}</Text>
      </TouchableOpacity>

      <View style={styles.confirmContent}>
        {/* Icono */}
        <View style={[
          styles.confirmIconContainer,
          confirmView.type === 'reject' && styles.confirmIconContainerReject
        ]}>
          <Ionicons 
            name={confirmView.type === 'reject' ? 'warning' : confirmView.type === 'workout' ? 'barbell' : 'nutrition'} 
            size={56} 
            color={confirmView.type === 'reject' ? '#ff4444' : '#ffb300'} 
          />
        </View>
        
        {/* Título */}
        <Text style={styles.confirmTitle}>
          {confirmView.type === 'reject' 
            ? (t('notifications.rejectPlanTitle') || 'Rechazar plan')
            : confirmView.type === 'workout' 
              ? (t('notifications.acceptWorkoutTitle') || 'Plan de entrenamiento')
              : (t('notifications.acceptNutritionTitle') || 'Plan nutricional')
          }
        </Text>
        
        {/* Mensaje */}
        <Text style={styles.confirmMessage}>
          {confirmView.type === 'reject'
            ? (t('notifications.rejectPlanMessage') || '¿Estás seguro de que deseas rechazar este plan?')
            : (t('notifications.acceptPlanMessage') || '¿Deseas agregar este plan a tu biblioteca o también activarlo?')
          }
        </Text>
        
        {/* Info del remitente */}
        {confirmView.notification && (
          <View style={styles.confirmSenderInfo}>
            <Ionicons name="person" size={18} color="#ffb300" />
            <Text style={styles.confirmSenderText}>
              {confirmView.notification.sender_name}
            </Text>
          </View>
        )}
        
        {/* Botones */}
        {confirmView.type === 'reject' ? (
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={cancelConfirmView}
              disabled={confirmView.isLoading}
            >
              <Text style={styles.confirmCancelText}>{t('common.cancel') || 'Cancelar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmRejectButton, confirmView.isLoading && styles.buttonDisabled]}
              onPress={processRejectPlan}
              disabled={confirmView.isLoading}
            >
              {confirmView.isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.confirmRejectText}>{t('notifications.reject') || 'Rechazar'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.confirmButtonsVertical}>
            <TouchableOpacity
              style={[styles.confirmAcceptActivateButton, confirmView.isLoading && styles.buttonDisabled]}
              onPress={() => processAcceptPlan(true)}
              disabled={confirmView.isLoading}
            >
              {confirmView.isLoading ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#1a1a1a" />
                  <Text style={styles.confirmAcceptActivateText}>{t('notifications.acceptAndActivate') || 'Aceptar y activar'}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmAcceptOnlyButton, confirmView.isLoading && styles.buttonDisabled]}
              onPress={() => processAcceptPlan(false)}
              disabled={confirmView.isLoading}
            >
              <Ionicons name="checkmark" size={20} color="#ffb300" />
              <Text style={styles.confirmAcceptOnlyText}>{t('notifications.acceptOnly') || 'Solo agregar a mi biblioteca'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancelButtonFull}
              onPress={cancelConfirmView}
              disabled={confirmView.isLoading}
            >
              <Text style={styles.confirmCancelFullText}>{t('common.cancel') || 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // Determinar si una notificación puede mostrar botones de aceptar/rechazar
  const getNotificationActionState = (notification: Notification): {
    canShowButtons: boolean;
    statusText: string | null;
    statusType: 'accepted' | 'rejected' | null;
  } => {
    const type = notification.notification_type;
    
    // Notificaciones de respuesta (solo informativas, nunca muestran botones)
    if (type === 'workout_plan_accepted' || type === 'nutrition_plan_accepted') {
      return { canShowButtons: false, statusText: null, statusType: null };
    }
    if (type === 'workout_plan_rejected' || type === 'nutrition_plan_rejected') {
      return { canShowButtons: false, statusText: null, statusType: null };
    }
    
    // Notificaciones de compartido (pueden tener botones si está pendiente)
    const isShareNotification = 
      type === 'workout_plan_shared' || 
      type === 'nutrition_plan_shared' ||
      type === 'workout_plan' ||  // Legacy
      type === 'nutrition_plan';  // Legacy
    
    if (!isShareNotification) {
      return { canShowButtons: false, statusText: null, statusType: null };
    }
    
    // Verificar el estado del shared
    const sharedStatus = notification.shared_status;
    
    if (sharedStatus === 'pending') {
      return { canShowButtons: true, statusText: null, statusType: null };
    }
    
    if (sharedStatus === 'accepted' || sharedStatus === 'active') {
      return { 
        canShowButtons: false, 
        statusText: t('notifications.youAccepted') || 'Has aceptado este plan',
        statusType: 'accepted'
      };
    }
    
    if (sharedStatus === 'rejected') {
      return { 
        canShowButtons: false, 
        statusText: t('notifications.youRejected') || 'Has rechazado este plan',
        statusType: 'rejected'
      };
    }
    
    // Si no hay shared_status, probablemente la notificación es antigua o ya fue procesada
    return { canShowButtons: false, statusText: null, statusType: null };
  };

  // Renderizar lista de notificaciones
  const renderNotificationsList = () => (
    <>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>{t('notifications.loading') || 'Cargando notificaciones...'}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>{t('notifications.emptyTitle') || 'No tienes notificaciones'}</Text>
          <Text style={styles.emptySubtext}>{t('notifications.emptySubtext') || 'Aquí aparecerán tus notificaciones'}</Text>
        </View>
      ) : (
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {notifications.map((notification) => {
            const actionState = getNotificationActionState(notification);
            
            // Registrar como vista al renderizar
            registerAsViewed(notification.id);

            return (
              <View
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.is_read && styles.notificationUnread,
                ]}
              >
                <View style={styles.notificationContentWrapper}>
                  <View style={styles.notificationIcon}>
                    <Ionicons
                      name={notification.is_read ? "mail-open-outline" : "mail-unread-outline"}
                      size={24}
                      color={notification.is_read ? "#666" : "#ffb300"}
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
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {getRelativeTime(notification.created_at)}
                    </Text>
                  </View>
                </View>
                
                {/* Botones de aceptar/rechazar solo si el plan está pendiente */}
                {actionState.canShowButtons && (
                  <View style={styles.planActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptPlan(notification)}
                    >
                      <Ionicons name="checkmark" size={18} color="#ffffff" />
                      <Text style={styles.acceptButtonText}>{t('notifications.accept') || 'Aceptar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectPlan(notification)}
                    >
                      <Ionicons name="close" size={18} color="#ffffff" />
                      <Text style={styles.rejectButtonText}>{t('notifications.reject') || 'Rechazar'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Indicador de estado si ya se procesó */}
                {actionState.statusText && (
                  <View style={[
                    styles.statusIndicator,
                    actionState.statusType === 'accepted' && styles.statusIndicatorAccepted,
                    actionState.statusType === 'rejected' && styles.statusIndicatorRejected,
                  ]}>
                    <Ionicons 
                      name={actionState.statusType === 'accepted' ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={actionState.statusType === 'accepted' ? "#4CAF50" : "#ff4444"} 
                    />
                    <Text style={[
                      styles.statusText,
                      actionState.statusType === 'accepted' && styles.statusTextAccepted,
                      actionState.statusType === 'rejected' && styles.statusTextRejected,
                    ]}>
                      {actionState.statusText}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </>
  );

  return (
    <>
      {/* Botón de Notificaciones */}
      <TouchableOpacity onPress={openModal} style={styles.bellButton}>
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
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔔 {t('notifications.title') || 'Notificaciones'}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Contenido condicional: Lista o Confirmación */}
            {confirmView.active ? renderConfirmView() : renderNotificationsList()}
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
    height: '80%',
    borderTopWidth: 2,
    borderTopColor: '#ffb300',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
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
    flex: 1,
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
    flexDirection: 'column',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  notificationUnread: {
    backgroundColor: 'rgba(255, 179, 0, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#ffb300',
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
    color: '#ffb300',
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
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Estilos de la vista de confirmación
  confirmViewContainer: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  confirmIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  confirmIconContainerReject: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  confirmSenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.2)',
  },
  confirmSenderText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButtonsVertical: {
    width: '100%',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  confirmCancelText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmRejectButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmRejectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmAcceptActivateButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmAcceptActivateText: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: 'bold',
  },
  confirmAcceptOnlyButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#ffb300',
  },
  confirmAcceptOnlyText: {
    color: '#ffb300',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmCancelButtonFull: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelFullText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Estilos para el indicador de estado
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusIndicatorAccepted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusIndicatorRejected: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
  },
  statusText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  statusTextAccepted: {
    color: '#4CAF50',
  },
  statusTextRejected: {
    color: '#ff4444',
  },
});
