/**
 * Tipos para el sistema de personalización del dashboard
 */

export type MetricType = 
  | 'steps'
  | 'distance'
  | 'calories'
  | 'sleep'
  | 'exercise'
  | 'gym'
  | 'weight'
  | 'glucose'
  | 'mindfulness'
  | 'food'
  | 'water'
  | 'heartRate';

export interface MetricConfig {
  id: MetricType;
  name: string;
  icon: string;
  color: string;
  unit?: string;
  description?: string;
}

export interface PriorityPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  metrics: MetricType[];
}

export interface CustomPriority {
  id: string;
  name: string;
  metrics: MetricType[];
  isCustom: true;
}

export type Priority = PriorityPreset | CustomPriority;

export interface DashboardConfig {
  selectedPriority?: string; // ID de la prioridad seleccionada
  customPriorities: CustomPriority[];
  visibleMetrics: MetricType[]; // Métricas visibles en "Mostrar u ocultar otras métricas"
  hiddenMetrics: MetricType[];
}

// Métricas disponibles - usa claves de traducción
export const AVAILABLE_METRICS: MetricConfig[] = [
  {
    id: 'steps',
    name: 'dashboard.customize.metrics.steps',
    icon: 'footsteps',
    color: '#00D4AA',
    unit: 'pasos',
  },
  {
    id: 'distance',
    name: 'dashboard.customize.metrics.distance',
    icon: 'location',
    color: '#00D4AA',
    unit: 'km',
  },
  {
    id: 'calories',
    name: 'dashboard.customize.metrics.caloriesBurned',
    icon: 'flame',
    color: '#FF6B35',
    unit: 'kcal',
  },
  {
    id: 'sleep',
    name: 'dashboard.customize.metrics.sleepDuration',
    icon: 'moon',
    color: '#9B5DE5',
    unit: 'h',
  },
  {
    id: 'exercise',
    name: 'dashboard.customize.metrics.exerciseDays',
    icon: 'barbell',
    color: '#00D4AA',
    unit: 'días',
  },
  {
    id: 'weight',
    name: 'dashboard.customize.metrics.weight',
    icon: 'fitness',
    color: '#F15BB5',
    unit: 'kg',
  },
  {
    id: 'glucose',
    name: 'dashboard.customize.metrics.glucose',
    icon: 'water',
    color: '#00BBF9',
    unit: 'mg/dL',
  },
  {
    id: 'mindfulness',
    name: 'dashboard.customize.metrics.mindfulnessDays',
    icon: 'flower',
    color: '#FEE440',
  },
  {
    id: 'food',
    name: 'dashboard.customize.metrics.food',
    icon: 'restaurant',
    color: '#FF6B35',
    unit: 'kcal',
  },
  {
    id: 'water',
    name: 'dashboard.customize.metrics.water',
    icon: 'water',
    color: '#00BBF9',
    unit: 'ml',
  },
  {
    id: 'heartRate',
    name: 'dashboard.customize.metrics.heartRate',
    icon: 'heart',
    color: '#F15BB5',
    unit: 'bpm',
  },
];

// Prioridades preestablecidas - usa claves de traducción
export const PRESET_PRIORITIES: PriorityPreset[] = [
  {
    id: 'sleep-better',
    name: 'dashboard.customize.priorities.sleepBetter',
    description: 'dashboard.customize.priorities.sleepBetterDesc',
    icon: 'moon',
    metrics: ['sleep', 'steps', 'mindfulness'],
  },
  {
    id: 'eat-better',
    name: 'dashboard.customize.priorities.eatBetter',
    description: 'dashboard.customize.priorities.eatBetterDesc',
    icon: 'restaurant',
    metrics: ['food', 'steps', 'weight'],
  },
  {
    id: 'lose-weight',
    name: 'dashboard.customize.priorities.loseWeight',
    description: 'dashboard.customize.priorities.loseWeightDesc',
    icon: 'fitness',
    metrics: ['weight', 'calories', 'steps'],
  },
  {
    id: 'active-lifestyle',
    name: 'dashboard.customize.priorities.activeLifestyle',
    description: 'dashboard.customize.priorities.activeLifestyleDesc',
    icon: 'footsteps',
    metrics: ['steps', 'distance', 'calories'],
  },
];

// Configuración por defecto
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  selectedPriority: 'active-lifestyle',
  customPriorities: [],
  visibleMetrics: ['steps', 'distance', 'calories', 'sleep', 'exercise', 'weight'],
  hiddenMetrics: ['glucose', 'mindfulness', 'food', 'water', 'heartRate'],
};

