import { Platform } from 'react-native';
import api from './api';
import { getErrorCode, getErrorMessage } from '../constants/errors';
import { clearPersistedClinicalAccessSession } from './secureSessionStorage';

export class ClinicalPinError extends Error {
  constructor(message: string, public readonly code?: string) { super(message); }
}

export async function requestClinicalPinReset(): Promise<{ expiresAt: string; resendAfterSeconds: number }> {
  try {
    const response = await api.post<{ data: { expiresAt: string; resendAfterSeconds: number } }>(
      '/clinical/access/pin/reset/request', { platform: Platform.OS === 'web' ? 'web' : 'mobile' }
    );
    return response.data.data;
  } catch (error: unknown) {
    const code = getErrorCode(error);
    throw new ClinicalPinError(code === 'CLINICAL_PIN_EMAIL_FAILED'
      ? 'No hemos podido enviar el enlace. Inténtalo de nuevo.'
      : getErrorMessage(error, 'No hemos podido enviar el enlace. Inténtalo de nuevo.'), code);
  }
}

export async function validateClinicalPinReset(token: string): Promise<void> {
  try { await api.post('/clinical/access/pin/reset/validate', { token }); }
  catch (error: unknown) { throw new ClinicalPinError(getErrorMessage(error, 'No se pudo comprobar el enlace. Inténtalo de nuevo.'), getErrorCode(error)); }
}

const accessListeners = new Set<() => void>();
export const subscribeToClinicalPinChange = (listener: () => void) => {
  accessListeners.add(listener);
  return () => { accessListeners.delete(listener); };
};
export async function notifyClinicalPinChange() {
  accessListeners.forEach((listener) => listener());
  await clearPersistedClinicalAccessSession();
}

export async function confirmClinicalPinReset(token: string, nextPin: string): Promise<void> {
  try { await api.post('/clinical/access/pin/reset/confirm', { token, nextPin }); }
  catch (error: unknown) { throw new ClinicalPinError(getErrorMessage(error, 'No se pudo guardar el nuevo PIN.'), getErrorCode(error)); }
  await notifyClinicalPinChange();
}

export const maskClinicalEmail = (email: string) => {
  const [local, domain] = email.split('@');
  return local && domain ? `${local.slice(0, 1)}***@${domain}` : 'el correo de tu cuenta';
};
