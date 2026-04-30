import { validateManagedSessionSchedulerInput } from '../managedSessionSchedulerValidation';

const baseForm = {
  clientId: 'client-1',
  date: '2026-01-02',
  time: '10:30',
  duration: 60,
  type: 'VIDEO_CALL' as const,
};

describe('validateManagedSessionSchedulerInput', () => {
  it('returns a backend-ready payload for a future session', () => {
    const result = validateManagedSessionSchedulerInput(baseForm, new Date(2026, 0, 1, 9, 0));

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.clientId).toBe('client-1');
    expect(result.input.duration).toBe(60);
    expect(result.input.type).toBe('VIDEO_CALL');
    expect(result.startsAt.getFullYear()).toBe(2026);
    expect(result.startsAt.getMonth()).toBe(0);
    expect(result.startsAt.getDate()).toBe(2);
    expect(result.startsAt.getHours()).toBe(10);
    expect(result.startsAt.getMinutes()).toBe(30);
  });

  it('requires patient selection', () => {
    const result = validateManagedSessionSchedulerInput(
      {
        ...baseForm,
        clientId: '',
      },
      new Date(2026, 0, 1, 9, 0)
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
        time: '25:00',
      },
      new Date(2026, 0, 1, 9, 0)
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors.date).toBe('La fecha u hora no es válida');
  });

  it('enforces duration bounds', () => {
    const tooShort = validateManagedSessionSchedulerInput(
      { ...baseForm, duration: 10 },
      new Date(2026, 0, 1, 9, 0)
    );
    const tooLong = validateManagedSessionSchedulerInput(
      { ...baseForm, duration: 181 },
      new Date(2026, 0, 1, 9, 0)
    );

    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      expect(tooShort.errors.duration).toBe('Mínimo 15 minutos');
    }

    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(tooLong.errors.duration).toBe('Máximo 180 minutos');
    }
  });

  it('rejects past sessions', () => {
    const result = validateManagedSessionSchedulerInput(
      { ...baseForm, date: '2026-01-01', time: '08:30' },
      new Date(2026, 0, 1, 9, 0)
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.date).toBe('La cita debe ser futura');
    }
  });
});
