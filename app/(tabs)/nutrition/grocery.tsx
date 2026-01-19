// ============================================================================
// GROCERY LIST SCREEN
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmptyState } from '../../../src/components/EmptyStates';
import { getFriendlyErrorMessage } from '../../../src/utils/errorMessages';

interface GroceryItem {
  food_id: string;
  food_name: string;
  grams: number;
  checked: boolean;
}

const GROCERY_STORAGE_KEY = 'grocery_checked_items';

export default function GroceryListScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [storageKey, setStorageKey] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      loadGroceryList();
    }
  }, [user]);

  // NO recargar en focus para mantener el estado guardado
  // Solo cargar al montar el componente

  // Guardar items seleccionados cuando cambien
  useEffect(() => {
    if (storageKey && groceryList.length > 0) {
      saveCheckedItems();
    }
  }, [groceryList]);

  const saveCheckedItems = async () => {
    try {
      const checkedIds = groceryList
        .filter(item => item.checked)
        .map(item => item.food_id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(checkedIds));
    } catch (err) {
      console.error('Error saving checked items:', err);
    }
  };

  const loadCheckedItems = async (key: string): Promise<string[]> => {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading checked items:', err);
      return [];
    }
  };

  const loadGroceryList = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Obtener el plan activo del nuevo sistema (nutrition_plans)
      const { data: activePlan, error: planError } = await supabase
        .from('nutrition_plans')
        .select(`
          id,
          current_week_number,
          nutrition_plan_weeks (
            id,
            week_number,
            nutrition_plan_days (
              id,
              nutrition_plan_meals (
                id,
                nutrition_plan_meal_foods (
                  quantity,
                  quantity_unit,
                  foods (
                    id,
                    name_es,
                    name_en
                  )
                )
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (planError) throw planError;

      if (!activePlan) {
        setGroceryList([]);
        return;
      }

      // Crear clave única para el almacenamiento
      const currentWeekNumber = activePlan.current_week_number || 1;
      const key = `${GROCERY_STORAGE_KEY}_${activePlan.id}_${currentWeekNumber}`;
      setStorageKey(key);

      // Cargar items previamente seleccionados
      const checkedIds = await loadCheckedItems(key);

      // Obtener la semana actual del plan
      const weeks = activePlan.nutrition_plan_weeks || [];
      const currentWeek = weeks.find((w: any) => w.week_number === currentWeekNumber) || weeks[0];

      if (!currentWeek) {
        setGroceryList([]);
        return;
      }

      // Agregar todos los alimentos de la semana
      const foodMap: Record<string, { name: string; grams: number }> = {};
      const lang = i18n.language;

      for (const day of currentWeek.nutrition_plan_days || []) {
        for (const meal of day.nutrition_plan_meals || []) {
          for (const mealFood of meal.nutrition_plan_meal_foods || []) {
            const food = mealFood.foods;
            if (!food) continue;

            const foodName = lang === 'es' ? food.name_es : (food.name_en || food.name_es);
            const quantity = mealFood.quantity || 0;
            // Convertir unidades a gramos aproximados si es necesario
            const grams = mealFood.quantity_unit === 'units' ? quantity * 100 : quantity;

            if (foodMap[food.id]) {
              foodMap[food.id].grams += grams;
            } else {
              foodMap[food.id] = { name: foodName, grams };
            }
          }
        }
      }

      // Convertir a lista ordenada con estado guardado
      const list: GroceryItem[] = Object.entries(foodMap)
        .map(([foodId, item]) => ({
          food_id: foodId,
          food_name: item.name,
          grams: Math.round(item.grams),
          checked: checkedIds.includes(foodId),
        }))
        .sort((a, b) => a.food_name.localeCompare(b.food_name));

      setGroceryList(list);
    } catch (err) {
      console.error('Error loading grocery list:', err);
      const friendlyMessage = getFriendlyErrorMessage(err, { 
        action: 'cargar la lista de compras',
        screen: 'Lista de Compras'
      });
      Alert.alert(t('common.error'), friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    const newList = [...groceryList];
    newList[index].checked = !newList[index].checked;
    setGroceryList(newList);
  };

  const clearAllChecked = async () => {
    const newList = groceryList.map(item => ({ ...item, checked: false }));
    setGroceryList(newList);
    if (storageKey) {
      await AsyncStorage.removeItem(storageKey);
    }
  };

  const checkedCount = groceryList.filter((item) => item.checked).length;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>{t('groceryList.loadingText')}</Text>
      </SafeAreaView>
    );
  }

  if (groceryList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition' as any)} style={styles.backIconButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('groceryList.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon="cart-outline"
          title={t('groceryList.noGroceries')}
          subtitle={t('groceryList.noGroceriesDesc')}
          actionText={t('groceryList.viewPlan')}
          onAction={() => router.push('/(tabs)/nutrition/plan' as any)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('groceryList.title')}</Text>
        {checkedCount > 0 ? (
          <TouchableOpacity onPress={clearAllChecked} style={styles.clearButton}>
            <Ionicons name="refresh-outline" size={22} color="#ffb300" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>
      
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color="#ffb300" />
        <Text style={styles.infoBannerText}>
          {t('groceryList.infoBanner')}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {checkedCount} / {groceryList.length} {t('groceryList.products')}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(checkedCount / groceryList.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {groceryList.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.groceryItem, item.checked && styles.groceryItemChecked]}
            onPress={() => toggleItem(index)}
          >
            <View style={styles.checkbox}>
              {item.checked && <Ionicons name="checkmark" size={20} color="#ffb300" />}
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                {item.food_name}
              </Text>
              <Text style={styles.itemAmount}>{item.grams}g</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backIconButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#ffb300',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffb300',
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  groceryItemChecked: {
    backgroundColor: '#0a0a0a',
    borderColor: '#ffb300',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#888888',
  },
  itemAmount: {
    fontSize: 14,
    color: '#888888',
  },
});

