export type SessionNotificationEvent =
  | 'session_requested'
  | 'session_confirmed'
  | 'session_cancelled'
  | 'session_reminder_24h';

export type SessionNotificationRecipient = 'specialist' | 'patient';

export type SessionNotificationType = 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';

export type SessionNotificationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type SessionNotificationActor = 'CLIENT' | 'PROFESSIONAL' | 'SYSTEM';

export interface SessionNotificationOfficeAddress {
  line1: string;
  city: string;
  postalCode?: string;
  country?: string;
  googleMapsUrl?: string;
}

export interface SessionNotificationPayload {
  event: SessionNotificationEvent;
  recipient: SessionNotificationRecipient;
  recipientName?: string;
  counterpartName: string;
  specialistName: string;
  patientName: string;
  date: string;
  durationMinutes: number;
  timezone: string;
  type: SessionNotificationType;
  status: SessionNotificationStatus;
  ctaUrl: string;
  ctaLabel?: string;
  meetingLink?: string | null;
  officeAddress?: SessionNotificationOfficeAddress | null;
  actor?: SessionNotificationActor;
}

export interface EmailTemplateResult {
  event: SessionNotificationEvent;
  subject: string;
  html: string;
  text: string;
}
