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
  const [confirm, setConfirm] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const mounted = useRef(true);
  const currentSession = useRef(sessionId);
  currentSession.current = sessionId;
  const running = useRef(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    setStatus(null); setError(''); setConfirm(false);
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
  const command = async (action: 'RETRY' | 'USE_DAILY') => {
    if (!status || running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      await commandSessionMeeting(sessionId, action, status.meetingRevision);
      if (mounted.current && currentSession.current === sessionId) { setConfirm(false); setRefresh(value => value + 1); }
    } catch (cause) { if (mounted.current && currentSession.current === sessionId) setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la videollamada.'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  return <View style={{ gap: 10 }}>
    <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{!status ? error ? 'Estado de videollamada no disponible.' : 'Consultando videollamada…'
      : status.preparationStatus === 'READY' ? 'Videollamada preparada. Usa el botón habitual para entrar.'
      : status.preparationStatus === 'PENDING' ? 'Estamos preparando la videollamada.'
      : status.preparationStatus === 'REQUIRES_GOOGLE' ? 'Completa la configuración de Google para preparar esta videollamada.'
      : status.preparationStatus === 'ERROR' ? 'No se pudo preparar la videollamada. Revisa la conexión y vuelve a intentarlo.' : 'Videollamada inactiva.'}</Text>
    {status?.organizerEmail && <Text selectable style={{ color: theme.textSecondary }}>Cuenta organizadora: {status.organizerEmail}{!status.organizerConnected ? '. Necesita reconexión; el acceso preparado se conserva, pero ya no se sincroniza.' : ''}</Text>}
    {status?.deliveryErrorCode && <Text style={{ color: theme.warning }}>{status.deliveryErrorCode === 'MEETING_RECIPIENT_MISSING' ? 'Falta un correo válido del paciente para entregar el acceso.' : 'No se ha podido entregar el acceso por correo. HERA reintentará según su política de entrega; si persiste, contacta con soporte.'}</Text>}
    {error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
    {(status?.preparationStatus === 'REQUIRES_GOOGLE' || status?.preparationStatus === 'ERROR') && <Button variant="outline" onPress={() => navigation.navigate('ProfessionalProfile', { initialTab: 'account' })}>Configurar videollamadas</Button>}
    {status?.canRetryPreparation && <Button variant="ghost" loading={busy} onPress={() => { void command('RETRY'); }}>Reintentar preparación</Button>}
    <Button variant="ghost" disabled={busy} onPress={() => setRefresh(value => value + 1)}>Actualizar estado</Button>
    {status?.canChangeProvider && status.provider !== 'DAILY' && !confirm && <Button variant="ghost" disabled={busy} onPress={() => setConfirm(true)}>Usar alternativa para esta sesión</Button>}
    {confirm && <>
      <Text style={{ color: theme.textPrimary }}>Se sustituirá el acceso de esta sesión por Daily para ambos participantes y se enviará el nuevo enlace. Los enlaces enviados antes pueden seguir existiendo.</Text>
      <Button variant="outline" loading={busy} onPress={() => { void command('USE_DAILY'); }}>Confirmar cambio a Daily</Button>
      <Button variant="ghost" disabled={busy} onPress={() => setConfirm(false)}>Conservar acceso actual</Button>
    </>}
  </View>;
}
