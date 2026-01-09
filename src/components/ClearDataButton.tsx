import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface ClearDataButtonProps {
  onDataCleared?: () => void;
}

export default function ClearDataButton({ onDataCleared }: ClearDataButtonProps) {
  const [isClearing, setIsClearing] = useState(false);

  const clearAsyncStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => 
        key.includes('fitmind') || 
        key.includes('supabase') || 
        key.includes('clerk') ||
        key.includes('dashboard') ||
        key.includes('auth') ||
        key.includes('user')
      );
      
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
        console.log(`✅ AsyncStorage limpiado: ${appKeys.length} claves eliminadas`);
      }
      
      return { success: true, keysRemoved: appKeys.length };
    } catch (error: any) {
      console.error('❌ Error limpiando AsyncStorage:', error);
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  };

  const clearSecureStore = async () => {
    try {
      const authKeys = [
        'clerk-session-token',
        'clerk-jwt',
        'supabase-auth-token',
        'expo-secure-store-key',
        'auth-token',
        'refresh-token'
      ];
      
      let removedCount = 0;
      
      for (const key of authKeys) {
        try {
          const exists = await SecureStore.getItemAsync(key);
          if (exists) {
            await SecureStore.deleteItemAsync(key);
            removedCount++;
          }
        } catch (error) {
          // Ignorar errores de claves que no existen
        }
      }
      
      console.log(`✅ SecureStore limpiado: ${removedCount} tokens eliminados`);
      return { success: true, tokensRemoved: removedCount };
    } catch (error: any) {
      console.error('❌ Error limpiando SecureStore:', error);
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  };

  const handleClearData = async () => {
    Alert.alert(
      '🧹 Limpiar Datos de la App',
      '¿Estás seguro de que quieres borrar todos los datos locales de la app? Esto incluye:\n\n• Configuración del dashboard\n• Tokens de autenticación\n• Sesiones guardadas\n\n⚠️ Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpiar Todo',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            
            try {
              console.log('🚀 Iniciando limpieza de datos locales...');
              
              const asyncResult = await clearAsyncStorage();
              const secureResult = await clearSecureStore();
              
              const allSuccess = asyncResult.success && secureResult.success;
              
              if (allSuccess) {
                Alert.alert(
                  '✅ Datos Limpiados',
                  `Limpieza completada exitosamente:\n\n• ${asyncResult.keysRemoved} claves de AsyncStorage\n• ${secureResult.tokensRemoved} tokens de SecureStore\n\nLa app está lista para empezar desde cero.`,
                  [{ text: 'OK', onPress: onDataCleared }]
                );
              } else {
                Alert.alert(
                  '⚠️ Limpieza Parcial',
                  'Algunos datos no se pudieron limpiar completamente. Revisa la consola para más detalles.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error: any) {
              Alert.alert(
                '❌ Error',
                `Error durante la limpieza: ${error?.message || 'Error desconocido'}`,
                [{ text: 'OK' }]
              );
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isClearing && styles.buttonDisabled]}
        onPress={handleClearData}
        disabled={isClearing}
      >
        <Text style={styles.buttonText}>
          {isClearing ? '🧹 Limpiando...' : '🧹 Limpiar Datos Locales'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.description}>
        Borra todos los datos almacenados localmente en el dispositivo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  button: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});
