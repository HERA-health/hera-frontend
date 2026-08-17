import { z } from 'zod';
import type {
  ClinicPatientSummary,
  CreateClinicSessionPayload,
} from '../../services/clinicService';
import { parseMadridDateTime } from '../../utils/madridTime';

export type ClinicSessionSchedulerType = Extract<
  CreateClinicSessionPayload['type'],
  'IN_PERSON' | 'PHONE_CALL'
>;

export interface ClinicSessionSchedulerForm {
  clinicPatientId: string;
  date: string;
  time: string;
  duration: string;
  type: ClinicSessionSchedulerType;
}

export type ClinicSessionSchedulerErrors = Partial<
  Record<keyof ClinicSessionSchedulerForm | 'clinicSpecialistId' | 'form', string>
>;

export type ClinicSessionSchedulerValidationResult =
  | { success: true; payload: CreateClinicSessionPayload }
  | { success: false; errors: ClinicSessionSchedulerErrors };

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/;

const schedulerSchema = z.object({
  clinicPatientId: z.string().trim().min(1, 'Selecciona un paciente asignado.'),
  date: z.string().trim().regex(DATE_INPUT_PATTERN, 'Usa una fecha válida.'),
  time: z.string().trim().regex(TIME_INPUT_PATTERN, 'Usa una hora válida.'),
  duration: z.coerce.number().int().min(15, 'La duración mínima es de 15 minutos.').max(180, 'La duración máxima es de 180 minutos.'),
  type: z.enum(['IN_PERSON', 'PHONE_CALL']),
}).strict();

export const createClinicSessionSchedulerForm = (
  clinicPatientId = '',
): ClinicSessionSchedulerForm => ({
  clinicPatientId,
  date: '',
  time: '10:00',
  duration: '60',
  type: 'IN_PERSON',
});

export const validateClinicSessionSchedulerForm = (
  form: ClinicSessionSchedulerForm,
  patients: ClinicPatientSummary[],
  now: Date = new Date(),
): ClinicSessionSchedulerValidationResult => {
  const parsed = schedulerSchema.safeParse(form);

  if (!parsed.success) {
    const errors: ClinicSessionSchedulerErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (
        field === 'clinicPatientId'
        || field === 'date'
        || field === 'time'
        || field === 'duration'
        || field === 'type'
      ) {
        errors[field] = issue.message;
      }
    });
    return { success: false, errors };
  }

  const patient = patients.find((item) => item.id === parsed.data.clinicPatientId);
  const activeAssignment = patient?.activeAssignment;
  if (!patient || !activeAssignment || activeAssignment.clinicSpecialistStatus !== 'ACTIVE') {
    return {
      success: false,
      errors: { clinicSpecialistId: 'El paciente no tiene un responsable activo.' },
    };
  }

  const startsAt = parseMadridDateTime(parsed.data.date, parsed.data.time);
  if (!startsAt) {
    return {
      success: false,
      errors: { date: 'La fecha u hora no existe en Europe/Madrid.' },
    };
  }

  if (startsAt.date.getTime() <= now.getTime()) {
    return {
      success: false,
      errors: { date: 'La cita debe programarse en una fecha futura.' },
    };
  }

  return {
    success: true,
    payload: {
      clinicPatientId: patient.id,
      clinicSpecialistId: activeAssignment.clinicSpecialistId,
      date: startsAt.iso,
      duration: parsed.data.duration,
      type: parsed.data.type,
    },
  };
};
