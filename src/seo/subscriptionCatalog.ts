import { z } from "zod";
export const subscriptionPlanSchema = z.enum([
  "DIRECTORIO",
  "CALMA",
  "CRECIMIENTO",
  "HORIZONTE",
]);
export const duration = z.object({
  unit: z.enum(["month", "day"]),
  count: z.number().int().positive(),
});
export const monthlyPaymentSchema = z.object({
  baseCents: z.number().int().nonnegative(),
  vatPercent: z.number(),
  vatCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});
const planSchema = z.object({
  id: subscriptionPlanSchema,
  name: z.string(),
  monthlyCents: z.number(),
  ownPatientLimit: z.number().nullable(),
  monthlyPayment: monthlyPaymentSchema.optional(),
  storageBytes: z.number(),
  rank: z.number(),
  features: z.array(z.string()),
  presentation: z.object({
    description: z.string(),
    documents: z.string(),
    supervision: z.string(),
    templates: z.string(),
    directoryProfile: z.string(),
    publications: z.string(),
    support: z.string(),
  }),
});
export const catalogSchema = z.object({
  version: z.string(),
  enforced: z.boolean(),
  currency: z.literal("EUR"),
  taxIncluded: z.literal(false),
  trial: duration,
  activityDays: z.number(),
  timeZone: z.string(),
  directoryCommissionsIndependent: z.boolean(),
  plans: z.array(planSchema),
});
export type SubscriptionCatalog = z.infer<typeof catalogSchema>;

export const storageLabel = (value: string | number) => {
  const bytes = Number(value);
  return bytes >= 1e12
    ? `${Number((bytes / 1e12).toFixed(2))} TB`
    : bytes >= 1e9
      ? `${Number((bytes / 1e9).toFixed(2))} GB`
      : `${Number((bytes / 1e6).toFixed(2))} MB`;
};
export const trialLabel = (trial: SubscriptionCatalog["trial"]) =>
  trial.unit === "month"
    ? `${trial.count} mes${trial.count === 1 ? "" : "es"} natural${trial.count === 1 ? "" : "es"}`
    : `${trial.count} días`;
