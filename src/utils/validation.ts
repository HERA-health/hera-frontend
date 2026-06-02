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
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 symbol
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE_REGEX = /\p{Lu}/u;
const PASSWORD_LOWERCASE_REGEX = /\p{Ll}/u;
const PASSWORD_NUMBER_REGEX = /\p{N}/u;
const PASSWORD_SYMBOL_REGEX = /[^\p{L}\p{N}\s]/u;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula, un número y un símbolo';

export type PasswordRequirementKey =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'symbol';

export interface PasswordRequirementStatus {
  key: PasswordRequirementKey;
  label: string;
  error: string;
  met: boolean;
}

const getPasswordValue = (password: string): string =>
  typeof password === 'string' ? password : '';

export function getPasswordRequirementStatuses(password: string): PasswordRequirementStatus[] {
  const value = getPasswordValue(password);

  return [
    {
      key: 'minLength',
      label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
      error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      met: value.length >= PASSWORD_MIN_LENGTH,
    },
    {
      key: 'uppercase',
      label: '1 mayúscula',
      error: 'La contraseña debe contener al menos una mayúscula',
      met: PASSWORD_UPPERCASE_REGEX.test(value),
    },
    {
      key: 'lowercase',
      label: '1 minúscula',
      error: 'La contraseña debe contener al menos una minúscula',
      met: PASSWORD_LOWERCASE_REGEX.test(value),
    },
    {
      key: 'number',
      label: '1 número',
      error: 'La contraseña debe contener al menos un número',
      met: PASSWORD_NUMBER_REGEX.test(value),
    },
    {
      key: 'symbol',
      label: '1 símbolo',
      error: 'La contraseña debe contener al menos un símbolo',
      met: PASSWORD_SYMBOL_REGEX.test(value),
    },
  ];
}

export function getMissingPasswordRequirements(password: string): PasswordRequirementStatus[] {
  return getPasswordRequirementStatuses(password).filter((requirement) => !requirement.met);
}

/**
 * Validates password meets minimum requirements
 * @param password - Password to validate
 * @returns true if password meets all requirements
 */
export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  return getMissingPasswordRequirements(password).length === 0;
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

  return getMissingPasswordRequirements(password)[0]?.error ?? null;
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

  errors.push(...getMissingPasswordRequirements(password).map((requirement) => requirement.label));

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
  if (PASSWORD_UPPERCASE_REGEX.test(password)) score += 1;
  if (PASSWORD_LOWERCASE_REGEX.test(password)) score += 1;
  if (PASSWORD_NUMBER_REGEX.test(password)) score += 1;
  if (PASSWORD_SYMBOL_REGEX.test(password)) score += 1;

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
