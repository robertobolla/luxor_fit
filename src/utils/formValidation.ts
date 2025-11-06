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

