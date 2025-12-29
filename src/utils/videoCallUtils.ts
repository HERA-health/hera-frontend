/**
 * Video Call Button Utilities
 *
 * Provides helper functions for video call button states, labels, and styling.
 * Follows SOLID principles:
 * - Single Responsibility: Each function has one purpose
 * - Open/Closed: Easy to add new states without modifying existing code
 */

// Time constants (in milliseconds)
const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  JOIN_WINDOW_BEFORE: 15 * 60 * 1000, // 15 minutes before session
  JOIN_WINDOW_AFTER: 15 * 60 * 1000, // 15 minutes after session ends
} as const;

/**
 * Button states for video call sessions
 */
export type VideoCallButtonState =
  | 'PENDING' // Session not confirmed yet
  | 'CONFIRMED_EARLY' // Confirmed but >15min before
  | 'READY' // Within 15min window, can join
  | 'IN_PROGRESS' // Session currently active
  | 'COMPLETED' // Session ended
  | 'NO_LINK'; // Confirmed but no meeting link (error state)

/**
 * Session data required for button state calculation
 */
export interface VideoCallSession {
  status: string;
  type: string;
  date: string | Date;
  duration: number;
  meetingLink?: string | null;
}

/**
 * Button label with optional helper text
 */
export interface VideoCallButtonLabel {
  primary: string;
  helper?: string;
  icon: string;
}

/**
 * Button style configuration
 */
export interface VideoCallButtonStyle {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  disabled: boolean;
}

/**
 * Calculates time difference in a human-readable Spanish format
 */
