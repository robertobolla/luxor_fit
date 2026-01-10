import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft';
export type DistanceUnit = 'km' | 'mi';
export type TemperatureUnit = 'c' | 'f';

export interface UnitsState {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  distanceUnit: DistanceUnit;
  temperatureUnit: TemperatureUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  setHeightUnit: (unit: HeightUnit) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setAllMetric: () => void;
  setAllImperial: () => void;
}

// Funciones de conversión
export const conversions = {
  // Peso
  kgToLb: (kg: number): number => kg * 2.20462,
  lbToKg: (lb: number): number => lb / 2.20462,
  
  // Altura
  cmToFt: (cm: number): { feet: number; inches: number } => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  },
  ftToCm: (feet: number, inches: number = 0): number => {
    return (feet * 12 + inches) * 2.54;
  },
  cmToFtString: (cm: number): string => {
    const { feet, inches } = conversions.cmToFt(cm);
    return `${feet}'${inches}"`;
  },
  
  // Distancia
  kmToMi: (km: number): number => km * 0.621371,
  miToKm: (mi: number): number => mi / 0.621371,
  
  // Temperatura
  cToF: (c: number): number => (c * 9/5) + 32,
  fToC: (f: number): number => (f - 32) * 5/9,
};

// Funciones de formateo con unidad
export const formatWeight = (value: number, unit: WeightUnit, decimals: number = 1): string => {
  if (unit === 'lb') {
    return `${conversions.kgToLb(value).toFixed(decimals)} lb`;
  }
  return `${value.toFixed(decimals)} kg`;
};

export const formatHeight = (valueCm: number, unit: HeightUnit): string => {
  if (unit === 'ft') {
    return conversions.cmToFtString(valueCm);
  }
  return `${Math.round(valueCm)} cm`;
};

export const formatDistance = (valueKm: number, unit: DistanceUnit, decimals: number = 2): string => {
  if (unit === 'mi') {
    return `${conversions.kmToMi(valueKm).toFixed(decimals)} mi`;
  }
  return `${valueKm.toFixed(decimals)} km`;
};

export const formatTemperature = (valueC: number, unit: TemperatureUnit): string => {
  if (unit === 'f') {
    return `${Math.round(conversions.cToF(valueC))}°F`;
  }
  return `${Math.round(valueC)}°C`;
};

// Funciones para obtener el valor en la unidad del usuario (para inputs)
export const getWeightInUserUnit = (valueKg: number, unit: WeightUnit): number => {
  if (unit === 'lb') {
    return conversions.kgToLb(valueKg);
  }
  return valueKg;
};

export const getWeightFromUserUnit = (value: number, unit: WeightUnit): number => {
  if (unit === 'lb') {
    return conversions.lbToKg(value);
  }
  return value;
};

export const getHeightInUserUnit = (valueCm: number, unit: HeightUnit): { value: number; feet?: number; inches?: number } => {
  if (unit === 'ft') {
    const { feet, inches } = conversions.cmToFt(valueCm);
    return { value: valueCm, feet, inches };
  }
  return { value: valueCm };
};

export const getHeightFromUserUnit = (value: number, unit: HeightUnit, inches?: number): number => {
  if (unit === 'ft') {
    return conversions.ftToCm(value, inches || 0);
  }
  return value;
};

// Store con persistencia
export const useUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      weightUnit: 'kg',
      heightUnit: 'cm',
      distanceUnit: 'km',
      temperatureUnit: 'c',
      
      setWeightUnit: (unit) => set({ weightUnit: unit }),
      setHeightUnit: (unit) => set({ heightUnit: unit }),
      setDistanceUnit: (unit) => set({ distanceUnit: unit }),
      setTemperatureUnit: (unit) => set({ temperatureUnit: unit }),
      
      setAllMetric: () => set({
        weightUnit: 'kg',
        heightUnit: 'cm',
        distanceUnit: 'km',
        temperatureUnit: 'c',
      }),
      
      setAllImperial: () => set({
        weightUnit: 'lb',
        heightUnit: 'ft',
        distanceUnit: 'mi',
        temperatureUnit: 'f',
      }),
    }),
    {
      name: 'units-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
