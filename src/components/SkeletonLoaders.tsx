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
});
