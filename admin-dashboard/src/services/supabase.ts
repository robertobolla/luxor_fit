import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// ==========================================
// MONKEY PATCH: GLOBAL FETCH INTERCEPTOR
// ==========================================
// Esto garantiza que CUALQUIER petición a Supabase (incluso internas del cliente)
// lleve el token de Clerk si está disponible.

const originalFetch = window.fetch;
let tokenProvider: (() => Promise<string | null>) | null = null;

// Sobrescribir fetch global
window.fetch = async (...args) => {
  let [resource, config] = args;

  // Si es una petición a Supabase (usan string usualmente, pero fetch acepta Request object también)
  let isSupabaseRequest = false;

  if (typeof resource === 'string' && resource.includes(supabaseUrl)) {
    isSupabaseRequest = true;
  } else if (resource instanceof Request && resource.url.includes(supabaseUrl)) {
    isSupabaseRequest = true;
  }

  if (isSupabaseRequest && tokenProvider) {
    try {
      const freshToken = await tokenProvider();
      if (freshToken) {
        // Asegurar que config existe
        if (!config) {
          config = {};
        }

        // Asegurar que headers existe
        if (!config.headers) {
          config.headers = {};
        }

        // Inyectar token
        // Manejar los diferentes tipos de headers que fetch acepta
        if (config.headers instanceof Headers) {
          config.headers.set('Authorization', `Bearer ${freshToken}`);
          // Asegurar apikey también
          if (!config.headers.has('apikey')) {
            config.headers.set('apikey', supabaseAnonKey);
          }
        } else if (Array.isArray(config.headers)) {
          config.headers.push(['Authorization', `Bearer ${freshToken}`]);
          // @ts-ignore
        } else {
          // @ts-ignore
          config.headers['Authorization'] = `Bearer ${freshToken}`;
          // @ts-ignore
          if (!config.headers['apikey']) {
            // @ts-ignore
            config.headers['apikey'] = supabaseAnonKey;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching fresh token for Supabase request:', e);
    }
  }

  return originalFetch(resource, config);
};

// Crear cliente normal - ya no necesitamos customFetch porque tenemos el parche global
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      apikey: supabaseAnonKey,
    },
  },
});

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

// Configurar el proveedor dinámico que obtiene el token fresco de Clerk
export const setSupabaseTokenProvider = (provider: () => Promise<string | null>) => {
  tokenProvider = provider;
};

// (Deprecated) Mantener de backwards compatibility si en algún lado se llama directamente
export const setSupabaseAuthToken = async (token: string | null) => {
  // If explicitly called with a static string, we wrap it in a provider temporarily,
  // but the main app will be refactored to use setSupabaseTokenProvider
  if (token) {
    tokenProvider = async () => token;
  }
};
