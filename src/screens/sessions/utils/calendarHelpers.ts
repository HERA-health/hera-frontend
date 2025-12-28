/**
 * Calendar Helper Utilities
 * Single Responsibility: Pure functions for calendar calculations
 */

import { ApiSession, SessionStatus } from '../types';

/**
 * Gets the date string in YYYY-MM-DD format
 */
export const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Gets today's date string
 */
export const getTodayString = (): string => {
  return getDateString(new Date());
};

/**
 * Creates marked dates object for react-native-calendars
 */
export const createMarkedDates = (
  sessions: ApiSession[],
  selectedDate: string
): Record<string, { selected?: boolean; selectedColor?: string; dots: Array<{ key: string; color: string }> }> => {
  const marked: Record<string, { selected?: boolean; selectedColor?: string; dots: Array<{ key: string; color: string }> }> = {};

  // Process sessions to add dots
  sessions.forEach((session) => {
    const dateStr = getDateString(new Date(session.date));

    if (!marked[dateStr]) {
      marked[dateStr] = { dots: [] };
    }

    // Add dot based on status
    const dot = {
      key: session.id,
      color: getStatusDotColor(session.status),
    };

    marked[dateStr].dots.push(dot);
  });

  // Add selected date styling
  if (marked[selectedDate]) {
    marked[selectedDate].selected = true;
    marked[selectedDate].selectedColor = '#8B9D83'; // Sage green
  } else {
    marked[selectedDate] = {
      selected: true,
      selectedColor: '#8B9D83',
      dots: [],
    };
  }

  return marked;
};

/**
 * Gets dot color based on session status
 */
export const getStatusDotColor = (status: SessionStatus): string => {
  switch (status) {
    case 'CONFIRMED':
      return '#7BA377'; // Sage/Success green
    case 'PENDING':
      return '#D9A84F'; // Warning orange
    case 'COMPLETED':
      return '#9BA39B'; // Muted gray
    case 'CANCELLED':
      return '#E89D88'; // Coral/Error
    default:
      return '#6B7B6B';
  }
};

/**
 * Formats selected date for display
 */
export const formatSelectedDateHeader = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

/**
 * Check if date has sessions
 */
export const dateHasSessions = (sessions: ApiSession[], dateString: string): boolean => {
  return sessions.some((session) => {
    const sessionDate = getDateString(new Date(session.date));
    return sessionDate === dateString;
  });
};

/**
 * Get session count for a date
 */
export const getSessionCountForDate = (sessions: ApiSession[], dateString: string): number => {
  return sessions.filter((session) => {
    const sessionDate = getDateString(new Date(session.date));
    return sessionDate === dateString;
  }).length;
};

/**
 * Get next month date string
 */
export const getNextMonth = (currentDateString: string): string => {
  const date = new Date(currentDateString);
  date.setMonth(date.getMonth() + 1);
  return getDateString(date);
};

/**
 * Get previous month date string
 */
export const getPreviousMonth = (currentDateString: string): string => {
  const date = new Date(currentDateString);
  date.setMonth(date.getMonth() - 1);
  return getDateString(date);
};

/**
 * Check if date is in the past
 */
export const isDateInPast = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Check if date is today
 */
export const isDateToday = (dateString: string): boolean => {
  return dateString === getTodayString();
};
