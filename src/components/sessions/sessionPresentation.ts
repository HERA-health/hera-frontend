import type { Theme } from '../../constants/theme';
import type {
  ClinicSessionStatus,
  ClinicSessionType,
} from '../../services/clinicService';
import { showAppAlert } from '../common/alert';
import type { AppAlertApi } from '../common/alert';

export type ClinicSessionTerminalStatus = Extract<
  ClinicSessionStatus,
  'CANCELLED' | 'COMPLETED'
>;

export const CLINIC_SESSION_STATUS_LABELS: Record<ClinicSessionStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const CLINIC_SESSION_TYPE_LABELS: Record<ClinicSessionType, string> = {
  IN_PERSON: 'Presencial',
  PHONE_CALL: 'Llamada',
  VIDEO_CALL: 'Videollamada',
};

export const CLINIC_SESSION_STATUS_THEME_KEYS: Record<
  ClinicSessionStatus,
  keyof Theme['status']
> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const CLINIC_SESSION_STATUSES: readonly ClinicSessionStatus[] = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

const CLINIC_SESSION_TYPES: readonly ClinicSessionType[] = [
  'IN_PERSON',
  'PHONE_CALL',
  'VIDEO_CALL',
];

const isClinicSessionStatus = (value: string): value is ClinicSessionStatus =>
  CLINIC_SESSION_STATUSES.some((status) => status === value);

const isClinicSessionType = (value: string): value is ClinicSessionType =>
  CLINIC_SESSION_TYPES.some((type) => type === value);

export const getSessionStatusLabel = (status: string): string =>
  isClinicSessionStatus(status) ? CLINIC_SESSION_STATUS_LABELS[status] : status;

export const getSessionStatusThemeKey = (
  status: string
): keyof Theme['status'] | null =>
  isClinicSessionStatus(status) ? CLINIC_SESSION_STATUS_THEME_KEYS[status] : null;

export const getSessionTypeLabel = (type: string): string =>
  isClinicSessionType(type) ? CLINIC_SESSION_TYPE_LABELS[type] : type;

export const requestClinicSessionStatusConfirmation = (
  alert: AppAlertApi,
  status: ClinicSessionTerminalStatus,
  onConfirm: () => void,
): void => {
  const cancelling = status === 'CANCELLED';

  showAppAlert(
    alert,
    cancelling ? 'Cancelar cita' : 'Completar cita',
    cancelling
      ? '¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer.'
      : 'Confirma que la cita ya ha finalizado. Esta acción no se puede deshacer.',
    [
      { text: 'Volver', style: 'cancel' },
      {
        text: cancelling ? 'Sí, cancelar' : 'Sí, completar',
        ...(cancelling ? { style: 'destructive' as const } : {}),
        onPress: onConfirm,
      },
    ],
    { cancelable: true },
  );
};
