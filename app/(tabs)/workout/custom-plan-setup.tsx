import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Equipment } from '../../../src/types';

// Equipment keys for translation lookup
const EQUIPMENT_KEYS: Record<Equipment, string> = {
  [Equipment.NONE]: 'none',
  [Equipment.DUMBBELLS]: 'dumbbells',
  [Equipment.BARBELL]: 'barbell',
  [Equipment.RESISTANCE_BANDS]: 'resistance_bands',
  [Equipment.PULL_UP_BAR]: 'pull_up_bar',
  [Equipment.BENCH]: 'bench',
  [Equipment.BENCH_DUMBBELLS]: 'bench_dumbbells',
  [Equipment.BENCH_BARBELL]: 'bench_barbell',
  [Equipment.GYM_ACCESS]: 'gym_access',
  [Equipment.KETTLEBELL]: 'kettlebell',
  [Equipment.CABLE_MACHINE]: 'cable_machine',
  [Equipment.SMITH_MACHINE]: 'smith_machine',
  [Equipment.LEG_PRESS]: 'leg_press',
  [Equipment.MEDICINE_BALL]: 'medicine_ball',
  [Equipment.YOGA_MAT]: 'yoga_mat',
};

// Orden personalizado de equipamiento (GYM_ACCESS primero)
const EQUIPMENT_ORDER = [
  Equipment.GYM_ACCESS,
  Equipment.NONE,
  Equipment.DUMBBELLS,
  Equipment.BARBELL,
  Equipment.RESISTANCE_BANDS,
  Equipment.PULL_UP_BAR,
  Equipment.BENCH,
  Equipment.BENCH_DUMBBELLS,
  Equipment.BENCH_BARBELL,
  Equipment.KETTLEBELL,
  Equipment.CABLE_MACHINE,
  Equipment.SMITH_MACHINE,
  Equipment.LEG_PRESS,
  Equipment.MEDICINE_BALL,
  Equipment.YOGA_MAT,
];

// Todos los equipamientos excepto GYM_ACCESS
const ALL_EQUIPMENT_EXCEPT_GYM = EQUIPMENT_ORDER.filter(e => e !== Equipment.GYM_ACCESS);

