# Email Notifications Contract

This repo contains the HERA email templates and payload contract for the first notification rollout. The actual send, scheduling, and event triggering must be wired from the backend service that already uses Resend.

## Supported events

- `session_requested`
  - Recipient: specialist
  - Trigger: client creates a session in `PENDING`
- `session_cancelled`
  - Recipient: specialist
  - Trigger: session moves from `PENDING` or `CONFIRMED` to `CANCELLED`
  - Rule: do not send to the specialist when the cancelling actor is `PROFESSIONAL`
- `session_confirmed`
  - Recipient: patient
  - Trigger: specialist confirms a session
- `session_reminder_24h`
  - Recipient: patient
  - Trigger: scheduled job 24 hours before a `CONFIRMED` session
  - Rule: job must be idempotent and skip sessions already reminded, cancelled, or rescheduled

## Payload shape

The backend should render templates from `src/notifications/email` with this shape:

```ts
interface SessionNotificationPayload {
  event: 'session_requested' | 'session_confirmed' | 'session_cancelled' | 'session_reminder_24h';
  recipient: 'specialist' | 'patient';
  recipientName?: string;
  counterpartName: string;
  specialistName: string;
  patientName: string;
  date: string;
  durationMinutes: number;
  timezone: string;
  type: 'VIDEO_CALL' | 'PHONE_CALL' | 'IN_PERSON';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  ctaUrl: string;
  ctaLabel?: string;
  meetingLink?: string | null;
  officeAddress?: {
    line1: string;
    city: string;
    postalCode?: string;
    country?: string;
    googleMapsUrl?: string;
  } | null;
  actor?: 'CLIENT' | 'PROFESSIONAL' | 'SYSTEM';
}
```

## Modality rules

- `IN_PERSON`
  - Include office address when available
  - Include directions link only when `googleMapsUrl` exists
- `VIDEO_CALL`
  - Do not include office address
  - Include video call access only when status is `CONFIRMED` and `meetingLink` exists
- `PHONE_CALL`
  - Do not include office address or video call link

## Frontend sync expectations

- `/auth/login`, `/auth/me`, and `/auth/profile` should always return `emailVerified` as an explicit boolean
- Cancellation APIs should expose or internally know the `actor` value so notification fanout can skip self-notifications
- Reminder jobs should persist a send marker to prevent duplicate 24h reminders
