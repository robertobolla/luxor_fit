import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DashboardConfig,
  PRESET_PRIORITIES,
  AVAILABLE_METRICS,
  MetricType,
  Priority,
  PriorityPreset,
  CustomPriority,
} from '../types/dashboard';
import {
  loadDashboardConfig,
  setSelectedPriority,
  createCustomPriority,
  updateVisibleMetrics,
} from '../services/dashboardPreferences';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (config: DashboardConfig) => void;
}

export default function DashboardCustomizationModal({
  visible,
  onClose,
  onSave,
}: Props) {
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>();
  const [visibleMetrics, setVisibleMetrics] = useState<MetricType[]>([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [selectedCustomMetrics, setSelectedCustomMetrics] = useState<MetricType[]>([]);

  useEffect(() => {
    if (visible) {
      loadConfig();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadConfig = async () => {
    const loadedConfig = await loadDashboardConfig();
    setConfig(loadedConfig);
    setSelectedPriorityId(loadedConfig.selectedPriority);
    setVisibleMetrics(loadedConfig.visibleMetrics);
  };

  const handleSelectPriority = (priorityId: string) => {
    setSelectedPriorityId(priorityId);
    setIsCreatingCustom(false);
  };

  const handleCreateCustomPriority = () => {
    setIsCreatingCustom(true);
    
    // Si ya existe una prioridad personalizada, cargar sus métricas
    const existingCustom = config?.customPriorities.find(
      (p) => p.name === 'Prioridades personalizadas'
    );
    
    if (existingCustom) {
      setSelectedCustomMetrics(existingCustom.metrics);
    } else {
      setSelectedCustomMetrics([]);
    }
  };

  const toggleMetricInCustom = (metric: MetricType) => {
    if (selectedCustomMetrics.includes(metric)) {
      setSelectedCustomMetrics(selectedCustomMetrics.filter((m) => m !== metric));
    } else if (selectedCustomMetrics.length < 3) {
      setSelectedCustomMetrics([...selectedCustomMetrics, metric]);
    }
  };

  const toggleMetricVisibility = (metric: MetricType) => {
    if (visibleMetrics.includes(metric)) {
      setVisibleMetrics(visibleMetrics.filter((m) => m !== metric));
    } else {
      setVisibleMetrics([...visibleMetrics, metric]);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      // Si está creando una prioridad personalizada
      if (isCreatingCustom && selectedCustomMetrics.length > 0) {
        const customPriority = await createCustomPriority(
          'Prioridades personalizadas',
          selectedCustomMetrics
        );
        await setSelectedPriority(customPriority.id);
      } else if (selectedPriorityId) {
        await setSelectedPriority(selectedPriorityId);
      }

      // Actualizar métricas visibles
      const hiddenMetrics = AVAILABLE_METRICS
        .map((m) => m.id)
        .filter((id) => !visibleMetrics.includes(id));
      
      await updateVisibleMetrics(visibleMetrics, hiddenMetrics);

      // Recargar y notificar
      const updatedConfig = await loadDashboardConfig();
      onSave(updatedConfig);
      onClose();
    } catch (error) {
      console.error('Error saving dashboard config:', error);
    }
  };

  // Filtrar las prioridades personalizadas con nombre "Prioridades personalizadas"
  // para que no aparezcan duplicadas (ya que se muestra como botón)
  const filteredCustomPriorities = (config?.customPriorities || []).filter(
    (p) => p.name !== 'Prioridades personalizadas'
  );
  
  const allPriorities: Priority[] = [
    ...PRESET_PRIORITIES,
    ...filteredCustomPriorities,
  ];

  const renderPriorityOption = (priority: Priority) => {
    const isSelected = isCreatingCustom 
      ? false 
      : selectedPriorityId === priority.id;
    const isPreset = 'description' in priority;

    return (
      <TouchableOpacity
        key={priority.id}
        style={[
          styles.priorityCard,
          isSelected && styles.priorityCardSelected,
        ]}
        onPress={() => handleSelectPriority(priority.id)}
      >
        <View style={styles.priorityIconContainer}>
          <Ionicons
            name={isPreset ? (priority as PriorityPreset).icon as any : 'create'}
            size={32}
            color={isSelected ? '#1a1a1a' : '#00D4AA'}
          />
        </View>
        <View style={styles.priorityInfo}>
          <Text style={[styles.priorityName, isSelected && styles.priorityNameSelected]}>
            {priority.name}
          </Text>
          {isPreset && (
            <Text style={[styles.priorityDescription, isSelected && styles.priorityDescriptionSelected]}>
              {(priority as PriorityPreset).description}
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
        )}
      </TouchableOpacity>
    );
  };

  if (!config) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Personalizar Hoy</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Establecer prioridades */}
            <Text style={styles.sectionTitle}>Establece tus prioridades</Text>
            
            <View style={styles.prioritiesContainer}>
              {allPriorities.map(renderPriorityOption)}
              
              {/* Opción para crear prioridad personalizada */}
              <TouchableOpacity
                style={[
                  styles.priorityCard,
                  (isCreatingCustom || config?.customPriorities.find(p => p.name === 'Prioridades personalizadas' && p.id === selectedPriorityId)) && styles.priorityCardSelected,
                ]}
                onPress={handleCreateCustomPriority}
              >
                <View style={styles.priorityIconContainer}>
                  <Ionicons
                    name="create"
                    size={32}
                    color={(isCreatingCustom || config?.customPriorities.find(p => p.name === 'Prioridades personalizadas' && p.id === selectedPriorityId)) ? '#1a1a1a' : '#00D4AA'}
                  />
                </View>
                <View style={styles.priorityInfo}>
                  <Text style={[styles.priorityName, (isCreatingCustom || config?.customPriorities.find(p => p.name === 'Prioridades personalizadas' && p.id === selectedPriorityId)) && styles.priorityNameSelected]}>
                    Prioridades personalizadas
                  </Text>
                  <Text style={[styles.priorityDescription, (isCreatingCustom || config?.customPriorities.find(p => p.name === 'Prioridades personalizadas' && p.id === selectedPriorityId)) && styles.priorityDescriptionSelected]}>
                    Añade métricas
                  </Text>
                </View>
                {(isCreatingCustom || config?.customPriorities.find(p => p.name === 'Prioridades personalizadas' && p.id === selectedPriorityId)) && (
                  <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
                )}
              </TouchableOpacity>
            </View>

            {/* Selector de métricas personalizadas */}
            {isCreatingCustom && (
              <View style={styles.customMetricsSection}>
                <Text style={styles.customMetricsTitle}>
                  Selecciona hasta 3 métricas ({selectedCustomMetrics.length}/3)
                </Text>
                <View style={styles.metricsGrid}>
                  {AVAILABLE_METRICS.map((metric) => {
                    const isSelected = selectedCustomMetrics.includes(metric.id);
                    const isDisabled = !isSelected && selectedCustomMetrics.length >= 3;
                    
                    return (
                      <TouchableOpacity
                        key={metric.id}
                        style={[
                          styles.metricChip,
                          isSelected && styles.metricChipSelected,
                          isDisabled && styles.metricChipDisabled,
                        ]}
                        onPress={() => toggleMetricInCustom(metric.id)}
                        disabled={isDisabled}
                      >
                        <Ionicons
                          name={metric.icon as any}
                          size={20}
                          color={isSelected ? '#1a1a1a' : isDisabled ? '#666' : '#00D4AA'}
                        />
                        <Text style={[
                          styles.metricChipText,
                          isSelected && styles.metricChipTextSelected,
                          isDisabled && styles.metricChipTextDisabled,
                        ]}>
                          {metric.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Mostrar u ocultar otras métricas */}
            <View style={styles.visibilitySection}>
              <Text style={styles.sectionTitle}>Mostrar u ocultar otras métricas</Text>
              <Text style={styles.visibilityDescription}>
                Las métricas ocultas no aparecerán en tu dashboard
              </Text>
              
              {AVAILABLE_METRICS.map((metric) => {
                const isVisible = visibleMetrics.includes(metric.id);
                
                return (
                  <TouchableOpacity
                    key={metric.id}
                    style={styles.metricToggle}
                    onPress={() => toggleMetricVisibility(metric.id)}
                  >
                    <View style={styles.metricToggleLeft}>
                      <Ionicons name={metric.icon as any} size={24} color={metric.color} />
                      <Text style={styles.metricToggleText}>{metric.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.toggle,
                        isVisible && styles.toggleActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleKnob,
                          isVisible && styles.toggleKnobActive,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.9,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    fontSize: 16,
    color: '#00D4AA',
  },
  saveButton: {
    fontSize: 16,
    color: '#00D4AA',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  prioritiesContainer: {
    marginBottom: 32,
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityCardSelected: {
    backgroundColor: '#00D4AA',
    borderColor: '#00D4AA',
  },
  priorityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  priorityInfo: {
    flex: 1,
  },
  priorityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  priorityNameSelected: {
    color: '#1a1a1a',
  },
  priorityDescription: {
    fontSize: 14,
    color: '#999',
  },
  priorityDescriptionSelected: {
    color: '#1a1a1a',
    opacity: 0.7,
  },
  customMetricsSection: {
    marginBottom: 32,
  },
  customMetricsTitle: {
    fontSize: 16,
    color: '#00D4AA',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  metricChipSelected: {
    backgroundColor: '#00D4AA',
    borderColor: '#00D4AA',
  },
  metricChipDisabled: {
    opacity: 0.3,
  },
  metricChipText: {
    fontSize: 14,
    color: '#ffffff',
  },
  metricChipTextSelected: {
    color: '#1a1a1a',
  },
  metricChipTextDisabled: {
    color: '#666',
  },
  visibilitySection: {
    marginBottom: 32,
  },
  visibilityDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  metricToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  metricToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricToggleText: {
    fontSize: 16,
    color: '#ffffff',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#00D4AA',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
});

