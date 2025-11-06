import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullScreen?: boolean;
}

/**
 * Componente unificado para mostrar estados de carga
 * Soporta tanto overlay como pantalla completa
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = React.memo(({ 
  visible, 
  message, 
  fullScreen = false 
}) => {
  if (!visible) return null;

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.fullScreen}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#00D4AA" />
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00D4AA" />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00D4AA',
    minWidth: 200,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    maxWidth: 250,
  },
});

