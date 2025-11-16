import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { useRetry } from '../../src/hooks/useRetry';

export default function RegisterWeightScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const defaultDate = params.date ? new Date(params.date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  const [date, setDate] = useState(defaultDate);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');

  // Hook para retry en guardado de peso
  const saveWeightWithRetry = useRetry(
    async () => {
      if (!user?.id || !weight) {
        throw new Error('El peso es requerido');
      }

      const bodyMetric = {
        user_id: user.id,
        date,
        weight_kg: parseFloat(weight),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        muscle_percentage: muscle ? parseFloat(muscle) : null,
        waist_cm: waist ? parseFloat(waist) : null,
        notes: notes || null,
      };

      const { error } = await supabase
        .from('body_metrics')
        .upsert(bodyMetric, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;
      return true;
    },
    {
      maxRetries: 2,
      retryDelay: 2000,
      showAlert: true,
    }
  );

  const handleSave = async () => {
    if (!user?.id || !weight) {
      Alert.alert('Error', 'El peso es requerido');
      return;
    }

    const result = await saveWeightWithRetry.executeWithRetry();
    
    if (result) {
      Alert.alert('¡Guardado!', 'Mediciones registradas correctamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Medición</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Fecha */}
        <View style={styles.section}>
          <Text style={styles.label}>Fecha de la medición</Text>
          <Text style={styles.dateText}>{new Date(date).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
          <Text style={styles.infoText}>
            Puedes registrar mediciones pasadas navegando días en la sección de Progreso
          </Text>
        </View>

        {/* Peso */}
        <View style={styles.section}>
          <Text style={styles.label}>Peso (kg) *</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="78.5"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Grasa corporal */}
        <View style={styles.section}>
          <Text style={styles.label}>Grasa corporal (%)</Text>
          <Text style={styles.optionalLabel}>Opcional - Ayuda a personalizar tu dieta</Text>
          <TextInput
            style={styles.input}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="18.5"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <Text style={styles.infoText}>
            📍 Puedes medirlo con balanza de bioimpedancia o pellizco
          </Text>
        </View>

        {/* Masa muscular */}
        <View style={styles.section}>
          <Text style={styles.label}>Masa muscular (%)</Text>
          <Text style={styles.optionalLabel}>Opcional - Ayuda a evaluar tu progreso</Text>
          <TextInput
            style={styles.input}
            value={muscle}
            onChangeText={setMuscle}
            placeholder="42.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <Text style={styles.infoText}>
            📍 Solo si tienes acceso a medición de composición corporal
          </Text>
        </View>

        {/* Cintura */}
        <View style={styles.section}>
          <Text style={styles.label}>Cintura (cm)</Text>
          <Text style={styles.optionalLabel}>Opcional</Text>
          <TextInput
            style={styles.input}
            value={waist}
            onChangeText={setWaist}
            placeholder="85"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Notas */}
        <View style={styles.section}>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones, cómo te sientes, etc."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saveWeightWithRetry.isRetrying && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveWeightWithRetry.isRetrying}
        >
          <Text style={styles.saveButtonText}>
            {saveWeightWithRetry.isRetrying ? 'Guardando...' : 'Guardar Medición'}
          </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#ffb300',
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#ffb300',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
});

