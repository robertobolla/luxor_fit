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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Equipment } from '../../../src/types';

const EQUIPMENT_LABELS_MAP: Record<Equipment, string> = {
  [Equipment.NONE]: 'Solo peso corporal',
  [Equipment.DUMBBELLS]: 'Mancuernas',
  [Equipment.BARBELL]: 'Barra olímpica',
  [Equipment.RESISTANCE_BANDS]: 'Bandas de resistencia',
  [Equipment.PULL_UP_BAR]: 'Barra de dominadas',
  [Equipment.BENCH]: 'Banco',
  [Equipment.BENCH_DUMBBELLS]: 'Banco y mancuernas',
  [Equipment.BENCH_BARBELL]: 'Banco con barra',
  [Equipment.GYM_ACCESS]: 'Acceso a gimnasio',
  [Equipment.KETTLEBELL]: 'Kettlebell',
  [Equipment.CABLE_MACHINE]: 'Máquina de poleas',
  [Equipment.SMITH_MACHINE]: 'Máquina Smith',
  [Equipment.LEG_PRESS]: 'Prensa de piernas',
  [Equipment.MEDICINE_BALL]: 'Balón medicinal',
  [Equipment.YOGA_MAT]: 'Mat de yoga',
};

export default function CustomPlanSetupScreen() {
  const router = useRouter();
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);

  // Limpiar datos de planes anteriores cuando se monta el componente
  useEffect(() => {
    const clearPreviousPlanData = async () => {
      try {
        // Limpiar todos los datos de días (del 1 al 7 por si acaso)
        for (let i = 1; i <= 7; i++) {
          await AsyncStorage.removeItem(`day_${i}_data`);
        }
        // Limpiar ejercicio seleccionado si existe
        await AsyncStorage.removeItem('selectedExercise');
        // Limpiar nombre del plan
        await AsyncStorage.removeItem('custom_plan_name');
      } catch (error) {
        console.error('Error limpiando datos anteriores:', error);
      }
    };
    
    clearPreviousPlanData();
  }, []);

  const handleDaysSelect = (days: number) => {
    setDaysPerWeek(days);
  };

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment)
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const handleContinue = () => {
    if (!daysPerWeek) {
      Alert.alert('Error', 'Por favor selecciona cuántos días a la semana quieres entrenar');
      return;
    }
    if (selectedEquipment.length === 0) {
      Alert.alert('Error', 'Por favor selecciona al menos un tipo de equipamiento');
      return;
    }

    router.push({
      pathname: '/(tabs)/workout/custom-plan-days',
      params: {
        daysPerWeek: daysPerWeek.toString(),
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
        <Text style={styles.headerTitle}>Plan Personalizado</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Paso 1: Días por semana */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Cuántos días a la semana quieres entrenar?</Text>
          <View style={styles.daysGrid}>
            {[1, 2, 3, 4, 5, 6, 7].map(days => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.dayButton,
                  daysPerWeek === days && styles.dayButtonSelected,
                ]}
                onPress={() => handleDaysSelect(days)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    daysPerWeek === days && styles.dayButtonTextSelected,
                  ]}
                >
                  {days}
                </Text>
                <Text
                  style={[
                    styles.dayButtonLabel,
                    daysPerWeek === days && styles.dayButtonLabelSelected,
                  ]}
                >
                  {days === 1 ? 'día' : 'días'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Paso 2: Equipamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué equipamiento tienes disponible?</Text>
          <Text style={styles.sectionSubtitle}>Selecciona todo lo que tengas</Text>
          <View style={styles.equipmentGrid}>
            {Object.values(Equipment).map(equipment => (
              <TouchableOpacity
                key={equipment}
                style={[
                  styles.equipmentButton,
                  selectedEquipment.includes(equipment) && styles.equipmentButtonSelected,
                ]}
                onPress={() => toggleEquipment(equipment)}
              >
                <Text
                  style={[
                    styles.equipmentButtonText,
                    selectedEquipment.includes(equipment) && styles.equipmentButtonTextSelected,
                  ]}
                >
                  {EQUIPMENT_LABELS_MAP[equipment] || equipment}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botón continuar */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!daysPerWeek || selectedEquipment.length === 0) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!daysPerWeek || selectedEquipment.length === 0}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
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
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
    width: '100%',
  },
  equipmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  equipmentButtonSelected: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  equipmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  equipmentButtonTextSelected: {
    color: '#1a1a1a',
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

