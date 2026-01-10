import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { 
  useUnitsStore, 
  WeightUnit, 
  HeightUnit, 
  DistanceUnit,
} from '../src/store/unitsStore';

type UnitOption<T> = {
  value: T;
  label: string;
  description: string;
};

export default function UnitsSettingsScreen() {
  const { t } = useTranslation();
  const { 
    weightUnit, 
    heightUnit, 
    distanceUnit,
    setWeightUnit, 
    setHeightUnit, 
    setDistanceUnit,
    setAllMetric,
    setAllImperial,
  } = useUnitsStore();

  const weightOptions: UnitOption<WeightUnit>[] = [
    { value: 'kg', label: t('units.kilograms'), description: 'kg' },
    { value: 'lb', label: t('units.pounds'), description: 'lb' },
  ];

  const heightOptions: UnitOption<HeightUnit>[] = [
    { value: 'cm', label: t('units.centimeters'), description: 'cm' },
    { value: 'ft', label: t('units.feetInches'), description: 'ft/in' },
  ];

  const distanceOptions: UnitOption<DistanceUnit>[] = [
    { value: 'km', label: t('units.kilometers'), description: 'km' },
    { value: 'mi', label: t('units.miles'), description: 'mi' },
  ];

  const isMetric = weightUnit === 'kg' && heightUnit === 'cm' && distanceUnit === 'km';
  const isImperial = weightUnit === 'lb' && heightUnit === 'ft' && distanceUnit === 'mi';

  const renderUnitSelector = <T extends string>(
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    options: UnitOption<T>[],
    currentValue: T,
    onChange: (value: T) => void
  ) => (
    <View style={styles.unitSection}>
      <View style={styles.unitHeader}>
        <Ionicons name={icon} size={22} color="#ffb300" />
        <Text style={styles.unitTitle}>{title}</Text>
      </View>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              currentValue === option.value && styles.optionButtonActive,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[
              styles.optionLabel,
              currentValue === option.value && styles.optionLabelActive,
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.optionDescription,
              currentValue === option.value && styles.optionDescriptionActive,
            ]}>
              {option.description}
            </Text>
            {currentValue === option.value && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={16} color="#1a1a1a" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('units.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Presets rápidos */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>{t('units.quickPresets')}</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[
                styles.presetButton,
                isMetric && styles.presetButtonActive,
              ]}
              onPress={setAllMetric}
            >
              <Ionicons 
                name="globe-outline" 
                size={24} 
                color={isMetric ? '#1a1a1a' : '#ffb300'} 
              />
              <Text style={[
                styles.presetLabel,
                isMetric && styles.presetLabelActive,
              ]}>
                {t('units.metric')}
              </Text>
              <Text style={[
                styles.presetDescription,
                isMetric && styles.presetDescriptionActive,
              ]}>
                kg, cm, km
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetButton,
                isImperial && styles.presetButtonActive,
              ]}
              onPress={setAllImperial}
            >
              <Ionicons 
                name="flag-outline" 
                size={24} 
                color={isImperial ? '#1a1a1a' : '#ffb300'} 
              />
              <Text style={[
                styles.presetLabel,
                isImperial && styles.presetLabelActive,
              ]}>
                {t('units.imperial')}
              </Text>
              <Text style={[
                styles.presetDescription,
                isImperial && styles.presetDescriptionActive,
              ]}>
                lb, ft/in, mi
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unidades individuales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('units.customizeUnits')}</Text>
          <View style={styles.settingCard}>
            {renderUnitSelector(
              t('units.weight'),
              'barbell-outline',
              weightOptions,
              weightUnit,
              setWeightUnit
            )}
            <View style={styles.divider} />
            {renderUnitSelector(
              t('units.height'),
              'resize-outline',
              heightOptions,
              heightUnit,
              setHeightUnit
            )}
            <View style={styles.divider} />
            {renderUnitSelector(
              t('units.distance'),
              'walk-outline',
              distanceOptions,
              distanceUnit,
              setDistanceUnit
            )}
          </View>
        </View>

        {/* Nota informativa */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            {t('units.infoNote')}
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  presetsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  presetButtonActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
  },
  presetLabelActive: {
    color: '#1a1a1a',
  },
  presetDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  presetDescriptionActive: {
    color: '#333',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  settingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  unitSection: {
    padding: 16,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  unitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#444',
    position: 'relative',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    borderColor: '#ffb300',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  optionLabelActive: {
    color: '#ffb300',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
  },
  optionDescriptionActive: {
    color: '#ffb300',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
