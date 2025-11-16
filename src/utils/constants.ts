// Colores de la aplicación - Luxor Fitness
export const COLORS = {
  primary: '#ffb300', // Amarillo dorado Luxor (más oscuro para mejor contraste)
  secondary: '#1a1a1a', // Fondo secundario (tarjetas)
  background: '#0a0a0a', // Fondo principal
  surface: '#1a1a1a', // Superficie de tarjetas
  text: '#ffffff', // Texto principal
  textSecondary: '#cccccc', // Texto secundario
  textTertiary: '#999999', // Texto terciario
  border: '#333333', // Bordes
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',
} as const;

// Tamaños de fuente
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

// Espaciado
export const SPACING = {
  xs: 4,
  sm: 8,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// Radios de borde
export const BORDER_RADIUS = {
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// Niveles de fitness
export const FITNESS_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

// Objetivos de fitness
export const FITNESS_GOALS = {
  WEIGHT_LOSS: 'weight_loss',
  MUSCLE_GAIN: 'muscle_gain',
  STRENGTH: 'strength',
  ENDURANCE: 'endurance',
  GENERAL_FITNESS: 'general_fitness',
} as const;

// Equipamiento
export const EQUIPMENT = {
  NONE: 'none',
  DUMBBELLS: 'dumbbells',
  BARBELL: 'barbell',
  RESISTANCE_BANDS: 'resistance_bands',
  PULL_UP_BAR: 'pull_up_bar',
  BENCH: 'bench',
  GYM_ACCESS: 'gym_access',
} as const;

// Grupos musculares
export const MUSCLE_GROUPS = {
  CHEST: 'chest',
  BACK: 'back',
  SHOULDERS: 'shoulders',
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
  FOREARMS: 'forearms',
  ABS: 'abs',
  OBLIQUES: 'obliques',
  QUADS: 'quads',
  HAMSTRINGS: 'hamstrings',
  GLUTES: 'glutes',
  CALVES: 'calves',
} as const;

// Tipos de recomendación de IA
export const RECOMMENDATION_TYPES = {
  INCREASE_WEIGHT: 'increase_weight',
  DECREASE_WEIGHT: 'decrease_weight',
  INCREASE_REPS: 'increase_reps',
  DECREASE_REPS: 'decrease_reps',
  INCREASE_SETS: 'increase_sets',
  DECREASE_SETS: 'decrease_sets',
  ADD_EXERCISE: 'add_exercise',
  REMOVE_EXERCISE: 'remove_exercise',
} as const;

// Tipos de notificación
export const NOTIFICATION_TYPES = {
  WORKOUT_REMINDER: 'workout_reminder',
  PROGRESS_UPDATE: 'progress_update',
  ACHIEVEMENT: 'achievement',
  MOTIVATION: 'motivation',
} as const;

// Configuración de la app
export const APP_CONFIG = {
  name: 'Luxor Fitness',
  version: '1.0.0',
  description: 'Tu entrenador personal con IA',
  supportEmail: 'soporte@luxorfitness.app',
  website: 'https://luxorfitness.app',
} as const;

// Límites y validaciones
export const VALIDATION_LIMITS = {
  MIN_AGE: 13,
  MAX_AGE: 100,
  MIN_HEIGHT: 100, // cm
  MAX_HEIGHT: 250, // cm
  MIN_WEIGHT: 30, // kg
  MAX_WEIGHT: 300, // kg
  MIN_RPE: 1,
  MAX_RPE: 10,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  MIN_AVAILABLE_DAYS: 1,
  MAX_AVAILABLE_DAYS: 7,
} as const;

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  AUTH_ERROR: 'Error de autenticación. Intenta nuevamente.',
  VALIDATION_ERROR: 'Por favor completa todos los campos requeridos.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
  PERMISSION_DENIED: 'Permiso denegado.',
  NOT_FOUND: 'No se encontró el recurso solicitado.',
} as const;

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Perfil actualizado correctamente.',
  WORKOUT_COMPLETED: '¡Entrenamiento completado!',
  WORKOUT_SAVED: 'Entrenamiento guardado.',
  PROGRESS_SAVED: 'Progreso guardado.',
  NOTIFICATION_SCHEDULED: 'Notificación programada.',
} as const;
