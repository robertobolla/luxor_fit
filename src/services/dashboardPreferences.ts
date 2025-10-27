import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  CustomPriority,
  MetricType,
} from '../types/dashboard';

const STORAGE_KEY = '@fitmind_dashboard_config';

/**
 * Servicio para manejar las preferencias del dashboard
 */

/**
 * Carga la configuración del dashboard
 */
export async function loadDashboardConfig(): Promise<DashboardConfig> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_DASHBOARD_CONFIG;
  } catch (error) {
    console.error('Error loading dashboard config:', error);
    return DEFAULT_DASHBOARD_CONFIG;
  }
}

/**
 * Guarda la configuración del dashboard
 */
export async function saveDashboardConfig(config: DashboardConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving dashboard config:', error);
  }
}

/**
 * Actualiza la prioridad seleccionada
 */
export async function setSelectedPriority(priorityId: string): Promise<void> {
  const config = await loadDashboardConfig();
  config.selectedPriority = priorityId;
  await saveDashboardConfig(config);
}

/**
 * Crea o actualiza una prioridad personalizada
 */
export async function createCustomPriority(
  name: string,
  metrics: MetricType[]
): Promise<CustomPriority> {
  const config = await loadDashboardConfig();
  
  // Buscar si ya existe una prioridad con el mismo nombre
  const existingIndex = config.customPriorities.findIndex(
    (p) => p.name === name
  );
  
  let priority: CustomPriority;
  
  if (existingIndex >= 0) {
    // Actualizar la prioridad existente
    priority = {
      ...config.customPriorities[existingIndex],
      metrics,
    };
    config.customPriorities[existingIndex] = priority;
  } else {
    // Crear una nueva prioridad
    priority = {
      id: `custom-${Date.now()}`,
      name,
      metrics,
      isCustom: true,
    };
    config.customPriorities.push(priority);
  }
  
  config.selectedPriority = priority.id;
  
  await saveDashboardConfig(config);
  return priority;
}

/**
 * Elimina una prioridad personalizada
 */
export async function deleteCustomPriority(priorityId: string): Promise<void> {
  const config = await loadDashboardConfig();
  
  config.customPriorities = config.customPriorities.filter(
    (p) => p.id !== priorityId
  );
  
  // Si era la prioridad seleccionada, volver al default
  if (config.selectedPriority === priorityId) {
    config.selectedPriority = DEFAULT_DASHBOARD_CONFIG.selectedPriority;
  }
  
  await saveDashboardConfig(config);
}

/**
 * Actualiza las métricas visibles/ocultas
 */
export async function updateVisibleMetrics(
  visible: MetricType[],
  hidden: MetricType[]
): Promise<void> {
  const config = await loadDashboardConfig();
  config.visibleMetrics = visible;
  config.hiddenMetrics = hidden;
  await saveDashboardConfig(config);
}

/**
 * Resetea la configuración a los valores por defecto
 */
export async function resetDashboardConfig(): Promise<void> {
  await saveDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
}

