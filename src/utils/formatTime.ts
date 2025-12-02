/**
 * Utilidades para formatear fechas y tiempos
 */

/**
 * Formatear fecha a tiempo relativo (ej: "hace 5 min", "hace 2 horas", "ayer")
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Menos de 1 minuto
    if (diffSeconds < 60) {
      return 'ahora';
    }
    
    // Menos de 1 hora
    if (diffMinutes < 60) {
      return `hace ${diffMinutes} min`;
    }
    
    // Menos de 24 horas
    if (diffHours < 24) {
      return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    }
    
    // Menos de 7 días
    if (diffDays < 7) {
      if (diffDays === 1) {
        return 'ayer';
      }
      return `hace ${diffDays} días`;
    }
    
    // Más de 7 días - mostrar fecha
    const isThisYear = date.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    }
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    return '';
  }
}

/**
 * Formatear fecha a hora (ej: "14:30")
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '';
  }
}

/**
 * Formatear fecha completa (ej: "15 de enero, 14:30")
 */
export function formatFullDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();
    
    if (isToday) {
      return `Hoy, ${formatTime(dateString)}`;
    }
    
    if (isYesterday) {
      return `Ayer, ${formatTime(dateString)}`;
    }
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '';
  }
}

