import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonBox: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC = () => (
  <View style={styles.skeletonCard}>
    <SkeletonBox width="60%" height={16} style={{ marginBottom: 8 }} />
    <SkeletonBox width="40%" height={14} style={{ marginBottom: 12 }} />
    <SkeletonBox width="100%" height={12} style={{ marginBottom: 4 }} />
    <SkeletonBox width="80%" height={12} style={{ marginBottom: 4 }} />
    <SkeletonBox width="90%" height={12} />
  </View>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
);

export const SkeletonProfile: React.FC = () => (
  <View style={styles.skeletonProfile}>
    <SkeletonBox width={80} height={80} borderRadius={40} style={{ marginBottom: 16 }} />
    <SkeletonBox width="70%" height={20} style={{ marginBottom: 8 }} />
    <SkeletonBox width="50%" height={16} style={{ marginBottom: 20 }} />
    <View style={styles.skeletonStats}>
      <SkeletonBox width="30%" height={40} borderRadius={8} />
      <SkeletonBox width="30%" height={40} borderRadius={8} />
      <SkeletonBox width="30%" height={40} borderRadius={8} />
    </View>
  </View>
);

export const SkeletonWorkoutCard: React.FC = () => (
  <View style={styles.skeletonWorkoutCard}>
    <View style={styles.skeletonWorkoutHeader}>
      <SkeletonBox width="60%" height={18} />
      <SkeletonBox width="25%" height={14} borderRadius={12} />
    </View>
    <SkeletonBox width="100%" height={12} style={{ marginBottom: 8 }} />
    <SkeletonBox width="80%" height={12} style={{ marginBottom: 12 }} />
    <View style={styles.skeletonWorkoutActions}>
      <SkeletonBox width="40%" height={36} borderRadius={18} />
      <SkeletonBox width="30%" height={36} borderRadius={18} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#333',
  },
  skeletonCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonList: {
    paddingHorizontal: 20,
  },
  skeletonProfile: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    margin: 20,
  },
  skeletonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  skeletonWorkoutCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  skeletonWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skeletonWorkoutActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  skeletonProgressCircles: {
    marginBottom: 32,
  },
  skeletonCircleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  skeletonMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonMetricCard: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonChartContainer: {
    marginBottom: 24,
  },
  skeletonStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonStatCard: {
    width: '48%',
    marginBottom: 12,
  },
  skeletonMacrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  skeletonMacroCard: {
    width: '48%',
    marginBottom: 12,
  },
  skeletonMealsContainer: {
    marginBottom: 24,
  },
  skeletonMealCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonWorkoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});

// Componentes de animación
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export const FadeInView: React.FC<FadeInViewProps> = ({ 
  children, 
  delay = 0, 
  duration = 300 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, delay, duration]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
};

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
}

export const SlideInView: React.FC<SlideInViewProps> = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 300 
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [slideAnim, delay, duration]);

  const getTransform = () => {
    const distance = 50;
    switch (direction) {
      case 'up':
        return { translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }) };
      case 'down':
        return { translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-distance, 0],
        }) };
      case 'left':
        return { translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }) };
      case 'right':
        return { translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-distance, 0],
        }) };
      default:
        return { translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }) };
    }
  };

  return (
    <Animated.View style={{ transform: [getTransform()] }}>
      {children}
    </Animated.View>
  );
};

// Skeleton específico para Dashboard
export const SkeletonDashboard: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Header */}
    <View style={styles.skeletonHeader}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <SkeletonBox width="60%" height={24} style={{ marginLeft: 12 }} />
      <SkeletonBox width={40} height={40} borderRadius={20} />
    </View>
    
    {/* Círculos de progreso */}
    <View style={styles.skeletonProgressCircles}>
      <View style={styles.skeletonCircleContainer}>
        <SkeletonBox width={120} height={120} borderRadius={60} />
        <SkeletonBox width="80%" height={16} style={{ marginTop: 12 }} />
        <SkeletonBox width="60%" height={14} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.skeletonProgressRow}>
        <View style={styles.skeletonCircleContainer}>
          <SkeletonBox width={80} height={80} borderRadius={40} />
          <SkeletonBox width="70%" height={14} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.skeletonCircleContainer}>
          <SkeletonBox width={80} height={80} borderRadius={40} />
          <SkeletonBox width="70%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
    
    {/* Métricas */}
    <View style={styles.skeletonMetrics}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonMetricCard}>
          <SkeletonBox width="40%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonBox width="60%" height={20} style={{ marginBottom: 4 }} />
          <SkeletonBox width="50%" height={14} />
        </View>
      ))}
    </View>
  </View>
);

// Skeleton específico para Progress
export const SkeletonProgress: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Header */}
    <View style={styles.skeletonHeader}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <SkeletonBox width="60%" height={24} style={{ marginLeft: 12 }} />
      <SkeletonBox width={40} height={40} borderRadius={20} />
    </View>
    
    {/* Gráficos */}
    <View style={styles.skeletonChartContainer}>
      <SkeletonBox width="100%" height={200} borderRadius={12} style={{ marginBottom: 16 }} />
      <SkeletonBox width="100%" height={150} borderRadius={12} />
    </View>
    
    {/* Estadísticas */}
    <View style={styles.skeletonStatsGrid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonStatCard}>
          <SkeletonBox width="100%" height={60} borderRadius={8} />
        </View>
      ))}
    </View>
  </View>
);

// Skeleton específico para Workout
export const SkeletonWorkout: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Header */}
    <View style={styles.skeletonHeader}>
      <SkeletonBox width="50%" height={28} />
      <SkeletonBox width={100} height={36} borderRadius={18} />
    </View>
    
    {/* Planes de entrenamiento */}
    <View style={styles.skeletonList}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonWorkoutCard}>
          <View style={styles.skeletonWorkoutHeader}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <SkeletonBox width="60%" height={18} style={{ marginLeft: 8 }} />
            <SkeletonBox width={60} height={20} borderRadius={10} />
          </View>
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 8, marginTop: 12 }} />
          <SkeletonBox width="80%" height={12} style={{ marginBottom: 12 }} />
          <View style={styles.skeletonWorkoutStats}>
            <SkeletonBox width="30%" height={14} />
            <SkeletonBox width="30%" height={14} />
            <SkeletonBox width="30%" height={14} />
          </View>
        </View>
      ))}
    </View>
  </View>
);

// Skeleton específico para Nutrition
export const SkeletonNutrition: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Header con fecha */}
    <View style={styles.skeletonHeader}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <SkeletonBox width="50%" height={24} style={{ marginLeft: 12 }} />
      <SkeletonBox width={40} height={40} borderRadius={20} />
    </View>
    
    {/* Tarjetas de macros */}
    <View style={styles.skeletonMacrosContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonMacroCard}>
          <SkeletonBox width="100%" height={80} borderRadius={12} />
        </View>
      ))}
    </View>
    
    {/* Comidas del día */}
    <View style={styles.skeletonMealsContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonMealCard}>
          <SkeletonBox width="30%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonBox width="100%" height={12} style={{ marginBottom: 4 }} />
          <SkeletonBox width="80%" height={12} style={{ marginBottom: 4 }} />
          <SkeletonBox width="60%" height={12} />
        </View>
      ))}
    </View>
  </View>
);
