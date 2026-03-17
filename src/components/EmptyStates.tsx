import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
  style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  style
}) => (
  <View style={[styles.container, style]}>
    {/* Decorative background glow */}
    <View style={styles.glowOuter}>
      <View style={styles.glowInner}>
        <Ionicons name={icon as any} size={48} color="#FFD54A" />
      </View>
    </View>

    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>

    {actionText && onAction && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
        <Ionicons name="add-circle" size={20} color="#0a0a0a" />
        <Text style={styles.actionButtonText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Specific empty states ──────────────────────────────────────────────────

export const EmptyWorkouts: React.FC<{ onGeneratePlan?: () => void }> = ({ onGeneratePlan }) => (
  <EmptyState
    icon="fitness-outline"
    title="¡Crea tu primer plan!"
    subtitle="Genera un plan de entrenamiento personalizado basado en tus objetivos y nivel de fitness."
    actionText="Generar Plan"
    onAction={onGeneratePlan}
  />
);

export const EmptyWorkoutPlans: React.FC<{ onGeneratePlan?: () => void }> = ({ onGeneratePlan }) => (
  <EmptyState
    icon="calendar-outline"
    title="No tienes planes activos"
    subtitle="Crea un nuevo plan de entrenamiento para comenzar tu rutina de ejercicios."
    actionText="Crear Plan"
    onAction={onGeneratePlan}
  />
);

export const EmptyProgress: React.FC<{ onStartTracking?: () => void }> = ({ onStartTracking }) => (
  <EmptyState
    icon="trending-up-outline"
    title="Comienza a registrar tu progreso"
    subtitle="Completa entrenamientos y registra tus records personales para ver tu evolución."
    actionText="Ver Entrenamientos"
    onAction={onStartTracking}
  />
);

export const EmptyPersonalRecords: React.FC<{ onStartTracking?: () => void }> = ({ onStartTracking }) => (
  <EmptyState
    icon="trophy-outline"
    title="No tienes records registrados"
    subtitle="Completa entrenamientos y marca tus mejores series para comenzar a trackear tu progreso."
    actionText="Ver Entrenamientos"
    onAction={onStartTracking}
  />
);

export const EmptyNutrition: React.FC<{ onSetupNutrition?: () => void }> = ({ onSetupNutrition }) => (
  <EmptyState
    icon="nutrition-outline"
    title="Configura tu nutrición"
    subtitle="Establece tus objetivos nutricionales y comienza a trackear tu alimentación."
    actionText="Configurar Nutrición"
    onAction={onSetupNutrition}
  />
);

export const EmptyNotifications: React.FC = () => (
  <EmptyState
    icon="notifications-outline"
    title="Notificaciones habilitadas"
    subtitle="Recibirás recordatorios inteligentes basados en tu adherencia y progreso."
  />
);

export const EmptySearch: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => (
  <EmptyState
    icon="search-outline"
    title={searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "Buscar"}
    subtitle={searchTerm ? "Intenta con otros términos de búsqueda." : "Ingresa un término para buscar."}
  />
);

export const EmptyError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="alert-circle-outline"
    title="Algo salió mal"
    subtitle="No pudimos cargar la información. Verifica tu conexión e intenta nuevamente."
    actionText="Reintentar"
    onAction={onRetry}
  />
);

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  // Outer glow ring
  glowOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 213, 74, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    // Subtle border to imitate glow
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 74, 0.15)',
  },
  // Inner circle with icon
  glowInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 213, 74, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 74, 0.25)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 280,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD54A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    // Subtle shadow
    shadowColor: '#FFD54A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0a',
  },
});
