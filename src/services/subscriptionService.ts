import { z } from 'zod';
import { api, publicApi } from './api';

export const subscriptionPlanSchema = z.enum(['DIRECTORIO', 'CALMA', 'CRECIMIENTO', 'HORIZONTE']);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type PaidSubscriptionPlan = Exclude<SubscriptionPlan, 'DIRECTORIO'>;
const duration = z.object({ unit: z.enum(['month', 'day']), count: z.number().int().positive() });
const paymentSchema = z.object({ amountCents: z.number(), currency: z.string(), paidAt: z.string(), method: z.string(), reference: z.string() });
const periodSchema = z.object({ id: z.string(), plan: subscriptionPlanSchema, kind: z.enum(['TRIAL','PAID']),
  startsAt: z.string(), endsAt: z.string(), offerVersion: z.string(), voidedAt: z.string().nullable() });
const grantSchema = z.object({ plan: subscriptionPlanSchema, kind: z.string(), startsAt: z.string(), endsAt: z.string(), offerVersion: z.string() });
const requestSchema = z.object({ id: z.string(), kind: z.enum(['TRIAL','CHANGE','RENEW','CANCEL']), plan: subscriptionPlanSchema.nullable(),
  status: z.enum(['PENDING','RESOLVED','REJECTED']), createdAt: z.string(), resolvedAt: z.string().nullable(), resolution: z.string().nullable() });
export type SubscriptionRequestKind = z.infer<typeof requestSchema>['kind'];
const monthlyPaymentSchema = z.object({ baseCents: z.number().int().nonnegative(), vatPercent: z.number(), vatCents: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative() });
const planSchema = z.object({ id: subscriptionPlanSchema, name: z.string(), monthlyCents: z.number(), ownPatientLimit: z.number().nullable(),
  monthlyPayment: monthlyPaymentSchema.optional(),
  storageBytes: z.number(), rank: z.number(), features: z.array(z.string()),
  presentation: z.object({ description: z.string(), documents: z.string(), supervision: z.string(), templates: z.string(), directoryProfile: z.string(), publications: z.string(), support: z.string() }),
});
const catalogSchema = z.object({ version: z.string(), enforced: z.boolean(), currency: z.literal('EUR'), taxIncluded: z.literal(false), trial: duration,
  activityDays: z.number(), timeZone: z.string(), directoryCommissionsIndependent: z.boolean(), plans: z.array(planSchema) });
export type SubscriptionCatalog = z.infer<typeof catalogSchema>;
const subscriptionSchema = z.object({ plan: subscriptionPlanSchema, name: z.string(), period: periodSchema.nullable(), revision: z.number(),
  trialEligible: z.boolean(), trialGrantedAt: z.string().nullable(), trialPolicy: duration, nextPlan: subscriptionPlanSchema.nullable(),
  cancelAtEnd: z.boolean(), invitationDismissed: z.boolean(), enforced: z.boolean(),
  limits: z.object({ ownPatients: z.number().nullable(), storageBytes: z.string().regex(/^\d+$/) }),
  usage: z.object({ patients: z.object({ active: z.number(), additionalCommitted: z.number(), total: z.number(), directoryCount: z.number().int().nonnegative().optional(), protectedCount: z.number(), unresolvedCount: z.number(), activityDays: z.number() }),
    storage: z.object({ usedBytes: z.string().regex(/^\d+$/), unknownFiles: z.number() }) }),
  features: z.array(z.string()), periods: z.array(periodSchema), requests: z.array(requestSchema), computedAt: z.string(),
  specialist: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable().optional(),
  timeZone: z.string(), directoryCommissionsIndependent: z.boolean(),
  history: z.array(z.object({ id: z.string(), kind: z.string(), actorId: z.string(), reason: z.string(), createdAt: z.string(), details: z.object({
    payment: paymentSchema.nullable(), notice: z.string(), before: z.array(periodSchema), after: z.array(periodSchema),
    additions: z.array(grantSchema), nextPlan: subscriptionPlanSchema.nullable(),
  }) })).optional(),
});
export type SubscriptionSummary = z.infer<typeof subscriptionSchema>;
export const getSubscriptionCatalog = async (signal?: AbortSignal) => catalogSchema.parse((await publicApi.get('/subscriptions/plans', { signal })).data);
export const getMySubscription = async (signal?: AbortSignal) => subscriptionSchema.parse((await api.get('/subscriptions/me', { signal })).data);
export const getAdminSubscription = async (id: string, signal?: AbortSignal) => subscriptionSchema.parse((await api.get(`/admin/specialists/${encodeURIComponent(id)}/subscription`, { signal })).data);
export const requestSubscription = async (input: { operationKey: string; kind: SubscriptionRequestKind; plan?: PaidSubscriptionPlan }) =>
  requestSchema.parse((await api.post('/subscriptions/requests', input)).data);
