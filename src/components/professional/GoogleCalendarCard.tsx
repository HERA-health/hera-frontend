import { getLegalCatalog } from '../../services/legalService';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Linking, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { Button } from '../common/Button';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { AccountSettingsCard } from './AccountSettingsCard';
import { connectGoogleCalendar, disconnectGoogleCalendar, getGoogleCalendarStatus, resyncGoogleCalendar, setVideoPreference, type GoogleCalendarStatus } from '../../services/googleCalendarService';

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
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [privacyDialog, setPrivacyDialog] = useState<'connect' | 'read' | null>(null);
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const [contentWidth, setContentWidth] = useState(0);
  const twoColumns = contentWidth >= 640;
  const [confirmMeet, setConfirmMeet] = useState<{
    email: string; disclosureVersion: string; connection: { id: string; generation: number };
  } | null>(null);
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
    let checks = 0;
    const timer = setInterval(() => {
      if (++checks > 6) { clearInterval(timer); return; }
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
    if (mounted.current) setPrivacyDialog(null);
    if (attempt) navigation.navigate('GoogleCalendarIntegration', { attempt });
  });
  const activateMeet = () => run(async () => {
    if (!confirmMeet) return;
    try {
      const next = await setVideoPreference('GOOGLE_MEET', confirmMeet.disclosureVersion, confirmMeet.connection);
      if (mounted.current) { setStatus(next); setConfirmMeet(null); }
    } catch (cause) {
      // Never substitute the organizer in an acceptance already on screen.
      if (mounted.current) setConfirmMeet(null);
      await refresh();
      throw cause;
    }
  });
  const needsReauthorization = status?.status === 'REAUTH_REQUIRED'
    || (status?.status === 'CONNECTED' && Boolean(status.privacyUpdateRequired));
  const connected = status?.status === 'CONNECTED' && !needsReauthorization;
  const meetUnavailable = status?.meetAssignmentsEnabled === false;
  const meetActive = connected && status.enabled && status.meetEnabled && status.videoProviderPreference === 'GOOGLE_MEET' && !status.privacyUpdateRequired && !meetUnavailable;
  const needsAttention = needsReauthorization || Boolean(status?.failed);
  const canActivate = connected && status.enabled && status.meetAssignmentsEnabled && !meetActive;
  const label = !status ? 'Cargando conexión…' : !status.enabled ? 'Disponible próximamente'
    : status.status === 'DISCONNECTING' ? 'Desconectando…'
    : needsReauthorization ? 'Vuelve a autorizar el acceso'
    : status.status === 'DISCONNECTED' ? 'Sin conectar'
    : status.failed ? 'Hay citas pendientes de revisar'
    : pending ? 'Actualizando automáticamente…' : 'Sincronización automática activa';
  const copy = [styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }];
  const heading = [styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }];
  const closeDialog = () => {
    if (actionRunning.current) return;
    setPrivacyDialog(null); setConfirmMeet(null); setConfirmDisconnect(false);
  };
  const dialogOpen = Boolean(privacyDialog || confirmMeet || confirmDisconnect);
  const dialogTitle = confirmMeet ? 'Activa Google Meet' : confirmDisconnect ? 'Desconectar Google Calendar' : privacyDialog === 'connect' ? needsReauthorization ? 'Renueva la autorización de Google' : 'Conecta tu calendario' : 'Datos compartidos y privacidad';

  return <>
    <AccountSettingsCard title="Calendario y videollamadas">
      <View onLayout={event => setContentWidth(event.nativeEvent.layout.width)} style={[styles.columns, twoColumns && styles.columnsWide]}>
      <View style={[styles.section, styles.column, twoColumns ? styles.calendarDividerWide : styles.calendarDividerCompact, { borderColor: theme.borderLight }]}>
        <View style={styles.sectionHeader}>
          <Image source={require('../../../assets/google-calendar.png')} style={styles.productLogo} resizeMode="contain" accessible={false} />
          <View style={styles.headerCopy}>
            <Text style={heading}>Google Calendar</Text>
            <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: needsAttention ? theme.warning : theme.textSecondary }]}>{label}</Text>
          </View>
        </View>
        {status?.email && <Text selectable style={[styles.account, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{status.email}</Text>}
        <Text style={copy}>{needsReauthorization && status?.privacyUpdateRequired
          ? 'Hemos actualizado la información de privacidad. Reconecta la misma cuenta para continuar con Calendar y activar Meet.'
          : connected
          ? 'Tus citas de HERA, actualizadas automáticamente en tu calendario.'
          : 'Sincroniza tus citas de HERA con tu calendario principal.'}</Text>
        {!!status?.pending && connected && <Text style={copy}>{status.pending} citas por actualizar</Text>}
        {!status && !error && <ActivityIndicator color={theme.primary} />}
        {status?.enabled && (status.status === 'DISCONNECTED' || needsReauthorization) && <Button
          style={compact ? styles.stretch : styles.start} loading={busy} disabled={!disclosureVersion}
          onPress={() => setPrivacyDialog('connect')}>
          {needsReauthorization ? 'Reconectar Google Calendar' : 'Conectar Google Calendar'}
        </Button>}
        {(connected || status?.status === 'REAUTH_REQUIRED') && <AnimatedPressable
          onPress={() => setShowOptions(value => !value)} disabled={busy} hoverLift={false}
          accessibilityRole="button" accessibilityState={{ expanded: showOptions }} style={styles.disclosure}>
          <Text style={[styles.link, { color: theme.link, fontFamily: theme.fontSansSemiBold }]}>Opciones de sincronización</Text>
          <Ionicons name={showOptions ? 'chevron-up' : 'chevron-down'} color={theme.link} size={17} />
        </AnimatedPressable>}
        {(showOptions || Boolean(status?.failed)) && <View style={[styles.details, { borderColor: theme.borderLight }]}>
          {connected && <>
            <Text style={copy}>Las actualizaciones suelen tardar uno o dos minutos. No necesitas pulsar ningún botón ni mantener HERA abierta.</Text>
            {status.lastSyncedAt && <Text style={copy}>Última sincronización: {new Date(status.lastSyncedAt).toLocaleString('es-ES')}</Text>}
            <Button variant="outline" size="small" style={styles.start} loading={busy} disabled={pending} onPress={() => { void run(async () => { const next = await resyncGoogleCalendar(); if (mounted.current) setStatus(next); }); }}>Revisar sincronización</Button>
            <Text style={copy}>Para ver el horario peninsular, selecciona Europe/Madrid en los ajustes de Google Calendar.</Text>
            <Button variant="ghost" size="small" style={styles.start} onPress={() => { void Linking.openURL('https://calendar.google.com/calendar/u/0/r/settings'); }}>Abrir ajustes de Google Calendar</Button>
          </>}
          <Button variant="ghost" size="small" style={styles.start} disabled={busy} onPress={() => setConfirmDisconnect(true)}>Desconectar</Button>
        </View>}
      </View>

      <View style={[styles.section, styles.column]}>
        <View style={styles.sectionHeader}>
          <Image source={require('../../../assets/google-meet.png')} style={styles.productLogo} resizeMode="contain" accessible={false} />
          <View style={styles.headerCopy}>
            <Text style={heading}>Google Meet</Text>
            <Text style={[styles.caption, { color: meetActive ? theme.success : theme.textSecondary }]}>{!status ? 'Comprobando…' : meetActive ? 'Google Meet activo' : status.videoProviderPreference === 'GOOGLE_MEET' ? 'Necesita atención' : !status.enabled || !status.meetAssignmentsEnabled ? 'Activación no disponible' : needsReauthorization ? 'Renueva la autorización de Calendar' : connected ? 'Listo para activar' : 'Necesita Google Calendar'}</Text>
          </View>
        </View>
        {meetActive ? <>
          <Text style={copy}>Un enlace por cita, en HERA y en los correos. Entra con la cuenta de Google conectada.</Text>
        </> : status?.videoProviderPreference === 'GOOGLE_MEET' ? <Text style={[...copy, { color: theme.warning }]}>
          {meetUnavailable ? 'Google Meet no está disponible temporalmente para nuevas citas. Puedes elegir Daily en las otras opciones de videollamada.' : 'Revisa la conexión y la activación de Meet para preparar nuevas videollamadas.'}
        </Text> : <>
          <Text style={copy}>{status?.meetAssignmentsEnabled && status.enabled
            ? connected || needsReauthorization ? 'Un enlace de Meet para cada cita, disponible en HERA y en los correos.' : 'Conecta Calendar y activa Meet para tus próximas videollamadas.'
            : 'Las videollamadas de HERA siguen disponibles sin conectar Google.'}</Text>
        </>}
        {canActivate && <Button style={compact ? styles.stretch : styles.start} disabled={busy || status.privacyUpdateRequired || !status.activationConnection || !status.meetDisclosureVersion || !status.email} onPress={() => {
          if (status.activationConnection && status.meetDisclosureVersion && status.email) setConfirmMeet({ email: status.email, disclosureVersion: status.meetDisclosureVersion, connection: { ...status.activationConnection } });
        }}>Activar Google Meet</Button>}
        {!!status?.failedDeliveries && <Text style={[...copy, { color: theme.error }]}>Hay accesos por correo pendientes de entrega: {status.failedDeliveries}</Text>}
      </View>
      </View>

      <View style={[styles.footer, { borderColor: theme.borderLight }]}>
        <Text style={[styles.caption, styles.footnote, { color: theme.textSecondary }]}>Las citas ya preparadas conservan su enlace.</Text>
        <AnimatedPressable onPress={() => setPrivacyDialog('read')} hoverLift={false} disabled={busy} accessibilityRole="button" style={styles.disclosure}>
          <Ionicons name="shield-checkmark-outline" size={17} color={theme.textSecondary} />
          <Text style={[styles.link, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Datos compartidos y privacidad</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => setShowVideoOptions(value => !value)} hoverLift={false} disabled={busy} accessibilityRole="button" accessibilityState={{ expanded: showVideoOptions }} style={styles.disclosure}>
          <Text style={[styles.link, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Videollamadas · Otras opciones</Text>
          <Ionicons name={showVideoOptions ? 'chevron-up' : 'chevron-down'} size={17} color={theme.textSecondary} />
        </AnimatedPressable>
      </View>
      {showVideoOptions && <View style={[styles.details, { borderColor: theme.borderLight }]}>
        <Text style={copy}>Daily permite videollamadas sin conectar Google. Esta preferencia se aplica a nuevas citas; no sustituye enlaces ya asignados.</Text>
        <Button variant="outline" size="small" style={styles.start} loading={busy} onPress={() => { void run(async () => { const next = await setVideoPreference('DAILY'); if (mounted.current) setStatus(next); }); }}>Usar videollamadas sin Google</Button>
      </View>}
      {status?.errorCode === 'REVOCATION_FAILED' && <View style={styles.section}>
        <Text style={copy}>HERA ha dejado de sincronizar. No se pudo retirar el permiso en Google; puedes hacerlo desde tu cuenta.</Text>
        <Button variant="outline" size="small" style={styles.start} onPress={() => { void Linking.openURL('https://myaccount.google.com/connections'); }}>Revisar permisos en Google</Button>
      </View>}
      {error && !dialogOpen && <View style={[styles.feedback, { backgroundColor: theme.errorBg }]}>
        <Text accessibilityRole="alert" style={[...copy, { color: theme.error }]}>{error}</Text>
        <Button variant="ghost" size="small" disabled={busy} style={styles.start} onPress={() => { void refresh(); }}>Actualizar estado</Button>
      </View>}
    </AccountSettingsCard>

    <Modal visible={dialogOpen} transparent animationType="fade" onRequestClose={closeDialog}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: theme.bgCard, borderColor: theme.border }]} accessibilityViewIsModal>
          <View style={styles.dialogHeader}>
            <Text accessibilityRole="header" style={[styles.dialogTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{dialogTitle}</Text>
            <AnimatedPressable onPress={closeDialog} disabled={busy} accessibilityRole="button" accessibilityLabel="Cerrar aviso" style={styles.close} hoverLift={false}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
          <ScrollView style={styles.dialogScroll} contentContainerStyle={styles.dialogBody}>
            {confirmMeet ? <>
              <View style={[styles.organizer, { backgroundColor: theme.bgMuted }]}>
                <Text style={[styles.caption, { color: theme.textSecondary }]}>CUENTA ORGANIZADORA</Text>
                <Text selectable style={[styles.account, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{confirmMeet.email}</Text>
              </View>
              <Text style={copy}>Autorizas a HERA a crear una reunión distinta de Google Meet por cita de vídeo en el calendario principal de {confirmMeet.email}. Los participantes recibirán su acceso por HERA y correo. No se enviarán datos clínicos al evento.</Text>
              <Text style={copy}>Las citas con proveedor asignado conservarán su acceso.</Text>
              <Text style={copy}>El audio y vídeo transcurren en Google. Debes admitir al paciente correcto y finalizar la reunión. Desconectar o borrar el evento no invalida necesariamente un enlace copiado. Revisa las condiciones aplicables a tu cuenta antes del uso clínico.</Text>
            </> : confirmDisconnect ? <Text style={copy}>Las citas ya copiadas permanecerán en Google y dejarán de actualizarse. Los enlaces Meet preparados pueden seguir funcionando; desconectar no borra las reuniones.</Text> : <>
              <Text style={copy}>Se mostrarán tus citas privadas y de clínicas, pendientes y confirmadas, con su horario y un enlace a HERA. No se enviarán datos del paciente.</Text>
              <Text style={copy}>Los cambios se gestionan en HERA. Los eventos personales de Google no se importan ni bloquean tu disponibilidad. Google solicitará permiso para gestionar eventos de tus calendarios; HERA solo gestionará sus propias copias.</Text>
              <Text style={copy}>Si desconectas la cuenta, las citas ya copiadas permanecerán en Google y dejarán de actualizarse. Guardamos tu identidad Google y una credencial cifrada; puedes desconectar cuando quieras.</Text>
              {privacyDialog === 'connect' && <Text style={copy}>Al continuar autorizas esta sincronización. Activar Meet será un paso adicional.</Text>}
              <Button variant="ghost" size="small" style={styles.start} onPress={() => { closeDialog(); navigation.navigate('LegalDocument', { documentKey: 'PRIVACY_POLICY', version: disclosureVersion ?? undefined }); }}>Leer política de privacidad</Button>
            </>}
            {error && <Text accessibilityRole="alert" style={[...copy, { color: theme.error }]}>{error}</Text>}
          </ScrollView>
          <View style={[styles.dialogActions, compact && styles.dialogActionsCompact, { borderColor: theme.borderLight }]}>
            {confirmMeet ? <>
              <Button fullWidth={compact} loading={busy} onPress={() => { void activateMeet(); }}>Aceptar y activar Google Meet</Button>
              <Button fullWidth={compact} variant="ghost" disabled={busy} onPress={closeDialog}>Ahora no</Button>
            </> : confirmDisconnect ? <>
              <Button fullWidth={compact} variant="outline" loading={busy} onPress={() => { void run(async () => { const next = await disconnectGoogleCalendar(); if (mounted.current) { setStatus(next); setConfirmDisconnect(false); } }); }}>Desconectar y conservar eventos</Button>
              <Button fullWidth={compact} variant="ghost" disabled={busy} onPress={closeDialog}>Volver</Button>
            </> : privacyDialog === 'connect' ? <>
              <Button fullWidth={compact} loading={busy} onPress={() => { void connect(); }}>Continuar con Google</Button>
              <Button fullWidth={compact} variant="ghost" disabled={busy} onPress={closeDialog}>Ahora no</Button>
            </> : <Button fullWidth={compact} variant="outline" onPress={closeDialog}>Entendido</Button>}
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, gap: 3 },
  productLogo: { width: 40, height: 40 },
  columns: { flexDirection: 'column', gap: 24 },
  columnsWide: { flexDirection: 'row', gap: 28 },
  column: { flex: 1, minWidth: 0 },
  calendarDividerWide: { paddingRight: 28, borderRightWidth: 1 },
  calendarDividerCompact: { paddingBottom: 24, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 16, lineHeight: 23 },
  caption: { fontSize: 12, lineHeight: 19 },
  account: { fontSize: 14, lineHeight: 22, flexShrink: 1 },
  copy: { fontSize: 14, lineHeight: 22 },
  start: { alignSelf: 'flex-start' },
  stretch: { alignSelf: 'stretch' },
  disclosure: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
  link: { fontSize: 13, lineHeight: 20, flexShrink: 1 },
  details: { borderTopWidth: 1, paddingTop: 14, gap: 12 },
  footer: { borderTopWidth: 1, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, alignItems: 'center' },
  footnote: { flexGrow: 1, flexBasis: '100%', marginBottom: 4 },
  feedback: { padding: 14, borderRadius: 10, gap: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(18, 28, 18, 0.48)', padding: 16, justifyContent: 'center', alignItems: 'center' },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  dialogHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialogTitle: { flex: 1, fontSize: 23, lineHeight: 30 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dialogScroll: { flexShrink: 1 },
  dialogBody: { padding: 20, gap: 16 },
  organizer: { borderRadius: 10, padding: 14, gap: 4 },
  dialogActions: { padding: 16, gap: 8, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap' },
  dialogActionsCompact: { flexDirection: 'column' },
});
