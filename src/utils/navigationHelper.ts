/**
 * Helper para manejar navegación hacia atrás de forma confiable en Expo Router
 * 
 * El problema: router.back() puede fallar cuando:
 * - No hay historial previo
 * - La navegación se hizo con router.push() sin historial
 * - Se abre una pantalla directamente desde un deep link
 * 
 * Solución: Siempre proporcionar una ruta de fallback explícita
 */

import { Router } from 'expo-router';

interface NavigateBackOptions {
  router: Router;
  fallbackPath: string;
  fallbackParams?: Record<string, any>;
}

/**
 * Navega hacia atrás de forma confiable
 * 
 * @param options - Configuración de navegación
 * @param options.router - Instancia del router de expo-router
 * @param options.fallbackPath - Ruta a la que navegar si no hay historial previo
 * @param options.fallbackParams - Parámetros opcionales para la ruta de fallback
 * 
 * @example
 * ```typescript
 * import { useRouter } from 'expo-router';
 * import { navigateBack } from '@/utils/navigationHelper';
 * 
 * const router = useRouter();
 * 
 * navigateBack({
 *   router,
 *   fallbackPath: '/(tabs)/workout',
 *   fallbackParams: { refresh: 'true' }
 * });
 * ```
 */
export function navigateBack({ router, fallbackPath, fallbackParams }: NavigateBackOptions): void {
  try {
    // Intentar usar el historial nativo primero
    if (router.canGoBack && router.canGoBack()) {
      router.back();
      return;
    }
  } catch (error) {
    console.warn('router.back() failed, using fallback:', error);
  }

  // Si router.back() no está disponible o falla, usar la ruta de fallback
  if (fallbackParams && Object.keys(fallbackParams).length > 0) {
    router.push({
      pathname: fallbackPath,
      params: fallbackParams,
    } as any);
  } else {
    router.push(fallbackPath as any);
  }
}

/**
 * Helper para navegar hacia atrás con reemplazo (no agrega al historial)
 * Útil cuando no quieres que el usuario pueda volver a la pantalla actual
 */
export function navigateBackReplace({ router, fallbackPath, fallbackParams }: NavigateBackOptions): void {
  // Siempre usar replace para evitar acumular historial
  if (fallbackParams && Object.keys(fallbackParams).length > 0) {
    router.replace({
      pathname: fallbackPath,
      params: fallbackParams,
    } as any);
  } else {
    router.replace(fallbackPath as any);
  }
}

