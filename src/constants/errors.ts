/**
 * Typed Error Handling System
 * Replaces all `catch (error: any)` with type-safe error handling
 *
 * Usage:
 * } catch (error: unknown) {
 *   throw new Error(getErrorMessage(error));
 * }
 */

/**
 * API Error - returned from backend
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  field?: string;
}

/**
 * Network Error - connection issues
 */
export interface NetworkError {
  message: string;
  isNetworkError: true;
}

/**
 * Validation Error - form/input validation
 */
export interface ValidationError {
  message: string;
  field: string;
  isValidationError: true;
}

/**
 * Union of all app errors
 */
export type AppError = ApiError | NetworkError | ValidationError | Error;

/**
 * Type guard: Check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Type guard: Check if error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  if (typeof error !== 'object' || error === null) return false;

  // Check explicit flag
  if ('isNetworkError' in error && (error as NetworkError).isNetworkError) {
    return true;
  }

  // Check for Axios network error patterns
  if ('message' in error) {
    const message = (error as { message: string }).message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }

  return false;
}

/**
 * Type guard: Check if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isValidationError' in error &&
    (error as ValidationError).isValidationError === true
  );
}

/**
 * Type guard: Check if error has response data (Axios error)
 */
export function hasResponseData(error: unknown): error is { response: { data: { message?: string; error?: string; code?: string } } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: { data?: unknown } }).response !== null &&
    'data' in (error as { response: { data?: unknown } }).response!
  );
}

/**
 * Extract user-friendly error message from any error type
 *
 * @param error - Any error type
 * @param defaultMessage - Fallback message if error can't be parsed
 * @returns User-friendly error message in Spanish
 */
export function getErrorMessage(error: unknown, defaultMessage = 'Ha ocurrido un error inesperado'): string {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return defaultMessage;
  }

  // Handle network errors first (before API errors check)
  if (isNetworkError(error)) {
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
  }

  // Handle Axios response errors
  if (hasResponseData(error)) {
    const data = error.response.data;
    if (
      data.message &&
      data.message !== 'Ha ocurrido un error. Intenta de nuevo más tarde.' &&
      data.message !== 'Ha ocurrido un error. Intenta de nuevo mÃ¡s tarde.'
    ) {
      return data.message;
    }
    if (data.error) return data.error;
    if (data.message) return data.message;
  }

  // Handle validation errors
  if (isValidationError(error)) {
    return error.message;
  }

  // Handle API errors and standard errors
  if (isApiError(error)) {
    return error.message;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return defaultMessage;
}

/**
 * Extract a stable application error code from known error shapes.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (hasResponseData(error)) {
    return error.response.data?.code;
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

/**
 * Create a typed API error
 */
export function createApiError(message: string, status?: number, code?: string): ApiError {
  return { message, status, code };
}

/**
 * Create a typed network error
 */
export function createNetworkError(message = 'Error de conexión'): NetworkError {
  return { message, isNetworkError: true };
}

/**
 * Create a typed validation error
 */
export function createValidationError(message: string, field: string): ValidationError {
  return { message, field, isValidationError: true };
}
