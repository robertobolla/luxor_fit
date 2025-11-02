import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, TextInput } from 'react-native';
import { paymentsService } from '../src/services/payments';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useSubscription } from '../src/hooks/useSubscription';

export default function PaywallScreen() {
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const { isActive, loading: subLoading, refresh } = useSubscription();

  // El manejo de deep links está en _layout.tsx (global)
  // Aquí solo mantenemos la redirección si ya tiene suscripción activa

  // Redirigir si ya tiene suscripción activa (con timeout para evitar loops)
  useEffect(() => {
    if (!subLoading && isActive) {
      console.log('✅ Paywall: Usuario tiene suscripción activa, redirigiendo al home');
      const timer = setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, subLoading]); // Removido 'router' de dependencias

  const startTrial = useCallback(async () => {
    try {
      setLoading(true);
      const url = await paymentsService.createCheckoutSession(
        promoCode?.trim() || undefined,
        user?.id
      );
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('No se pudo abrir el navegador', 'Copia este enlace y ábrelo manualmente: ' + url);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo iniciar la prueba gratis');
    } finally {
      setLoading(false);
    }
  }, [promoCode, user?.id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso Premium</Text>
      <Text style={styles.subtitle}>Prueba gratis 7 días. Luego US$12.99/mes.</Text>
      <View style={styles.benefits}>
        <Text style={styles.benefit}>• Acceso total a planes y seguimiento</Text>
        <Text style={styles.benefit}>• IA para adaptar entrenamientos</Text>
        <Text style={styles.benefit}>• Notificaciones inteligentes</Text>
        <Text style={styles.benefit}>• Progreso, fotos y estadísticas</Text>
      </View>

      <View style={styles.couponRow}>
        <TextInput
          placeholder="Código de descuento (opcional)"
          placeholderTextColor="#777"
          style={styles.input}
          value={promoCode}
          onChangeText={setPromoCode}
          autoCapitalize="characters"
        />
      </View>

      <TouchableOpacity style={styles.cta} onPress={startTrial} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.ctaText}>Comenzar prueba gratis de 7 días</Text>
        )}
      </TouchableOpacity>

      {/* Botón temporal para refrescar suscripción (debug) */}
      <TouchableOpacity 
        style={[styles.cta, { backgroundColor: '#333', marginTop: 12 }]} 
        onPress={async () => {
          try {
            console.log('🔄 Refrescando suscripción manualmente...');
            await refresh();
            // Esperar un momento antes de verificar para evitar loops
            setTimeout(() => {
              console.log('✅ Refresh completado. Verificando estado...');
            }, 500);
          } catch (e) {
            console.error('❌ Error al refrescar:', e);
          }
        }}
      >
        <Text style={[styles.ctaText, { color: '#fff' }]}>🔄 Refrescar Suscripción (Debug)</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>Se requiere tarjeta. Cancela cuando quieras antes de que termine la prueba.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 24,
  },
  benefits: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
    padding: 16,
    marginBottom: 24,
  },
  couponRow: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  benefit: {
    color: '#e6e6e6',
    marginBottom: 8,
  },
  cta: {
    backgroundColor: '#ffd54a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  legal: {
    color: '#888888',
    marginTop: 16,
    fontSize: 12,
  },
});


