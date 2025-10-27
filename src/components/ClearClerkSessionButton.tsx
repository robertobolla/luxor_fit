import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export default function ClearClerkSessionButton() {
  const { signOut } = useClerk();

  const clearClerkSession = async () => {
    try {
      console.log('🧹 Iniciando limpieza de sesión de Clerk...');
      
      // 1. Cerrar sesión con Clerk
      await signOut();
      console.log('✅ Sesión de Clerk cerrada');
      
      // 2. Limpiar AsyncStorage
      const clerkKeys = [
        'clerk-session-token',
        'clerk-jwt',
        'clerk-user',
        'clerk-session',
        'clerk-active-session',
        'clerk-cache',
        'clerk-tokens',
        'clerk-auth-state'
      ];
      
      for (const key of clerkKeys) {
        try {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ Eliminado de AsyncStorage: ${key}`);
        } catch (error) {
          console.log(`⚠️ Error eliminando ${key}:`, error);
        }
      }
      
      // 3. Limpiar SecureStore
      const secureKeys = [
        'clerk-session-token',
        'clerk-jwt',
        'clerk-refresh-token',
        'clerk-access-token',
        'clerk-user-token'
      ];
      
      for (const key of secureKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
          console.log(`🗑️ Eliminado de SecureStore: ${key}`);
        } catch (error) {
          console.log(`⚠️ Error eliminando ${key}:`, error);
        }
      }
      
      console.log('✅ Limpieza de sesión completada');
      
      Alert.alert(
        '✅ Sesión Limpiada',
        'La sesión de Clerk ha sido limpiada completamente. La app se reiniciará.',
        [{ text: 'OK', onPress: () => {
          // Forzar recarga de la app
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}]
      );
      
    } catch (error) {
      console.error('❌ Error limpiando sesión:', error);
      Alert.alert('Error', 'No se pudo limpiar la sesión. Intenta reiniciar la app.');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity
        onPress={clearClerkSession}
        style={{
          backgroundColor: '#ff4444',
          padding: 15,
          borderRadius: 10,
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          🧹 Limpiar Sesión de Clerk
        </Text>
      </TouchableOpacity>
      
      <Text style={{ 
        color: '#666', 
        fontSize: 12, 
        textAlign: 'center',
        marginTop: 10
      }}>
        Usa este botón si la app te lleva al onboarding sin permitirte hacer login
      </Text>
    </View>
  );
}
