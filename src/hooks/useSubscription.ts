import { useEffect, useState } from 'react';
import { paymentsService } from '../services/payments';

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [trialEnd, setTrialEnd] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await paymentsService.getSubscriptionStatus();
        if (!mounted) return;
        setIsActive(!!res.isActive);
        setStatus(res.status ?? undefined);
        setTrialEnd(res.trialEnd ?? undefined);
      } catch (_e) {
        // Silencio: usuarios nuevos aún no tienen fila
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, isActive, status, trialEnd };
}


