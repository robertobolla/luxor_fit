/**
 * Tipos para el sistema de personalización del dashboard
 */

export type MetricType = 
  | 'steps'
  | 'distance'
  | 'calories'
  | 'sleep'
  | 'exercise'
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

// Métricas disponibles
export const AVAILABLE_METRICS: MetricConfig[] = [
  {
    id: 'steps',
    name: 'Pasos',
    icon: 'footsteps',
    color: '#00D4AA',
    unit: 'pasos',
  },
  {
    id: 'distance',
    name: 'Distancia',
    icon: 'location',
    color: '#00D4AA',
    unit: 'km',
  },
  {
    id: 'calories',
    name: 'Calorías quemadas',
    icon: 'flame',
    color: '#FF6B35',
    unit: 'kcal',
  },
  {
    id: 'sleep',
    name: 'Duración del sueño',
    icon: 'moon',
    color: '#9B5DE5',
    unit: 'h',
  },
  {
    id: 'exercise',
    name: 'Días de ejercicio',
    icon: 'barbell',
    color: '#00D4AA',
    unit: 'días',
  },
  {
    id: 'weight',
    name: 'Peso',
    icon: 'fitness',
    color: '#F15BB5',
    unit: 'kg',
  },
  {
    id: 'glucose',
    name: 'Glucosa',
    icon: 'water',
    color: '#00BBF9',
    unit: 'mg/dL',
  },
  {
    id: 'mindfulness',
    name: 'Días de mindfulness',
    icon: 'flower',
    color: '#FEE440',
  },
  {
    id: 'food',
    name: 'Comida',
    icon: 'restaurant',
    color: '#FF6B35',
    unit: 'kcal',
  },
  {
    id: 'water',
    name: 'Agua',
    icon: 'water',
    color: '#00BBF9',
    unit: 'ml',
  },
  {
    id: 'heartRate',
    name: 'Frecuencia cardíaca',
    icon: 'heart',
    color: '#F15BB5',
    unit: 'bpm',
  },
];

// Prioridades preestablecidas
export const PRESET_PRIORITIES: PriorityPreset[] = [
  {
    id: 'sleep-better',
    name: 'Duerme mejor',
    description: 'Duración del sueño • Pasos • Días de mindfulness',
    icon: 'moon',
    metrics: ['sleep', 'steps', 'mindfulness'],
  },
  {
    id: 'eat-better',
    name: 'Come mejor',
    description: 'Comida • Pasos • Peso',
    icon: 'restaurant',
    metrics: ['food', 'steps', 'weight'],
  },
  {
    id: 'lose-weight',
    name: 'Pierde peso',
    description: 'Peso • Calorías • Pasos',
    icon: 'fitness',
    metrics: ['weight', 'calories', 'steps'],
  },
  {
    id: 'active-lifestyle',
    name: 'Vida activa',
    description: 'Pasos • Distancia • Calorías',
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

