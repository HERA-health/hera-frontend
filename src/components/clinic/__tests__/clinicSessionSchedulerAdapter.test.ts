import type { ClinicSessionSlotOption } from '../../../services/clinicService';
import { createClinicSchedulerSlots } from '../clinicSessionSchedulerAdapter';

describe('clinicSessionSchedulerAdapter', () => {
  it('maps available, occupied and past clinic slots without exposing their origin', () => {
    const slots: ClinicSessionSlotOption[] = [
      { startTime: '10:00', endTime: '11:00', status: 'AVAILABLE', selectable: true },
      { startTime: '10:15', endTime: '11:15', status: 'OCCUPIED', selectable: false },
      { startTime: '10:30', endTime: '11:30', status: 'PAST', selectable: false },
    ];

    const result = createClinicSchedulerSlots(
      '2030-01-15',
      slots,
      new Date('2030-01-14T10:00:00.000Z'),
    );

    expect(result).toHaveLength(65);
    expect(result.find((slot) => slot.startTime === '10:00')).toMatchObject({
      state: 'available',
      selectable: true,
    });
    expect(result.find((slot) => slot.startTime === '10:15')).toMatchObject({
      state: 'unavailable',
      selectable: false,
      accessibilityStatus: 'ocupada',
    });
    expect(result.find((slot) => slot.startTime === '10:30')).toMatchObject({
      state: 'unavailable',
      selectable: false,
      accessibilityStatus: 'pasada',
    });
  });

  it('fills an unavailable preview honestly while preserving past-time blocking', () => {
    const result = createClinicSchedulerSlots(
      '2030-01-15',
      [],
      new Date('2030-01-15T09:05:00.000Z'),
    );

    expect(result.find((slot) => slot.startTime === '10:00')?.selectable).toBe(false);
    expect(result.find((slot) => slot.startTime === '10:15')).toMatchObject({
      state: 'available',
      selectable: true,
      accessibilityStatus: 'disponible pendiente de validación',
    });
  });
});
