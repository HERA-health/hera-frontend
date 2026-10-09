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

export function GoogleCalendarCard({ videoSetup = false, hasUnsavedChanges = false, onBeforeConnect }: {
  videoSetup?: boolean;
  hasUnsavedChanges?: boolean;
  onBeforeConnect?: () => Promise<boolean>;
} = {}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [disclosureVersion, setDisclosureVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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
      if (mounted.current && revision === generation.current) {
        setStatus(next); setDisclosureVersion(privacy.version); setError(null);
        if (next.status !== 'DISCONNECTING' && !next.pending && !next.reconciling) setPollingPaused(false);
      }
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
      if (++checks > 6) { clearInterval(timer); setPollingPaused(true); return; }
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
    // Web OAuth leaves HERA; preserve profile edits before starting it.
    if (onBeforeConnect && !await onBeforeConnect()) {
      if (mounted.current) setPrivacyDialog(null);
      return;
    }
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
  const credentialStorageError = status?.errorCode === 'CALENDAR_CREDENTIAL_STORAGE_ERROR';
  const connected = status?.status === 'CONNECTED' && !needsReauthorization;
  const meetUnavailable = status?.meetAssignmentsEnabled === false;
  const meetActive = Boolean(connected && status.enabled && status.meetEnabled && status.videoProviderPreference === 'GOOGLE_MEET' && !status.privacyUpdateRequired && !meetUnavailable && !credentialStorageError);
  const calendarActive = connected && status.enabled && !credentialStorageError;
  const needsAttention = needsReauthorization || credentialStorageError;
  const canActivate = connected && status.enabled && status.meetAssignmentsEnabled && !meetActive && !credentialStorageError;
  const meetNeedsCalendar = Boolean(status?.enabled && status.meetAssignmentsEnabled === true
    && status.status === 'DISCONNECTED' && !credentialStorageError);
  const guidedSetup = videoSetup && status?.videoSetupCompleted === false && status.enabled
    && status.meetAssignmentsEnabled === true && !meetActive && !credentialStorageError && status.status !== 'DISCONNECTING';
  const label = !status ? 'Cargando conexión…' : !status.enabled ? 'Disponible próximamente'
    : status.status === 'DISCONNECTING' ? 'Desconectando…'
    : credentialStorageError ? 'La integración necesita revisión'
    : needsReauthorization ? 'Vuelve a autorizar el acceso'
    : status.status === 'DISCONNECTED' ? 'Sin conectar'
    : 'Conectado';
  const meetLabel = !status ? 'Comprobando…' : credentialStorageError ? 'Preparación pausada'
    : meetActive ? 'Activo' : !status.enabled || !status.meetAssignmentsEnabled ? 'Activación no disponible'
    : meetNeedsCalendar ? 'Necesita Calendar'
    : needsReauthorization ? 'Renueva Calendar' : canActivate ? 'Listo para activar' : status.videoProviderPreference === 'GOOGLE_MEET' ? 'Necesita atención'
    : connected ? 'Listo para activar' : 'Sin activar';
  const renderStatus = (product: string, text: string, active: boolean, attention: boolean, requiresCalendar = false) => (
    <View style={[styles.statusBadge, { backgroundColor: active ? theme.successBg : attention ? theme.warningBg : theme.bgCard }]}>
      <Ionicons name={active ? 'checkmark-circle' : attention ? 'information-circle-outline' : requiresCalendar ? 'lock-closed-outline' : 'ellipse-outline'}
        size={18} color={active ? theme.success : attention ? theme.warning : theme.textSecondary} />
      <Text accessibilityLabel={`${product}: ${text}`} accessibilityLiveRegion="polite"
        style={[styles.statusText, { color: active ? theme.success : attention ? theme.warning : theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>{text}</Text>
    </View>
  );
  const copy = [styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }];
  const heading = [styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }];
  const closeDialog = () => {
    if (actionRunning.current) return;
    setPrivacyDialog(null); setConfirmMeet(null); setConfirmDisconnect(false);
  };
  const dialogOpen = Boolean(privacyDialog || confirmMeet || confirmDisconnect);
  const dialogTitle = confirmMeet ? 'Activa Google Meet' : confirmDisconnect ? 'Desconectar Google Calendar' : privacyDialog === 'connect' ? needsReauthorization ? 'Renueva la autorización de Google' : 'Conecta tu calendario' : 'Datos compartidos y privacidad';

  return <>
    <AccountSettingsCard title={guidedSetup ? 'Prepara tus videollamadas con Google Meet' : 'Calendario y videollamadas'}>
      {guidedSetup && <View style={styles.setupIntro}>
        <Text accessibilityLiveRegion="polite" style={[styles.sectionTitle, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
          {connected ? 'Paso 2 de 2 · Activa Google Meet' : 'Paso 1 de 2 · Conecta tu cuenta de Google'}
        </Text>
        <Text style={copy}>{connected
          ? 'Calendar ya está conectado. Acepta la activación de Meet para preparar los enlaces de tus nuevas citas.'
          : 'Primero sincroniza tus citas con Google Calendar. Después podrás activar un enlace de Meet para cada videollamada.'}</Text>
      </View>}
      <View onLayout={event => setContentWidth(event.nativeEvent.layout.width)} style={[styles.columns, twoColumns && styles.columnsWide]}>
      <View style={[styles.section, styles.productPanel, styles.column, twoColumns && styles.columnWide, { backgroundColor: calendarActive ? theme.successLight : theme.bgMuted }]}>
        <View style={styles.sectionHeader}>
          <Image source={require('../../../assets/google-calendar.png')} style={styles.productLogo} resizeMode="contain" accessible={false} />
          <View style={styles.headerCopy}>
            <Text style={heading}>{guidedSetup ? '1. Google Calendar' : 'Google Calendar'}</Text>
            {renderStatus('Google Calendar', label, calendarActive, needsAttention)}
          </View>
        </View>
        {status?.email && <Text selectable style={[styles.account, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{status.email}</Text>}
        <Text style={copy}>{credentialStorageError
          ? 'La integración necesita revisión técnica. Contacta con soporte para continuar con Calendar y Meet.'
          : needsReauthorization && status?.privacyUpdateRequired
          ? 'Hemos actualizado la información de privacidad. Reconecta la misma cuenta para continuar con Calendar y activar Meet.'
          : needsReauthorization
          ? 'Google necesita que renueves el permiso. Reconecta la misma cuenta para continuar sincronizando tus citas.'
          : connected
          ? 'Tus citas de HERA se sincronizan automáticamente con tu calendario.'
          : 'Sincroniza tus citas de HERA con tu calendario principal.'}</Text>
        {!status && !error && <ActivityIndicator color={theme.primary} />}
        {status?.enabled && (status.status === 'DISCONNECTED' || needsReauthorization) && <Button
          style={compact ? styles.stretch : styles.start} loading={busy} disabled={!disclosureVersion}
          onPress={() => setPrivacyDialog('connect')}>
          {needsReauthorization ? 'Reconectar Google Calendar' : guidedSetup ? 'Conectar Google y continuar' : 'Conectar Google Calendar'}
        </Button>}
      </View>

      <View style={[styles.section, styles.productPanel, styles.column, twoColumns && styles.columnWide, { backgroundColor: meetActive ? theme.successLight : theme.bgMuted }]}>
        <View style={styles.sectionHeader}>
          <Image source={require('../../../assets/google-meet.png')} style={styles.productLogo} resizeMode="contain" accessible={false} />
          <View style={styles.headerCopy}>
            <Text style={heading}>{guidedSetup ? '2. Google Meet' : 'Google Meet'}</Text>
            {renderStatus('Google Meet', meetLabel, meetActive, needsAttention || (!meetActive && !canActivate && !meetNeedsCalendar && status?.videoProviderPreference === 'GOOGLE_MEET'), meetNeedsCalendar)}
          </View>
        </View>
        {credentialStorageError ? <Text style={copy}>La preparación de enlaces está pausada mientras se revisa la integración. Las citas ya preparadas conservan su enlace.</Text> : meetNeedsCalendar ? <View style={[styles.dependencyHint, { backgroundColor: theme.bgCard }]}>
          <Ionicons name="link-outline" size={18} color={theme.textSecondary} accessible={false} />
          <Text style={[styles.dependencyCopy, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>Para activar Meet, primero conecta Google Calendar.</Text>
        </View> : guidedSetup && !connected ? <Text style={copy}>El siguiente paso, cuando conectes Calendar. Podrás revisar la cuenta organizadora antes de activar Meet.</Text> : meetActive ? <>
          <Text style={copy}>Un enlace por cita, en HERA y en los correos. Entra con tu cuenta de Google conectada.</Text>
        </> : status?.videoProviderPreference === 'GOOGLE_MEET' && !canActivate ? <Text style={[...copy, { color: theme.warning }]}>
          {meetUnavailable ? 'Google Meet no está disponible temporalmente para nuevas citas. Revisa la integración para continuar con Meet.' : 'Revisa la conexión y la activación de Meet para continuar con tus videollamadas.'}
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

      <View style={styles.utilityActions}>
        {(connected || status?.status === 'REAUTH_REQUIRED') && <AnimatedPressable
          onPress={() => setShowOptions(value => !value)} disabled={busy} hoverLift={false}
          accessibilityRole="button" accessibilityState={{ expanded: showOptions }} style={[styles.disclosure, styles.optionsTrigger, { backgroundColor: theme.bgMuted }]}>
          <Ionicons name="options-outline" color={theme.link} size={17} />
          <Text style={[styles.link, { color: theme.link, fontFamily: theme.fontSansSemiBold }]}>Opciones de sincronización</Text>
          <Ionicons name={showOptions ? 'chevron-up' : 'chevron-down'} color={theme.link} size={17} />
        </AnimatedPressable>}
        <AnimatedPressable onPress={() => setPrivacyDialog('read')} hoverLift={false} disabled={busy} accessibilityRole="button" style={styles.disclosure}>
          <Ionicons name="shield-checkmark-outline" size={17} color={theme.textSecondary} />
          <Text style={[styles.link, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Datos compartidos y privacidad</Text>
        </AnimatedPressable>
      </View>
        {showOptions && (connected || status?.status === 'REAUTH_REQUIRED') && <View style={[styles.details, { backgroundColor: theme.bgMuted }]}>
          {connected && <>
            <Text style={[...copy, { fontFamily: theme.fontSansSemiBold }]}>{pending ? 'Actualizando automáticamente…' : 'Sincronización automática'}</Text>
            {!!status.pending && <Text style={copy}>{status.pending} {status.pending === 1 ? 'cita' : 'citas'} por actualizar</Text>}
            {!!status.failed && <Text style={copy}>{status.failed} {status.failed === 1 ? 'cita con actualización pendiente' : 'citas con actualización pendiente'}. Puedes revisar la sincronización desde aquí.</Text>}
            <Text style={copy}>Las actualizaciones suelen tardar uno o dos minutos. No necesitas pulsar ningún botón ni mantener HERA abierta.</Text>
            {status.lastSyncedAt && <Text style={copy}>Última sincronización: {new Date(status.lastSyncedAt).toLocaleString('es-ES')}</Text>}
            <Text style={copy}>Para ver el horario peninsular, selecciona Europe/Madrid en los ajustes de Google Calendar.</Text>
          </>}
          <View style={styles.optionActions}>
            {connected && <>
              <Button variant="outline" size="small" loading={busy} disabled={pending} onPress={() => { void run(async () => { const next = await resyncGoogleCalendar(); if (mounted.current) setStatus(next); }); }}>Revisar sincronización</Button>
              <Button variant="ghost" size="small" onPress={() => { void Linking.openURL('https://calendar.google.com/calendar/u/0/r/settings'); }}>Abrir ajustes de Google Calendar</Button>
            </>}
            <Button variant="ghost" size="small" disabled={busy} onPress={() => setConfirmDisconnect(true)}>Desconectar</Button>
          </View>
        </View>}
      <Text style={[styles.caption, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Las citas ya preparadas conservan su enlace.</Text>
      {pending && pollingPaused && !error && <Button variant="ghost" size="small" disabled={busy} style={styles.start} onPress={() => { void refresh(); }}>Actualizar estado</Button>}
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
              <Text style={copy}>Google Meet será el proveedor principal, también en reservas inmediatas. El enlace puede tardar unos minutos en prepararse. Daily se utilizará automáticamente solo como respaldo de emergencia ante problemas que impidan disponer de Meet, según la política de privacidad. HERA mostrará el motivo del cambio; si se usa Daily, la llamada transcurrirá mediante ese servicio.</Text>
              <Text style={copy}>Los enlaces ya preparados y las citas que ya utilizan Daily conservarán su acceso.</Text>
              <Button variant="ghost" size="small" style={styles.start} onPress={() => {
                const version = confirmMeet.disclosureVersion;
                closeDialog(); navigation.navigate('LegalDocument', { documentKey: 'PRIVACY_POLICY', version });
              }}>Leer condiciones del respaldo de emergencia</Button>
              <Text style={copy}>Cuando se utiliza Meet, el audio y vídeo transcurren en Google. Debes admitir al paciente correcto y finalizar la reunión. Desconectar o borrar el evento no invalida necesariamente un enlace copiado. Revisa las condiciones aplicables a tu cuenta antes del uso clínico.</Text>
            </> : confirmDisconnect ? <Text style={copy}>Las citas ya copiadas permanecerán en Google y dejarán de actualizarse. Los enlaces Meet preparados pueden seguir funcionando; desconectar no borra las reuniones.</Text> : <>
              <Text style={copy}>Se mostrarán tus citas privadas y de clínicas, pendientes y confirmadas, con su horario y un enlace a HERA. No se enviarán datos del paciente.</Text>
              <Text style={copy}>Los cambios se gestionan en HERA. Los eventos personales de Google no se importan ni bloquean tu disponibilidad. Google solicitará permiso para gestionar eventos de tus calendarios; HERA solo gestionará sus propias copias.</Text>
              <Text style={copy}>Si desconectas la cuenta, las citas ya copiadas permanecerán en Google y dejarán de actualizarse. Guardamos tu identidad Google y una credencial cifrada; puedes desconectar cuando quieras.</Text>
              {privacyDialog === 'connect' && <Text style={copy}>Al continuar autorizas esta sincronización. Activar Meet será un paso adicional.</Text>}
              {privacyDialog === 'connect' && hasUnsavedChanges && <Text style={copy}>Antes de abrir Google guardaremos los cambios pendientes de tu perfil.</Text>}
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
  setupIntro: { gap: 8 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  productLogo: { width: 44, height: 44 },
  productPanel: { padding: 18, borderRadius: 16 },
  dependencyHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  dependencyCopy: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 20 },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: '100%' },
  statusText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  columns: { flexDirection: 'column', gap: 14 },
  columnsWide: { flexDirection: 'row', alignItems: 'stretch', gap: 16 },
  column: { minWidth: 0, flexShrink: 0 },
  columnWide: { flex: 1 },
  sectionTitle: { fontSize: 16, lineHeight: 23 },
  caption: { fontSize: 12, lineHeight: 19 },
  account: { fontSize: 14, lineHeight: 22, flexShrink: 1 },
  copy: { fontSize: 14, lineHeight: 22 },
  start: { alignSelf: 'flex-start' },
  stretch: { alignSelf: 'stretch' },
  disclosure: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
  link: { fontSize: 13, lineHeight: 20, flexShrink: 1 },
  optionsTrigger: { paddingHorizontal: 12, borderRadius: 10 },
  details: { padding: 16, borderRadius: 14, gap: 10 },
  optionActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  utilityActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: 16, rowGap: 4 },
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
