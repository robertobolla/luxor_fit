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
let currentClerkToken: string | null = null;

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

  if (isSupabaseRequest && currentClerkToken) {
    // console.log('⚡ Interceptando fetch a Supabase:', resource);

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
      config.headers.set('Authorization', `Bearer ${currentClerkToken}`);
      // Asegurar apikey también
      if (!config.headers.has('apikey')) {
        config.headers.set('apikey', supabaseAnonKey);
      }
    } else if (Array.isArray(config.headers)) {
      config.headers.push(['Authorization', `Bearer ${currentClerkToken}`]);
      // @ts-ignore - Array check es complejo, asumimos objeto es más común
    } else {
      // @ts-ignore
      config.headers['Authorization'] = `Bearer ${currentClerkToken}`;
      // @ts-ignore
      if (!config.headers['apikey']) {
        // @ts-ignore
        config.headers['apikey'] = supabaseAnonKey;
      }
    }

    // console.log('💉 Token inyectado vía Monkey Patch!');
  }

  return originalFetch(resource, config);
};

// Crear cliente normal - ya no necesitamos customFetch porque tenemos el parche global
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
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

// Helper para inyectar token de Clerk manualmente (Bypass UUID check)
export const setSupabaseAuthToken = async (token: string | null) => {
  // Guardar en variable local para el interceptor
  currentClerkToken = token;

  // Intentar los métodos estándar por compatibilidad interna de la librería
  // (Aunque nuestro interceptor hará el trabajo real)
  if (!token) {
    // @ts-ignore
    if (supabase.rest) supabase.rest.headers['Authorization'] = undefined;
    // @ts-ignore
    supabase.realtime.setAuth(null);
    return;
  }

  // Inyectar en Realtime (este sí suele funcionar manual)
  if (supabase.realtime) {
    supabase.realtime.setAuth(token);
  }

  // YA NO llamamos a setSession porque falla con tokens de Clerk (no-UUID)
  // y nuestro Monkey Patch ya se encarga de inyectar el token en las peticiones de datos.
};
