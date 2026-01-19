import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';

interface DayConfig {
  id: string;
  dbId?: string;
  dayNumber: number;
  dayName: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

interface WeekConfig {
  id: string;
  dbId?: string;
  weekNumber: number;
  days: DayConfig[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const DEFAULT_MACROS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 70,
};

const DAY_NAMES = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

export default function EditPlanScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const params = useLocalSearchParams();
  const planId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [weeks, setWeeks] = useState<WeekConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<DayConfig | null>(null);
  const [dayForm, setDayForm] = useState({
    dayName: '',
    targetCalories: DEFAULT_MACROS.calories.toString(),
    targetProtein: DEFAULT_MACROS.protein.toString(),
    targetCarbs: DEFAULT_MACROS.carbs.toString(),
    targetFat: DEFAULT_MACROS.fat.toString(),
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      // Cargar plan
      const { data: planData, error: planError } = await (supabase as any)
        .from('nutrition_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      setPlanName(planData.plan_name || '');
      setPlanDescription(planData.description || '');

      // Cargar semanas
      const { data: weeksData, error: weeksError } = await (supabase as any)
        .from('nutrition_plan_weeks')
        .select('*')
        .eq('plan_id', planId)
        .order('week_number');

      if (weeksError) throw weeksError;

      const loadedWeeks: WeekConfig[] = [];

      for (const week of weeksData || []) {
        // Cargar días de cada semana
        const { data: daysData, error: daysError } = await (supabase as any)
          .from('nutrition_plan_days')
          .select('*')
          .eq('week_id', week.id)
          .order('day_number');

        if (daysError) throw daysError;

        loadedWeeks.push({
          id: generateId(),
          dbId: week.id,
          weekNumber: week.week_number,
          days: (daysData || []).map((day: any) => ({
            id: generateId(),
            dbId: day.id,
            dayNumber: day.day_number,
            dayName: day.day_name || `Día ${day.day_number}`,
            targetCalories: day.target_calories || 2000,
            targetProtein: day.target_protein || 150,
            targetCarbs: day.target_carbs || 200,
            targetFat: day.target_fat || 70,
          })),
        });
      }

      if (loadedWeeks.length === 0) {
        loadedWeeks.push({
          id: generateId(),
          weekNumber: 1,
          days: [],
        });
      }

      setWeeks(loadedWeeks);
    } catch (err) {
      console.error('Error loading plan:', err);
      Alert.alert(t('common.error'), t('plansLibrary.loadError'));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addWeek = () => {
    const newWeek: WeekConfig = {
      id: generateId(),
      weekNumber: weeks.length + 1,
      days: [],
    };
    setWeeks([...weeks, newWeek]);
  };

  const removeWeek = (weekId: string) => {
    if (weeks.length <= 1) {
      Alert.alert(t('common.error'), t('customPlanSetup.atLeastOneWeek'));
      return;
    }
    
    Alert.alert(
      t('customPlanSetup.removeWeek'),
      t('customPlanSetup.removeWeekConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const updatedWeeks = weeks
              .filter(w => w.id !== weekId)
              .map((w, idx) => ({ ...w, weekNumber: idx + 1 }));
            setWeeks(updatedWeeks);
          },
        },
      ]
    );
  };

  const duplicateWeek = (week: WeekConfig) => {
    const newWeek: WeekConfig = {
      id: generateId(),
      weekNumber: weeks.length + 1,
      days: week.days.map(d => ({
        ...d,
        id: generateId(),
        dbId: undefined,
      })),
    };
    setWeeks([...weeks, newWeek]);
  };

  const openAddDayModal = (weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;

    const nextDayNumber = week.days.length + 1;
    const dayName = DAY_NAMES[(nextDayNumber - 1) % 7] || `Día ${nextDayNumber}`;

    setCurrentWeekId(weekId);
    setEditingDay(null);
    setDayForm({
      dayName,
      targetCalories: DEFAULT_MACROS.calories.toString(),
      targetProtein: DEFAULT_MACROS.protein.toString(),
      targetCarbs: DEFAULT_MACROS.carbs.toString(),
      targetFat: DEFAULT_MACROS.fat.toString(),
    });
    setShowDayModal(true);
  };

  const openEditDayModal = (weekId: string, day: DayConfig) => {
    setCurrentWeekId(weekId);
    setEditingDay(day);
    setDayForm({
      dayName: day.dayName,
      targetCalories: day.targetCalories.toString(),
      targetProtein: day.targetProtein.toString(),
      targetCarbs: day.targetCarbs.toString(),
      targetFat: day.targetFat.toString(),
    });
    setShowDayModal(true);
  };

  const saveDayConfig = () => {
    if (!currentWeekId) return;

    const calories = parseInt(dayForm.targetCalories) || 0;
    const protein = parseInt(dayForm.targetProtein) || 0;
    const carbs = parseInt(dayForm.targetCarbs) || 0;
    const fat = parseInt(dayForm.targetFat) || 0;

    if (calories === 0) {
      Alert.alert(t('common.error'), t('customPlanSetup.enterCalories'));
      return;
    }

    setWeeks(prevWeeks =>
      prevWeeks.map(week => {
        if (week.id !== currentWeekId) return week;

        if (editingDay) {
          return {
            ...week,
            days: week.days.map(d =>
              d.id === editingDay.id
                ? {
                    ...d,
                    dayName: dayForm.dayName || d.dayName,
                    targetCalories: calories,
                    targetProtein: protein,
                    targetCarbs: carbs,
                    targetFat: fat,
                  }
                : d
            ),
          };
        } else {
          const newDay: DayConfig = {
            id: generateId(),
            dayNumber: week.days.length + 1,
            dayName: dayForm.dayName || `Día ${week.days.length + 1}`,
            targetCalories: calories,
            targetProtein: protein,
            targetCarbs: carbs,
            targetFat: fat,
          };
          return { ...week, days: [...week.days, newDay] };
        }
      })
    );

    setShowDayModal(false);
    setEditingDay(null);
  };

  const removeDay = (weekId: string, dayId: string) => {
    Alert.alert(
      t('customPlanSetup.removeDay'),
      t('customPlanSetup.removeDayConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            setWeeks(prevWeeks =>
              prevWeeks.map(week => {
                if (week.id !== weekId) return week;
                return {
                  ...week,
                  days: week.days
                    .filter(d => d.id !== dayId)
                    .map((d, idx) => ({ ...d, dayNumber: idx + 1 })),
                };
              })
            );
          },
        },
      ]
    );
  };

  const duplicateDay = (weekId: string, day: DayConfig) => {
    setWeeks(prevWeeks =>
      prevWeeks.map(week => {
        if (week.id !== weekId) return week;
        const newDay: DayConfig = {
          ...day,
          id: generateId(),
          dbId: undefined,
          dayNumber: week.days.length + 1,
          dayName: `${day.dayName} (copia)`,
        };
        return { ...week, days: [...week.days, newDay] };
      })
    );
  };

  const navigateToEditDay = (weekId: string, day: DayConfig) => {
    router.push({
      pathname: '/(tabs)/nutrition/edit-day' as any,
      params: {
        weekId,
        dayId: day.id,
        dayName: day.dayName,
        targetCalories: day.targetCalories.toString(),
        targetProtein: day.targetProtein.toString(),
        targetCarbs: day.targetCarbs.toString(),
        targetFat: day.targetFat.toString(),
        isNewPlan: 'false',
        planId,
        dbDayId: day.dbId || '',
      },
    });
  };

  const validatePlan = (): boolean => {
    if (!planName.trim()) {
      Alert.alert(t('common.error'), t('customPlanSetup.enterPlanName'));
      return false;
    }

    const hasAtLeastOneDay = weeks.some(w => w.days.length > 0);
    if (!hasAtLeastOneDay) {
      Alert.alert(t('common.error'), t('customPlanSetup.addAtLeastOneDay'));
      return false;
    }

    return true;
  };

  const savePlan = async () => {
    if (!user?.id || !planId || !validatePlan()) return;

    setSaving(true);
    try {
      // Actualizar el plan básico
      const { error: planError } = await (supabase as any)
        .from('nutrition_plans')
        .update({
          plan_name: planName.trim(),
          description: planDescription.trim() || null,
          total_weeks: weeks.length,
        })
        .eq('id', planId);

      if (planError) throw planError;

      // Obtener semanas existentes
      const { data: existingWeeks } = await (supabase as any)
        .from('nutrition_plan_weeks')
        .select('id, week_number')
        .eq('plan_id', planId);

      const existingWeekIds = new Set((existingWeeks || []).map((w: any) => w.id));
      const weeksToKeep = new Set<string>();

      // Procesar semanas
      for (const week of weeks) {
        let weekDbId = week.dbId;

        if (weekDbId && existingWeekIds.has(weekDbId)) {
          // Actualizar semana existente
          await (supabase as any)
            .from('nutrition_plan_weeks')
            .update({ week_number: week.weekNumber })
            .eq('id', weekDbId);
          weeksToKeep.add(weekDbId);
        } else {
          // Crear nueva semana
          const { data: newWeek, error: weekError } = await (supabase as any)
            .from('nutrition_plan_weeks')
            .insert({
              plan_id: planId,
              week_number: week.weekNumber,
            })
            .select()
            .single();

          if (weekError) throw weekError;
          weekDbId = newWeek.id;
          weeksToKeep.add(weekDbId);
        }

        // Obtener días existentes de esta semana
        const { data: existingDays } = await (supabase as any)
          .from('nutrition_plan_days')
          .select('id, day_number')
          .eq('week_id', weekDbId);

        const existingDayIds = new Set((existingDays || []).map((d: any) => d.id));
        const daysToKeep = new Set<string>();

        // Procesar días
        for (const day of week.days) {
          if (day.dbId && existingDayIds.has(day.dbId)) {
            // Actualizar día existente (sin tocar las comidas)
            await (supabase as any)
              .from('nutrition_plan_days')
              .update({
                day_number: day.dayNumber,
                day_name: day.dayName,
                target_calories: day.targetCalories,
                target_protein: day.targetProtein,
                target_carbs: day.targetCarbs,
                target_fat: day.targetFat,
              })
              .eq('id', day.dbId);
            daysToKeep.add(day.dbId);
          } else {
            // Crear nuevo día
            const { data: newDay, error: dayError } = await (supabase as any)
              .from('nutrition_plan_days')
              .insert({
                week_id: weekDbId,
                day_number: day.dayNumber,
                day_name: day.dayName,
                target_calories: day.targetCalories,
                target_protein: day.targetProtein,
                target_carbs: day.targetCarbs,
                target_fat: day.targetFat,
              })
              .select()
              .single();

            if (dayError) throw dayError;
            daysToKeep.add(newDay.id);
          }
        }

        // Eliminar días que ya no existen
        for (const existingDay of existingDays || []) {
          if (!daysToKeep.has(existingDay.id)) {
            await (supabase as any)
              .from('nutrition_plan_days')
              .delete()
              .eq('id', existingDay.id);
          }
        }
      }

      // Eliminar semanas que ya no existen
      for (const existingWeek of existingWeeks || []) {
        if (!weeksToKeep.has(existingWeek.id)) {
          await (supabase as any)
            .from('nutrition_plan_weeks')
            .delete()
            .eq('id', existingWeek.id);
        }
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error saving plan:', err);
      Alert.alert(t('common.error'), t('customPlanSetup.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderDayCard = (week: WeekConfig, day: DayConfig) => (
    <TouchableOpacity
      key={day.id}
      style={styles.dayCard}
      onPress={() => navigateToEditDay(week.id, day)}
    >
      <View style={styles.dayCardHeader}>
        <View style={styles.dayCardTitleRow}>
          <View style={styles.dayNumberBadge}>
            <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
          </View>
          <Text style={styles.dayCardName}>{day.dayName}</Text>
        </View>
        <View style={styles.dayCardActions}>
          <TouchableOpacity
            style={styles.dayAction}
            onPress={() => openEditDayModal(week.id, day)}
          >
            <Ionicons name="settings-outline" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dayAction}
            onPress={() => duplicateDay(week.id, day)}
          >
            <Ionicons name="copy-outline" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dayAction}
            onPress={() => removeDay(week.id, day.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.macrosRow}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{day.targetCalories}</Text>
          <Text style={styles.macroLabel}>kcal</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: '#4CAF50' }]}>{day.targetProtein}g</Text>
          <Text style={styles.macroLabel}>{t('nutrition.protein')}</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: '#2196F3' }]}>{day.targetCarbs}g</Text>
          <Text style={styles.macroLabel}>{t('nutrition.carbs')}</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: '#FF9800' }]}>{day.targetFat}g</Text>
          <Text style={styles.macroLabel}>{t('nutrition.fats')}</Text>
        </View>
      </View>

      <View style={styles.tapToEditHint}>
        <Ionicons name="restaurant-outline" size={14} color="#666" />
        <Text style={styles.tapToEditText}>{t('customPlanSetup.tapToAddMeals')}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderWeekCard = (week: WeekConfig) => (
    <View key={week.id} style={styles.weekCard}>
      <View style={styles.weekHeader}>
        <View style={styles.weekTitleRow}>
          <Ionicons name="calendar" size={20} color="#ffb300" />
          <Text style={styles.weekTitle}>
            {t('customPlanSetup.week')} {week.weekNumber}
          </Text>
        </View>
        <View style={styles.weekActions}>
          <TouchableOpacity
            style={styles.weekAction}
            onPress={() => duplicateWeek(week)}
          >
            <Ionicons name="copy-outline" size={18} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.weekAction}
            onPress={() => removeWeek(week.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.daysContainer}>
        {week.days.length === 0 ? (
          <Text style={styles.emptyDaysText}>{t('customPlanSetup.noDaysYet')}</Text>
        ) : (
          week.days.map(day => renderDayCard(week, day))
        )}
      </View>

      <TouchableOpacity
        style={styles.addDayButton}
        onPress={() => openAddDayModal(week.id)}
      >
        <Ionicons name="add" size={20} color="#ffb300" />
        <Text style={styles.addDayButtonText}>{t('customPlanSetup.addDay')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>{t('plansLibrary.editPlan')}</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePlan}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Información del plan */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('customPlanSetup.planInfo')}</Text>
              <TextInput
                style={styles.input}
                value={planName}
                onChangeText={setPlanName}
                placeholder={t('customPlanSetup.planNamePlaceholder')}
                placeholderTextColor="#666"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={planDescription}
                onChangeText={setPlanDescription}
                placeholder={t('customPlanSetup.planDescriptionPlaceholder')}
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Semanas */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('customPlanSetup.weeks')}</Text>
                <TouchableOpacity style={styles.addWeekButton} onPress={addWeek}>
                  <Ionicons name="add-circle" size={24} color="#ffb300" />
                </TouchableOpacity>
              </View>

              {weeks.map(renderWeekCard)}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal para configurar día */}
        <Modal
          visible={showDayModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%' }}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingDay ? t('customPlanSetup.editDay') : t('customPlanSetup.newDay')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDayModal(false)}>
                    <Ionicons name="close" size={24} color="#888" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.inputLabel}>{t('customPlanSetup.dayName')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={dayForm.dayName}
                    onChangeText={(v) => setDayForm({ ...dayForm, dayName: v })}
                    placeholder={t('customPlanSetup.dayNamePlaceholder')}
                    placeholderTextColor="#666"
                  />

                  <Text style={styles.inputLabel}>{t('customPlanSetup.dailyTargets')}</Text>
                  
                  <View style={styles.macroInputRow}>
                    <View style={styles.macroInputItem}>
                      <Text style={styles.macroInputLabel}>🔥 Kcal</Text>
                      <TextInput
                        style={styles.macroInput}
                        value={dayForm.targetCalories}
                        onChangeText={(v) => setDayForm({ ...dayForm, targetCalories: v })}
                        keyboardType="numeric"
                        placeholder="2000"
                        placeholderTextColor="#444"
                      />
                    </View>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: '#4CAF50' }]}>
                        {t('nutrition.protein')} (g)
                      </Text>
                      <TextInput
                        style={[styles.macroInput, { borderColor: '#4CAF50' }]}
                        value={dayForm.targetProtein}
                        onChangeText={(v) => setDayForm({ ...dayForm, targetProtein: v })}
                        keyboardType="numeric"
                        placeholder="150"
                        placeholderTextColor="#444"
                      />
                    </View>
                  </View>

                  <View style={styles.macroInputRow}>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: '#2196F3' }]}>
                        {t('nutrition.carbs')} (g)
                      </Text>
                      <TextInput
                        style={[styles.macroInput, { borderColor: '#2196F3' }]}
                        value={dayForm.targetCarbs}
                        onChangeText={(v) => setDayForm({ ...dayForm, targetCarbs: v })}
                        keyboardType="numeric"
                        placeholder="200"
                        placeholderTextColor="#444"
                      />
                    </View>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: '#FF9800' }]}>
                        {t('nutrition.fats')} (g)
                      </Text>
                      <TextInput
                        style={[styles.macroInput, { borderColor: '#FF9800' }]}
                        value={dayForm.targetFat}
                        onChangeText={(v) => setDayForm({ ...dayForm, targetFat: v })}
                        keyboardType="numeric"
                        placeholder="70"
                        placeholderTextColor="#444"
                      />
                    </View>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={saveDayConfig}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {editingDay ? t('common.save') : t('customPlanSetup.addDay')}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Modal de éxito */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
              </View>
              <Text style={styles.successModalTitle}>{t('common.success')}</Text>
              <Text style={styles.successModalSubtitle}>{t('plansLibrary.planUpdated')}</Text>
              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(tabs)/nutrition/plans-library' as any);
                }}
              >
                <Text style={styles.successModalButtonText}>{t('common.ok')}</Text>
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
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
  saveButton: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
    marginBottom: 12,
  },
  addWeekButton: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  weekCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  weekActions: {
    flexDirection: 'row',
    gap: 12,
  },
  weekAction: {
    padding: 6,
  },
  daysContainer: {
    gap: 12,
  },
  emptyDaysText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  dayCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  dayCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dayCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dayAction: {
    padding: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffb300',
  },
  macroLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  tapToEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  tapToEditText: {
    fontSize: 12,
    color: '#666',
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
  },
  addDayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffb300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalScroll: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  macroInputItem: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
  },
  macroInput: {
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: '#ffb300',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  successModalSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28,
  },
  successModalButton: {
    backgroundColor: '#ffb300',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 150,
    alignItems: 'center',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
