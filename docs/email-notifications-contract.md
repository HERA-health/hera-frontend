# Email Notifications Contract

This repo contains the HERA email templates and payload contract for the first notification rollout. The actual send, scheduling, and event triggering must be wired from the backend service that already uses Resend.

## Supported events

- `session_requested`
  - Recipient: specialist
  - Trigger: client creates a session in `PENDING`
- `session_scheduled_by_specialist`
  - Recipient: patient
  - Trigger: specialist creates a confirmed private session for a managed or registered patient
  - Rule: managed patients may receive an optional registration CTA
- `session_cancelled`
  - Recipient: specialist
  - Trigger: session moves from `PENDING` or `CONFIRMED` to `CANCELLED`
  - Rule: do not send to the specialist when the cancelling actor is `PROFESSIONAL`
- `session_confirmed`
  - Recipient: patient
  - Trigger: specialist confirms a session
- `patient_session_reminder_24h`
  - Recipient: patient
  - Trigger: external cron calls the backend 24 hours before a `CONFIRMED` private session
  - Rule: registered patients use `User.email`; managed patients without HERA account use `Client.email`; skip private patients without email
- `specialist_session_reminder_24h`
  - Recipient: specialist
  - Trigger: external cron calls the backend 24 hours before any `CONFIRMED` private or clinic session
  - Rule: resolve recipient from `Session.specialist.user.email`, then `ClinicSpecialist.email`; skip if no email exists
- `session_reminder_24h`
  - Recipient: patient
  - Status: legacy alias kept for template compatibility; new backend events should use `patient_session_reminder_24h`

## Payload shape

The backend should render templates from `src/notifications/email` with this shape:

```ts
interface SessionNotificationPayload {
  event:
    | 'session_requested'
    | 'session_scheduled_by_specialist'
    | 'session_confirmed'
    | 'session_cancelled'
    | 'session_reminder_24h'
    | 'patient_session_reminder_24h'
    | 'specialist_session_reminder_24h';
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
- Reminder jobs should persist an `EmailNotification.dedupeKey` outbox row and return `enqueued`, `sent`, `skipped`, `failed`, `locked`, `pendingDue`, `failedRetryable`, and `oldestDueAt` from `/api/internal/cron/session-reminders`
- Patient reminder compatibility markers `clientReminder24hSentAt` and `clientReminder24hForDate` may still be written after outbox delivery
