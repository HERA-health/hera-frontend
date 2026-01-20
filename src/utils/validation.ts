/**
 * Validation Utilities for Auth Security Features
 * Email and password validation with Spanish error messages
 */

import type { PasswordStrength } from '../types/auth';

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Gets email validation error message in Spanish
 * @param email - Email address to validate
 * @returns Error message or null if valid
 */
export function getEmailError(email: string): string | null {
  if (!email || !email.trim()) {
    return 'El correo electrónico es requerido';
  }
  if (!validateEmail(email)) {
    return 'Por favor, introduce un correo electrónico válido';
  }
  return null;
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Password validation requirements:
 * - Minimum 8 characters
 * - At least 1 letter
 * - At least 1 number
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LETTER_REGEX = /[a-zA-Z]/;
const PASSWORD_NUMBER_REGEX = /\d/;
const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

/**
 * Validates password meets minimum requirements
 * @param password - Password to validate
 * @returns true if password meets all requirements
 */
export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    PASSWORD_LETTER_REGEX.test(password) &&
    PASSWORD_NUMBER_REGEX.test(password)
  );
}

/**
 * Gets detailed password validation error message in Spanish
 * @param password - Password to validate
 * @returns Error message or null if valid
 */
export function getPasswordError(password: string): string | null {
  if (!password || !password.trim()) {
    return 'La contraseña es requerida';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }

  if (!PASSWORD_LETTER_REGEX.test(password)) {
    return 'La contraseña debe contener al menos una letra';
  }

  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return 'La contraseña debe contener al menos un número';
  }

  return null;
}

/**
 * Gets all password validation errors as an array
 * Useful for showing multiple requirements at once
 * @param password - Password to validate
 * @returns Array of error messages (empty if valid)
 */
export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (!password || !password.trim()) {
    errors.push('La contraseña es requerida');
    return errors;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`);
  }

  if (!PASSWORD_LETTER_REGEX.test(password)) {
    errors.push('Al menos una letra');
  }

  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    errors.push('Al menos un número');
  }

  return errors;
}

// ============================================================================
// PASSWORD CONFIRMATION
// ============================================================================

/**
 * Validates that password confirmation matches
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns true if passwords match
 */
export function validatePasswordMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Gets password confirmation error message in Spanish
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Error message or null if passwords match
 */
export function getPasswordMatchError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword || !confirmPassword.trim()) {
    return 'Confirma tu contraseña';
  }

  if (!validatePasswordMatch(password, confirmPassword)) {
    return 'Las contraseñas no coinciden';
  }

  return null;
}

// ============================================================================
// PASSWORD STRENGTH
// ============================================================================

/**
 * Calculates password strength
 * @param password - Password to evaluate
 * @returns Password strength level
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return 'weak';
  }

  let score = 0;

  // Length scoring
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character diversity scoring
  if (PASSWORD_LETTER_REGEX.test(password)) score += 1;
  if (PASSWORD_NUMBER_REGEX.test(password)) score += 1;
  if (PASSWORD_SPECIAL_REGEX.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;

  // Map score to strength
  if (score >= 6) {
    return 'strong';
  }
  if (score >= 4) {
    return 'medium';
  }
  return 'weak';
}

/**
 * Gets password strength label in Spanish
 * @param strength - Password strength level
 * @returns Spanish label for the strength
 */
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case 'strong':
      return 'Contraseña fuerte';
    case 'medium':
      return 'Contraseña media';
    case 'weak':
    default:
      return 'Contraseña débil';
  }
}

// ============================================================================
// COMBINED VALIDATION
// ============================================================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates email and returns result object
 * @param email - Email to validate
 * @returns Validation result with isValid and error
 */
export function validateEmailField(email: string): ValidationResult {
  const error = getEmailError(email);
  return {
    isValid: error === null,
    error,
  };
}

/**
 * Validates password and returns result object
 * @param password - Password to validate
 * @returns Validation result with isValid and error
 */
export function validatePasswordField(password: string): ValidationResult {
  const error = getPasswordError(password);
  return {
    isValid: error === null,
    error,
  };
}

/**
 * Validates password confirmation and returns result object
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Validation result with isValid and error
 */
export function validatePasswordConfirmField(
  password: string,
  confirmPassword: string
): ValidationResult {
  const error = getPasswordMatchError(password, confirmPassword);
  return {
    isValid: error === null,
    error,
  };
}
