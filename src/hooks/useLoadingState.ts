import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook unificado para manejar estados de carga y errores
 */
export function useLoadingState(initialState: boolean = false) {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialState,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
      error: loading ? null : prev.error, // Limpiar error solo si empieza a cargar
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
    });
  }, []);

  const executeAsync = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      showError?: boolean;
    }
  ): Promise<T | null> => {
    const { onSuccess, onError, showError = true } = options || {};
    
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setLoading(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setLoading(false);

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }

      if (showError && error instanceof Error) {
        // El error se puede mostrar usando getFriendlyErrorMessage
        // La implementación de Alert se puede hacer en el componente
      }

      return null;
    }
  }, [setLoading, setError]);

  return {
    isLoading: state.isLoading,
    error: state.error,
    setLoading,
    setError,
    clearError,
    reset,
    executeAsync,
  };
}

