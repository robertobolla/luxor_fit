import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

import { TokenManager } from './TokenManager';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom fetch to inject Clerk token into every request
// @ts-ignore: Fetch signature compatibility
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    // Ahora getToken es async y refresca el token si es necesario
    let token = await TokenManager.getToken();

    if (!token) {
      // Si no hay token, esperar un momento (corrige race condition al inicio)
      token = await TokenManager.waitForToken(2000);
    }

    if (token) {

      init = init || {};
      init.headers = init.headers || {};

      // Inject Authorization header
      if (init.headers instanceof Headers) {
        init.headers.set('Authorization', `Bearer ${token}`);
        // Ensure apikey is present (robustness matching dashboard)
        if (!init.headers.has('apikey')) {
          init.headers.set('apikey', supabaseAnonKey);
        }
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['Authorization', `Bearer ${token}`]);
      } else {
        // @ts-ignore
        init.headers['Authorization'] = `Bearer ${token}`;
        // @ts-ignore
        if (!init.headers['apikey']) {
          // @ts-ignore
          init.headers['apikey'] = supabaseAnonKey;
        }
      }
    }

    const response = await fetch(input, init);

    // Detectar 401 (Unauthorized) o errores específicos de JWT
    if (response.status === 401) {
      console.warn('🔄 Detectado 401 Unauthorized en Supabase. Invalidando token...');
      await TokenManager.invalidateToken();
    }

    return response;
  } catch (error) {
    console.error('❌ FATAL customFetch error:', error);
    throw error;
  }
};

export const supabase = createClient<Database, 'public'>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: customFetch,
    }
  }
);

// Helper para manejar errores de Supabase
export const handleSupabaseError = (error: any) => {
  console.error('Supabase Error:', error);
  return {
    success: false,
    error: error.message || 'Error desconocido',
    data: null,
  };
};

// Helper para respuestas exitosas
export const handleSupabaseSuccess = (data: any) => {
  return {
    success: true,
    error: null,
    data,
  };
};

/**
 * Executes a Supabase RPC with retry logic for authentication errors.
 * This handles race conditions where Clerk token might not be synced yet.
 */
export async function callRpcWithRetry<T = any>(
  rpcName: string,
  params: object,
  maxRetries = 3,
  delayMs = 2000
): Promise<{ data: T | null; error: any }> {
  let attempt = 0;

  while (attempt < maxRetries) {
    // @ts-ignore: RPC generic type inference complexity
    const { data, error } = await supabase.rpc(rpcName as any, params as any);

    if (!error) {
      return { data: data as T, error: null };
    }

    // Check for auth errors (P0001 or "Not authenticated")
    const isAuthError = error.code === 'P0001' || error.message?.includes('Not authenticated');

    if (isAuthError && attempt < maxRetries - 1) {
      console.warn(`⏳ RPC ${rpcName} failed with auth error. Retrying in ${delayMs}ms (Attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    } else {
      return { data, error };
    }
  }

  return { data: null, error: { message: 'Max retries exceeded' } }; // Should be unreachable given loop logic
}
