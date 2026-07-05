import { validateManagedSessionSchedulerInput } from '../managedSessionSchedulerValidation';
import {
  MANAGED_SESSION_DURATION_OPTIONS,
  MANAGED_SESSION_TIME_OPTIONS,
} from '../managedSessionSchedulerOptions';

const baseForm = {
  clientId: 'client-1',
  date: '2026-01-02',
  time: '10:30',
  duration: 60,
  type: 'VIDEO_CALL' as const,
};

describe('validateManagedSessionSchedulerInput', () => {
  it('keeps the private managed appointment grid contract explicit', () => {
    expect([...MANAGED_SESSION_DURATION_OPTIONS]).toEqual([45, 50, 60, 75, 90]);
    expect(MANAGED_SESSION_TIME_OPTIONS[0]).toBe('07:00');
    expect(MANAGED_SESSION_TIME_OPTIONS[MANAGED_SESSION_TIME_OPTIONS.length - 1]).toBe('23:00');
    expect(MANAGED_SESSION_TIME_OPTIONS).toHaveLength(65);
  });

  it('returns a backend-ready payload for a future session', () => {
    const result = validateManagedSessionSchedulerInput(
      baseForm,
      new Date('2026-01-01T08:00:00.000Z')
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.clientId).toBe('client-1');
    expect(result.input.date).toBe('2026-01-02T09:30:00.000Z');
    expect(result.input.duration).toBe(60);
    expect(result.input.type).toBe('VIDEO_CALL');
    expect(result.startsAt.toISOString()).toBe('2026-01-02T09:30:00.000Z');
  });

  it('requires patient selection', () => {
    const result = validateManagedSessionSchedulerInput(
      {
        ...baseForm,
        clientId: '',
      },
      new Date('2026-01-01T08:00:00.000Z')
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors.clientId).toBe('Selecciona un paciente');
  });

  it('rejects invalid local date/time fields', () => {
    const result = validateManagedSessionSchedulerInput(
      {
        ...baseForm,
        date: '2026-99-02',
      },
      new Date('2026-01-01T08:00:00.000Z')
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors.date).toBe('La fecha u hora no es válida');
  });

  it('rejects times outside the fixed scheduler grid', () => {
    const result = validateManagedSessionSchedulerInput(
      { ...baseForm, time: '15:32' },
      new Date('2026-01-01T08:00:00.000Z')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.time).toBe('Elige una franja horaria de la lista');
    }
  });

  it('enforces predefined durations', () => {
    const result = validateManagedSessionSchedulerInput(
      { ...baseForm, duration: 30 },
      new Date('2026-01-01T08:00:00.000Z')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.duration).toBe('Elige una duración de la lista');
    }
  });

  it('rejects past sessions', () => {
    const result = validateManagedSessionSchedulerInput(
      { ...baseForm, date: '2026-01-01', time: '08:30' },
      new Date('2026-01-01T08:00:00.000Z')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.date).toBe('La cita debe ser futura');
    }
  });
});
