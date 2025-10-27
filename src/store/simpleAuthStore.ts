import { create } from 'zustand';

interface SimpleAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<SimpleAuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      // Simular delay de login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En modo demo, siempre fallar el login
      set({ isLoading: false });
      return { success: false, error: 'Modo demo - Usa cualquier email y contraseña' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'Error inesperado' };
    }
  },

  signOut: () => {
    set({ 
      isAuthenticated: false, 
      user: null,
      isLoading: false 
    });
  },

  loadUser: async () => {
    try {
      console.log('Cargando usuario en modo demo...');
      
      // Simular delay de carga
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En modo demo, siempre no autenticado
      set({ 
        isAuthenticated: false,
        user: null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      set({ 
        isAuthenticated: false,
        user: null,
        isLoading: false 
      });
    }
  },
}));
