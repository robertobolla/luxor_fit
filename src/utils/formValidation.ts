/**
 * Utilidades para validación de formularios
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida un campo de texto requerido
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} es requerido`,
    };
  }
  return { isValid: true };
}

/**
 * Valida un email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'El email es requerido',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'El email no es válido',
    };
  }

  return { isValid: true };
}

/**
 * Valida un número positivo
 */
export function validatePositiveNumber(value: string, fieldName: string, min?: number, max?: number): ValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} es requerido`,
    };
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return {
      isValid: false,
      error: `${fieldName} debe ser un número válido`,
    };
  }

  if (num <= 0) {
    return {
      isValid: false,
      error: `${fieldName} debe ser mayor a 0`,
    };
  }

  if (min !== undefined && num < min) {
    return {
      isValid: false,
      error: `${fieldName} debe ser al menos ${min}`,
    };
  }

  if (max !== undefined && num > max) {
    return {
      isValid: false,
      error: `${fieldName} no puede ser mayor a ${max}`,
    };
  }

  return { isValid: true };
}

/**
 * Valida un rango de edad
 */
export function validateAge(age: string): ValidationResult {
  return validatePositiveNumber(age, 'La edad', 13, 120);
}

/**
 * Valida peso (kg)
 */
export function validateWeight(weight: string): ValidationResult {
  return validatePositiveNumber(weight, 'El peso', 20, 300);
}

/**
 * Valida altura (cm)
 */
export function validateHeight(height: string): ValidationResult {
  return validatePositiveNumber(height, 'La altura', 100, 250);
}

/**
 * Valida un campo de texto con longitud mínima
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} es requerido`,
    };
  }

  if (value.trim().length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} debe tener al menos ${minLength} caracteres`,
    };
  }

  return { isValid: true };
}

/**
 * Valida que al menos un elemento esté seleccionado
 */
export function validateAtLeastOne(
  items: any[],
  fieldName: string
): ValidationResult {
  if (!items || items.length === 0) {
    return {
      isValid: false,
      error: `Debes seleccionar al menos un ${fieldName}`,
    };
  }
  return { isValid: true };
}

/**
 * Valida formato de username
 * - Solo letras minúsculas, números, guiones y guiones bajos
 * - Entre 3 y 30 caracteres
 * - No puede empezar o terminar con guión o guión bajo
 */
export function validateUsernameFormat(username: string): ValidationResult {
  if (!username || username.trim().length === 0) {
    return {
      isValid: false,
      error: 'El nombre de usuario es requerido',
    };
  }

  const trimmed = username.trim().toLowerCase();

  // Longitud
  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: 'El nombre de usuario debe tener al menos 3 caracteres',
    };
  }

  if (trimmed.length > 30) {
    return {
      isValid: false,
      error: 'El nombre de usuario no puede tener más de 30 caracteres',
    };
  }

  // Solo letras minúsculas, números, guiones y guiones bajos
  const usernameRegex = /^[a-z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'El nombre de usuario solo puede contener letras minúsculas, números, guiones (-) y guiones bajos (_)',
    };
  }

  // No puede empezar o terminar con guión o guión bajo
  if (trimmed.startsWith('-') || trimmed.startsWith('_')) {
    return {
      isValid: false,
      error: 'El nombre de usuario no puede empezar con guión o guión bajo',
    };
  }

  if (trimmed.endsWith('-') || trimmed.endsWith('_')) {
    return {
      isValid: false,
      error: 'El nombre de usuario no puede terminar con guión o guión bajo',
    };
  }

  return { isValid: true };
}

