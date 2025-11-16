import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  visible: boolean;
}

/**
 * Pantalla de splash con el logo de Luxor Fitness
 * Muestra el logo real desde assets
 */
export const SplashScreen: React.FC<SplashScreenProps> = React.memo(({ visible }) => {
  if (!visible) return null;

  // Dimensiones del logo (65% del ancho de pantalla, máximo 320px)
  const logoSize = Math.min(width * 0.65, 320);

  // IMPORTANTE: Reemplaza 'icon.png' con 'luxor-logo.png' cuando agregues tu logo
  // Por ahora usa icon.png como placeholder temporal
  const logoSource = require('../../assets/luxor-logo.png');

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  logo: {
    // El logo se ajustará automáticamente manteniendo su proporción
  },
});

