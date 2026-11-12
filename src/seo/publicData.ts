import { z } from 'zod';

// Explicit public fields only. Shared by the server response and its browser bootstrap.
export const professionalTypeSchema = z.enum(['PSYCHOLOGIST_HEALTH', 'PSYCHOLOGIST_CLINICAL', 'PSYCHIATRIST', 'OCCUPATIONAL_THERAPIST', 'MENTAL_HEALTH_NURSE', 'MENTAL_HEALTH_PROFESSIONAL']);
const text = z.string();
const optionalText = text.nullish();
const strings = z.array(text);
const priceOption = z.object({
  serviceId: text.optional(), serviceKey: text.optional(), serviceName: text.optional(), serviceDescription: optionalText,
  specialistId: text, optionId: text, modality: text, durationMinutes: z.number(), priceCents: z.number(),
});
const common = {
  id: text, publicSlug: optionalText, avatar: optionalText.transform(value => value ?? null),
  specialization: text, professionalType: professionalTypeSchema.nullable(), professionalTypeLabel: text,
  pricePerSession: z.number(), offersOnline: z.boolean(), offersInPerson: z.boolean(), offersPhone: z.boolean().optional(),
  rating: z.number().nullable(), reviewCount: z.number().nullable(), publicOptions: z.array(priceOption).optional(),
};
export const directoryCardSchema = z.object({
  ...common, name: text, yearsInPractice: z.number().nullable(), gradientId: text.nullable(),
  officeCity: text.nullable(), descriptionExcerpt: text.nullable(), collegiateNumber: text.nullable(),
  specialties: strings, customSpecialties: strings.optional(), therapeuticApproaches: strings.optional(),
  customTherapeuticApproaches: strings.optional(), languages: strings.optional(),
});
export const directoryPageSchema = z.object({
  items: z.array(directoryCardSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(), hasMore: z.boolean(),
});
export const publicProfileSchema = z.object({
  ...common, isPubliclyListed: z.boolean(), description: text, firstVisitFree: z.boolean(),
  user: z.object({ name: text, avatar: optionalText }),
  matchingProfile: z.object({ specialties: strings.optional(), customSpecialties: strings.optional(), therapeuticApproach: z.union([text, strings]).optional(), customTherapeuticApproaches: strings.optional(), language: z.union([text, strings]).optional(), experienceYears: z.number().optional() }),
  officeAddress: optionalText, officeCity: optionalText, officePostalCode: optionalText,
  officeLat: z.number().nullish(), officeLng: z.number().nullish(), professionalTitle: optionalText,
  education: z.array(z.object({ id: text, degree: text, institution: text, startYear: text, endYear: text })).optional(),
  experience: z.array(z.object({ id: text, position: text, organization: text, startYear: text, endYear: optionalText, current: z.boolean().optional() })).optional(),
  certificates: z.array(z.object({ id: text, name: text, issuer: text.optional(), validUntil: optionalText, educationId: optionalText, mimeType: optionalText, documentUrl: text.optional(), previewUrl: text.optional() })).optional(),
  verificationStatus: text.optional(), collegiateNumber: optionalText, gradientId: text.optional(), photoGallery: strings.optional(),
  presentationVideoUrl: optionalText, yearsInPractice: z.number().nullish(), age: z.number().nullish(), languagesSpoken: strings.optional(),
  slotDuration: z.number().nullish(), nextAvailable: optionalText,
  reviews: z.array(z.object({ id: text, rating: z.number(), text, authorName: text, date: text })),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type DirectoryPage = z.infer<typeof directoryPageSchema>;
export function takePublicBootstrap<T>(key: string, schema: z.ZodType<T>): T | undefined {
  if (typeof document === 'undefined') return;
  const element = document.getElementById('hera-public-data');
  const normalized = (value: string) => { const url = new URL(value, 'https://www.health-hera.com'); url.searchParams.sort(); return url.pathname + url.search; };
  if (!element || normalized(element.getAttribute('data-key') || '') !== normalized(key)) return;
  element.remove();
  try {
    const result = schema.safeParse(JSON.parse(element.textContent || 'null'));
    return result.success ? result.data : undefined;
  } catch { return; }
}
