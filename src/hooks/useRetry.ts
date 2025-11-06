import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: () => void;
  showAlert?: boolean;
}

/**
 * Hook para manejar reintentos automáticos de operaciones
 */
export function useRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    showAlert = true,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const executeWithRetry = useCallback(async (): Promise<T | null> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 0);
        setRetryCount(attempt);
        
        if (attempt > 0 && onRetry) {
          onRetry();
        }

        const result = await operation();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Si es el último intento, no esperar
        if (attempt < maxRetries) {
          // Esperar antes del siguiente intento (exponential backoff)
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Todos los intentos fallaron
    setIsRetrying(false);
    
    if (showAlert && lastError) {
      Alert.alert(
        'Error',
        `No se pudo completar la operación después de ${maxRetries + 1} intentos. Por favor, intenta nuevamente más tarde.`,
        [{ text: 'OK' }]
      );
    }

    return null;
  }, [operation, maxRetries, retryDelay, onRetry, showAlert]);

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
  };
}

