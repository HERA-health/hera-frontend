import {
  buildTransactionalEmailHtml,
  buildTransactionalEmailText,
} from './transactionalLayout';
import type {
  EmailTemplateResult,
  SessionNotificationPayload,
  SessionNotificationStatus,
  SessionNotificationType,
} from './types';

const getSafeDateFormatter = (
  timezone: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
  try {
    return new Intl.DateTimeFormat('es-ES', { ...options, timeZone: timezone });
  } catch {
    return new Intl.DateTimeFormat('es-ES', options);
  }
};

const formatDateLabel = (date: string, timezone: string): string =>
  getSafeDateFormatter(timezone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));

const formatTimeLabel = (date: string, timezone: string): string =>
  getSafeDateFormatter(timezone, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

const getSessionTypeLabel = (type: SessionNotificationType): string => {
  switch (type) {
    case 'VIDEO_CALL':
      return 'Videollamada';
    case 'PHONE_CALL':
      return 'Llamada telefónica';
    case 'IN_PERSON':
      return 'Consulta presencial';
    default:
      return type;
  }
};

const getStatusLabel = (status: SessionNotificationStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'Pendiente de confirmación';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
};

const getFooterNote = (timezone: string): string =>
  `Todos los horarios están expresados en ${timezone}. Si la cita cambia de estado o de hora, HERA enviará un nuevo aviso.`;

const getSecondaryActions = (payload: SessionNotificationPayload) => {
  const actions: Array<{ label: string; url: string }> = [];

  if (payload.type === 'IN_PERSON' && payload.officeAddress?.googleMapsUrl) {
    actions.push({
      label: 'Abrir indicaciones',
      url: payload.officeAddress.googleMapsUrl,
    });
  }

  if (
    payload.type === 'VIDEO_CALL' &&
    payload.status === 'CONFIRMED' &&
    payload.meetingLink
  ) {
    actions.push({
      label: 'Abrir videollamada',
      url: payload.meetingLink,
    });
  }

  return actions;
};

const buildSummaryRows = (payload: SessionNotificationPayload) => {
  const rows = [
    {
      label: payload.recipient === 'specialist' ? 'Paciente' : 'Especialista',
      value: payload.counterpartName,
    },
    { label: 'Fecha', value: formatDateLabel(payload.date, payload.timezone) },
    { label: 'Hora', value: formatTimeLabel(payload.date, payload.timezone) },
    { label: 'Duración', value: `${payload.durationMinutes} minutos` },
    { label: 'Modalidad', value: getSessionTypeLabel(payload.type) },
    { label: 'Estado', value: getStatusLabel(payload.status) },
    { label: 'Zona horaria', value: payload.timezone },
  ];

  if (payload.type === 'IN_PERSON' && payload.officeAddress) {
    const locationParts = [
      payload.officeAddress.line1,
      payload.officeAddress.city,
      payload.officeAddress.postalCode,
      payload.officeAddress.country,
    ].filter(Boolean);

    rows.push({
      label: 'Ubicación',
      value: locationParts.join(', '),
    });
  }

  return rows;
};

const buildEmail = (
  payload: SessionNotificationPayload,
  subject: string,
  eyebrow: string,
  title: string,
  intro: string,
  statusTone: 'primary' | 'success' | 'warning',
  ctaLabel: string
): EmailTemplateResult => {
  const summaryRows = buildSummaryRows(payload);
  const secondaryActions = getSecondaryActions(payload);
  const footerNote = getFooterNote(payload.timezone);
  const statusLabel = getStatusLabel(payload.status);

  return {
    event: payload.event,
    subject,
    html: buildTransactionalEmailHtml({
      preheader: `${title} · ${formatDateLabel(payload.date, payload.timezone)}`,
      eyebrow,
      title,
      intro,
      statusLabel,
      statusTone,
      summaryRows,
      ctaLabel: payload.ctaLabel || ctaLabel,
      ctaUrl: payload.ctaUrl,
      secondaryActions,
      footerNote,
    }),
    text: buildTransactionalEmailText({
      title,
      intro,
      statusLabel,
      summaryRows,
      ctaLabel: payload.ctaLabel || ctaLabel,
      ctaUrl: payload.ctaUrl,
      secondaryActions,
      footerNote,
    }),
  };
};

export const renderSpecialistSessionRequestedEmail = (
  payload: Omit<SessionNotificationPayload, 'event' | 'recipient' | 'status'> & {
    status?: 'PENDING';
  }
): EmailTemplateResult =>
  buildEmail(
    {
      ...payload,
      event: 'session_requested',
      recipient: 'specialist',
      status: payload.status ?? 'PENDING',
    },
    `Nueva solicitud de cita · ${payload.patientName}`,
    'Nueva reserva',
    'Tienes una nueva solicitud de cita',
    `${payload.patientName} ha solicitado una cita contigo en HERA. Revisa la agenda para confirmar o gestionar la solicitud.`,
    'primary',
    'Revisar solicitud'
  );

export const renderSpecialistSessionCancelledEmail = (
  payload: Omit<SessionNotificationPayload, 'event' | 'recipient' | 'status'> & {
    status?: 'CANCELLED';
  }
): EmailTemplateResult =>
  buildEmail(
    {
      ...payload,
      event: 'session_cancelled',
      recipient: 'specialist',
      status: payload.status ?? 'CANCELLED',
    },
    `Cita cancelada · ${payload.patientName}`,
    'Agenda actualizada',
    'Se ha cancelado una cita',
    `${payload.patientName} ya no asistirá a la cita programada. Tu agenda se ha actualizado para que puedas reorganizar ese hueco.`,
    'warning',
    'Ver agenda'
  );

export const renderClientSessionConfirmedEmail = (
  payload: Omit<SessionNotificationPayload, 'event' | 'recipient' | 'status'> & {
    status?: 'CONFIRMED';
  }
): EmailTemplateResult =>
  buildEmail(
    {
      ...payload,
      event: 'session_confirmed',
      recipient: 'patient',
      status: payload.status ?? 'CONFIRMED',
    },
    `Tu cita ha sido confirmada · ${payload.specialistName}`,
    'Cita confirmada',
    'Tu cita ya está confirmada',
    `${payload.specialistName} ha confirmado tu cita. Aquí tienes el resumen actualizado para que llegues con todo claro.`,
    'success',
    'Ver detalles de la cita'
  );

export const renderClientSessionReminder24hEmail = (
  payload: Omit<SessionNotificationPayload, 'event' | 'recipient' | 'status'> & {
    status?: 'CONFIRMED';
  }
): EmailTemplateResult =>
  buildEmail(
    {
      ...payload,
      event: 'session_reminder_24h',
      recipient: 'patient',
      status: payload.status ?? 'CONFIRMED',
    },
    `Recordatorio de cita · ${payload.specialistName}`,
    'Recordatorio 24h',
    'Mañana tienes una cita en HERA',
    `Te recordamos que tu cita con ${payload.specialistName} está próxima. Revisa la hora, la modalidad y los accesos necesarios con antelación.`,
    'primary',
    'Ver detalles de la cita'
  );

export const renderSessionNotificationEmail = (
  payload: SessionNotificationPayload
): EmailTemplateResult => {
  switch (payload.event) {
    case 'session_requested':
      return renderSpecialistSessionRequestedEmail({
        ...payload,
        status: 'PENDING',
      });
    case 'session_cancelled':
      return renderSpecialistSessionCancelledEmail({
        ...payload,
        status: 'CANCELLED',
      });
    case 'session_confirmed':
      return renderClientSessionConfirmedEmail({
        ...payload,
        status: 'CONFIRMED',
      });
    case 'session_reminder_24h':
      return renderClientSessionReminder24hEmail({
        ...payload,
        status: 'CONFIRMED',
      });
    default:
      return buildEmail(
        payload,
        'Actualización de cita',
        'Actualización',
        'Tu cita se ha actualizado',
        'Consulta el detalle más reciente de tu cita en HERA.',
        'primary',
        'Abrir HERA'
      );
  }
};
