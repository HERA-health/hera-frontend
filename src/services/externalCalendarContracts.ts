import { z } from 'zod';

export const externalCalendarVerificationSchema = z.object({ status: z.enum(['NOT_ENABLED', 'VERIFIED', 'STALE', 'UNAVAILABLE']), checkedAt: z.string().nullable() });
export type ExternalCalendarVerification = z.infer<typeof externalCalendarVerificationSchema>;
export const externalCalendarEventSchema = z.object({
  id: z.string(), kind: z.literal('GOOGLE'), title: z.string(), calendarName: z.string(),
  startsAt: z.string().datetime(), endsAt: z.string().datetime(), allDay: z.boolean(), busy: z.boolean(), expiresAt: z.string().datetime().optional(),
});
export type ExternalCalendarEvent = z.infer<typeof externalCalendarEventSchema>;
export const calendarImportStatusSchema = z.object({
  available: z.boolean(), enabled: z.boolean(), permissionRequired: z.boolean(), revision: z.number().int(), disclosureVersion: z.string(),
  calendars: z.array(z.object({ id: z.string(), name: z.string() })), lastSyncedAt: z.string().nullable(), errorCode: z.string().nullable(),
});
export type CalendarImportStatus = z.infer<typeof calendarImportStatusSchema>;
export const calendarChoiceSchema = z.object({ id: z.string(), name: z.string(), primary: z.boolean(), availabilityOnly: z.boolean() });
export type CalendarChoice = z.infer<typeof calendarChoiceSchema>;
export const PROFESSIONAL_CALENDAR_WARNING = 'No hemos podido actualizar Google. Puedes continuar, pero revisa ese horario.';
export const PATIENT_CALENDAR_WARNING = 'No hemos podido comprobar todos los compromisos del profesional. Puedes continuar con la reserva.';
export const calendarVerificationNeedsAttention = (value?: ExternalCalendarVerification | null) => value?.status === 'STALE' || value?.status === 'UNAVAILABLE';
