import Ionicons from '@expo/vector-icons/Ionicons';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession, SessionViewMode } from '../../../../constants/types';
import type * as professionalService from '../../../../services/professionalService';
import { formatMadridInstant, getMadridDateKey } from '../../../../utils/madridTime';

export const DAY_HOUR_HEIGHT = 48;
export const MONTH_HEADER_HEIGHT = 40;
export const MONTH_SCROLL_ROW_HEIGHT = 104;

export type SessionStatusTone =
  | 'confirmed'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'ended'
  | 'cancelled';

export type AgendaOriginFilter = 'ALL' | professionalService.AgendaProvenance;
export type AgendaStatusFilter = 'ACTIVE' | 'ALL' | 'PENDING' | 'CANCELLED';

export interface ViewOption {
  value: SessionViewMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface AgendaLayoutMetrics {
  itemHeight: number;
  contentHeight: number;
  scrollEnabled: boolean;
}

export interface AgendaStatusPalette {
  background: string;
  border: string;
  text: string;
}

export const VIEW_OPTIONS: readonly ViewOption[] = [
  { value: 'day', label: 'Día', icon: 'calendar' },
  { value: 'week', label: 'Semana', icon: 'calendar-outline' },
  { value: 'month', label: 'Mes', icon: 'calendar-number-outline' },
  { value: 'list', label: 'Lista', icon: 'list' },
];

export const ORIGIN_FILTER_OPTIONS: ReadonlyArray<{
  value: AgendaOriginFilter;
  label: string;
}> = [
  { value: 'ALL', label: 'Todas' },
  { value: 'DIRECTORY', label: 'Directorio HERA' },
  { value: 'OWN', label: 'Cartera propia' },
  { value: 'REFERRAL', label: 'Derivación' },
  { value: 'COLLABORATION', label: 'Colaboración' },
  { value: 'UNDETERMINED', label: 'Procedencia pendiente' },
];

export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: AgendaStatusFilter; label: string }> = [
  { value: 'ACTIVE', label: 'Sin canceladas' },
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CANCELLED', label: 'Solo canceladas' },
];

export function getProvenanceLabel(provenance: ProfessionalSession['provenance'], contexts?: ProfessionalSession['relationshipContext']): string {
  const primary = provenance === 'REFERRAL' || provenance === 'COLLABORATION' ? 'OWN' : provenance;
  const label = ORIGIN_FILTER_OPTIONS.find((option) => option.value === (primary ?? 'UNDETERMINED'))?.label ?? 'Procedencia pendiente';
  const additional = contexts ?? (provenance === 'REFERRAL' || provenance === 'COLLABORATION' ? [provenance] : []);
  return [label, ...additional.map(value => value === 'REFERRAL' ? 'Derivación' : 'Colaboración')].join(' · ');
}

export function getProvenancePalette(theme: Theme, session: ProfessionalSession): AgendaStatusPalette {
  if (session.status === 'cancelled' || !session.provenance || !['DIRECTORY', 'OWN'].includes(session.provenance)) {
    return { background: theme.bgMuted, border: theme.borderStrong, text: theme.textSecondary };
  }
  return session.provenance === 'DIRECTORY'
    ? theme.agendaProvenance.directory
    : theme.agendaProvenance.own;
}

export function filterAgendaSessions(sessions: ProfessionalSession[], origin: AgendaOriginFilter, status: AgendaStatusFilter): ProfessionalSession[] {
  return sessions.filter((session) => (origin === 'ALL' || (session.provenance ?? 'UNDETERMINED') === origin
    || ((origin === 'REFERRAL' || origin === 'COLLABORATION') && session.relationshipContext?.includes(origin))
    || (origin === 'OWN' && (session.provenance === 'REFERRAL' || session.provenance === 'COLLABORATION')))
    && (status === 'ALL' || (status === 'ACTIVE' && session.status !== 'cancelled')
      || (status === 'PENDING' && session.status === 'pending') || (status === 'CANCELLED' && session.status === 'cancelled')));
}

