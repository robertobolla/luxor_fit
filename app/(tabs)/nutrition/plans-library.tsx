import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';
import { getFriends } from '@/services/friendsService';
import { shareNutritionPlan } from '@/services/sharedNutritionService';
import { FriendSelectionModal } from '@/components/CustomModal';

interface NutritionPlan {
  id: string;
  plan_name: string;
  description: string | null;
  is_active: boolean;
  is_ai_generated: boolean;
  total_weeks: number;
  created_at: string;
  updated_at: string;
}

export default function PlansLibraryScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Estados para compartir
  const [showShareModal, setShowShareModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  // Estados para modal de mensaje
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onClose?: () => void;
  } | null>(null);

  // Estados para modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
    setMessageModalData({ type, title, message, onClose });
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    if (messageModalData?.onClose) {
      messageModalData.onClose();
    }
    setMessageModalData(null);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText?: string, confirmColor?: string) => {
    setConfirmModalData({ title, message, onConfirm, confirmText, confirmColor });
    setShowConfirmModal(true);
  };

  const loadPlans = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPlans((data as NutritionPlan[]) || []);
    } catch (err) {
      console.error('Error loading plans:', err);
      showMessage('error', t('common.error'), t('plansLibrary.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [user?.id])
  );

  const handleActivatePlan = async () => {
    if (!selectedPlan || !user?.id) return;

    setActivating(true);
    try {
      // Desactivar todos los planes del usuario
      await (supabase as any)
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Activar el plan seleccionado
      const { error } = await (supabase as any)
        .from('nutrition_plans')
        .update({ is_active: true })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      showMessage(
        'success',
        t('plansLibrary.planActivated'),
        t('plansLibrary.planActivatedMessage', { name: selectedPlan.plan_name })
      );
      setShowOptionsModal(false);
      loadPlans();
    } catch (err) {
      console.error('Error activating plan:', err);
      showMessage('error', t('common.error'), t('plansLibrary.activateError'));
    } finally {
      setActivating(false);
    }
  };

  const handleDeletePlan = () => {
    if (!selectedPlan) return;

    showConfirm(
      t('plansLibrary.deletePlan'),
      t('plansLibrary.deleteConfirmation', { name: selectedPlan.plan_name }),
      async () => {
        setShowConfirmModal(false);
        setDeleting(true);
        try {
          const { error } = await (supabase as any)
            .from('nutrition_plans')
            .delete()
            .eq('id', selectedPlan.id);

          if (error) throw error;

          showMessage('success', t('common.success'), t('plansLibrary.planDeleted'));
          setShowOptionsModal(false);
          loadPlans();
        } catch (err) {
          console.error('Error deleting plan:', err);
          showMessage('error', t('common.error'), t('plansLibrary.deleteError'));
        } finally {
          setDeleting(false);
        }
      },
      t('common.delete'),
      '#f44336'
    );
  };

  const handleDuplicatePlan = async () => {
    if (!selectedPlan || !user?.id) return;

    try {
      // Obtener los detalles completos del plan
      const { data: planData, error: planError } = await (supabase as any)
        .from('nutrition_plans')
        .select(`
          *,
          nutrition_plan_weeks (
            *,
            nutrition_plan_days (
              *,
              nutrition_plan_meals (
                *,
                nutrition_plan_meal_foods (*)
              )
            )
          )
        `)
        .eq('id', selectedPlan.id)
        .single();

      if (planError) throw planError;

      // Crear nuevo plan
      const { data: newPlan, error: newPlanError } = await (supabase as any)
        .from('nutrition_plans')
        .insert({
          user_id: user.id,
          plan_name: `${planData.plan_name} (${t('common.copy')})`,
          description: planData.description,
          is_active: false,
          is_ai_generated: false,
          total_weeks: planData.total_weeks,
        })
        .select()
        .single();

      if (newPlanError) throw newPlanError;

      // Duplicar semanas, días, comidas y alimentos
      for (const week of planData.nutrition_plan_weeks || []) {
        const { data: newWeek, error: weekError } = await (supabase as any)
          .from('nutrition_plan_weeks')
          .insert({
            plan_id: newPlan.id,
            week_number: week.week_number,
          })
          .select()
          .single();

        if (weekError) throw weekError;

        for (const day of week.nutrition_plan_days || []) {
          const { data: newDay, error: dayError } = await (supabase as any)
            .from('nutrition_plan_days')
            .insert({
              week_id: newWeek.id,
              day_number: day.day_number,
              day_name: day.day_name,
              target_calories: day.target_calories,
              target_protein: day.target_protein,
              target_carbs: day.target_carbs,
              target_fat: day.target_fat,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          for (const meal of day.nutrition_plan_meals || []) {
            const { data: newMeal, error: mealError } = await (supabase as any)
              .from('nutrition_plan_meals')
              .insert({
                day_id: newDay.id,
                meal_order: meal.meal_order,
                meal_name: meal.meal_name,
              })
              .select()
              .single();

            if (mealError) throw mealError;

            for (const food of meal.nutrition_plan_meal_foods || []) {
              await (supabase as any)
                .from('nutrition_plan_meal_foods')
                .insert({
                  meal_id: newMeal.id,
                  food_id: food.food_id,
                  quantity: food.quantity,
                  quantity_unit: food.quantity_unit,
                  calculated_calories: food.calculated_calories,
                  calculated_protein: food.calculated_protein,
                  calculated_carbs: food.calculated_carbs,
                  calculated_fat: food.calculated_fat,
                });
            }
          }
        }
      }

      showMessage('success', t('common.success'), t('plansLibrary.planDuplicated'));
      setShowOptionsModal(false);
      loadPlans();
    } catch (err) {
      console.error('Error duplicating plan:', err);
      showMessage('error', t('common.error'), t('plansLibrary.duplicateError'));
    }
  };

  const handleSharePlan = async () => {
    if (!selectedPlan || !user?.id) return;

    setIsLoadingFriends(true);
    setShowOptionsModal(false);

    try {
      interface FriendsResult {
        success: boolean;
        data?: any[];
        error?: string;
      }
      
      const friendsResult = (await getFriends(user.id)) as FriendsResult;

      if (friendsResult.success && friendsResult.data && friendsResult.data.length > 0) {
        setFriends(friendsResult.data);
        setShowShareModal(true);
      } else {
        showMessage('info', t('common.info'), t('plansLibrary.noFriendsError'));
      }
    } catch (err) {
      console.error('Error loading friends:', err);
      showMessage('error', t('common.error'), t('common.errorOccurred'));
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleSelectFriend = async (friendId: string) => {
    if (!selectedPlan || !user?.id) return;

    try {
      const result = await shareNutritionPlan(user.id, friendId, selectedPlan.id);
      
      if (result.success) {
        setShowShareModal(false);
        showMessage('success', t('plansLibrary.planSharedSuccess'), t('plansLibrary.planSharedMessage'));
      } else {
        showMessage('error', t('common.error'), result.error || t('plansLibrary.shareError'));
      }
    } catch (err) {
      console.error('Error sharing plan:', err);
      showMessage('error', t('common.error'), t('plansLibrary.shareError'));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderPlanCard = (plan: NutritionPlan) => (
    <TouchableOpacity
      key={plan.id}
      style={[styles.planCard, plan.is_active && styles.activePlanCard]}
      onPress={() => router.push(`/(tabs)/nutrition/plan-detail?id=${plan.id}` as any)}
      onLongPress={() => {
        setSelectedPlan(plan);
        setShowOptionsModal(true);
      }}
    >
      {/* Badges en la esquina superior izquierda */}
      <View style={styles.badgesRow}>
        {plan.is_active && (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#ffb300" />
            <Text style={styles.activeBadgeText}>{t('plansLibrary.active')}</Text>
          </View>
        )}
        {plan.is_ai_generated && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#9C27B0" />
            <Text style={styles.aiBadgeText}>IA</Text>
          </View>
        )}
      </View>

      <View style={styles.planCardHeader}>
        <Text style={styles.planCardName} numberOfLines={1}>
          {plan.plan_name}
        </Text>
      </View>

      {plan.description && (
        <Text style={styles.planCardDescription} numberOfLines={2}>
          {plan.description}
        </Text>
      )}

      <View style={styles.planCardFooter}>
        <View style={styles.planCardStat}>
          <Ionicons name="calendar-outline" size={14} color="#888" />
          <Text style={styles.planCardStatText}>
            {plan.total_weeks} {t('plansLibrary.weeks')}
          </Text>
        </View>
        <Text style={styles.planCardDate}>
          {formatDate(plan.updated_at)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.optionsButton}
        onPress={() => {
          setSelectedPlan(plan);
          setShowOptionsModal(true);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#888" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('plansLibrary.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={80} color="#444" />
          <Text style={styles.emptyTitle}>{t('plansLibrary.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('plansLibrary.emptySubtitle')}</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/nutrition/custom-plan-setup' as any)}
          >
            <Ionicons name="add" size={20} color="#000" />
            <Text style={styles.createButtonText}>{t('plansLibrary.createPlan')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {plans.map(renderPlanCard)}
        </ScrollView>
      )}

      {/* Botón flotante para crear plan */}
      {plans.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/nutrition/custom-plan-setup' as any)}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      )}

      {/* Modal de opciones */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedPlan?.plan_name}
              </Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                router.push(`/(tabs)/nutrition/plan-detail?id=${selectedPlan?.id}` as any);
              }}
            >
              <Ionicons name="eye-outline" size={22} color="#fff" />
              <Text style={styles.modalOptionText}>{t('plansLibrary.viewPlan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                router.push(`/(tabs)/nutrition/edit-plan?id=${selectedPlan?.id}` as any);
              }}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
              <Text style={styles.modalOptionText}>{t('plansLibrary.editPlan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleDuplicatePlan}
            >
              <Ionicons name="copy-outline" size={22} color="#fff" />
              <Text style={styles.modalOptionText}>{t('plansLibrary.duplicatePlan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleSharePlan}
              disabled={isLoadingFriends}
            >
              {isLoadingFriends ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Ionicons name="send-outline" size={22} color="#2196F3" />
              )}
              <Text style={[styles.modalOptionText, { color: '#2196F3' }]}>
                {t('plansLibrary.sharePlan')}
              </Text>
            </TouchableOpacity>

            {!selectedPlan?.is_active && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleActivatePlan}
                disabled={activating}
              >
                {activating ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={22} color="#4CAF50" />
                )}
                <Text style={[styles.modalOptionText, { color: '#4CAF50' }]}>
                  {t('plansLibrary.activatePlan')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleDeletePlan}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#f44336" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#f44336" />
              )}
              <Text style={[styles.modalOptionText, { color: '#f44336' }]}>
                {t('plansLibrary.deletePlan')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de selección de amigo para compartir */}
      <FriendSelectionModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        friends={friends}
        onSelectFriend={handleSelectFriend}
        title={`${t('plansLibrary.sharePlan')} "${selectedPlan?.plan_name || ''}"`}
      />

      {/* Modal de mensaje */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="fade"
        onRequestClose={closeMessageModal}
      >
        <View style={styles.messageModalOverlay}>
          <View style={styles.messageModalContent}>
            <View style={styles.messageModalIcon}>
              <Ionicons 
                name={
                  messageModalData?.type === 'success' ? 'checkmark-circle' : 
                  messageModalData?.type === 'error' ? 'alert-circle' : 'information-circle'
                } 
                size={60} 
                color={
                  messageModalData?.type === 'success' ? '#4CAF50' : 
                  messageModalData?.type === 'error' ? '#f44336' : '#ffb300'
                } 
              />
            </View>
            <Text style={styles.messageModalTitle}>{messageModalData?.title}</Text>
            <Text style={styles.messageModalText}>{messageModalData?.message}</Text>
            <TouchableOpacity
              style={styles.messageModalButton}
              onPress={closeMessageModal}
            >
              <Text style={styles.messageModalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.messageModalOverlay}>
          <View style={styles.messageModalContent}>
            <View style={styles.messageModalIcon}>
              <Ionicons name="help-circle" size={60} color="#ffb300" />
            </View>
            <Text style={styles.messageModalTitle}>{confirmModalData?.title}</Text>
            <Text style={styles.messageModalText}>{confirmModalData?.message}</Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmActionButton,
                  confirmModalData?.confirmColor ? { backgroundColor: confirmModalData.confirmColor } : {}
                ]}
                onPress={() => confirmModalData?.onConfirm?.()}
              >
                <Text style={styles.confirmActionButtonText}>
                  {confirmModalData?.confirmText || t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  planCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  activePlanCard: {
    borderColor: '#ffb300',
    borderWidth: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 30,
  },
  planCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffb300',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9C27B0',
  },
  planCardDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    lineHeight: 18,
  },
  planCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planCardStatText: {
    fontSize: 12,
    color: '#888',
  },
  planCardDate: {
    fontSize: 12,
    color: '#666',
  },
  optionsButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  // Estilos para modal de mensaje
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    maxWidth: 340,
  },
  messageModalIcon: {
    marginBottom: 20,
  },
  messageModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageModalText: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  messageModalButton: {
    backgroundColor: '#ffb300',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    minWidth: 150,
    alignItems: 'center',
  },
  messageModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  // Estilos para modal de confirmación
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  confirmCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  confirmActionButton: {
    flex: 1,
    backgroundColor: '#ffb300',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
