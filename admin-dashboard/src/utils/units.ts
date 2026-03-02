// Unit conversion utilities

export type UnitSystem = 'metric' | 'imperial';

// Weight (Bodyweight) conversions
export const kgToLbs = (kg: number): number => kg * 2.20462;
export const lbsToKg = (lbs: number): number => lbs / 2.20462;

export const formatBodyWeight = (kg: number, system: UnitSystem): string => {
    if (system === 'imperial') {
        return `${kgToLbs(kg).toFixed(1)} lbs`;
    }
    return `${kg.toFixed(1)} kg`;
};

// Food portion conversions
export const gToOz = (g: number): number => g / 28.3495;
export const ozToG = (oz: number): number => oz * 28.3495;

export const formatFoodQuantity = (g: number, system: UnitSystem): string => {
    if (system === 'imperial') {
        return `${gToOz(g).toFixed(2)} oz`;
    }
    return `${g.toFixed(0)} g`;
};

// Height conversions
export const cmToInches = (cm: number): number => cm * 0.393701;
export const inchesToCm = (inches: number): number => inches / 0.393701;

export const formatHeight = (cm: number, system: UnitSystem): string => {
    if (system === 'imperial') {
        const totalInches = cmToInches(cm);
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${feet}'${inches}"`;
    }
    return `${cm.toFixed(0)} cm`;
};

// Liquid conversions (optional, if used)
export const mlToFlOz = (ml: number): number => ml / 29.5735;
export const flOzToMl = (flOz: number): number => flOz * 29.5735;
