import { getLegalCatalog } from '../../services/legalService';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { Button } from '../common/Button';
import { AccountSettingsCard } from './AccountSettingsCard';
import { connectGoogleCalendar, disconnectGoogleCalendar, getGoogleCalendarStatus, resyncGoogleCalendar, type GoogleCalendarStatus } from '../../services/googleCalendarService';

export function GoogleCalendarCard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [disclosureVersion, setDisclosureVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const actionRunning = useRef(false);
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    try {
      const [next, documents] = await Promise.all([getGoogleCalendarStatus(), getLegalCatalog()]);
      const privacy = documents.find(doc => doc.key === 'PRIVACY_POLICY');
      if (!privacy) throw new Error('No se pudo cargar la información de privacidad.');
      if (mounted.current && revision === generation.current) { setStatus(next); setDisclosureVersion(privacy.version); setError(null); }
    } catch (cause) {
      if (mounted.current && revision === generation.current) setError(getErrorMessage(cause));
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active' && !actionRunning.current) void refresh(); });
    return () => { mounted.current = false; generation.current += 1; subscription.remove(); };
  }, [refresh]);
  const pending = status?.status === 'DISCONNECTING' || (status?.status === 'CONNECTED' && (status.pending > 0 || status.reconciling));
  useEffect(() => {
    if ((!pending && status?.status !== 'CONNECTED') || busy) return;
    const timer = setInterval(() => {
      if (!actionRunning.current && AppState.currentState === 'active') void refresh();
    }, pending ? 10_000 : 30_000);
    return () => clearInterval(timer);
  }, [pending, status?.status, busy, refresh]);

  const run = async (action: () => Promise<void>) => {
    if (actionRunning.current) return;
    actionRunning.current = true;
    generation.current += 1;
    setBusy(true); setError(null);
    try { await action(); }
    catch (cause) { if (mounted.current) setError(getErrorMessage(cause)); }
    finally { actionRunning.current = false; if (mounted.current) setBusy(false); }
  };
  const connect = () => run(async () => {
    if (!user || !disclosureVersion) return;
    const attempt = await connectGoogleCalendar(user.id, disclosureVersion);
    if (attempt) navigation.navigate('GoogleCalendarIntegration', { attempt });
  });
  const connected = status?.status === 'CONNECTED';
  const needsAttention = status?.status === 'REAUTH_REQUIRED' || Boolean(status?.failed);
  const label = !status ? 'Cargando conexión…' : !status.enabled ? 'Disponible próximamente'
    : status.status === 'DISCONNECTING' ? 'Desconectando…'
    : status.status === 'REAUTH_REQUIRED' ? 'Vuelve a autorizar el acceso'
    : status.status === 'DISCONNECTED' ? 'Sin conectar'
    : status.failed ? 'Hay citas pendientes de revisar'
    : pending ? 'Actualizando automáticamente…' : 'Sincronización automática activa';
  return <AccountSettingsCard title="Google Calendar" description="Tus citas de HERA, también en tu calendario principal.">
    <View style={[styles.status, { borderLeftColor: needsAttention ? theme.warning : theme.primary }]}>
      <Text accessibilityLiveRegion="polite" style={{ color: theme.textPrimary, fontFamily: theme.fontSans, fontWeight: '600' }}>{label}</Text>
      {status?.email ? <Text selectable style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>{status.email}</Text> : null}
      {status?.lastSyncedAt && connected ? <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Última sincronización: {new Date(status.lastSyncedAt).toLocaleString('es-ES')}</Text> : null}
      {status && status.pending > 0 && connected ? <Text style={{ color: theme.textSecondary }}>{status.pending} citas por actualizar</Text> : null}
    </View>
    {connected ? <Text style={[styles.copy, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>
      Tus citas se crean, actualizan y cancelan en Google automáticamente, normalmente en uno o dos minutos. No necesitas pulsar ningún botón ni mantener HERA abierta.
    </Text> : null}
    <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
      Se mostrarán tus citas privadas y de clínicas, pendientes y confirmadas, con su horario y un enlace a HERA. No se enviarán datos del paciente.
    </Text>
    <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
      Los cambios se gestionan en HERA. Los eventos personales de Google no se importan ni bloquean tu disponibilidad. Google solicitará permiso para gestionar eventos de tus calendarios; HERA solo gestionará sus propias copias. Si desconectas la cuenta, las citas ya copiadas permanecerán en Google y dejarán de actualizarse.
    </Text>
    <Text style={[styles.copy, { color: theme.textSecondary }]}>Al conectar autorizas la sincronización descrita. Guardamos tu identidad Google y una credencial cifrada; puedes desconectar cuando quieras.</Text>
    <Button variant="ghost" onPress={() => navigation.navigate('LegalDocument', { documentKey: 'PRIVACY_POLICY', version: disclosureVersion ?? undefined })}>Leer política de privacidad</Button>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
    {status?.errorCode === 'REVOCATION_FAILED' ? <View style={styles.actions}>
      <Text style={[styles.copy, { color: theme.textSecondary }]}>HERA ha dejado de sincronizar. No se pudo retirar el permiso en Google; puedes hacerlo desde tu cuenta.</Text>
      <Button variant="outline" onPress={() => { void Linking.openURL('https://myaccount.google.com/connections'); }}>Revisar permisos en Google</Button>
    </View> : null}
    {!status && !error ? <ActivityIndicator color={theme.primary} /> : null}
    {status?.enabled ? <View style={styles.actions}>
      {(status.status === 'DISCONNECTED' || status.status === 'REAUTH_REQUIRED') ? <Button loading={busy} onPress={() => { void connect(); }}>{status.status === 'REAUTH_REQUIRED' ? 'Reconectar Google Calendar' : 'Conectar Google Calendar'}</Button> : null}
      {connected ? <Button variant="ghost" disabled={busy} onPress={() => setShowOptions(value => !value)}>{showOptions ? 'Ocultar opciones' : 'Opciones de sincronización'}</Button> : null}
      {(connected || status.status === 'REAUTH_REQUIRED') && !confirmDisconnect ? <Button variant="ghost" disabled={busy} onPress={() => setConfirmDisconnect(true)}>Desconectar</Button> : null}
    </View> : null}
    {connected && (showOptions || Boolean(status.failed)) ? <View style={styles.options}>
      <Text style={[styles.copy, { color: theme.textSecondary }]}>Si falta alguna cita o has modificado un evento en Google, puedes volver a comprobar las copias de HERA.</Text>
      <Button variant="outline" loading={busy} disabled={pending} onPress={() => { void run(async () => { const next = await resyncGoogleCalendar(); if (mounted.current) setStatus(next); }); }}>Revisar sincronización</Button>
      <Text style={[styles.copy, { color: theme.textSecondary }]}>Google muestra las citas en la zona horaria de su calendario. Para ver el horario peninsular, selecciona Europe/Madrid en los ajustes de Google Calendar.</Text>
      <Button variant="ghost" onPress={() => { void Linking.openURL('https://calendar.google.com/calendar/u/0/r/settings'); }}>Abrir ajustes de Google Calendar</Button>
    </View> : null}
    {confirmDisconnect ? <View style={styles.actions}>
      <Text style={[styles.copy, { color: theme.textPrimary }]}>Las citas ya copiadas permanecerán en Google y dejarán de actualizarse.</Text>
      <Button variant="outline" loading={busy} onPress={() => { void run(async () => { const next = await disconnectGoogleCalendar(); if (mounted.current) { setStatus(next); setConfirmDisconnect(false); } }); }}>Desconectar y conservar eventos</Button>
      <Button variant="ghost" disabled={busy} onPress={() => setConfirmDisconnect(false)}>Volver</Button>
    </View> : null}
    {error ? <Button variant="ghost" disabled={busy} onPress={() => { void refresh(); }}>Actualizar estado</Button> : null}
  </AccountSettingsCard>;
}

const styles = StyleSheet.create({
  status: { borderLeftWidth: 3, paddingLeft: 14, gap: 7 },
  copy: { fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  options: { gap: 12 },
});
