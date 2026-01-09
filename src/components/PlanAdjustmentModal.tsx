// ============================================================================
// PLAN ADJUSTMENT MODAL - Modal para mostrar ajustes realizados al plan
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlanAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  adjustmentData: {
    type: 'repeat' | 'basic' | 'full';
    calorieChange?: number;
    calorieChangePercent?: number;
    proteinChange?: number;
    carbsChange?: number;
    fatsChange?: number;
    oldCalories?: number;
    newCalories?: number;
    oldProtein?: number;
    newProtein?: number;
    adherence: number;
    hasBodyComposition: boolean;
  };
}

export default function PlanAdjustmentModal({
  visible,
  onClose,
  adjustmentData,
}: PlanAdjustmentModalProps) {
  const { type, calorieChange, calorieChangePercent, proteinChange, carbsChange, fatsChange, 
          oldCalories, newCalories, oldProtein, newProtein, adherence, hasBodyComposition } = adjustmentData;

  const getTitle = () => {
    if (type === 'repeat') return 'Plan Mantenido 🔄';
    if (type === 'basic') return 'Ajuste Básico Realizado ⚡';
    return 'Ajuste Completo Realizado 🎯';
  };

  const getMainMessage = () => {
    if (type === 'repeat') {
      return `Debido a tu adherencia del ${adherence}%, hemos decidido mantener el mismo plan esta semana. Una mayor adherencia nos permitirá hacer ajustes más precisos.`;
    }
    
    if (type === 'basic') {
      const direction = calorieChange! > 0 ? 'aumentado' : 'reducido';
      return `Hemos ${direction} tus calorías un ${Math.abs(calorieChangePercent!)}% manteniendo tu ingesta de proteínas para optimizar tu progreso.`;
    }

    const direction = calorieChange! > 0 ? 'aumentado' : 'reducido';
    return `Hemos ${direction} tus calorías un ${Math.abs(calorieChangePercent!)}% y ajustado todos tus macronutrientes basándonos en tu composición corporal actualizada.`;
  };

  const getIcon = () => {
    if (type === 'repeat') return 'repeat';
    if (type === 'basic') return 'flash';
    return 'analytics';
  };

  const getIconColor = () => {
    if (type === 'repeat') return '#666';
    if (type === 'basic') return '#ffb300';
    return '#4caf50';
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Icono principal */}
          <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
            <Ionicons name={getIcon() as any} size={48} color={getIconColor()} />
          </View>

          {/* Título */}
          <Text style={styles.title}>{getTitle()}</Text>

          {/* Mensaje principal */}
          <Text style={styles.mainMessage}>{getMainMessage()}</Text>

          {/* Detalles de los cambios */}
          {type !== 'repeat' && (
            <View style={styles.changesContainer}>
              <Text style={styles.changesTitle}>Cambios Realizados</Text>
              
              {/* Calorías */}
              <View style={styles.changeRow}>
                <View style={styles.changeLabel}>
                  <Ionicons name="flame" size={18} color="#ff9500" />
                  <Text style={styles.changeLabelText}>Calorías</Text>
                </View>
                <View style={styles.changeValues}>
                  <Text style={styles.oldValue}>{oldCalories} kcal</Text>
                  <Ionicons name="arrow-forward" size={16} color="#666" />
                  <Text style={styles.newValue}>{newCalories} kcal</Text>
                  <View style={[styles.changeBadge, calorieChange! > 0 ? styles.increaseBadge : styles.decreaseBadge]}>
                    <Text style={styles.changeBadgeText}>
                      {calorieChange! > 0 ? '+' : ''}{calorieChangePercent}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Proteína */}
              {type === 'basic' ? (
                <View style={styles.changeRow}>
                  <View style={styles.changeLabel}>
                    <Ionicons name="fitness" size={18} color="#4caf50" />
                    <Text style={styles.changeLabelText}>Proteína</Text>
                  </View>
                  <View style={styles.changeValues}>
                    <Text style={styles.maintainedValue}>{oldProtein}g (mantenida)</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.changeRow}>
                    <View style={styles.changeLabel}>
                      <Ionicons name="fitness" size={18} color="#4caf50" />
                      <Text style={styles.changeLabelText}>Proteína</Text>
                    </View>
                    <View style={styles.changeValues}>
                      <Text style={styles.oldValue}>{oldProtein}g</Text>
                      <Ionicons name="arrow-forward" size={16} color="#666" />
                      <Text style={styles.newValue}>{newProtein}g</Text>
                      <View style={[styles.changeBadge, proteinChange! >= 0 ? styles.increaseBadge : styles.decreaseBadge]}>
                        <Text style={styles.changeBadgeText}>
                          {proteinChange! > 0 ? '+' : ''}{proteinChange}g
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Carbohidratos y Grasas si hay cambio completo */}
                  {carbsChange !== undefined && (
                    <>
                      <View style={styles.changeRow}>
                        <View style={styles.changeLabel}>
                          <Ionicons name="pizza" size={18} color="#ffb300" />
                          <Text style={styles.changeLabelText}>Carbohidratos</Text>
                        </View>
                        <View style={styles.changeValues}>
                          <View style={[styles.changeBadge, carbsChange >= 0 ? styles.increaseBadge : styles.decreaseBadge]}>
                            <Text style={styles.changeBadgeText}>
                              {carbsChange > 0 ? '+' : ''}{carbsChange}g
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.changeRow}>
                        <View style={styles.changeLabel}>
                          <Ionicons name="water" size={18} color="#2196f3" />
                          <Text style={styles.changeLabelText}>Grasas</Text>
                        </View>
                        <View style={styles.changeValues}>
                          <View style={[styles.changeBadge, fatsChange! >= 0 ? styles.increaseBadge : styles.decreaseBadge]}>
                            <Text style={styles.changeBadgeText}>
                              {fatsChange! > 0 ? '+' : ''}{fatsChange}g
                            </Text>
                          </View>
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* Recomendación */}
          {type === 'repeat' && (
            <View style={styles.recommendationCard}>
              <Ionicons name="bulb" size={20} color="#ffb300" />
              <Text style={styles.recommendationText}>
                Para obtener mejores resultados, intenta seguir el plan al menos en un 70% esta semana.
              </Text>
            </View>
          )}

          {type === 'basic' && !hasBodyComposition && (
            <View style={styles.recommendationCard}>
              <Ionicons name="information-circle" size={20} color="#2196f3" />
              <Text style={styles.recommendationText}>
                Para ajustes más precisos, considera registrar tu porcentaje de grasa y masa muscular la próxima semana.
              </Text>
            </View>
          )}

          {/* Botón de cerrar */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  mainMessage: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  changesContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  changesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffb300',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changeRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  changeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  changeLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  changeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  oldValue: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  newValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  maintainedValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4caf50',
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  increaseBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  decreaseBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#ffb300',
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: '#ffb300',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

