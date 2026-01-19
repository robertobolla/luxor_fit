import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { paymentsService } from '../services/payments';
import {
  initializeRevenueCat,
  identifyUser,
  checkSubscriptionStatus,
  addCustomerInfoListener,
} from '../services/revenueCatService';
import { Platform } from 'react-native';

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [trialEnd, setTrialEnd] = useState<string | undefined>(undefined);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const { user } = useUser();

  const checkStatus = useCallback(async () => {
    if (!user?.id) {
      console.log('🔐 useSubscription: No hay user.id');
      setLoading(false);
      return;
    }

    try {
      console.log('📋 useSubscription: Verificando suscripción para user:', user.id);
      
      // 1. Primero verificar en Supabase (admin, socio, gimnasio, etc.)
      const dbResult = await paymentsService.getSubscriptionStatus(user.id, user);
      console.log('📋 useSubscription: Resultado DB:', dbResult);
      
      // Si tiene acceso por admin/socio/gimnasio, usar ese estado
      // TEMPORALMENTE DESACTIVADO PARA VER EL PAYWALL
      /* if (dbResult.isAdmin || dbResult.isPartnerFree || dbResult.isGymMember) {
        setIsActive(true);
        setStatus('active');
        console.log('📋 useSubscription: Acceso por rol especial');
        return;
      } */

      // 2. Verificar RevenueCat para iOS/Android (In-App Purchase)
      if (Platform.OS !== 'web') {
        try {
          await initializeRevenueCat(user.id);
          const identifiedUser = await identifyUser(user.id);
          
          // Solo verificar estado si el usuario fue identificado (RevenueCat está configurado)
          if (identifiedUser !== null) {
            const rcStatus = await checkSubscriptionStatus();
            console.log('📋 useSubscription: RevenueCat status:', rcStatus);
            
            if (rcStatus.isActive) {
              setIsActive(true);
              setStatus('active');
              setExpirationDate(rcStatus.expirationDate);
              console.log('📋 useSubscription: Acceso por RevenueCat IAP');
              return;
            }
          }
        } catch (rcError) {
          console.warn('⚠️ useSubscription: Error RevenueCat (puede no estar configurado):', rcError);
          // Continuar verificando en DB
        }
      }

      // 3. Usar el resultado de la base de datos
      setIsActive(!!dbResult.isActive);
      setStatus(dbResult.status ?? undefined);
      setTrialEnd(dbResult.trialEnd ?? undefined);
      console.log('📋 useSubscription: isActive =', !!dbResult.isActive);
      
    } catch (e) {
      console.error('❌ useSubscription: Error:', e);
      // Si es error de "no encontrado", está bien (usuario nuevo)
      if (e && typeof e === 'object' && 'code' in e && e.code !== 'PGRST116') {
        console.error('❌ Error inesperado al verificar suscripción:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Escuchar cambios en RevenueCat
  useEffect(() => {
    if (!user?.id || Platform.OS === 'web') return;

    const removeListener = addCustomerInfoListener((customerInfo) => {
      console.log('🔔 useSubscription: CustomerInfo actualizado');
      checkStatus();
    });

    return removeListener;
  }, [user?.id, checkStatus]);

  // Función para refrescar el estado manualmente
  const refresh = useCallback(async () => {
    if (!user?.id) {
      console.log('🔐 refresh: No hay user.id');
      return;
    }
    
    setLoading(true);
    await checkStatus();
    setLoading(false);
  }, [user?.id, checkStatus]);

  return { 
    loading, 
    isActive, 
    status, 
    trialEnd, 
    expirationDate,
    refresh 
  };
}
