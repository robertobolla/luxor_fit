import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { useCustomAlert } from '../../src/components/CustomAlert';

export default function RegisterWeightScreen() {
  const { user } = useUser();
  const { showAlert, AlertComponent } = useCustomAlert();
  const params = useLocalSearchParams();
  const defaultDate = params.date ? new Date(params.date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  const [date, setDate] = useState(defaultDate);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const performSave = async (bodyMetric: any, isUpdate: boolean) => {
    try {
      let metricsError;
      if (isUpdate) {
        // Actualizar medición existente
        const { error } = await supabase
          .from('body_metrics')
          .update(bodyMetric)
          .eq('user_id', user!.id)
          .eq('date', date);
        metricsError = error;
      } else {
        // Insertar nueva medición
        const { error } = await supabase
          .from('body_metrics')
          .insert(bodyMetric);
        metricsError = error;
      }

      if (metricsError) {
        console.error('❌ Error guardando medición:', metricsError);
        throw metricsError;
      }

      console.log('✅ Medición guardada en historial');

      // 2. Actualizar peso actual en el perfil del usuario
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          weight: parseFloat(weight),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (profileError) {
        console.error('⚠️ Error actualizando perfil:', profileError);
        // No lanzamos error aquí para que no falle todo el guardado
      } else {
        console.log('✅ Peso actualizado en perfil');
      }

      showAlert(
        '¡Guardado!',
        'Mediciones registradas correctamente.',
        [{ text: 'OK', onPress: () => router.push('/(tabs)/nutrition' as any) }],
        { icon: 'checkmark-circle', iconColor: '#4CAF50' }
      );
    } catch (error: any) {
      console.error('Error saving weight:', error);
      showAlert(
        'Error',
        error.message || 'No se pudo guardar la medición. Intenta nuevamente.',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || !weight) {
      showAlert(
        'Error',
        'El peso es requerido',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
      return;
    }

    try {
      setSaving(true);

      const bodyMetric = {
        user_id: user.id,
        date,
        weight_kg: parseFloat(weight),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        muscle_percentage: muscle ? parseFloat(muscle) : null,
        notes: notes || null,
      };

      console.log('💾 Guardando medición:', bodyMetric);

      // Verificar si ya existe una medición para este día
      const { data: existingMetric } = await supabase
        .from('body_metrics')
        .select('id, weight_kg, body_fat_percentage, muscle_percentage')
        .eq('user_id', user.id)
        .eq('date', date)
        .single();

      // Si existe, mostrar confirmación antes de sobrescribir
      if (existingMetric) {
        setSaving(false); // Detener loading mientras esperamos confirmación
        
        showAlert(
          'Registro Existente',
          `Ya registraste mediciones para el día ${new Date(date).toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
          })}.\n\nSi continúas, los valores anteriores serán reemplazados por los nuevos datos.\n\n¿Deseas actualizar la medición?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                console.log('❌ Usuario canceló la actualización');
              }
            },
            {
              text: 'Actualizar',
              style: 'default',
              onPress: async () => {
                setSaving(true);
                await performSave(bodyMetric, true);
              }
            }
          ],
          { icon: 'calendar', iconColor: '#ffb300' }
        );
        return;
      }

      // Si no existe, guardar directamente
      await performSave(bodyMetric, false);

    } catch (error: any) {
      console.error('Error checking existing weight:', error);
      showAlert(
        'Error',
        'No se pudo verificar la medición. Intenta nuevamente.',
        [{ text: 'OK' }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
      setSaving(false);
    }
  }, [user, date, weight, bodyFat, muscle, notes]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition' as any)}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Medición</Text>
        <TouchableOpacity onPress={() => router.push('/body-evolution' as any)}>
          <Ionicons name="analytics" size={24} color="#ffb300" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Botón Ver Evolución */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.evolutionButton}
            onPress={() => router.push('/body-evolution' as any)}
          >
            <View style={styles.evolutionButtonIcon}>
              <Ionicons name="analytics" size={24} color="#ffb300" />
            </View>
            <View style={styles.evolutionButtonContent}>
              <Text style={styles.evolutionButtonTitle}>Ver Evolución Corporal</Text>
              <Text style={styles.evolutionButtonSubtitle}>
                Gráficas de peso, grasa y músculo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

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
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Medición</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AlertComponent />
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
  evolutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  evolutionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evolutionButtonContent: {
    flex: 1,
  },
  evolutionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  evolutionButtonSubtitle: {
    fontSize: 12,
    color: '#999',
  },
});

