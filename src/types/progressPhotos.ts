// ============================================================================
// TYPES FOR PROGRESS PHOTOS
// ============================================================================

export type PhotoType = 'front' | 'side' | 'back' | 'other';

export interface AIAnalysis {
  muscleGrowth?: {
    arms?: 'increased' | 'maintained' | 'decreased';
    chest?: 'increased' | 'maintained' | 'decreased';
    shoulders?: 'increased' | 'maintained' | 'decreased';
    abs?: 'more_visible' | 'same' | 'less_visible';
    legs?: 'increased' | 'maintained' | 'decreased';
  };
  bodyFat?: {
    estimation?: number; // Porcentaje estimado
    change?: 'increased' | 'maintained' | 'decreased';
  };
  posture?: {
    rating?: number; // 1-10
    notes?: string;
  };
  overallChange?: string; // Resumen general
  confidence?: number; // 0-1 (confianza del análisis)
  detectedChanges?: string[]; // Lista de cambios detectados
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  photo_date: string; // ISO date
  photo_type: PhotoType;
  weight_kg?: number;
  notes?: string;
  ai_analysis?: AIAnalysis;
  created_at: string;
  updated_at: string;
}

export interface PhotoComparison {
  before: ProgressPhoto;
  after: ProgressPhoto;
  daysBetween: number;
  weightChange?: number;
  analysis?: AIAnalysis;
}

export interface PhotoReminder {
  nextPhotoDate: string; // ISO date
  daysSinceLastPhoto: number;
  shouldShowReminder: boolean;
}

