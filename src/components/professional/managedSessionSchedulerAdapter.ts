import type {
  ManagedSessionSlotOption,
  ManagedSessionSlotStatus,
} from '../../services/professionalService';
import {
  isSchedulerTimeInPast,
  SCHEDULER_TIME_OPTIONS,
} from '../../utils/schedulerDateTime';
import type { SchedulerSlotOption } from '../scheduling/schedulerTypes';

const getStatusMessage = (status: ManagedSessionSlotStatus): string | undefined => {
  if (status === 'OCCUPIED') return 'Ese hueco ya está ocupado. Elige otra hora.';
  if (status === 'PAST') return 'Esa hora ya ha pasado. Elige otra franja.';
  if (status === 'BUFFER_CONFLICT') {
    return 'Este hueco pisa el descanso configurado entre sesiones.';
  }
  return undefined;
};

const getAccessibilityStatus = (status: ManagedSessionSlotStatus): string => {
  if (status === 'OCCUPIED') return 'ocupada';
  if (status === 'PAST') return 'pasada';
  if (status === 'BUFFER_CONFLICT') return 'en descanso';
  return 'disponible';
};

const mapManagedSlot = (slot: ManagedSessionSlotOption): SchedulerSlotOption => ({
  startTime: slot.startTime,
  endTime: slot.endTime,
  state: slot.status === 'AVAILABLE'
    ? 'available'
    : slot.status === 'BUFFER_CONFLICT'
      ? 'caution'
      : 'unavailable',
  selectable: slot.selectable,
  accessibilityStatus: getAccessibilityStatus(slot.status),
  message: getStatusMessage(slot.status),
});

export const createProfessionalSchedulerSlots = (
  date: string,
  slots: readonly ManagedSessionSlotOption[],
  now: Date = new Date(Date.now()),
): SchedulerSlotOption[] => {
  const slotsByStart = new Map(slots.map((slot) => [slot.startTime, slot]));

  return SCHEDULER_TIME_OPTIONS.map((startTime) => {
    const slot = slotsByStart.get(startTime);
    if (slot) return mapManagedSlot(slot);

    const past = isSchedulerTimeInPast(date, startTime, now);
    return {
      startTime,
      endTime: startTime,
      state: past ? 'unavailable' : 'available',
      selectable: !past,
      accessibilityStatus: past ? 'pasada' : 'disponible',
      message: past ? getStatusMessage('PAST') : undefined,
    };
  });
};
