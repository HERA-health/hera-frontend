import { z } from 'zod';
import type { CreateManagedClientSessionInput, SessionType } from '../services/professionalService';

export type ManagedSessionSchedulerField = 'clientId' | 'date' | 'time' | 'duration' | 'type';

export interface ManagedSessionSchedulerForm {
  clientId: string;
  date: string;
  time: string;
  duration: number;
  type: SessionType;
}

type ValidationErrors = Partial<Record<ManagedSessionSchedulerField, string>>;

export type ManagedSessionSchedulerValidationResult =
  | {
      success: true;
      input: CreateManagedClientSessionInput;
      startsAt: Date;
    }
  | {
      success: false;
      errors: ValidationErrors;
    };

const schedulerSchema = z.object({
  clientId: z.string().min(1, 'Selecciona un paciente'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Usa el formato HH:MM'),
  duration: z.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 180 minutos'),
  type: z.enum(['VIDEO_CALL', 'PHONE_CALL', 'IN_PERSON']),
});

const parseLocalDateTime = (dateValue: string, timeValue: string): Date | null => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  const matchesInput =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;

  return matchesInput ? date : null;
};

export const validateManagedSessionSchedulerInput = (
  form: ManagedSessionSchedulerForm,
  now: Date = new Date()
): ManagedSessionSchedulerValidationResult => {
  const parsed = schedulerSchema.safeParse({
    clientId: form.clientId,
    date: form.date.trim(),
    time: form.time.trim(),
    duration: form.duration,
    type: form.type,
  });

  if (!parsed.success) {
    const errors: ValidationErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (
        field === 'clientId' ||
        field === 'date' ||
        field === 'time' ||
        field === 'duration' ||
        field === 'type'
      ) {
        errors[field] = issue.message;
      }
    });

    return { success: false, errors };
  }

  const startsAt = parseLocalDateTime(parsed.data.date, parsed.data.time);
  if (!startsAt) {
    return { success: false, errors: { date: 'La fecha u hora no es válida' } };
  }

  if (startsAt.getTime() <= now.getTime()) {
    return { success: false, errors: { date: 'La cita debe ser futura' } };
  }

  return {
    success: true,
    startsAt,
    input: {
      clientId: parsed.data.clientId,
      date: startsAt.toISOString(),
      duration: parsed.data.duration,
      type: parsed.data.type,
    },
  };
};