export default function CustomPlanSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
  
  // Helper to get translated equipment label
  const getEquipmentLabel = (eq: Equipment) => t(`equipment.${EQUIPMENT_KEYS[eq]}`);
  const [previousSelection, setPreviousSelection] = useState<Equipment[]>([]);

  // Limpiar datos de planes anteriores cuando se monta el componente
  useEffect(() => {
    const clearPreviousPlanData = async () => {
      try {
        console.log('🧹 Limpiando datos de planes anteriores...');
        
        // Limpiar datos de días (formato viejo: day_X_data)
        for (let i = 1; i <= 7; i++) {
          await AsyncStorage.removeItem(`day_${i}_data`);
        }
        
        // Limpiar datos de días multi-semana (formato nuevo: week_X_day_Y_data)
        for (let week = 1; week <= 10; week++) {
          for (let day = 1; day <= 7; day++) {
            await AsyncStorage.removeItem(`week_${week}_day_${day}_data`);
          }
        }
        
        // Limpiar ejercicio seleccionado si existe
        await AsyncStorage.removeItem('selectedExercise');
        
        // Limpiar nombre del plan
        await AsyncStorage.removeItem('custom_plan_name');
        
        // Limpiar contador de semanas
        await AsyncStorage.removeItem('custom_plan_weeks_count');
        
        // Limpiar ID de plan en edición
        await AsyncStorage.removeItem('editing_plan_id');
        
        console.log('✅ Datos de planes anteriores limpiados');
      } catch (error) {
        console.error('❌ Error limpiando datos anteriores:', error);
      }
    };
    
    clearPreviousPlanData();
  }, []);

  const toggleEquipment = (equipment: Equipment) => {
    if (equipment === Equipment.GYM_ACCESS) {
      // Si GYM_ACCESS ya está seleccionado, deseleccionarlo y restaurar selección previa
      if (selectedEquipment.includes(Equipment.GYM_ACCESS)) {
        setSelectedEquipment(previousSelection);
        setPreviousSelection([]);
      } else {
        // Guardar selección actual (sin GYM_ACCESS)
        const currentSelection = selectedEquipment.filter(e => e !== Equipment.GYM_ACCESS);
        setPreviousSelection(currentSelection);
        // Seleccionar GYM_ACCESS + todos los demás equipamientos
        setSelectedEquipment([Equipment.GYM_ACCESS, ...ALL_EQUIPMENT_EXCEPT_GYM]);
      }
    } else {
      // Comportamiento normal para otros equipamientos
      setSelectedEquipment(prev => {
        if (prev.includes(equipment)) {
          // Si GYM_ACCESS está activo y deseleccionamos algo, desactivar GYM_ACCESS también
          if (prev.includes(Equipment.GYM_ACCESS)) {
            return prev.filter(e => e !== equipment && e !== Equipment.GYM_ACCESS);
          }
          return prev.filter(e => e !== equipment);
        } else {
          return [...prev, equipment];
        }
      });
    }
  };

  const handleContinue = () => {
    if (selectedEquipment.length === 0) {
      Alert.alert(t('common.error'), t('customPlan.selectEquipmentError'));
      return;
    }

    // Ya no pasamos daysPerWeek, se iniciará con 1 día por defecto
    router.push({
      pathname: '/(tabs)/workout/custom-plan-days',
      params: {
        equipment: JSON.stringify(selectedEquipment),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Navegar directamente a la pantalla de workout
            router.push('/(tabs)/workout' as any);
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('customPlan.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Equipamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('customPlan.whatEquipment')}</Text>
          <Text style={styles.sectionSubtitle}>{t('customPlan.selectAllYouHave')}</Text>
          <View style={styles.equipmentGrid}>
            {EQUIPMENT_ORDER.map(equipment => {
              const isSelected = selectedEquipment.includes(equipment);
              const isGymAccess = equipment === Equipment.GYM_ACCESS;
              
              return (
                <TouchableOpacity
                  key={equipment}
                  style={[
                    styles.equipmentButton,
                    isGymAccess && styles.gymAccessButton,
                    isSelected && styles.equipmentButtonSelected,
                    isGymAccess && isSelected && styles.gymAccessButtonSelected,
                  ]}
                  onPress={() => toggleEquipment(equipment)}
                >
                  {isGymAccess && isSelected && (
                    <Ionicons 
                      name="fitness" 
                      size={18} 
                      color="#1a1a1a" 
                      style={{ marginRight: 6 }} 
                    />
                  )}
                  <Text
                    style={[
                      styles.equipmentButtonText,
                      isSelected && styles.equipmentButtonTextSelected,
                      isGymAccess && isSelected && styles.gymAccessButtonText,
                    ]}
                  >
                    {getEquipmentLabel(equipment)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Botón continuar */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedEquipment.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedEquipment.length === 0}
        >
          <Text style={styles.continueButtonText}>{t('common.continue')}</Text>
          <Ionicons name="arrow-forward" size={24} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
    width: '100%',
  },
  // OPCIÓN 3: Botones con Gradiente y efecto glow
  dayButton: {
    width: 75,
    height: 75,
    borderRadius: 20,
    backgroundColor: '#1f1f1f',
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  dayButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dayButtonTextSelected: {
    color: '#1a1a1a',
  },
  dayButtonLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  dayButtonLabelSelected: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    justifyContent: 'center',
    width: '100%',
  },
  equipmentButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: '45%',
    maxWidth: '48%',
  },
  gymAccessButton: {
    width: '100%',
    minWidth: '100%',
    maxWidth: '100%',
  },
  equipmentButtonSelected: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  gymAccessButtonSelected: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
  },
  equipmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  equipmentButtonTextSelected: {
    color: '#1a1a1a',
  },
  gymAccessButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});

