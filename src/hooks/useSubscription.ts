import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { paymentsService } from '../services/payments';

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [trialEnd, setTrialEnd] = useState<string | undefined>(undefined);
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) {
      console.log('🔐 useSubscription: No hay user.id');
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        console.log('📋 useSubscription: Verificando suscripción para user:', user.id);
        const res = await paymentsService.getSubscriptionStatus(user.id);
        console.log('📋 useSubscription: Resultado:', res);
        if (!mounted) return;
        setIsActive(!!res.isActive);
        setStatus(res.status ?? undefined);
        setTrialEnd(res.trialEnd ?? undefined);
        console.log('📋 useSubscription: isActive =', !!res.isActive);
      } catch (e) {
        console.error('❌ useSubscription: Error:', e);
        // Si es error de "no encontrado", está bien (usuario nuevo)
        if (e && typeof e === 'object' && 'code' in e && e.code !== 'PGRST116') {
          console.error('❌ Error inesperado al verificar suscripción:', e);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Función para refrescar el estado manualmente
  const refresh = async () => {
    if (!user?.id) {
      console.log('🔐 refresh: No hay user.id');
      return;
    }
    try {
      console.log('🔄 refresh: Refrescando suscripción para user:', user.id);
      const res = await paymentsService.getSubscriptionStatus(user.id);
      console.log('🔄 refresh: Resultado:', res);
      setIsActive(!!res.isActive);
      setStatus(res.status ?? undefined);
      setTrialEnd(res.trialEnd ?? undefined);
      console.log('🔄 refresh: isActive actualizado a', !!res.isActive);
    } catch (e) {
      console.error('❌ refresh: Error:', e);
    }
  };

  return { loading, isActive, status, trialEnd, refresh };
}


