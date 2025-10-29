import React, { useRef, useEffect } from 'react';
import { RefreshControl, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
}

export const CustomRefreshControl: React.FC<CustomRefreshControlProps> = ({
  refreshing,
  onRefresh,
  tintColor = '#00D4AA',
  title = 'Actualizando...',
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotation.start();
      return () => rotation.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [refreshing, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      title={title}
      titleColor={tintColor}
      progressBackgroundColor="#2a2a2a"
      colors={[tintColor]}
      progressViewOffset={20}
    />
  );
};

// Hook para manejar el estado de refresh
export const useRefresh = (onRefresh: () => Promise<void>) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    onRefresh: handleRefresh,
  };
};
