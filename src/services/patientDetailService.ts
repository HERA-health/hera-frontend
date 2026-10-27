import { treatmentSummarySchema } from './treatmentConsentService';
import { z } from "zod";
import { api } from "./api";
import type { ProfessionalSessionDetail } from "./professionalService";
const parse = <T>(schema: z.ZodType<T>, payload: unknown): T => {
  const result = schema.safeParse(payload);
  if (!result.success)
    throw new Error(
      "No se pudo interpretar la información de la ficha. Actualiza la vista o inténtalo de nuevo.",
    );
  return result.data;
};

const text = z.string().nullable();
export const patientProfileSchema = z.object({
  firstName: text.optional(),
  lastName: text.optional(),
  email: text.optional(),
  phone: text.optional(),
  taxId: text,
  birthDate: text,
  address: text,
  postalCode: text,
  city: text,
  country: text,
  occupation: text,
  emergencyName: text,
  emergencyPhone: text,
  editableFields: z.array(
    z.enum([
      "firstName",
      "lastName",
      "email",
      "phone",
      "birthDate",
      "occupation",
      "address",
      "postalCode",
      "city",
      "country",
      "emergencyName",
      "emergencyPhone",
    ]),
  ),
});
export type PatientProfile = z.infer<typeof patientProfileSchema>;
export type PatientProfileInput = Partial<
  Omit<PatientProfile, "taxId" | "editableFields">
>;
const session = z
  .object({
    id: z.string(),
    date: z.string().datetime(),
    duration: z.number(),
    type: z.string(),
    status: z.string(),
  })
  .nullable();
const summarySchema = z.object({
  profile: patientProfileSchema,
  completed: z.number().int().nonnegative(),
  nextSession: session,
  lastSession: session,
  pendingAmountCents: z.number().int(),
  pendingInvoiceCount: z.number().int(),
  authorizationStatus: z.enum(["PENDING", "GRANTED", "REVOKED"]),
  authorizationGrantedAt: text,
  closedAt: text,
  informedConsent: treatmentSummarySchema.optional(),
  treatmentConsent: z
    .object({ id: z.string(), uploadedAt: z.string().datetime() })
    .nullable(),
  recentMovements: z
    .array(
      z.object({
        id: z.string(),
        date: text,
        cents: z.number().int(),
        refund: z.boolean(),
        source: z.string(),
        reference: text,
      }),
    )
    .default([]),
  recentActivity: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["SESSION", "COLLECTION", "REFUND"]),
        date: z.string().datetime(),
        title: z.string(),
        detail: z.string(),
        target: z.enum(["SESSION", "INVOICE", "PACKAGE", "MOVEMENT"]),
        targetId: text,
      }),
    )
    .optional(),
  professionalName: z.string(),
  relationshipSince: text,
  provenance: z.enum(["DIRECTORY", "OWN", "UNDETERMINED"]),
});
export type PatientSummary = z.infer<typeof summarySchema>;
export const getPatientSummary = async (id: string): Promise<PatientSummary> =>
  parse(
    summarySchema,
    (await api.get<{ data: unknown }>(`/clients/${id}/summary`)).data.data,
  );
export const savePatientProfile = async (
  id: string,
  input: PatientProfileInput,
) => {
  if (
    input.birthDate !== undefined &&
    !z
      .union([z.literal(""), z.string().date()])
      .nullable()
      .safeParse(input.birthDate).success
  )
    throw new Error(
      "Introduce una fecha de nacimiento válida con formato AAAA-MM-DD.",
    );
  return parse(
    patientProfileSchema,
    (await api.patch<{ data: unknown }>(`/clients/${id}/profile`, input)).data
      .data,
  );
};
export interface PatientSessionFilters {
  search?: string;
  type?: string;
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
  page?: number;
}
export interface PatientSession extends ProfessionalSessionDetail {
  collectionState?:
    "PACKAGE" | "PAID" | "NOT_APPLICABLE" | "PENDING" | "UNRECORDED";
}
const sessionListItemSchema = z.object({
  id: z.string(),
  date: z.string().datetime(),
  duration: z.number(),
  type: z.string(),
  status: z.string(),
  collectionState: z.enum([
    "PACKAGE",
    "PAID",
    "NOT_APPLICABLE",
    "PENDING",
    "UNRECORDED",
  ]),
});
export type PatientSessionListItem = z.infer<typeof sessionListItemSchema>;
export interface PatientSessionPage {
  items: PatientSessionListItem[];
  total: number;
  page: number;
  totalPages: number;
}
export const getPatientSessions = async (
  id: string,
  filters: PatientSessionFilters,
): Promise<PatientSessionPage> =>
  parse(
    z.object({
      items: z.array(sessionListItemSchema),
      total: z.number().int(),
      page: z.number().int(),
      totalPages: z.number().int(),
    }),
    (
      await api.get<{ data: unknown }>(`/clients/${id}/sessions`, {
        params: filters,
      })
    ).data.data,
  );
const movementPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      date: text,
      cents: z.number().int(),
      refund: z.boolean(),
      source: z.string(),
      reference: text,
    }),
  ),
  hasMore: z.boolean(),
  page: z.number().int(),
});
export type PatientMovementPage = z.infer<typeof movementPageSchema>;
export const getPatientMovements = async (id: string, page: number) =>
  parse(
    movementPageSchema,
    (
      await api.get<{ data: unknown }>(`/clients/${id}/movements`, {
        params: { page },
      })
    ).data.data,
  );
