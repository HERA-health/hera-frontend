import type {
  ClinicSessionSlotOption,
  ClinicSessionSlotStatus,
} from '../../services/clinicService';
import {
  isSchedulerTimeInPast,
  SCHEDULER_TIME_OPTIONS,
} from '../../utils/schedulerDateTime';
import type { SchedulerSlotOption } from '../scheduling/schedulerTypes';

const getStatusMessage = (status: ClinicSessionSlotStatus): string | undefined => {
  if (status === 'OCCUPIED') return 'Ese hueco ya está ocupado. Elige otra hora.';
  if (status === 'PAST') return 'Esa hora ya ha pasado. Elige otra franja.';
  return undefined;
};

const mapClinicSlot = (slot: ClinicSessionSlotOption): SchedulerSlotOption => ({
  startTime: slot.startTime,
  endTime: slot.endTime,
  state: slot.status === 'AVAILABLE' ? 'available' : 'unavailable',
  selectable: slot.selectable,
  accessibilityStatus: slot.status === 'AVAILABLE'
    ? 'disponible'
    : slot.status === 'PAST'
      ? 'pasada'
      : 'ocupada',
  message: getStatusMessage(slot.status),
});

export const createClinicSchedulerSlots = (
  date: string,
  slots: readonly ClinicSessionSlotOption[],
  now: Date = new Date(Date.now()),
): SchedulerSlotOption[] => {
  const slotsByStart = new Map(slots.map((slot) => [slot.startTime, slot]));

  return SCHEDULER_TIME_OPTIONS.map((startTime) => {
    const slot = slotsByStart.get(startTime);
    if (slot) return mapClinicSlot(slot);

    const past = isSchedulerTimeInPast(date, startTime, now);
    return {
      startTime,
      endTime: startTime,
      state: past ? 'unavailable' : 'available',
      selectable: !past,
      accessibilityStatus: past ? 'pasada' : 'disponible pendiente de validación',
      message: past ? getStatusMessage('PAST') : undefined,
    };
  });
};
