import { create } from 'zustand';
import { User, UserProfile } from '../types';
import { supabase } from '@/services/supabase';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        set({ 
          user: data.user as User, 
          isAuthenticated: true,
          isLoading: false 
        });
        
        // Cargar perfil del usuario
        await get().loadUser();
        
        return { success: true };
      }

      return { success: false, error: 'No se pudo iniciar sesión' };
    } catch (error) {
      return { success: false, error: 'Error inesperado' };
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        set({ 
          user: data.user as User, 
          isAuthenticated: true,
          isLoading: false 
        });
        
        return { success: true };
      }

      return { success: false, error: 'No se pudo crear la cuenta' };
    } catch (error) {
      return { success: false, error: 'Error inesperado' };
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithMagicLink: async (email: string) => {
    try {
      set({ isLoading: true });
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'fitmind://auth/callback',
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error inesperado' };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ 
        user: null, 
        profile: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  },

  loadUser: async () => {
    try {
      // Modo demo - simular carga de usuario
      console.log('Cargando usuario en modo demo...');
      
      // Simular delay de carga
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En modo demo, siempre redirigir a login
      set({ 
        user: null, 
        profile: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      set({ 
        user: null, 
        profile: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },

  updateProfile: async (profileData: Partial<UserProfile>) => {
    try {
      const { user } = get();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      set({ profile: data as UserProfile });
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error inesperado' };
    }
  },
}));

// Inicializar el store al cargar
useAuthStore.getState().loadUser();