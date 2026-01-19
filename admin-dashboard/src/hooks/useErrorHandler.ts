import { useCallback } from 'react';
import { logger } from '../utils/logger';

export interface ErrorHandler {
  handleError: (error: unknown, userMessage?: string) => void;
  handleApiError: (error: unknown, defaultMessage?: string) => string;
}

export function useErrorHandler(onError?: (message: string) => void): ErrorHandler {
  const handleError = useCallback((error: unknown, userMessage?: string) => {
    // Log error for debugging
    logger.error('Error:', error);

    // Extract error message
    let message = userMessage;
    
    if (!message) {
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = String(error.message);
      } else {
        message = 'Ha ocurrido un error inesperado';
      }
    }

    // Call callback if provided
    if (onError) {
      onError(message);
    }
  }, [onError]);

  const handleApiError = useCallback((error: unknown, defaultMessage = 'Error al procesar la solicitud'): string => {
    logger.error('API Error:', error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return 'Error de conexión. Verifica tu conexión a internet.';
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'No tienes permisos para realizar esta acción.';
      }
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return 'Recurso no encontrado.';
      }
      return error.message || defaultMessage;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }

    return defaultMessage;
  }, []);

  return {
    handleError,
    handleApiError,
  };
}
