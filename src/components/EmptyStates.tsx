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
    <View style={styles.iconContainer}>
      <Ionicons name={icon as any} size={64} color="#666" />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {actionText && onAction && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction}>
        <Text style={styles.actionButtonText}>{actionText}</Text>
        <Ionicons name="arrow-forward" size={16} color="#ffb300" />
      </TouchableOpacity>
    )}
  </View>
);

// Estados vacíos específicos para diferentes pantallas
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
});
