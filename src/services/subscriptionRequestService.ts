import axios from 'axios';
import { z } from 'zod';
import { publicApi } from './api';
import type { PricingPlanId } from '../screens/landing/pricingContent';

const conditionsSchema = z.object({
  version: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  privacy: z.object({
    version: z.string().min(1), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    title: z.string().min(1), publicPath: z.string().startsWith('/legal/'),
  }),
});
export type SubscriptionConditions = z.infer<typeof conditionsSchema>;

export const subscriptionContactSchema = z.object({
  firstName: z.string().trim().min(1, 'Introduce tu nombre.').max(100, 'El nombre es demasiado largo.'),
  lastName: z.string().trim().min(1, 'Introduce tus apellidos.').max(150, 'Los apellidos son demasiado largos.'),
  email: z.string().trim().max(254).email('Introduce un email válido.'),
  phone: z.string().trim().max(40),
  licenseNumber: z.string().trim().max(80),
});
export type SubscriptionContact = z.infer<typeof subscriptionContactSchema>;
export interface SubscriptionRequest extends SubscriptionContact {
  planId: PricingPlanId;
  accepted: true;
  conditionsVersion: string;
  conditionsHash: string;
  privacyVersion: string;
  privacyHash: string;
}

export class SubscriptionRequestError extends Error {
  constructor(message: string, public readonly conditionsChanged = false) { super(message); }
}

export async function getSubscriptionConditions(): Promise<SubscriptionConditions> {
  const response = await publicApi.get<unknown>('/subscription-requests/conditions');
  return conditionsSchema.parse(response.data);
}

export async function submitSubscriptionRequest(input: SubscriptionRequest): Promise<void> {
  try {
    // Leave enough time for the backend's 10-second provider timeout.
    const response = await publicApi.post<unknown>('/subscription-requests', input, { timeout: 20000 });
    z.object({ success: z.literal(true) }).parse(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 409) {
        throw new SubscriptionRequestError('Las condiciones han cambiado. Revísalas y vuelve a aceptarlas.', true);
      }
      if (error.response?.status === 429) {
        throw new SubscriptionRequestError('Has alcanzado el límite de solicitudes. Espera una hora antes de volver a intentarlo.');
      }
      if (error.response?.status === 400) {
        throw new SubscriptionRequestError('Revisa los datos y la aceptación de las condiciones antes de enviar.');
      }
    }
    throw new SubscriptionRequestError('No hemos podido confirmar el envío. Tus datos siguen aquí; puedes volver a intentarlo.');
  }
}
