import type { ManagedSessionSlotOption } from '../../../services/professionalService';
import { createProfessionalSchedulerSlots } from '../managedSessionSchedulerAdapter';

describe('managedSessionSchedulerAdapter', () => {
  it('maps professional statuses to neutral scheduler states', () => {
    const slots: ManagedSessionSlotOption[] = [
      { startTime: '10:00', endTime: '11:00', status: 'AVAILABLE', selectable: true },
      { startTime: '10:15', endTime: '11:15', status: 'OCCUPIED', selectable: false },
      { startTime: '10:30', endTime: '11:30', status: 'BUFFER_CONFLICT', selectable: true },
      { startTime: '10:45', endTime: '11:45', status: 'PAST', selectable: false },
    ];

    const result = createProfessionalSchedulerSlots(
      '2026-06-15',
      slots,
      new Date('2026-06-15T06:00:00.000Z'),
    );

    expect(result.find((slot) => slot.startTime === '10:00')).toMatchObject({
      state: 'available',
      selectable: true,
      accessibilityStatus: 'disponible',
    });
    expect(result.find((slot) => slot.startTime === '10:15')).toMatchObject({
      state: 'unavailable',
      selectable: false,
      accessibilityStatus: 'ocupada',
    });
    expect(result.find((slot) => slot.startTime === '10:30')).toMatchObject({
      state: 'caution',
      selectable: true,
      accessibilityStatus: 'en descanso',
    });
    expect(result.find((slot) => slot.startTime === '10:45')).toMatchObject({
      state: 'unavailable',
      selectable: false,
      accessibilityStatus: 'pasada',
    });
  });

  it('completes missing API slots with an honest Madrid fallback grid', () => {
    const result = createProfessionalSchedulerSlots(
      '2026-06-15',
      [],
      new Date('2026-06-15T08:30:00.000Z'),
    );

    expect(result).toHaveLength(65);
    expect(result.find((slot) => slot.startTime === '10:30')).toMatchObject({
      state: 'unavailable',
      selectable: false,
    });
    expect(result.find((slot) => slot.startTime === '10:45')).toMatchObject({
      state: 'available',
      selectable: true,
    });
  });
});
