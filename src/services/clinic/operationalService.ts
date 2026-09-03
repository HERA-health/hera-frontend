import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import api from '../api';

const intervalSchema = z.object({ start: z.string(), end: z.string() }).strict();
const weeklyScheduleSchema = z.object({
  monday: z.array(intervalSchema),
  tuesday: z.array(intervalSchema),
  wednesday: z.array(intervalSchema),
  thursday: z.array(intervalSchema),
  friday: z.array(intervalSchema),
  saturday: z.array(intervalSchema),
  sunday: z.array(intervalSchema),
}).strict();

const profileSchema = z.object({
  coordinationName: z.string().nullable(),
  operationalEmail: z.string().nullable(),
  operationalPhone: z.string().nullable(),
  supportChannel: z.string().nullable(),
  generalInstructions: z.string().nullable(),
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  addressLine: z.string(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  weeklySchedule: weeklyScheduleSchema,
  instructions: z.string().nullable(),
  isPrimary: z.boolean(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime({ offset: true }),
  specialistLinks: z.array(z.object({ clinicSpecialistId: z.string() }).strict()),
}).strict();

const configSchema = z.object({
  id: z.string(),
  commercialName: z.string(),
  operationalProfile: profileSchema.nullable(),
  locations: z.array(locationSchema),
}).strict();

const envelope = <T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> => {
  const parsed = z.object({ success: z.literal(true), data: z.unknown() }).strict().parse(payload);
  return schema.parse(parsed.data);
};

const headers = () => ({ 'Idempotency-Key': Crypto.randomUUID() });

export type ClinicOperationalConfiguration = z.infer<typeof configSchema>;
export type ClinicOperationalProfile = z.infer<typeof profileSchema>;
export type ClinicLocation = z.infer<typeof locationSchema>;
export type ClinicWeeklySchedule = z.infer<typeof weeklyScheduleSchema>;
export type ClinicLocationInput = Omit<ClinicLocation, 'id' | 'status' | 'version' | 'updatedAt' | 'specialistLinks'>;

export const getClinicOperationalConfiguration = async (clinicId: string): Promise<ClinicOperationalConfiguration> => {
  const response = await api.get(`/clinics/${clinicId}/operations`);
  return envelope(configSchema, response.data);
};

export const updateClinicOperationalProfile = async (
  clinicId: string,
  payload: {
    coordinationName: string | null;
    operationalEmail: string | null;
    operationalPhone: string | null;
    supportChannel: string | null;
    generalInstructions: string | null;
    expectedVersion?: number;
  },
): Promise<ClinicOperationalProfile> => {
  const response = await api.put(`/clinics/${clinicId}/operations/profile`, payload, { headers: headers() });
  return envelope(profileSchema, response.data);
};

export const createClinicLocation = async (
  clinicId: string,
  payload: ClinicLocationInput,
): Promise<ClinicLocation> => {
  const response = await api.post(`/clinics/${clinicId}/operations/locations`, payload, { headers: headers() });
  return envelope(locationSchema, response.data);
};

export const updateClinicLocation = async (
  clinicId: string,
  locationId: string,
  payload: Partial<ClinicLocationInput> & { expectedVersion: number },
): Promise<ClinicLocation> => {
  const response = await api.patch(`/clinics/${clinicId}/operations/locations/${locationId}`, payload, { headers: headers() });
  return envelope(locationSchema, response.data);
};

export const archiveClinicLocation = async (
  clinicId: string,
  locationId: string,
  expectedVersion: number,
): Promise<void> => {
  await api.post(
    `/clinics/${clinicId}/operations/locations/${locationId}/archive`,
    { expectedVersion },
    { headers: headers() },
  );
};

export const replaceClinicSpecialistLocations = async (
  clinicId: string,
  clinicSpecialistId: string,
  locationIds: string[],
): Promise<void> => {
  await api.put(
    `/clinics/${clinicId}/specialists/${clinicSpecialistId}/locations`,
    { locationIds },
    { headers: headers() },
  );
};
