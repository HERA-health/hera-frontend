import Ionicons from '@expo/vector-icons/Ionicons';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession, SessionViewMode } from '../../../../constants/types';
import type * as professionalService from '../../../../services/professionalService';

export const TIME_SLOTS = Array.from({ length: 17 }, (_, index) => index + 7);
export const DAY_HOUR_HEIGHT = 72;
export const CALENDAR_FIT_MIN_HEIGHT = 540;
export const WEEK_HEADER_HEIGHT = 48;
export const MONTH_HEADER_HEIGHT = 38;
export const WEEK_SCROLL_HOUR_HEIGHT = 48;
export const MONTH_SCROLL_ROW_HEIGHT = 80;

export type SessionStatusTone =
  | 'confirmed'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AgendaOriginFilter = 'ALL' | professionalService.ProfessionalSessionOrigin;

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

export interface AgendaWeekSessionBlockMetrics {
  top: number;
  height: number;
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
  { value: 'CLINIC', label: 'Clínica' },
  { value: 'PRIVATE', label: 'Particular' },
];

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return toCalendarDateKey(left) === toCalendarDateKey(right);
}

export function isToday(date: Date, now = new Date()): boolean {
  return isSameCalendarDay(date, now);
}

export function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  const day = start.getDay();
  const offset = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(offset);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

export function getAgendaCalendarRange(
  viewMode: SessionViewMode,
  selectedDate: Date,
): { from: string; to: string } | null {
  if (viewMode === 'list') return null;

  if (viewMode === 'month') {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 41);
    return { from: toCalendarDateKey(gridStart), to: toCalendarDateKey(gridEnd) };
  }

  if (viewMode === 'week') {
    const [weekStart] = getWeekDays(selectedDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
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
    date: new Date(session.startsAt),
    duration: session.durationMinutes,
    status,
    type,
    clientAvatar: session.client.avatar ?? undefined,
    hasInvoice: session.hasInvoice,
    origin: session.origin,
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

  if (now >= sessionEnd) return 'completed';
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
    case 'completed':
      return {
        background: theme.bgMuted,
        border: theme.borderStrong,
        text: theme.textSecondary,
      };
    case 'cancelled':
      return {
        background: theme.status.cancelled.bg,
        border: theme.status.cancelled.border,
        text: theme.status.cancelled.text,
      };
  }
}

export function getWeekLayoutMetrics(availableHeight: number): AgendaLayoutMetrics {
  const fit = availableHeight >= CALENDAR_FIT_MIN_HEIGHT;
  const itemHeight = fit
    ? Math.max(1, (availableHeight - WEEK_HEADER_HEIGHT) / TIME_SLOTS.length)
    : WEEK_SCROLL_HOUR_HEIGHT;
  return {
    itemHeight,
    contentHeight: WEEK_HEADER_HEIGHT + itemHeight * TIME_SLOTS.length,
    scrollEnabled: !fit,
  };
}

export function getAgendaDayScrollOffset(
  targetDate: Date,
  hourHeight = DAY_HOUR_HEIGHT,
): number {
  const startHour = TIME_SLOTS[0];
  const endHour = TIME_SLOTS[TIME_SLOTS.length - 1];
  const rawHour = targetDate.getHours() + targetDate.getMinutes() / 60;
  const clampedHour = Math.min(Math.max(rawHour, startHour), endHour);
  const offset = (clampedHour - startHour) * hourHeight - hourHeight * 0.75;
  return Math.max(0, offset);
}

export function getWeekSessionBlockMetrics(
  sessionStart: Date,
  durationMinutes: number,
  itemHeight: number,
  bodyHeight: number,
): AgendaWeekSessionBlockMetrics | null {
  const calendarStartMinutes = TIME_SLOTS[0] * 60;
  const calendarEndMinutes = (TIME_SLOTS[TIME_SLOTS.length - 1] + 1) * 60;
  const sessionStartMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes();
  const visibleStartMinutes = Math.max(calendarStartMinutes, sessionStartMinutes);
  const visibleEndMinutes = Math.min(calendarEndMinutes, sessionStartMinutes + durationMinutes);
  if (visibleEndMinutes <= visibleStartMinutes) return null;

  const minutesFromStart = visibleStartMinutes - calendarStartMinutes;
  const top = minutesFromStart / 60 * itemHeight;
  const visibleDuration = visibleEndMinutes - visibleStartMinutes;
  const durationFootprint = visibleDuration / 60 * itemHeight;
  const availableBlockHeight = Math.max(1, bodyHeight - top - 3);

  return {
    top,
    height: Math.min(availableBlockHeight, Math.max(8, durationFootprint - 3)),
  };
}

export function getMonthLayoutMetrics(availableHeight: number): AgendaLayoutMetrics {
  const fit = availableHeight >= CALENDAR_FIT_MIN_HEIGHT;
  const itemHeight = fit
    ? Math.max(1, (availableHeight - MONTH_HEADER_HEIGHT) / 6)
    : MONTH_SCROLL_ROW_HEIGHT;
  return {
    itemHeight,
    contentHeight: MONTH_HEADER_HEIGHT + itemHeight * 6,
    scrollEnabled: !fit,
  };
}

export function getMonthVisibleEventLimit(rowHeight: number, isTablet: boolean): number {
  if (rowHeight >= 112 && !isTablet) return 3;
  if (rowHeight >= 88) return 2;
  return 1;
}
