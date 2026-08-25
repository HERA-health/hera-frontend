import type { SchedulerDateTimeValue } from '../../utils/schedulerDateTime';

export type { SchedulerDateTimeValue };

export type SchedulerSlotState = 'available' | 'unavailable' | 'caution';
export type SchedulerAvailabilityState = 'idle' | 'loading' | 'ready' | 'error';
export type SchedulerOpenPanel = 'date' | 'time' | null;
export type SchedulerTimeChangeSource = 'manual' | 'slot';

export interface SchedulerSlotOption {
  startTime: string;
  endTime: string;
  state: SchedulerSlotState;
  selectable: boolean;
  accessibilityStatus: string;
  message?: string;
}

export interface SchedulerLegendLabels {
  available: string;
  unavailable: string;
  caution: string;
}
