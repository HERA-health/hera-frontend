/**
 * Session Helper Utilities
 * Single Responsibility: Pure functions for session data manipulation
 */

import { ApiSession, SessionStatus, SessionType, GroupedSessions, StatusBadgeVariant } from '../types';

/**
 * Time constants for session calculations
 */
const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour after session ends

/**
 * Checks if a session is past (with grace period)
 */
export const isSessionPast = (session: ApiSession): boolean => {
  const now = Date.now();
  const sessionStart = new Date(session.date).getTime();
  const sessionEnd = sessionStart + session.duration * 60 * 1000;
  const gracePeriodEnd = sessionEnd + GRACE_PERIOD_MS;
  return now > gracePeriodEnd;
};

/**
 * Checks if session is upcoming (not past and active status)
 */
export const isUpcomingSession = (session: ApiSession): boolean => {
  const isActive = session.status === 'CONFIRMED' || session.status === 'PENDING';
  return isActive && !isSessionPast(session);
};

/**
 * Groups sessions into upcoming and past
 */
export const groupSessions = (sessions: ApiSession[]): GroupedSessions => {
  const upcoming: ApiSession[] = [];
  const past: ApiSession[] = [];

  sessions.forEach((session) => {
    if (isUpcomingSession(session)) {
      upcoming.push(session);
    } else {
      past.push(session);
    }
  });

  // Sort upcoming by date ascending (earliest first)
  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Sort past by date descending (most recent first)
  past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { upcoming, past };
};

/**
 * Gets sessions for a specific date
 */
export const getSessionsForDate = (sessions: ApiSession[], dateString: string): ApiSession[] => {
  return sessions
    .filter((session) => {
      const sessionDate = new Date(session.date).toISOString().split('T')[0];
      return sessionDate === dateString;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Gets status badge variant from session status
 */
export const getStatusBadgeVariant = (status: SessionStatus): StatusBadgeVariant => {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'CONFIRMED':
      return 'confirmed';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
};

/**
 * Gets status label in Spanish
 */
export const getStatusLabel = (status: SessionStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'COMPLETED':
      return 'Completada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
};

/**
 * Gets session type label in Spanish
 */
export const getSessionTypeLabel = (type: SessionType): string => {
  switch (type) {
    case 'VIDEO_CALL':
      return 'Videollamada';
    case 'PHONE_CALL':
      return 'Llamada';
    case 'IN_PERSON':
      return 'Presencial';
    default:
      return type;
  }
};

/**
 * Gets session type icon name
 */
export const getSessionTypeIcon = (type: SessionType): string => {
  switch (type) {
    case 'VIDEO_CALL':
      return 'videocam';
    case 'PHONE_CALL':
      return 'call';
    case 'IN_PERSON':
      return 'location';
    default:
      return 'videocam';
  }
};

/**
 * Safely parses a date string, returning null if invalid
 */
const safeParseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Formats date to Spanish locale full format
 */
export const formatDate = (dateString: string): string => {
  const date = safeParseDate(dateString);
  if (!date) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/**
 * Formats date to short format (day, month)
 */
export const formatShortDate = (dateString: string): string => {
  const date = safeParseDate(dateString);
  if (!date) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

/**
 * Formats time in HH:MM format
 */
export const formatTime = (dateString: string): string => {
  const date = safeParseDate(dateString);
  if (!date) return '--:--';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Checks if date is today
 */
export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Checks if date is tomorrow
 */
export const isTomorrow = (dateString: string): boolean => {
  const date = new Date(dateString);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
};

/**
 * Gets date label (Hoy, Mañana, or short date)
 */
export const getDateLabel = (dateString: string): string => {
  if (isToday(dateString)) return 'Hoy';
  if (isTomorrow(dateString)) return 'Mañana';
  return formatShortDate(dateString);
};

/**
 * Gets status color for calendar indicators
 */
export const getStatusColor = (status: SessionStatus): string => {
  switch (status) {
    case 'CONFIRMED':
      return '#7BA377'; // Sage green
    case 'PENDING':
      return '#D9A84F'; // Warning yellow
    case 'COMPLETED':
      return '#9BA39B'; // Muted gray
    case 'CANCELLED':
      return '#E89D88'; // Coral
    default:
      return '#6B7B6B';
  }
};
