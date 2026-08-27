import { z } from 'zod';
import type {
  ClinicServiceCatalogItem,
  ClinicServiceModality,
  ClinicServiceWritePayload,
} from '../../../services/clinicService';

export interface ClinicServiceFormValues {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  modalities: ClinicServiceModality[];
  clinicSpecialistIds: string[];
}

export type ClinicServiceFormErrors = Partial<Record<keyof ClinicServiceFormValues, string>>;

export const CLINIC_SERVICE_MAX_PRICE = 99_999_999.99;

export const EMPTY_CLINIC_SERVICE_FORM: ClinicServiceFormValues = {
  name: '',
  description: '',
  durationMinutes: '50',
  price: '',
  modalities: ['IN_PERSON'],
  clinicSpecialistIds: [],
};

const priceSchema = z.string()
  .trim()
  .min(1, 'Indica el importe final del servicio.')
  .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Usa un importe válido con un máximo de dos decimales.')
  .transform((value) => Number(value.replace(',', '.')))
  .refine((value) => Number.isFinite(value) && value >= 0, 'El importe no puede ser negativo.')
  .refine(
    (value) => value <= CLINIC_SERVICE_MAX_PRICE,
    'El importe supera el máximo admitido.',
  );

const formSchema = z.object({
  name: z.string().trim().min(2, 'Escribe un nombre de al menos 2 caracteres.').max(120),
  description: z.string().trim().max(500, 'La descripción no puede superar 500 caracteres.'),
  durationMinutes: z.string()
    .trim()
    .regex(/^\d+$/, 'La duración debe ser un número entero.')
    .transform(Number)
    .refine((value) => value >= 15 && value <= 180, 'La duración debe estar entre 15 y 180 minutos.'),
  price: priceSchema,
  modalities: z.array(z.enum(['IN_PERSON', 'PHONE_CALL'])).min(1, 'Selecciona al menos una modalidad.'),
  clinicSpecialistIds: z.array(z.string().trim().min(1)).min(1, 'Asocia al menos un profesional activo.'),
});

export type ClinicServiceFormParseResult =
  | { success: true; payload: ClinicServiceWritePayload }
  | { success: false; errors: ClinicServiceFormErrors };

export const parseClinicServiceForm = (
  values: ClinicServiceFormValues,
): ClinicServiceFormParseResult => {
  const parsed = formSchema.safeParse(values);
  if (!parsed.success) {
    const errors: ClinicServiceFormErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field === 'string' && !(field in errors)) {
        errors[field as keyof ClinicServiceFormValues] = issue.message;
      }
    });
    return { success: false, errors };
  }

  return {
    success: true,
    payload: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationMinutes: parsed.data.durationMinutes,
      price: parsed.data.price,
      modalities: parsed.data.modalities,
      clinicSpecialistIds: [...new Set(parsed.data.clinicSpecialistIds)],
    },
  };
};

export const clinicServiceToForm = (
  service: ClinicServiceCatalogItem,
): ClinicServiceFormValues => ({
  name: service.name,
  description: service.description ?? '',
  durationMinutes: String(service.durationMinutes),
  price: service.price.toFixed(2).replace('.', ','),
  modalities: [...service.modalities],
  clinicSpecialistIds: [...service.clinicSpecialistIds],
});

export const formatClinicServicePrice = (price: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(price);
