import React from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from './utils/clerkCache';

// Reemplaza esta clave con tu API key de Clerk
// Reemplaza esta clave con tu API key de Clerk
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('❌ Falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY en .env');
}

console.log('🔐 Clerk Key Loaded:', CLERK_PUBLISHABLE_KEY.substring(0, 10) + '...');

import { supabase } from './services/supabase';

import { TokenManager } from './services/TokenManager';

function ClerkSupabaseSync() {
  const { getToken, userId } = useAuth();

  React.useEffect(() => {
    const syncSession = async () => {
      if (!userId) {
        TokenManager.setToken(null);
        return;
      }

      // Registrar la función de obtención de token en el TokenManager
      // Esto permite que supabase.ts solicite un token fresco cuando lo necesite
      TokenManager.setTokenFetcher(async () => {
        return await getToken({ template: 'supabase' });
      });

      try {
        // Sincronización inicial
        const token = await getToken({ template: 'supabase' });

        if (token) {
          TokenManager.setToken(token);

          // También intentamos configurar Realtime si es posible (opcional)
          try {
            // @ts-ignore
            supabase.realtime.setAuth(token);
          } catch (e) {
            // Ignoramos errores de realtime
          }

          console.log('✅ Supabase initialized with Clerk token (TokenManager Dynamic Mode)');
        }
      } catch (err) {
        console.error('Error syncing Clerk session to Supabase:', err);
      }
    };

    syncSession();
  }, [userId, getToken]);

  return null;
}

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkSupabaseSync />
      {children}
    </ClerkProvider>
  );
}