export function formatTime(date: Date): string {
  return formatMadridInstant(date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

export function getSessionEndDate(session: ProfessionalSession): Date {
  return new Date(session.date.getTime() + session.duration * 60_000);
}

export function formatSessionTimeRange(session: ProfessionalSession): string {
  return `${formatTime(session.date)} - ${formatTime(getSessionEndDate(session))}`;
}

export function getSessionTypeLabel(type: ProfessionalSession['type']): string {
  switch (type) {
    case 'video':
      return 'Videollamada';
    case 'audio':
      return 'Teléfono';
    case 'chat':
      return 'Chat';
    case 'in_person':
      return 'Presencial';
  }
}

export function capitalizeFirst(value: string): string {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function toCalendarDateKey(date: Date): string {
  return getMadridDateKey(date);
}

export const calendarDate = (key: string): Date => new Date(`${key}T12:00:00.000Z`);
export const addCalendarDays = (date: Date, days: number): Date => {
  const result = calendarDate(toCalendarDateKey(date));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export function getMonthDays(date: Date): Date[] {
  const first = calendarDate(`${toCalendarDateKey(date).slice(0, 7)}-01`);
  const offset = (first.getUTCDay() + 6) % 7;
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  const count = Math.ceil((offset + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => addCalendarDays(first, index - offset));
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return toCalendarDateKey(left) === toCalendarDateKey(right);
}

export function isToday(date: Date, now = new Date()): boolean {
  return isSameCalendarDay(date, now);
}

export function getWeekDays(date: Date): Date[] {
  const current = calendarDate(toCalendarDateKey(date));
  const offset = (current.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(current, index - offset));
}

export function getAgendaCalendarRange(
  viewMode: SessionViewMode,
  selectedDate: Date,
): { from: string; to: string } {
  if (viewMode === 'month') {
    const days = getMonthDays(selectedDate);
    return { from: toCalendarDateKey(days[0]), to: toCalendarDateKey(days[days.length - 1]) };
  }

  if (viewMode === 'week' || viewMode === 'list') {
    const [weekStart] = getWeekDays(selectedDate);
    const weekEnd = addCalendarDays(weekStart, 6);
    return { from: toCalendarDateKey(weekStart), to: toCalendarDateKey(weekEnd) };
  }

  const day = toCalendarDateKey(selectedDate);
  return { from: day, to: day };
}

export function mapAgendaItem(
  session: professionalService.ProfessionalAgendaItem,
): ProfessionalSession {
  const status: ProfessionalSession['status'] = session.status === 'COMPLETED'
    ? 'completed'
    : session.status === 'CANCELLED'
      ? 'cancelled'
      : session.status === 'CONFIRMED'
        ? 'scheduled'
        : 'pending';
  const type: ProfessionalSession['type'] = session.type === 'PHONE_CALL'
    ? 'audio'
    : session.type === 'IN_PERSON'
      ? 'in_person'
      : 'video';

  return {
    id: session.id,
    clientId: session.client.id,
    clientName: session.client.displayName,
    clientInitial: session.client.displayName[0]?.toLocaleUpperCase('es-ES') ?? 'P',
    meetingStatus: session.meetingStatus,
    date: new Date(session.startsAt),
    duration: session.durationMinutes,
    status,
    type,
    clientAvatar: session.client.avatar ?? undefined,
    hasInvoice: session.hasInvoice,
    paymentBooking: session.paymentBooking,
    origin: session.origin,
    provenance: session.provenance ?? 'UNDETERMINED',
    relationshipContext: session.relationshipContext,
    privateOptionId: session.privateOptionId,
    bookedPrivateServiceName: session.bookedPrivateServiceName,
    clinicContext: session.clinicContext,
    actions: session.actions,
  };
}

export function getSessionDisplayStatus(
  session: ProfessionalSession,
  currentTime: Date,
): SessionStatusTone {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';
  if (session.status === 'pending') return 'pending';

  const sessionStart = session.date.getTime();
  const sessionEnd = sessionStart + session.duration * 60_000;
  const now = currentTime.getTime();

  if (now >= sessionEnd) return 'ended';
  if (now >= sessionStart) return 'in_progress';
  return 'confirmed';
}

export function getStatusLabel(status: SessionStatusTone): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmada';
    case 'pending':
      return 'Pendiente';
    case 'in_progress':
      return 'En curso';
    case 'completed':
      return 'Completada';
    case 'ended':
      return 'Finalizada';
    case 'cancelled':
      return 'Cancelada';
  }
}

export function getAgendaStatusPalette(
  theme: Theme,
  status: SessionStatusTone,
): AgendaStatusPalette {
  switch (status) {
    case 'confirmed':
      return {
        background: theme.status.confirmed.bg,
        border: theme.status.confirmed.border,
        text: theme.status.confirmed.text,
      };
    case 'pending':
      return {
        background: theme.status.pending.bg,
        border: theme.status.pending.border,
        text: theme.status.pending.text,
      };
    case 'in_progress':
      return {
        background: theme.primaryAlpha12,
        border: theme.info,
        text: theme.info,
      };
    case 'ended':
    case 'completed':
      return {
        background: theme.bgMuted,
        border: theme.borderStrong,
        text: theme.textSecondary,
      };
    case 'cancelled':
      return {
        background: theme.bgMuted,
        border: theme.borderStrong,
        text: theme.textSecondary,
      };
  }
}

export function getMonthLayoutMetrics(availableHeight: number, rows = 6): AgendaLayoutMetrics {
  const fit = availableHeight >= MONTH_HEADER_HEIGHT + rows * MONTH_SCROLL_ROW_HEIGHT;
  const itemHeight = fit
    ? Math.max(1, (availableHeight - MONTH_HEADER_HEIGHT) / rows)
    : MONTH_SCROLL_ROW_HEIGHT;
  return {
    itemHeight,
    contentHeight: MONTH_HEADER_HEIGHT + itemHeight * rows,
    scrollEnabled: !fit,
  };
}

export function getMonthVisibleEventLimit(rowHeight: number, isTablet: boolean): number {
  return Math.max(1, Math.min(isTablet ? 2 : 3, Math.floor((rowHeight - 50) / 50)));
}
