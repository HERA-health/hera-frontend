import { z } from 'zod';

export const billingReadinessSchema = z.object({
  invoiceKind: z.enum(['SIMPLIFIED', 'FULL']), canGenerate: z.boolean(), canSend: z.boolean(), canBook: z.boolean(),
  missingFields: z.array(z.object({ field: z.string(), label: z.string(), purpose: z.enum(['ISSUE', 'DELIVERY', 'BOOKING']) })),
  correctionTarget: z.enum(['CLIENT_PROFILE', 'BILLING_SETTINGS']).nullable(), clientId: z.string().optional(),
});
export type BillingReadiness = z.infer<typeof billingReadinessSchema>;

export function billingReadinessFromError(error: unknown): BillingReadiness | undefined {
  const result = z.union([
    z.object({ billingReadiness: billingReadinessSchema }),
    z.object({ response: z.object({ data: z.object({ billingReadiness: billingReadinessSchema }) }) }),
  ]).safeParse(error);
  if (!result.success) return undefined;
  return 'billingReadiness' in result.data ? result.data.billingReadiness : result.data.response.data.billingReadiness;
}
