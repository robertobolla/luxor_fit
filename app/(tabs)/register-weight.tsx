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
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/services/supabase';
import { useCustomAlert } from '../../src/components/CustomAlert';

export default function RegisterWeightScreen() {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const locale = i18n.language; // 'es', 'en', 'es-ES', etc.

  // ✅ FIX: Supabase sin tipos -> TS infiere payload como "never".
  // Casteamos el cliente (o from) para evitar los 2 errores que te quedaban.
  const sb = supabase as any;

  const { showAlert, AlertComponent } = useCustomAlert();
  const params = useLocalSearchParams();

  const defaultDate = params.date
    ? new Date(params.date as string).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

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
        // Update existing measurement
        const { error } = await sb
          .from('body_metrics')
          .update(bodyMetric)
          .eq('user_id', user!.id)
          .eq('date', date);

        metricsError = error;
      } else {
        // Insert new measurement
        const { error } = await sb.from('body_metrics').insert(bodyMetric);
        metricsError = error;
      }

      if (metricsError) {
        console.error('❌ Error saving measurement:', metricsError);
        throw metricsError;
      }

      console.log('✅ Measurement saved in history');

      // 2. Update current weight in the user profile
      const { error: profileError } = await sb
        .from('user_profiles')
        .update({
          weight: parseFloat(weight),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (profileError) {
        console.error('⚠️ Error updating profile:', profileError);
        // Don't throw here so the whole save doesn't fail
      } else {
        console.log('✅ Weight updated in profile');
      }

      showAlert(
        t('registerWeight.savedTitle'),
        t('registerWeight.savedMessage'),
        [{ text: t('common.ok'), onPress: () => router.push('/(tabs)/nutrition' as any) }],
        { icon: 'checkmark-circle', iconColor: '#4CAF50' }
      );
    } catch (error: any) {
      console.error('Error saving weight:', error);
      showAlert(
        t('common.error'),
        error?.message || t('registerWeight.saveError'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || !weight) {
      showAlert(
        t('common.error'),
        t('registerWeight.weightRequired'),
        [{ text: t('common.ok') }],
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

      console.log('💾 Saving measurement:', bodyMetric);

      // Check if a measurement already exists for this day
      const { data: existingMetric } = await sb
        .from('body_metrics')
        .select('id, weight_kg, body_fat_percentage, muscle_percentage')
        .eq('user_id', user.id)
        .eq('date', date)
        .single();

      // If it exists, confirm before overwriting
      if (existingMetric) {
        setSaving(false); // Stop loading while waiting for confirmation

        showAlert(
          t('registerWeight.existingRecordTitle'),
          t('registerWeight.existingRecordMessage', {
            // Podés usar locale si querés respetar el idioma actual:
            // date: new Date(date).toLocaleDateString(locale, { ... })
            date: new Date(date).toLocaleDateString('en-IE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          }),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
              onPress: () => {
                console.log('❌ User canceled update');
              },
            },
            {
              text: t('common.update'),
              style: 'default',
              onPress: async () => {
                setSaving(true);
                await performSave(bodyMetric, true);
              },
            },
          ],
          { icon: 'calendar', iconColor: '#ffb300' }
        );
        return;
      }

      // If it doesn't exist, save directly
      await performSave(bodyMetric, false);
    } catch (error: any) {
      console.error('Error checking existing weight:', error);
      showAlert(
        t('common.error'),
        t('registerWeight.verifyError'),
        [{ text: t('common.ok') }],
        { icon: 'alert-circle', iconColor: '#F44336' }
      );
      setSaving(false);
    }
  }, [user, date, weight, bodyFat, muscle, notes, showAlert, t]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition' as any)}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('registerWeight.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/body-evolution' as any)}>
          <Ionicons name="analytics" size={24} color="#ffb300" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* View Evolution button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.evolutionButton}
            onPress={() => router.push('/body-evolution' as any)}
          >
            <View style={styles.evolutionButtonIcon}>
              <Ionicons name="analytics" size={24} color="#ffb300" />
            </View>
            <View style={styles.evolutionButtonContent}>
              <Text style={styles.evolutionButtonTitle}>
                {t('registerWeight.viewBodyEvolution')}
              </Text>
              <Text style={styles.evolutionButtonSubtitle}>
                {t('registerWeight.viewBodyEvolutionSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Progress Photos button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.evolutionButton}
            onPress={() => router.push('/(tabs)/progress-photos' as any)}
          >
            <View style={styles.evolutionButtonIcon}>
              <Ionicons name="camera" size={24} color="#ffb300" />
            </View>
            <View style={styles.evolutionButtonContent}>
              <Text style={styles.evolutionButtonTitle}>
                {t('registerWeight.progressPhotosTitle')}
              </Text>
              <Text style={styles.evolutionButtonSubtitle}>
                {t('registerWeight.progressPhotosSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('registerWeight.measurementDate')}</Text>
          <Text style={styles.dateText}>
            {new Date(date).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.infoText}>{t('registerWeight.dateHint')}</Text>
        </View>

        {/* Weight */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('registerWeight.weightLabel')}</Text>
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

        {/* Body fat */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('registerWeight.bodyFatLabel')}</Text>
          <Text style={styles.optionalLabel}>{t('registerWeight.optionalDietHint')}</Text>
          <TextInput
            style={styles.input}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="18.5"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <Text style={styles.infoText}>{t('registerWeight.bodyFatHint')}</Text>
        </View>

        {/* Muscle mass */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('registerWeight.muscleLabel')}</Text>
          <Text style={styles.optionalLabel}>{t('registerWeight.optionalProgressHint')}</Text>
          <TextInput
            style={styles.input}
            value={muscle}
            onChangeText={setMuscle}
            placeholder="42.0"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <Text style={styles.infoText}>{t('registerWeight.muscleHint')}</Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('registerWeight.notesLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('registerWeight.notesPlaceholder')}
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <Text style={styles.saveButtonText}>{t('registerWeight.save')}</Text>
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
    textTransform: 'capitalize',
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
