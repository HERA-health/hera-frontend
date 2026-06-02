import { z } from 'zod';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../constants/errors';
import type { UploadAsset } from '../../utils/multipartUpload';

export type ConsentCaptureMode = 'UPLOAD_NOW' | 'UPLOAD_LATER';

export const CLINICAL_PIN_REGEX = /^\d{6}$/;

export const CONSENT_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const consentDocumentSchema = z.custom<UploadAsset | null>(
  (value) =>
    value === null
    || (
      typeof value === 'object'
      && value !== null
      && 'uri' in value
      && typeof value.uri === 'string'
    ),
  { message: 'Adjunta el consentimiento firmado' }
);

export const managedClientSchema = z.object({
  firstName: z.string().trim().min(2, 'Introduce el nombre'),
  lastName: z.string().trim().min(2, 'Introduce los apellidos'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || '')
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: 'Introduce un email válido',
    }),
  phone: z.string().trim().optional().transform((value) => value || ''),
  billingFullName: z.string().trim().optional().transform((value) => value || ''),
  billingTaxId: z.string().trim().optional().transform((value) => value || ''),
  billingAddress: z.string().trim().optional().transform((value) => value || ''),
  billingPostalCode: z.string().trim().optional().transform((value) => value || ''),
  billingCity: z.string().trim().optional().transform((value) => value || ''),
  billingCountry: z.string().trim().optional().transform((value) => value || 'Spain'),
  consentCaptureMode: z.enum(['UPLOAD_NOW', 'UPLOAD_LATER']),
  consentDocument: consentDocumentSchema,
  clinicalPin: z.string().trim().optional().transform((value) => value || ''),
}).superRefine((value, context) => {
  if (!value.email && !value.phone) {
    context.addIssue({
      code: 'custom',
      path: ['email'],
      message: CONTACT_METHOD_REQUIRED_MESSAGE,
    });
  }

  if (value.consentCaptureMode === 'UPLOAD_NOW' && !value.consentDocument) {
    context.addIssue({
      code: 'custom',
      path: ['consentDocument'],
      message: 'Adjunta el consentimiento firmado para registrarlo ahora.',
    });
  }
});

export type ManagedClientForm = z.infer<typeof managedClientSchema>;

export const emptyManagedClientForm: ManagedClientForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  billingFullName: '',
  billingTaxId: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: 'Spain',
  consentCaptureMode: 'UPLOAD_LATER',
  consentDocument: null,
  clinicalPin: '',
};
