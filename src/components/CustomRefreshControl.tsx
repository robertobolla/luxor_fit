import React, { useRef, useEffect } from 'react';
import { RefreshControl, Animated, Platform } from 'react-native';

interface CustomRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
}

export const CustomRefreshControl: React.FC<CustomRefreshControlProps> = ({
  refreshing,
  onRefresh,
  tintColor = '#ffb300',
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

  // En Android, usar propiedades simplificadas para evitar problemas de renderizado
  if (Platform.OS === 'android') {
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[tintColor]}
        progressBackgroundColor="#2a2a2a"
      />
    );
  }

  // En iOS, usar todas las propiedades
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      title={title}
      titleColor={tintColor}
      progressBackgroundColor="#2a2a2a"
      colors={[tintColor]}
    />
  );
};
