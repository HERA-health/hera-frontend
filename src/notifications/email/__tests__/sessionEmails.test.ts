import {
  renderClientSessionScheduledBySpecialistEmail,
  renderClientSessionUpdatedBySpecialistEmail,
  renderClientSessionConfirmedEmail,
  renderClientSessionReminder24hEmail,
  renderSpecialistSessionCancelledEmail,
  renderSpecialistSessionReminder24hEmail,
  renderSpecialistSessionRequestedEmail,
} from '../sessionEmails';

describe('session email templates', () => {
  const basePayload = {
    recipientName: 'Lucía',
    counterpartName: 'Lucía Gómez',
    specialistName: 'Dra. Elena Martín',
    patientName: 'Lucía Gómez',
    date: '2026-05-10T09:30:00.000Z',
    durationMinutes: 60,
    timezone: 'Europe/Madrid',
    ctaUrl: 'https://www.health-hera.com/sessions/session-123',
  };

  it('renders specialist_session_requested with in-person details', () => {
    const result = renderSpecialistSessionRequestedEmail({
      ...basePayload,
      counterpartName: 'Lucía Gómez',
      type: 'IN_PERSON',
      officeAddress: {
        line1: 'Calle Alcalá 14',
        city: 'Madrid',
        postalCode: '28014',
        country: 'España',
        googleMapsUrl: 'https://maps.google.com/?q=Calle+Alcala+14+Madrid',
      },
    });

    expect(result.subject).toContain('Nueva solicitud de cita');
    expect(result.html).toContain('Ubicación');
    expect(result.html).toContain('Calle Alcalá 14');
    expect(result.html).toContain('Abrir indicaciones');
    expect(result).toMatchSnapshot();
  });

  it('renders session_scheduled_by_specialist with optional registration copy', () => {
    const result = renderClientSessionScheduledBySpecialistEmail({
      ...basePayload,
      recipientName: 'Lucía',
      counterpartName: 'Dra. Elena Martín',
      type: 'VIDEO_CALL',
      meetingLink: 'https://meet.hera.app/session-123',
    });

    expect(result.event).toBe('session_scheduled_by_specialist');
    expect(result.subject).toContain('Cita programada');
    expect(result.text).toContain('No necesitas registrarte');
    expect(result).toMatchSnapshot();
  });

  it('renders modified session copy for registered patients without registration CTA', () => {
    const result = renderClientSessionUpdatedBySpecialistEmail({
      ...basePayload,
      recipientName: 'Lucía',
      counterpartName: 'Dra. Elena Martín',
      type: 'VIDEO_CALL',
      meetingLink: 'https://meet.hera.app/session-123',
      patientHasAccount: true,
    });

    expect(result.event).toBe('session_scheduled_by_specialist');
    expect(result.subject).toContain('Cita modificada');
    expect(result.text).toContain('Tu cita se ha modificado');
    expect(result.text).toContain('Ver detalles de la cita');
    expect(result.text).not.toContain('Crear cuenta en HERA');
  });

  it('renders specialist_session_cancelled without fake video or location data for phone calls', () => {
    const result = renderSpecialistSessionCancelledEmail({
      ...basePayload,
      type: 'PHONE_CALL',
    });

    expect(result.subject).toContain('Cita cancelada');
    expect(result.html).toContain('Llamada telefónica');
    expect(result.html).not.toContain('Abrir videollamada');
    expect(result.html).not.toContain('Ubicación');
    expect(result).toMatchSnapshot();
  });

  it('renders client_session_confirmed with video call access only when confirmed and available', () => {
    const result = renderClientSessionConfirmedEmail({
      ...basePayload,
      counterpartName: 'Dra. Elena Martín',
      type: 'VIDEO_CALL',
      meetingLink: 'https://meet.hera.app/session-123',
    });

    expect(result.subject).toContain('Tu cita ha sido confirmada');
    expect(result.html).toContain('Videollamada');
    expect(result.html).toContain('Abrir videollamada');
    expect(result.html).not.toContain('Ubicación');
    expect(result).toMatchSnapshot();
  });

  it('renders patient_session_reminder_24h with a stable reminder summary', () => {
    const result = renderClientSessionReminder24hEmail({
      ...basePayload,
      counterpartName: 'Dra. Elena Martín',
      type: 'VIDEO_CALL',
      meetingLink: 'https://meet.hera.app/session-123',
    });

    expect(result.subject).toContain('Recordatorio de cita');
    expect(result.event).toBe('patient_session_reminder_24h');
    expect(result.html).toContain('Mañana tienes una cita en HERA');
    expect(result.html).toContain('Europe/Madrid');
    expect(result.text).toContain('Abrir videollamada');
    expect(result).toMatchSnapshot();
  });

  it('renders specialist_session_reminder_24h with patient as counterpart', () => {
    const result = renderSpecialistSessionReminder24hEmail({
      ...basePayload,
      counterpartName: 'Lucía Gómez',
      recipientName: 'Dra. Elena Martín',
      type: 'PHONE_CALL',
    });

    expect(result.event).toBe('specialist_session_reminder_24h');
    expect(result.subject).toContain('Recordatorio de cita');
    expect(result.text).toContain('Paciente: Lucía Gómez');
    expect(result).toMatchSnapshot();
  });
});
