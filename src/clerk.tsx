import React from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from './utils/clerkCache';

// Reemplaza esta clave con tu API key de Clerk
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_demo_key';

// Para desarrollo, usamos una clave demo
if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY === 'pk_test_demo_key') {
  console.warn('⚠️ Usando clave demo de Clerk. Configura EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY en tu .env');
}

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      {children}
    </ClerkProvider>
  );
}