export const getTimeUntilSession = (sessionDate: Date): string => {
  const now = new Date();
  const diff = sessionDate.getTime() - now.getTime();

  if (diff < 0) return 'ahora';

  const days = Math.floor(diff / TIME_CONSTANTS.DAY);
  const hours = Math.floor((diff % TIME_CONSTANTS.DAY) / TIME_CONSTANTS.HOUR);
  const minutes = Math.floor((diff % TIME_CONSTANTS.HOUR) / TIME_CONSTANTS.MINUTE);

  if (days > 0) {
    if (days === 1) {
      return hours > 0 ? `1 día ${hours}h` : '1 día';
    }
    return hours > 0 ? `${days} días ${hours}h` : `${days} días`;
  }

  if (hours > 0) {
    if (hours === 1) {
      return minutes > 0 ? `1 hora ${minutes}min` : '1 hora';
    }
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours} horas`;
  }

  if (minutes === 1) return '1 minuto';
  return `${minutes} minutos`;
};

/**
 * Determines the button state based on session data
 */
export const getVideoCallButtonState = (session: VideoCallSession): VideoCallButtonState => {
  // Check if it's a video call type
  const isVideoCall =
    session.type === 'VIDEO_CALL' || session.type === 'video';

  if (!isVideoCall) {
    return 'PENDING'; // Not applicable for non-video sessions
  }

  // Check confirmation status
  const isConfirmed =
    session.status === 'CONFIRMED' ||
    session.status === 'confirmed' ||
    session.status === 'scheduled';
  const isPending = session.status === 'PENDING' || session.status === 'pending';
  const isCompleted = session.status === 'COMPLETED' || session.status === 'completed';
  const isCancelled = session.status === 'CANCELLED' || session.status === 'cancelled';

  if (isPending) {
    return 'PENDING';
  }

  if (isCancelled || isCompleted) {
    return 'COMPLETED';
  }

  // Session is confirmed, check meeting link
  if (isConfirmed && !session.meetingLink) {
    return 'NO_LINK';
  }

  if (!isConfirmed) {
    return 'PENDING';
  }

  // Calculate time windows
  const now = new Date();
  const sessionStart = new Date(session.date);
  const sessionEnd = new Date(sessionStart.getTime() + session.duration * TIME_CONSTANTS.MINUTE);

  // Can join 15 minutes before session starts
  const joinWindowStart = new Date(sessionStart.getTime() - TIME_CONSTANTS.JOIN_WINDOW_BEFORE);
  // Session considered expired 15 minutes after session end
  const joinWindowEnd = new Date(sessionEnd.getTime() + TIME_CONSTANTS.JOIN_WINDOW_AFTER);

  // Check if session has expired (past join window)
  if (now > joinWindowEnd) {
    return 'COMPLETED';
  }

  // Check if currently in session (between start and end of join window)
  if (now >= sessionStart && now <= joinWindowEnd) {
    return 'IN_PROGRESS';
  }

  // Check if ready to join (within 15 min before)
  if (now >= joinWindowStart && now < sessionStart) {
    return 'READY';
  }

  // Confirmed but too early
  return 'CONFIRMED_EARLY';
};

/**
 * Generates button label and helper text based on state
 */
export const getVideoCallButtonLabel = (
  state: VideoCallButtonState,
  session: VideoCallSession
): VideoCallButtonLabel => {
  const sessionDate = new Date(session.date);

  switch (state) {
    case 'PENDING':
      return {
        primary: 'Esperando confirmación',
        helper: 'El enlace estará disponible cuando el profesional confirme',
        icon: 'time-outline',
      };

    case 'CONFIRMED_EARLY': {
      const timeUntil = getTimeUntilSession(sessionDate);
      return {
        primary: `Videollamada en ${timeUntil}`,
        helper: 'Podrás unirte 15 minutos antes de la sesión',
        icon: 'videocam-outline',
      };
    }

    case 'READY':
      return {
        primary: 'Unirse a Sesión',
        icon: 'videocam',
      };

    case 'IN_PROGRESS':
      return {
        primary: 'Unirse Ahora',
        helper: 'La sesión está en curso',
        icon: 'videocam',
      };

    case 'COMPLETED':
      return {
        primary: 'Sesión finalizada',
        icon: 'checkmark-circle-outline',
      };

    case 'NO_LINK':
      return {
        primary: 'Enlace no disponible',
        helper: 'Estamos preparando tu videollamada',
        icon: 'alert-circle-outline',
      };
  }
};

/**
 * Generates button styling based on state
 * Uses HERA branding colors
 */
export const getVideoCallButtonStyle = (state: VideoCallButtonState): VideoCallButtonStyle => {
  // HERA color palette
  const colors = {
    sageGreen: '#8B9D83',
    sageGreenLight: '#E8EDE6',
    lavender: '#B8A8D9',
    lavenderLight: '#EDE8F5',
    grayLight: '#F0F2F0',
    grayMedium: '#9CA3AF',
    grayDark: '#6B7280',
    white: '#FFFFFF',
    successLight: '#D4EDD0',
    successDark: '#7BA377',
    errorLight: '#FEE2E2',
    errorDark: '#DC2626',
    warningLight: '#FEF3C7',
    warningDark: '#D97706',
  };

  switch (state) {
    case 'PENDING':
      return {
        backgroundColor: colors.grayLight,
        textColor: colors.grayDark,
        disabled: true,
      };

    case 'CONFIRMED_EARLY':
      return {
        backgroundColor: colors.lavenderLight,
        textColor: colors.lavender,
        borderColor: colors.lavender,
        disabled: true,
      };

    case 'READY':
      return {
        backgroundColor: colors.sageGreen,
        textColor: colors.white,
        disabled: false,
      };

    case 'IN_PROGRESS':
      return {
        backgroundColor: colors.sageGreen,
        textColor: colors.white,
        disabled: false,
      };

    case 'COMPLETED':
      return {
        backgroundColor: colors.successLight,
        textColor: colors.successDark,
        disabled: true,
      };

    case 'NO_LINK':
      return {
        backgroundColor: colors.warningLight,
        textColor: colors.warningDark,
        disabled: true,
      };
  }
};

/**
 * Determines if the button should be clickable
 */
export const isVideoCallButtonClickable = (state: VideoCallButtonState): boolean => {
  return state === 'READY' || state === 'IN_PROGRESS';
};

/**
 * Checks if the session is a video call type
 */
export const isVideoCallSession = (session: VideoCallSession): boolean => {
  return session.type === 'VIDEO_CALL' || session.type === 'video';
};
