// ============================================================================
// TUTORIAL TOOLTIP - Tooltips contextuales para guiar al usuario
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TooltipStep {
  element: React.ReactNode;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title?: string;
  // Nuevo: posición del spotlight (para resaltar un elemento)
  spotlightPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: number;
  };
}

interface TutorialTooltipProps {
  steps: TooltipStep[];
  visible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export function TutorialTooltip({ steps, visible, onComplete, onSkip }: TutorialTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  // Si no es visible o no hay steps, no renderizar nada
  if (!visible || !steps || steps.length === 0) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Llamar onComplete que cierra el modal desde el padre
      onComplete();
    }
  };

  const handleSkip = () => {
    // Llamar onSkip o onComplete que cierra el modal desde el padre
    onSkip ? onSkip() : onComplete();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const spotlight = currentStepData.spotlightPosition;

  // Calcular la posición óptima del tooltip basado en el spotlight
  const getTooltipPosition = () => {
    if (!spotlight) {
      return { top: '20%' as any };
    }
    
    const TOOLTIP_HEIGHT = 300; // Altura aproximada del tooltip
    const TOP_SAFE_AREA = 70; // Área segura superior
    const MARGIN = 40; // Margen entre tooltip y spotlight
    
    const spotlightTop = spotlight.y;
    const spotlightBottom = spotlight.y + spotlight.height;
    
    // Calcular espacios disponibles
    const spaceAbove = spotlightTop - TOP_SAFE_AREA - MARGIN;
    const spaceBelow = SCREEN_HEIGHT - spotlightBottom - MARGIN - 120; // 120 para tab bar
    
    // Si el spotlight está muy abajo (y > 500), forzar tooltip arriba
    if (spotlightTop > 500) {
      // Poner el tooltip lo más arriba posible
      return { top: TOP_SAFE_AREA };
    }
    
    // Si hay espacio suficiente arriba
    if (spaceAbove >= TOOLTIP_HEIGHT) {
      return { top: spotlightTop - TOOLTIP_HEIGHT - MARGIN };
    }
    
    // Si hay espacio suficiente abajo
    if (spaceBelow >= TOOLTIP_HEIGHT) {
      return { top: spotlightBottom + MARGIN };
    }
    
    // Fallback: poner arriba en el área segura
    return { top: TOP_SAFE_AREA };
  };

  // Calcular las dimensiones de las áreas del overlay (para crear el hueco del spotlight)
  const renderOverlayWithSpotlight = () => {
    if (!spotlight) {
      return <View style={styles.fullOverlay} />;
    }

    const padding = 8;
    const spotX = spotlight.x - padding;
    const spotY = spotlight.y - padding;
    const spotWidth = spotlight.width + padding * 2;
    const spotHeight = spotlight.height + padding * 2;
    const borderRadius = spotlight.borderRadius || 12;

    return (
      <>
        {/* Área superior */}
        <View style={[styles.overlayPart, { 
          top: 0, 
          left: 0, 
          right: 0, 
          height: spotY 
        }]} />
        
        {/* Área izquierda (al lado del spotlight) */}
        <View style={[styles.overlayPart, { 
          top: spotY, 
          left: 0, 
          width: spotX, 
          height: spotHeight 
        }]} />
        
        {/* Área derecha (al lado del spotlight) */}
        <View style={[styles.overlayPart, { 
          top: spotY, 
          left: spotX + spotWidth, 
          right: 0, 
          height: spotHeight 
        }]} />
        
        {/* Área inferior */}
        <View style={[styles.overlayPart, { 
          top: spotY + spotHeight, 
          left: 0, 
          right: 0, 
          bottom: 0 
        }]} />

        {/* Borde del spotlight */}
        <View style={[styles.spotlightBorder, {
          top: spotY,
          left: spotX,
          width: spotWidth,
          height: spotHeight,
          borderRadius: borderRadius,
        }]}>
          {/* Anillo exterior animado */}
          <View style={[styles.spotlightOuterRing, { borderRadius: borderRadius + 4 }]} />
        </View>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {/* Overlay con hueco para el spotlight */}
        {renderOverlayWithSpotlight()}

        {/* Contenido del tooltip */}
        <View style={[styles.tooltipWrapper, getTooltipPosition()]}>
          <View style={styles.tooltipContainer}>
            {/* Icono decorativo */}
            <View style={styles.iconContainer}>
              <Ionicons 
                name={
                  currentStepData.title?.includes('💪') ? 'fitness' :
                  currentStepData.title?.includes('✨') ? 'barbell' :
                  currentStepData.title?.includes('📋') ? 'list' :
                  currentStepData.title?.includes('🏠') ? 'home' :
                  currentStepData.title?.includes('🥗') ? 'nutrition' :
                  currentStepData.title?.includes('📊') ? 'stats-chart' :
                  currentStepData.title?.includes('❓') ? 'help-circle' :
                  currentStepData.title?.includes('📈') ? 'trending-up' :
                  currentStepData.title?.includes('🎯') ? 'fitness' :
                  currentStepData.title?.includes('⚙️') ? 'settings' :
                  currentStepData.title?.includes('👥') ? 'people' :
                  currentStepData.title?.includes('📝') ? 'document-text' :
                  currentStepData.title?.includes('✏️') ? 'create' :
                  currentStepData.title?.includes('📅') ? 'calendar' :
                  currentStepData.title?.includes('🗑️') ? 'trash' :
                  currentStepData.title?.includes('➕') ? 'add-circle' :
                  currentStepData.title?.includes('📆') ? 'calendar-outline' :
                  currentStepData.title?.includes('💾') ? 'save' :
                  currentStepData.title?.includes('🎉') ? 'checkmark-done-circle' :
                  'information-circle'
                } 
                size={28} 
                color="#ffb300" 
              />
            </View>

            {currentStepData.title && (
              <Text style={styles.tooltipTitle}>
                {currentStepData.title.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ¿?¡!.,]/g, '').trim()}
              </Text>
            )}
            <Text style={styles.tooltipText}>{currentStepData.content}</Text>
            
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                    index < currentStep && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Saltar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>
                  {isLastStep ? '¡Entendido!' : 'Siguiente'}
                </Text>
                {!isLastStep && (
                  <Ionicons name="arrow-forward" size={16} color="#000" style={styles.nextIcon} />
                )}
              </TouchableOpacity>
            </View>

            {/* Step counter */}
            <Text style={styles.stepCounter}>
              {currentStep + 1} de {steps.length}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  overlayPart: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#ffb300',
    backgroundColor: 'transparent',
  },
  spotlightOuterRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderWidth: 2,
    borderColor: 'rgba(255, 179, 0, 0.4)',
  },
  tooltipWrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  tooltipContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
    borderColor: '#ffb300',
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    gap: 5,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  progressDotActive: {
    backgroundColor: '#ffb300',
    width: 24,
    height: 8,
  },
  progressDotCompleted: {
    backgroundColor: '#ffb300',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  skipButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextIcon: {
    marginLeft: 6,
  },
  stepCounter: {
    textAlign: 'center',
    color: '#666',
    fontSize: 11,
    marginTop: 10,
  },
});
