// ============================================================================
// TUTORIAL TOOLTIP - Tooltips contextuales para guiar al usuario
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';
import { Ionicons } from '@expo/vector-icons';

export interface TooltipStep {
  element: React.ReactNode;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title?: string;
}

interface TutorialTooltipProps {
  steps: TooltipStep[];
  visible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export function TutorialTooltip({ steps, visible, onComplete, onSkip }: TutorialTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  if (!visible || !steps || steps.length === 0) {
    return <>{steps?.[0]?.element}</>;
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip ? onSkip() : onComplete();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Tooltip
      isVisible={isVisible}
      content={
        <View style={styles.tooltipContent}>
          {currentStepData.title && (
            <Text style={styles.tooltipTitle}>{currentStepData.title}</Text>
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
                {isLastStep ? 'Entendido' : 'Siguiente'}
              </Text>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={16} color="#000" style={styles.nextIcon} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      }
      placement={currentStepData.placement || 'bottom'}
      onClose={handleSkip}
      contentStyle={styles.tooltipContainer}
      tooltipStyle={styles.tooltip}
      arrowSize={{ width: 16, height: 8 }}
      backgroundColor="rgba(0, 0, 0, 0.7)"
    >
      {currentStepData.element}
    </Tooltip>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 0,
  },
  tooltipContent: {
    padding: 16,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginHorizontal: 3,
  },
  progressDotActive: {
    backgroundColor: '#ffb300',
    width: 18,
    height: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextIcon: {
    marginLeft: 4,
  },
});

