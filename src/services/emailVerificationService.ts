import * as authService from './authService';
import type { BackendUserType } from './authService';
import { getErrorCode } from '../constants/errors';

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  userType: BackendUserType;
}

const verificationRequests = new Map<string, Promise<EmailVerificationResult>>();

/**
 * A verification token is single-use. React can mount an effect twice in development,
 * so all callers for the same token must share the first request instead of consuming it twice.
 */
export const verifyEmailLinkOnce = (token: string): Promise<EmailVerificationResult> => {
  const existingRequest = verificationRequests.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  const request = authService.verifyEmail(token).catch((error: unknown) => {
    verificationRequests.delete(token);
    throw error;
  });

  verificationRequests.set(token, request);
  return request;
};

export type VerificationResendOutcome = 'sent' | 'already_verified';

export interface VerificationResendResult {
  outcome: VerificationResendOutcome;
  message: string;
}

const normalizeMessage = (message: string): string =>
  message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const isAlreadyVerifiedError = (error: unknown): boolean => {
  if (getErrorCode(error) === 'ALREADY_VERIFIED') {
    return true;
  }

  if (error instanceof Error) {
    return normalizeMessage(error.message) === 'este correo ya ha sido verificado';
  }

  return false;
};

export const resendVerificationEmailWithRefresh = async (
  email: string,
  refreshCurrentUser: () => Promise<unknown>
): Promise<VerificationResendResult> => {
  try {
    await authService.resendVerificationEmail(email);
    return {
      outcome: 'sent',
      message: 'Email enviado. Revisa tu bandeja de entrada.',
    };
  } catch (error: unknown) {
    if (isAlreadyVerifiedError(error)) {
      await refreshCurrentUser();
      return {
        outcome: 'already_verified',
        message: 'Tu correo ya estaba verificado. Hemos actualizado tu cuenta.',
      };
    }

    throw error;
  }
};