export const dismissSubscriptionInvitation = async () => { await api.post('/subscriptions/invitation/dismiss'); };
export type SubscriptionPayment = { amountCents: number; currency: 'EUR'; paidAt: string; method: string; reference: string };
export type SubscriptionCommand = { operationKey: string; expectedRevision: number; expectedCurrentPeriodId?: string | null; requestId?: string; reason: string } & (
  { kind: 'TRIAL' | 'DOWNGRADE'; plan: PaidSubscriptionPlan }
  | { kind: 'PAY'; plan: PaidSubscriptionPlan; payment: SubscriptionPayment }
  | { kind: 'UPGRADE'; plan: PaidSubscriptionPlan; payment?: SubscriptionPayment }
  | { kind: 'CANCEL' }
  | { kind: 'REFUND'; payment: SubscriptionPayment }
  | { kind: 'CORRECT'; periodId: string; plan: PaidSubscriptionPlan; startsAt: string; endsAt: string; void: boolean });
const previewSchema = z.object({ kind: z.string(), effectiveAt: z.string(), before: z.array(periodSchema), after: z.array(periodSchema),
  monthlyPayment: monthlyPaymentSchema.optional(),
  additions: z.array(grantSchema),
  nextPlan: subscriptionPlanSchema.nullable(), cancelAtEnd: z.boolean(), payment: z.object({ amountCents: z.number(), currency: z.string(), paidAt: z.string(), method: z.string(), reference: z.string() }).nullable(), notice: z.string() });
export type SubscriptionPreview = z.infer<typeof previewSchema>;
export const previewSubscriptionCommand = async (id: string, input: SubscriptionCommand) => previewSchema.parse((await api.post(`/admin/specialists/${encodeURIComponent(id)}/subscription/preview`, input)).data);
export const executeSubscriptionCommand = async (id: string, input: SubscriptionCommand) => { await api.post(`/admin/specialists/${encodeURIComponent(id)}/subscription`, input); };
const adminRequestsSchema = z.object({ total: z.number(), page: z.number(), items: z.array(requestSchema.extend({
  specialistId: z.string().nullable(), specialist: z.object({ name: z.string(), email: z.string() }).nullable(),
  contact: z.object({ firstName: z.string().optional(), lastName: z.string().optional(), email: z.string(), phone: z.string().optional(), licenseNumber: z.string().optional() }).nullable(),
  acceptance: z.object({ conditionsVersion: z.string(), privacyVersion: z.string(), paragraphs: z.array(z.string()), accepted: z.boolean() }).nullable(), deliveryStatus: z.string(), deliveryAttempts: z.number(),
})) });
export type AdminSubscriptionRequests = z.infer<typeof adminRequestsSchema>;
export const listSubscriptionRequests = async (params: { status?: string; plan?: PaidSubscriptionPlan; page: number }, signal?: AbortSignal) =>
  adminRequestsSchema.parse((await api.get('/admin/subscription-requests', { params, signal })).data);
export const resolveSubscriptionRequest = async (id: string, input: { specialistId?: string; identityVerified?: true; status: 'PENDING' | 'RESOLVED' | 'REJECTED'; reason: string }) => {
  await api.patch(`/admin/subscription-requests/${encodeURIComponent(id)}`, input);
};
export const retrySubscriptionNotification = async (id: string) => { await api.post(`/admin/subscription-requests/${encodeURIComponent(id)}/retry`); };
const accountsSchema = z.object({ total: z.number(), page: z.number(), metrics: z.object({ pending: z.number(), firstPayments: z.number(), renewals: z.number() }),
  items: z.array(z.object({ id: z.string(), name: z.string(), email: z.string(), plan: subscriptionPlanSchema, kind: z.string().nullable(), endsAt: z.string().nullable() })) });
export type SubscriptionAccounts = z.infer<typeof accountsSchema>;
export const listSubscriptionAccounts = async (params: { search?: string; plan?: SubscriptionPlan; trial?: boolean; expiring?: boolean; page: number }, signal?: AbortSignal) =>
  accountsSchema.parse((await api.get('/admin/subscriptions', { params, signal })).data);

export const subscriptionDate = (value: string) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
export const storageLabel = (value: string | number) => { const bytes = Number(value); return bytes >= 1e12 ? `${Number((bytes / 1e12).toFixed(2))} TB` : bytes >= 1e9 ? `${Number((bytes / 1e9).toFixed(2))} GB` : `${Number((bytes / 1e6).toFixed(2))} MB`; };
export const trialLabel = (trial: SubscriptionCatalog['trial']) => trial.unit === 'month' ? `${trial.count} mes${trial.count === 1 ? '' : 'es'} natural${trial.count === 1 ? '' : 'es'}` : `${trial.count} días`;
