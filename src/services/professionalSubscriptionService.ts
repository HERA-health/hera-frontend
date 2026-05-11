import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { api } from './api';

export type ProfessionalPlanSlug = 'calma' | 'crecimiento' | 'horizonte';

export type ProfessionalSubscriptionStatus =
  | 'none'
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete_expired'
  | 'paused';

export interface ProfessionalSubscriptionStatusDto {
  plan: ProfessionalPlanSlug | null;
  status: ProfessionalSubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  activePatientCount: number;
  activePatientLimit: number | null;
  canCreateActivePatient: boolean;
  enforcementEnabled: boolean;
  commercialGatingEnabled: boolean;
  subscriptionAccessAllowed: boolean;
  canPublishProfile: boolean;
  canReceiveBookings: boolean;
  canUseBilling: boolean;
  canCreateSession: boolean;
  gracePeriodEndsAt: string | null;
  subscriptionNeedsSync: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  code?: string;
  error?: string;
  message?: string;
}

interface StripeRedirectDto {
  url: string;
}

const PENDING_PLAN_STORAGE_KEY = 'hera.pendingProfessionalSubscriptionPlan';

export const PROFESSIONAL_PLAN_LABELS: Record<ProfessionalPlanSlug, string> = {
  calma: 'Calma',
  crecimiento: 'Crecimiento',
  horizonte: 'Horizonte',
};

export const isProfessionalPlanSlug = (value: unknown): value is ProfessionalPlanSlug =>
  value === 'calma' || value === 'crecimiento' || value === 'horizonte';

const assertSuccess = <T>(response: ApiEnvelope<T>): T => {
  if (!response.success || !response.data) {
    const message = response.message || response.error || 'No se pudo completar la operación.';
    throw new Error(message);
  }

  return response.data;
};

export const savePendingProfessionalPlan = async (plan: ProfessionalPlanSlug): Promise<void> => {
  await AsyncStorage.setItem(PENDING_PLAN_STORAGE_KEY, plan);
};

export const getPendingProfessionalPlan = async (): Promise<ProfessionalPlanSlug | null> => {
  const storedPlan = await AsyncStorage.getItem(PENDING_PLAN_STORAGE_KEY);
  return isProfessionalPlanSlug(storedPlan) ? storedPlan : null;
};

export const clearPendingProfessionalPlan = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
};

export const getProfessionalSubscriptionStatus =
  async (): Promise<ProfessionalSubscriptionStatusDto> => {
    const response = await api.get<ApiEnvelope<ProfessionalSubscriptionStatusDto>>(
      '/professional-subscriptions/status'
    );

    return assertSuccess(response.data);
  };

export const createProfessionalCheckoutSession = async (
  plan: ProfessionalPlanSlug
): Promise<StripeRedirectDto> => {
  const response = await api.post<ApiEnvelope<StripeRedirectDto>>(
    '/professional-subscriptions/checkout',
    { plan }
  );

  return assertSuccess(response.data);
};

export const createProfessionalPortalSession = async (): Promise<StripeRedirectDto> => {
  const response = await api.post<ApiEnvelope<StripeRedirectDto>>(
    '/professional-subscriptions/portal'
  );

  return assertSuccess(response.data);
};

export const redirectToStripeUrl = async (url: string): Promise<void> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }

  await Linking.openURL(url);
};
