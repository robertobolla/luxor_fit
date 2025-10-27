// ============================================================================
// TODAY DETAIL SCREEN - Detalle de comidas del día
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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';
import { MealLog, NutritionTarget } from '../../../src/types/nutrition';

export default function TodayDetailScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const selectedDate = (params.date as string) || new Date().toISOString().split('T')[0];
  const [isLoading, setIsLoading] = useState(true);
  const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
  const [todayTarget, setTodayTarget] = useState<NutritionTarget | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedDate]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, selectedDate])
  );

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Usar selectedDate si viene como parámetro, si no, usar hoy
      const targetDate = selectedDate;

      // Cargar target del día
      const { data: targetData } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .single();

      setTodayTarget(targetData as NutritionTarget);

      // Cargar logs del día
      const { data: logsData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('datetime', `${targetDate}T00:00:00`)
        .lte('datetime', `${targetDate}T23:59:59`)
        .order('datetime', { ascending: true });

      setTodayLogs((logsData || []) as MealLog[]);
    } catch (err) {
      console.error('Error loading today detail:', err);
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    Alert.alert(
      'Eliminar comida',
      '¿Estás seguro de eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('meal_logs')
                .delete()
                .eq('id', logId);
              
              if (!error) {
                await loadData();
                Alert.alert('Eliminado', 'Registro eliminado correctamente.');
              } else {
                Alert.alert('Error', 'No se pudo eliminar el registro.');
              }
            } catch (err) {
              console.error('Error deleting log:', err);
              Alert.alert('Error', 'Error al eliminar.');
            }
          },
        },
      ]
    );
  };

  const calculateConsumed = () => {
    return todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein_g: acc.protein_g + log.protein_g,
        carbs_g: acc.carbs_g + log.carbs_g,
        fats_g: acc.fats_g + log.fats_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    );
  };

  const consumed = calculateConsumed();

  const mealTypeLabels = {
    breakfast: '🍳 Desayuno',
    lunch: '🍽️ Almuerzo',
    dinner: '🌙 Cena',
    snack: '🥤 Snack',
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hoy - {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Resumen de macros */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen del día</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{consumed.calories}</Text>
              <Text style={styles.summaryLabel}>/ {todayTarget?.calories || 0} kcal</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{consumed.protein_g}g</Text>
              <Text style={styles.summaryLabel}>/ {todayTarget?.protein_g || 0}g proteína</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{consumed.carbs_g}g</Text>
              <Text style={styles.summaryLabel}>/ {todayTarget?.carbs_g || 0}g carbos</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{consumed.fats_g}g</Text>
              <Text style={styles.summaryLabel}>/ {todayTarget?.fats_g || 0}g grasas</Text>
            </View>
          </View>
        </View>

        {/* Comidas registradas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Comidas registradas</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/nutrition/log' as any)}
            >
              <Ionicons name="add-circle" size={28} color="#00D4AA" />
            </TouchableOpacity>
          </View>

          {todayLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color="#666666" />
              <Text style={styles.emptyText}>No has registrado comidas hoy</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/nutrition/log' as any)}
              >
                <Text style={styles.emptyButtonText}>Registrar primera comida</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayLogs.map((log, index) => {
              const time = new Date(log.datetime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View key={log.id || index} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View>
                      <Text style={styles.logMealType}>
                        {mealTypeLabels[log.meal_type as keyof typeof mealTypeLabels] || log.meal_type}
                      </Text>
                      <Text style={styles.logTime}>{time}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleDeleteLog(log.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.logFoodName}>
                    {log.item_json?.name || 'Comida sin nombre'}
                  </Text>
                  
                  {log.item_json?.weight_grams && (
                    <Text style={styles.logWeight}>Peso: {log.item_json.weight_grams}g</Text>
                  )}
                  
                  <View style={styles.logMacros}>
                    <View style={styles.logMacroItem}>
                      <Text style={styles.logMacroValue}>{log.calories}</Text>
                      <Text style={styles.logMacroLabel}>kcal</Text>
                    </View>
                    <View style={styles.logMacroItem}>
                      <Text style={styles.logMacroValue}>{log.protein_g}g</Text>
                      <Text style={styles.logMacroLabel}>proteína</Text>
                    </View>
                    <View style={styles.logMacroItem}>
                      <Text style={styles.logMacroValue}>{log.carbs_g}g</Text>
                      <Text style={styles.logMacroLabel}>carbos</Text>
                    </View>
                    <View style={styles.logMacroItem}>
                      <Text style={styles.logMacroValue}>{log.fats_g}g</Text>
                      <Text style={styles.logMacroLabel}>grasas</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

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
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4AA',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  logCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logMealType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logTime: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
  },
  logFoodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00D4AA',
    marginBottom: 4,
  },
  logWeight: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 12,
  },
  logMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  logMacroItem: {
    alignItems: 'center',
  },
  logMacroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logMacroLabel: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
});

