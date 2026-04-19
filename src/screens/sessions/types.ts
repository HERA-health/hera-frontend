/**
 * TypeScript types for Client Sessions Screen
 * Following Interface Segregation Principle - components receive only what they need
 */

/**
 * View modes for the sessions screen
 */
export type ViewMode = 'calendar' | 'list';

/**
 * Session status from API
 */
export type SessionStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

/**
 * Session type from API
 */
export type SessionType = 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';

/**
 * API Session interface - matches backend response
 */
export interface ApiSession {
  id: string;
  date: string;
  duration: number;
  status: SessionStatus;
  type: SessionType;
  meetingLink?: string;
  hasReview?: boolean;
  specialist: {
    id: string;
    specialization: string;
    pricePerSession: number;
    avatar?: string;
    user: {
      name: string;
      email: string;
      avatar?: string;
    };
  };
}

/**
 * Props for ViewToggle component
 */
export interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

/**
 * Calendar day representation
 */
export interface CalendarDay {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: ApiSession[];
}

/**
 * Props for CalendarView component
 */
export interface CalendarViewProps {
  sessions: ApiSession[];
  onSessionPress?: (session: ApiSession) => void;
  onJoinSession?: (sessionId: string) => void;
  onCancelSession?: (sessionId: string) => void;
}

/**
 * Props for ListView component
 */
export interface ListViewProps {
  sessions: ApiSession[];
  onSessionPress?: (session: ApiSession) => void;
  onJoinSession?: (sessionId: string) => void;
  onCancelSession?: (sessionId: string) => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

/**
 * Props for SessionCard component
 */
export interface SessionCardProps {
  session: ApiSession;
  variant?: 'detailed' | 'compact';
  onPress?: () => void;
  onJoinPress?: () => void;
  onCancelPress?: () => void;
  onLeaveReviewPress?: () => void;
  hasReview?: boolean;
  showActions?: boolean;
}

/**
 * Props for CompactSessionCard component
 */
export interface CompactSessionCardProps {
  session: ApiSession;
  onPress?: () => void;
  onJoinPress?: () => void;
}

/**
 * Props for DayDetailsSection component
 */
export interface DayDetailsSectionProps {
  selectedDate: string;
  sessions: ApiSession[];
  onSessionPress?: (session: ApiSession) => void;
  onJoinSession?: (sessionId: string) => void;
}

/**
 * Session grouping for list view
 */
export interface GroupedSessions {
  upcoming: ApiSession[];
  past: ApiSession[];
}

/**
 * Status badge variant type
 */
export type StatusBadgeVariant = 'pending' | 'confirmed' | 'completed' | 'cancelled';
