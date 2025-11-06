/**
 * Utilidades para mostrar mensajes de error amigables al usuario
 */

export interface ErrorContext {
  action?: string; // Qué acción estaba realizando el usuario
  screen?: string; // En qué pantalla ocurrió
}

/**
 * Convierte errores técnicos en mensajes amigables para el usuario
 */
export function getFriendlyErrorMessage(error: any, context?: ErrorContext): string {
  const errorMessage = error?.message || String(error || 'Error desconocido');
  const action = context?.action || 'La operación';
  const screen = context?.screen ? ` en ${context.screen}` : '';

  // Errores de red
  if (
    errorMessage.includes('Network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('timeout')
  ) {
    return `No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.`;
  }

  // Errores de autenticación
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('401')
  ) {
    return `Tu sesión ha expirado. Por favor, inicia sesión nuevamente.`;
  }

  // Errores de permisos
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('403')
  ) {
    return `No tienes permisos para realizar esta acción.`;
  }

  // Errores de datos no encontrados
  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('404') ||
    errorMessage.includes('PGRST116')
  ) {
    return `No se encontró la información solicitada.`;
  }

  // Errores de validación
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('required')
  ) {
    return `Los datos ingresados no son válidos. Por favor, verifica la información e intenta nuevamente.`;
  }

  // Errores de servidor
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('server') ||
    errorMessage.includes('internal error')
  ) {
    return `Ocurrió un error en el servidor. Por favor, intenta nuevamente en unos momentos.`;
  }

  // Errores de Stripe/Pagos
  if (
    errorMessage.includes('stripe') ||
    errorMessage.includes('payment') ||
    errorMessage.includes('card')
  ) {
    return `Hubo un problema con el pago. Verifica los datos de tu tarjeta e intenta nuevamente.`;
  }

  // Errores de OpenAI
  if (
    errorMessage.includes('openai') ||
    errorMessage.includes('429') ||
    errorMessage.includes('quota')
  ) {
    return `El servicio de inteligencia artificial está temporalmente no disponible. Por favor, intenta más tarde.`;
  }

  // Error genérico con contexto
  if (context?.action) {
    return `No se pudo ${action.toLowerCase()}${screen}. Por favor, intenta nuevamente.`;
  }

  // Error genérico sin contexto
  return `Ocurrió un error inesperado. Por favor, intenta nuevamente.`;
}

/**
 * Mensajes de error específicos por operación
 */
export const ErrorMessages = {
  loadData: 'No se pudieron cargar los datos. Verifica tu conexión e intenta nuevamente.',
  saveData: 'No se pudo guardar la información. Por favor, intenta nuevamente.',
  deleteData: 'No se pudo eliminar. Por favor, intenta nuevamente.',
  updateData: 'No se pudo actualizar. Por favor, intenta nuevamente.',
  networkError: 'Sin conexión a internet. Verifica tu conexión e intenta nuevamente.',
  authError: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  permissionError: 'No tienes permisos para realizar esta acción.',
  serverError: 'Error en el servidor. Por favor, intenta más tarde.',
  unknownError: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
};

