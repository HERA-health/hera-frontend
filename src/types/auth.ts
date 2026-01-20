/**
 * TypeScript type definitions for Auth Security Features
 * Email verification and password recovery types
 */

/**
 * Email type for verification flows
 */
export type EmailType = 'verification' | 'passwordReset';

/**
 * Success screen types
 */
export type SuccessType = 'emailVerified' | 'passwordReset';

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong';

// ============================================================================
// EMAIL VERIFICATION TYPES
// ============================================================================

/**
 * Payload for sending verification email
 */
export interface SendVerificationEmailPayload {
  email: string;
}

/**
 * Response from sending verification email
 */
export interface SendVerificationEmailResponse {
  success: boolean;
  message: string;
}

/**
 * Payload for verifying email with token
 */
export interface VerifyEmailPayload {
  token: string;
}

/**
 * Response from email verification
 */
export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

/**
 * Payload for resending verification email
 */
export interface ResendVerificationEmailPayload {
  email: string;
}

/**
 * Response from resending verification email
 */
export interface ResendVerificationEmailResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// PASSWORD RESET TYPES
// ============================================================================

/**
 * Payload for requesting password reset
 */
export interface RequestPasswordResetPayload {
  email: string;
}

/**
 * Response from password reset request
 */
export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
}

/**
 * Payload for validating reset token
 */
export interface ValidateResetTokenPayload {
  token: string;
}

/**
 * Response from reset token validation
 */
export interface ValidateResetTokenResponse {
  success: boolean;
  valid: boolean;
  email?: string;
  message?: string;
}

/**
 * Payload for resetting password
 */
export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/**
 * Response from password reset
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// TOKEN VALIDATION TYPES
// ============================================================================

/**
 * Generic token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  expired?: boolean;
  email?: string;
  errorCode?: string;
}

/**
 * Token error codes
 */
export type TokenErrorCode =
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_ALREADY_USED'
  | 'TOKEN_NOT_FOUND';
