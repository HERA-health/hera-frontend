import React, { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { commandSessionMeeting, getProfessionalMeetingStatus, type ProfessionalMeetingStatus } from '../../services/googleCalendarService';

/** Mounted only in an authorized professional session detail, never coordination. */
export function SessionMeetingControls({ sessionId }: { sessionId: string }) {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [status, setStatus] = useState<ProfessionalMeetingStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const mounted = useRef(true);
  const currentSession = useRef(sessionId);
  currentSession.current = sessionId;
  const running = useRef(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    setStatus(null); setError('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const load = async () => {
      try {
        const next = await getProfessionalMeetingStatus(sessionId);
        if (!active) return;
        setStatus(next);
        if (next.preparationStatus === 'PENDING' && polls++ < 4) timer = setTimeout(() => {
          if (AppState.currentState === 'active' && !running.current) void load();
        }, Math.max(30, next.retryAfterSeconds ?? 30) * 1000);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo consultar la videollamada.'); }
    };
    void load();
    return () => { active = false; mounted.current = false; if (timer) clearTimeout(timer); };
  }, [sessionId, refresh]);
  const command = async () => {
    if (!status || running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      await commandSessionMeeting(sessionId, 'RETRY', status.meetingRevision);
      if (mounted.current && currentSession.current === sessionId) setRefresh(value => value + 1);
    } catch (cause) { if (mounted.current && currentSession.current === sessionId) setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la videollamada.'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  return <View style={{ gap: 10 }}>
    <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{!status ? error ? 'Estado de videollamada no disponible.' : 'Consultando videollamada…'
      : status.preparationStatus === 'READY' ? status.provider === 'GOOGLE_MEET' ? 'Google Meet preparado. Usa el botón habitual para entrar.' : 'Videollamada preparada. Usa el botón habitual para entrar.'
      : status.preparationStatus === 'PENDING' ? status.provider === 'GOOGLE_MEET' ? 'Estamos preparando Google Meet. Puede tardar unos minutos.' : 'Estamos preparando la videollamada.'
      : status.preparationStatus === 'REQUIRES_GOOGLE' ? 'Google Meet necesita revisión de su conexión o configuración. Revisa la integración para continuar.'
      : status.preparationStatus === 'ERROR' ? 'No se pudo preparar la videollamada. Reintenta la preparación. Si el problema persiste, contacta con soporte.' : 'Videollamada inactiva.'}</Text>
    {status?.provider === 'DAILY' && status.fallbackReasonCode && <Text accessibilityLiveRegion="polite" style={{ color: theme.warning }}>
      {status.fallbackReasonCode === 'REAUTH_REQUIRED' ? 'Se ha utilizado Daily de emergencia porque Google necesita una nueva autorización.'
        : status.fallbackReasonCode === 'PERMISSION_DENIED' ? 'Se ha utilizado Daily de emergencia porque Google ha rechazado los permisos necesarios.'
        : status.fallbackReasonCode === 'MEET_CREATION_FAILED' ? 'Se ha utilizado Daily de emergencia después de que Google no pudiera crear la reunión en dos intentos.'
        : status.fallbackReasonCode === 'MEET_PREPARATION_TIMEOUT' ? 'Se ha utilizado Daily de emergencia porque Google seguía preparando la reunión tras diez minutos y la cita había empezado.'
        : status.fallbackReasonCode === 'MEET_TEMPORARY_ERROR' ? 'Se ha utilizado Daily de emergencia porque Google seguía sin responder correctamente tras varios intentos y la cita había empezado.'
        : 'Se ha utilizado Daily de emergencia. Contacta con soporte para revisar el motivo.'}
    </Text>}
    {status?.organizerEmail && <Text selectable style={{ color: theme.textSecondary }}>Cuenta organizadora: {status.organizerEmail}{!status.organizerConnected ? '. Necesita reconexión; el acceso preparado se conserva, pero ya no se sincroniza.' : ''}</Text>}
    {status?.deliveryErrorCode && <Text style={{ color: theme.warning }}>{status.deliveryErrorCode === 'MEETING_RECIPIENT_MISSING' ? 'Falta un correo válido del paciente para entregar el acceso.' : 'No se ha podido entregar el acceso por correo. HERA reintentará según su política de entrega; si persiste, contacta con soporte.'}</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
    {status?.provider === 'GOOGLE_MEET' && (status.preparationStatus === 'REQUIRES_GOOGLE' || status.preparationStatus === 'ERROR') && <Button variant="outline" onPress={() => navigation.navigate('ProfessionalProfile', { initialTab: 'google' })}>Revisar conexión de Google</Button>}
    {status?.canRetryPreparation && <Button variant="ghost" loading={busy} onPress={() => { void command(); }}>Reintentar preparación</Button>}
    <Button variant="ghost" disabled={busy} onPress={() => setRefresh(value => value + 1)}>Actualizar estado</Button>
  </View>;
}
