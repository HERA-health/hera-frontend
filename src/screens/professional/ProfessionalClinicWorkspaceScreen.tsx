import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AnimatedPressable, Button, Input, SimpleDropdown, useAppAlert } from '../../components/common';
import { showAppAlert } from '../../components/common/alert';
import { borderRadius, shadows, spacing } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useProfessionalClinicWorkspace } from '../../contexts/ProfessionalClinicWorkspaceContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  actOnClinicSession,
  getClinicInformation,
  getClinicMeetingLink,
  getWorkspaceHome,
  listClinicAgreements,
  listClinicPatients,
  listClinicSessions,
  rescheduleClinicSession,
  respondToClinicAgreement,
  type ProfessionalClinicAgreement,
  type ProfessionalClinicInformation,
  type ProfessionalClinicPatient,
  type ProfessionalClinicSession,
  type ProfessionalClinicWorkspaceHome,
  type ProfessionalClinicWorkspaceSection,
} from '../../services/clinic/professionalWorkspaceService';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import { ProfessionalClinicFinancePanel } from './clinic-finance/ProfessionalClinicFinancePanel';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfessionalClinicWorkspace'>;
type LoadStatus = 'loading' | 'ready' | 'error';

const sections: ReadonlyArray<{
  id: ProfessionalClinicWorkspaceSection;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { id: 'home', label: 'Inicio', icon: 'home-outline' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-outline' },
  { id: 'patients', label: 'Pacientes', icon: 'people-outline' },
  { id: 'agreement', label: 'Acuerdo', icon: 'document-text-outline' },
  { id: 'finance', label: 'Dinero', icon: 'wallet-outline' },
  { id: 'info', label: 'Información', icon: 'information-circle-outline' },
];

const formatDateTime = (iso: string): string => new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(iso));

const euro = (cents: number): string => (cents / 100).toLocaleString('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

function StateView({
  status,
  message,
  onRetry,
}: {
  status: LoadStatus;
  message?: string;
  onRetry?: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  if (status === 'loading') {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.stateText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Preparando este espacio…</Text>
      </View>
    );
  }
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={26} color={theme.textMuted} />
      <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>No pudimos cargar esta sección</Text>
      <Text style={[styles.stateText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{message}</Text>
      {onRetry ? <Button size="small" variant="outline" onPress={onRetry}>Reintentar</Button> : null}
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      shadowColor: theme.shadowCard,
    }]}>
      {children}
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={styles.headingBlock}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{subtitle}</Text> : null}
    </View>
  );
}

function HomeSection({
  clinicId,
  onOpenSection,
}: {
  clinicId: string;
  onOpenSection: (section: ProfessionalClinicWorkspaceSection, focusId?: string) => void;
}): React.ReactElement {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState<ProfessionalClinicWorkspaceHome | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const request = useRef(0);
  const load = useCallback(async (force = false) => {
    if (!user?.id) return;
    const id = request.current + 1;
    request.current = id;
    setData(null);
    setStatus('loading');
    setError('');
    try {
      const next = await getWorkspaceHome(user.id, clinicId, force);
      if (request.current !== id) return;
      setData(next);
      setStatus('ready');
    } catch (loadError: unknown) {
      if (request.current !== id) return;
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el inicio.');
      setStatus('error');
    }
  }, [clinicId, user?.id]);
  useEffect(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]);
  if (!data) return <StateView status={status} message={error} onRetry={() => { void load(true); }} />;

  return (
    <View style={styles.sectionStack}>
      <View style={styles.homeGrid}>
        <View style={styles.homeColumn}>
          <SectionCard>
            <SectionHeading title="Lo que necesita tu atención" subtitle="Solo tareas objetivas y accionables." />
            {data.tasks.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Todo está al día por ahora.</Text>
            ) : data.tasks.slice(0, 8).map((task) => (
              <AnimatedPressable
                key={task.id}
                onPress={() => onOpenSection(task.section, task.focusId)}
                style={[styles.rowAction, { borderColor: theme.borderLight }]}
                accessibilityRole="button"
                accessibilityLabel={`${task.title}. Abrir.`}
              >
                <View style={[styles.iconShell, { backgroundColor: theme.primaryAlpha12 }]}>
                  <Ionicons name="arrow-forward-outline" size={16} color={theme.primary} />
                </View>
                <Text style={[styles.rowTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{task.title}</Text>
                {task.dueAt ? <Text style={[styles.rowMeta, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{formatDateTime(task.dueAt)}</Text> : null}
              </AnimatedPressable>
            ))}
          </SectionCard>
          <SectionCard>
            <SectionHeading title="Citas de hoy" />
            {data.appointments.today.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>No tienes citas de clínica hoy.</Text>
            ) : data.appointments.today.map((session) => (
              <SessionSummary key={session.id} session={session} onPress={() => onOpenSection('agenda', session.id)} />
            ))}
          </SectionCard>
        </View>
        <View style={styles.homeColumn}>
          <SectionCard>
            <SectionHeading title="Próximas citas" />
            {data.appointments.upcoming.slice(0, 5).map((session) => (
              <SessionSummary key={session.id} session={session} onPress={() => onOpenSection('agenda', session.id)} />
            ))}
            {data.appointments.upcoming.length === 0 ? <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin próximas citas.</Text> : null}
          </SectionCard>
          <SectionCard>
            <SectionHeading title="Coordinación" />
            <Text style={[styles.rowTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
              {data.operationalContact?.coordinationName ?? 'Equipo de coordinación'}
            </Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              {data.operationalContact?.operationalEmail
                ?? data.operationalContact?.operationalPhone
                ?? data.operationalContact?.supportChannel
                ?? 'La clínica todavía no ha publicado un canal operativo.'}
            </Text>
            <Button size="small" variant="ghost" onPress={() => onOpenSection('info')}>Ver información</Button>
          </SectionCard>
          <View style={[styles.honestNotice, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
            <Text style={[styles.noticeText, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>La historia y los documentos clínicos aún no están disponibles en este espacio.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SessionSummary({ session, onPress }: { session: ProfessionalClinicSession; onPress: () => void }): React.ReactElement {
  const { theme } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.sessionSummary, { borderColor: theme.borderLight }]} accessibilityRole="button">
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{session.patient.displayName}</Text>
        <Text style={[styles.rowMeta, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{formatDateTime(session.schedule.startsAt)} · {session.service.name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

function AgendaSection({ clinicId, focusId }: { clinicId: string; focusId?: string }): React.ReactElement {
  const { theme } = useTheme();
  const appAlert = useAppAlert();
  const [sessions, setSessions] = useState<ProfessionalClinicSession[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const load = useCallback(async () => {
    setSessions([]);
    setStatus('loading');
    try {
      const page = await listClinicSessions(clinicId, { page: 1, limit: 50 });
      setSessions(page.items);
      setStatus('ready');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la agenda.');
      setStatus('error');
    }
  }, [clinicId]);
  useEffect(() => { void load(); }, [load]);
  const runAction = async (
    session: ProfessionalClinicSession,
    action: 'CONFIRM' | 'CANCEL' | 'COMPLETE' | 'MARK_PATIENT_NO_SHOW',
  ): Promise<void> => {
    if (action !== 'CONFIRM') {
      const copy = action === 'CANCEL'
        ? { title: '¿Cancelar esta cita?', message: 'El paciente y la coordinación recibirán un aviso. Esta acción no elimina la trazabilidad.', label: 'Cancelar cita', destructive: true }
        : action === 'COMPLETE'
          ? { title: '¿Marcar la cita como completada?', message: 'Se registrará la asistencia y se ejecutarán una sola vez los efectos económicos aplicables.', label: 'Confirmar asistencia', destructive: false }
          : { title: '¿Registrar que el paciente no asistió?', message: 'La cita se cerrará sin generar automáticamente un cobro o reparto por ausencia.', label: 'Registrar ausencia', destructive: false };
      const confirmed = await appAlert.confirm({
        title: copy.title,
        message: copy.message,
        confirmLabel: copy.label,
        cancelLabel: 'Volver',
        destructive: copy.destructive,
        tone: copy.destructive ? 'danger' : 'warning',
      });
      if (!confirmed) return;
    }
    setSavingId(session.id);
    try {
      const updated = await actOnClinicSession(clinicId, session.id, action === 'CANCEL'
        ? { action, expectedUpdatedAt: session.updatedAt, reasonCode: 'OTHER_NON_CLINICAL' }
        : { action, expectedUpdatedAt: session.updatedAt });
      setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (actionError: unknown) {
      showAppAlert(appAlert, 'No se pudo actualizar', actionError instanceof Error ? actionError.message : 'Actualiza la vista e inténtalo de nuevo.');
    } finally {
      setSavingId(null);
    }
  };
  const join = async (sessionId: string): Promise<void> => {
    setSavingId(sessionId);
    try {
      const meeting = await getClinicMeetingLink(clinicId, sessionId);
      await Linking.openURL(meeting.meetingLink);
    } catch (joinError: unknown) {
      showAppAlert(appAlert, 'Videollamada no disponible', joinError instanceof Error ? joinError.message : 'Inténtalo de nuevo.');
    } finally {
      setSavingId(null);
    }
  };
  const openReschedule = (session: ProfessionalClinicSession): void => {
    const startsAt = new Date(session.schedule.startsAt);
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(startsAt);
    setRescheduleDate(getMadridDateKey(startsAt));
    setRescheduleTime(`${timeParts.find((part) => part.type === 'hour')?.value ?? ''}:${timeParts.find((part) => part.type === 'minute')?.value ?? ''}`);
    setReschedulingId(session.id);
  };
  const submitReschedule = async (session: ProfessionalClinicSession): Promise<void> => {
    const parsed = parseMadridDateTime(rescheduleDate.trim(), rescheduleTime.trim());
    if (!parsed || parsed.date.getTime() <= Date.now()) {
      showAppAlert(appAlert, 'Fecha no válida', 'Elige una fecha y hora futuras en horario de Madrid.');
      return;
    }
    setSavingId(session.id);
    try {
      const updated = await rescheduleClinicSession(clinicId, session.id, {
        startsAt: parsed.iso,
        expectedUpdatedAt: session.updatedAt,
      });
      setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
      setReschedulingId(null);
    } catch (rescheduleError: unknown) {
      showAppAlert(appAlert, 'No se pudo reprogramar', rescheduleError instanceof Error ? rescheduleError.message : 'Comprueba los conflictos y vuelve a intentarlo.');
    } finally {
      setSavingId(null);
    }
  };
  if (status !== 'ready') return <StateView status={status} message={error} onRetry={() => { void load(); }} />;
  return (
    <View style={styles.sectionStack}>
      <SectionHeading title="Agenda de clínica" subtitle="Aquí solo aparecen las citas de esta clínica. Tu consulta privada permanece separada." />
      {sessions.length === 0 ? <SectionCard><Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay citas de clínica.</Text></SectionCard> : sessions.map((session) => (
        <View key={session.id} style={focusId === session.id ? { borderWidth: 2, borderColor: theme.focus, borderRadius: borderRadius.xl } : undefined}>
          <SectionCard>
            <View style={styles.cardHeaderRow}>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{session.patient.displayName}</Text>
                <Text style={[styles.bodyText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{formatDateTime(session.schedule.startsAt)} · {session.schedule.durationMinutes} min · {session.service.name}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: theme.status[session.status.toLowerCase() as 'pending' | 'confirmed' | 'completed' | 'cancelled'].bg }]}>
                <Text style={[styles.statusText, { color: theme.status[session.status.toLowerCase() as 'pending' | 'confirmed' | 'completed' | 'cancelled'].text }]}>{session.status}</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              {session.actions.canConfirm ? <Button size="small" onPress={() => { void runAction(session, 'CONFIRM'); }} loading={savingId === session.id}>Confirmar</Button> : null}
              {session.actions.canComplete ? <Button size="small" onPress={() => { void runAction(session, 'COMPLETE'); }} loading={savingId === session.id}>Completada</Button> : null}
              {session.actions.canMarkPatientNoShow ? <Button size="small" variant="outline" onPress={() => { void runAction(session, 'MARK_PATIENT_NO_SHOW'); }} disabled={savingId === session.id}>No asistió</Button> : null}
              {session.actions.canReschedule ? <Button size="small" variant="outline" onPress={() => openReschedule(session)} disabled={savingId === session.id}>Reprogramar</Button> : null}
              {session.actions.canCancel ? <Button size="small" variant="ghost" onPress={() => { void runAction(session, 'CANCEL'); }} disabled={savingId === session.id}>Cancelar</Button> : null}
              {session.actions.canJoinVideo ? <Button size="small" variant="secondary" onPress={() => { void join(session.id); }} loading={savingId === session.id}>Entrar en videollamada</Button> : null}
            </View>
            {!session.patient.hasHeraAccount && session.schedule.modality === 'VIDEO_CALL' ? (
              <Text style={[styles.inlineWarning, { color: theme.warning }]}>La videollamada requiere una cuenta HERA vinculada.</Text>
            ) : null}
            {reschedulingId === session.id ? <View style={[styles.reschedulePanel, { borderColor: theme.borderLight, backgroundColor: theme.bgMuted }]}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Nueva fecha y hora</Text>
              <Text style={[styles.rowMeta, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Horario Europe/Madrid. Se conservarán servicio, duración, modalidad, precio y acuerdo económico.</Text>
              <View style={styles.rescheduleFields}>
                <View style={styles.flex}><Input label="Fecha" value={rescheduleDate} onChangeText={setRescheduleDate} placeholder="AAAA-MM-DD" autoCapitalize="none" /></View>
                <View style={styles.flex}><Input label="Hora" value={rescheduleTime} onChangeText={setRescheduleTime} placeholder="HH:mm" autoCapitalize="none" /></View>
              </View>
              <View style={styles.actionRow}>
                <Button size="small" onPress={() => { void submitReschedule(session); }} loading={savingId === session.id}>Guardar cambio</Button>
                <Button size="small" variant="ghost" onPress={() => setReschedulingId(null)} disabled={savingId === session.id}>Cerrar</Button>
              </View>
            </View> : null}
          </SectionCard>
        </View>
      ))}
    </View>
  );
}

function PatientsSection({ clinicId, navigation }: Pick<Props, 'navigation'> & { clinicId: string }): React.ReactElement {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [patients, setPatients] = useState<ProfessionalClinicPatient[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.id) return;
    setPatients([]);
    setStatus('loading');
    try {
      const page = await listClinicPatients(user.id, clinicId, { search: search.trim() || undefined, page: 1, limit: 50 });
      setPatients(page.items);
      setStatus('ready');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pacientes.');
      setStatus('error');
    }
  }, [clinicId, search, user?.id]);
  useEffect(() => {
    const debounce = setTimeout(() => { void load(); }, search ? 250 : 0);
    return () => clearTimeout(debounce);
  }, [load, search]);
  return (
    <View style={styles.sectionStack}>
      <SectionHeading title="Pacientes asignados" subtitle="Identidad administrativa, contacto y consentimiento. Sin notas, documentos ni historia clínica." />
      <Input label="Buscar" value={search} onChangeText={setSearch} placeholder="Nombre, email o teléfono" />
      {status !== 'ready' ? <StateView status={status} message={error} onRetry={() => { void load(); }} /> : patients.length === 0 ? (
        <SectionCard><Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay pacientes asignados que coincidan.</Text></SectionCard>
      ) : patients.map((patient) => (
        <AnimatedPressable
          key={patient.clinicPatientId}
          onPress={() => navigation.navigate('ProfessionalClinicPatientDetail', { clinicId, clinicPatientId: patient.clinicPatientId })}
          style={[styles.patientCard, { backgroundColor: theme.bgCard, borderColor: theme.border, shadowColor: theme.shadowCard }]}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ficha administrativa de ${patient.displayName}`}
        >
          <View style={[styles.avatar, { backgroundColor: theme.primaryAlpha12 }]}>
            <Text style={[styles.avatarText, { color: theme.primary, fontFamily: theme.fontHeading }]}>{patient.displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{patient.displayName}</Text>
            <Text style={[styles.bodyText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{patient.email ?? patient.phone ?? 'Sin contacto disponible'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: patient.consent.status === 'GRANTED' ? theme.successBg : theme.warningBg }]}>
            <Text style={[styles.statusText, { color: patient.consent.status === 'GRANTED' ? theme.success : theme.warning }]}>{patient.consent.status === 'GRANTED' ? 'Consentimiento' : patient.consent.status === 'REVOKED' ? 'Revocado' : 'Pendiente'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </AnimatedPressable>
      ))}
    </View>
  );
}

function AgreementSection({ clinicId, focusId }: { clinicId: string; focusId?: string }): React.ReactElement {
  const { theme } = useTheme();
  const appAlert = useAppAlert();
  const [agreements, setAgreements] = useState<ProfessionalClinicAgreement[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setAgreements(await listClinicAgreements(clinicId));
      setStatus('ready');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los acuerdos.');
      setStatus('error');
    }
  }, [clinicId]);
  useEffect(() => { void load(); }, [load]);
  const respond = async (agreement: ProfessionalClinicAgreement, decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED') => {
    setSavingId(agreement.id);
    try {
      await respondToClinicAgreement(clinicId, agreement.id, {
        decision,
        expectedVersion: agreement.version,
        ...(decision === 'ACCEPTED' ? {} : { reason: reasons[agreement.id]?.trim() }),
      });
      await load();
    } catch (responseError: unknown) {
      showAppAlert(appAlert, 'No se pudo enviar la respuesta', responseError instanceof Error ? responseError.message : 'Revisa los datos e inténtalo de nuevo.');
    } finally {
      setSavingId(null);
    }
  };
  if (status !== 'ready') return <StateView status={status} message={error} onRetry={() => { void load(); }} />;
  return (
    <View style={styles.sectionStack}>
      <SectionHeading title="Tu acuerdo" subtitle="Condiciones, vigencia e historial. Las excepciones nunca muestran el nombre del paciente." />
      {agreements.length === 0 ? <SectionCard><Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay acuerdos publicados.</Text></SectionCard> : agreements.map((agreement) => {
        const share = agreement.share.method === 'PERCENTAGE'
          ? `${((agreement.share.value ?? 0) / 100).toLocaleString('es-ES')} %`
          : euro(agreement.share.value ?? 0);
        const pending = agreement.status === 'PENDING_ACCEPTANCE' && !agreement.response;
        return (
          <View key={agreement.id} style={focusId === agreement.id ? { borderWidth: 2, borderColor: theme.focus, borderRadius: borderRadius.xl } : undefined}>
            <SectionCard>
              <View style={styles.cardHeaderRow}>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{agreement.scope.label ?? agreement.scope.service?.name ?? 'Acuerdo general'}</Text>
                  <Text style={[styles.rowMeta, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Versión {agreement.version} · desde {new Date(agreement.validFrom).toLocaleDateString('es-ES')}</Text>
                </View>
                <Text style={[styles.agreementValue, { color: theme.primary, fontFamily: theme.fontHeading }]}>{share}</Text>
              </View>
              <View style={styles.termGrid}>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Relación: {agreement.relationship === 'EMPLOYEE' ? 'Laboral' : 'Profesional autónomo'}</Text>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Liquidación: {agreement.settlementCondition === 'PATIENT_COLLECTION' ? 'al registrar el cobro' : 'al completar la sesión'}</Text>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Emite y cobra: clínica</Text>
              </View>
              {agreement.response ? <Text style={[styles.inlineSuccess, { color: theme.success }]}>Respuesta: {agreement.response.decision}</Text> : null}
              {pending ? <>
                <Input label="Motivo (solo para rechazo o revisión)" value={reasons[agreement.id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [agreement.id]: value }))} multiline />
                <View style={styles.actionRow}>
                  <Button size="small" onPress={() => { void respond(agreement, 'ACCEPTED'); }} loading={savingId === agreement.id}>Aceptar</Button>
                  <Button size="small" variant="outline" disabled={(reasons[agreement.id]?.trim().length ?? 0) < 3 || savingId === agreement.id} onPress={() => { void respond(agreement, 'REVISION_REQUESTED'); }}>Pedir revisión</Button>
                  <Button size="small" variant="ghost" disabled={(reasons[agreement.id]?.trim().length ?? 0) < 3 || savingId === agreement.id} onPress={() => { void respond(agreement, 'REJECTED'); }}>Rechazar</Button>
                </View>
              </> : null}
            </SectionCard>
          </View>
        );
      })}
    </View>
  );
}

function InformationSection({ clinicId }: { clinicId: string }): React.ReactElement {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState<ProfessionalClinicInformation | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.id) return;
    setData(null);
    setStatus('loading');
    try {
      setData(await getClinicInformation(user.id, clinicId, true));
      setStatus('ready');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la información.');
      setStatus('error');
    }
  }, [clinicId, user?.id]);
  useEffect(() => { void load(); }, [load]);
  if (!data) return <StateView status={status} message={error} onRetry={() => { void load(); }} />;
  return (
    <View style={styles.sectionStack}>
      <SectionHeading title="Información operativa" subtitle="Solo coordinación, soporte, sedes vinculadas e instrucciones de trabajo." />
      <SectionCard>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{data.clinic.displayName}</Text>
        </View>
        <Text style={[styles.bodyText, { color: theme.textSecondary }]}>Coordinación: {data.coordination?.coordinationName ?? 'Sin nombre publicado'}</Text>
        <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{data.coordination?.operationalEmail ?? data.coordination?.operationalPhone ?? data.coordination?.supportChannel ?? 'Sin canal publicado'}</Text>
        {data.coordination?.generalInstructions ? <Text style={[styles.instructions, { color: theme.textPrimary, backgroundColor: theme.bgMuted }]}>{data.coordination.generalInstructions}</Text> : null}
      </SectionCard>
      {data.locations.map((location) => (
        <SectionCard key={location.id}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{location.name}</Text>
            {location.isPrimary ? <Text style={[styles.primaryLabel, { color: theme.primary }]}>Sede principal</Text> : null}
          </View>
          <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{[location.addressLine, location.postalCode, location.city].filter(Boolean).join(', ')}</Text>
          {location.contactEmail || location.contactPhone ? <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{location.contactEmail ?? location.contactPhone}</Text> : null}
          {location.instructions ? <Text style={[styles.instructions, { color: theme.textPrimary, backgroundColor: theme.bgMuted }]}>{location.instructions}</Text> : null}
          <Text style={[styles.scheduleTitle, { color: theme.textPrimary }]}>Horario · {data.timeZone}</Text>
          {Object.entries(location.weeklySchedule).map(([day, intervals]) => intervals.length > 0 ? (
            <Text key={day} style={[styles.rowMeta, { color: theme.textSecondary }]}>{day}: {intervals.map((interval) => `${interval.start}–${interval.end}`).join(', ')}</Text>
          ) : null)}
        </SectionCard>
      ))}
    </View>
  );
}

export function ProfessionalClinicWorkspaceScreen({ navigation, route }: Props): React.ReactElement {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const workspace = useProfessionalClinicWorkspace();
  const requestedClinicId = route.params?.clinicId;
  const section = route.params?.section ?? 'home';
  const focusId = route.params?.focusId;
  const stylesForTheme = useMemo(() => createStyles(theme, width < 768), [theme, width]);

  useEffect(() => {
    if (
      workspace.status === 'ready'
      && requestedClinicId
      && requestedClinicId !== workspace.selectedClinicId
      && workspace.contexts.some((item) => item.clinic.id === requestedClinicId)
    ) {
      void workspace.selectClinic(requestedClinicId);
    }
  }, [requestedClinicId, workspace.contexts, workspace.selectedClinicId, workspace.status]);

  if (workspace.status === 'loading' && workspace.contexts.length === 0) {
    return <View style={[stylesForTheme.screen, { backgroundColor: theme.bg }]}><StateView status="loading" /></View>;
  }
  if (workspace.status === 'error') {
    const message = workspace.hasActiveCareLink
      ? `${workspace.error ?? 'No se pudo cargar el espacio.'} Tu vínculo asistencial sigue activo; prueba de nuevo o contacta con la clínica si el problema continúa.`
      : workspace.error ?? undefined;
    return <View style={[stylesForTheme.screen, { backgroundColor: theme.bg }]}><StateView status="error" message={message} onRetry={() => { void workspace.refreshContexts(true); }} /></View>;
  }
  if (requestedClinicId && !workspace.contexts.some((item) => item.clinic.id === requestedClinicId)) {
    return (
      <View style={[stylesForTheme.accessScreen, { backgroundColor: theme.bg }]}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.textMuted} />
        <Text style={[stylesForTheme.accessTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Ya no tienes acceso a esta clínica</Text>
        <Text style={[stylesForTheme.accessText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>El enlace no ha cambiado tu clínica seleccionada.</Text>
        <Button onPress={() => navigation.navigate('ProfessionalHome')}>Volver al inicio profesional</Button>
      </View>
    );
  }
  const context = workspace.selectedContext;
  if (!context) {
    return (
      <View style={[stylesForTheme.accessScreen, { backgroundColor: theme.bg }]}>
        <Ionicons name="business-outline" size={34} color={theme.textMuted} />
        <Text style={[stylesForTheme.accessTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Mi clínica aún no está disponible</Text>
        <Text style={[stylesForTheme.accessText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Aparecerá cuando formes parte del equipo asistencial de una clínica.</Text>
        <Button variant="outline" onPress={() => navigation.navigate('ProfessionalHome')}>Volver a consulta privada</Button>
      </View>
    );
  }

  const openSection = (nextSection: ProfessionalClinicWorkspaceSection, nextFocusId?: string): void => {
    navigation.setParams({ clinicId: context.clinic.id, section: nextSection, focusId: nextFocusId });
  };

  return (
    <View style={[stylesForTheme.screen, { backgroundColor: theme.bg }]}>
      <View style={[stylesForTheme.contextBand, { backgroundColor: theme.primaryMuted, borderColor: theme.borderStrong }]}>
        <View style={stylesForTheme.contextIdentity}>
          <Text style={[stylesForTheme.contextKicker, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>ESTÁS TRABAJANDO EN</Text>
          <Text style={[stylesForTheme.contextName, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]} numberOfLines={2}>{context.clinic.displayName}</Text>
        </View>
        <View style={stylesForTheme.headerActions}>
          {workspace.contexts.length > 1 ? <SimpleDropdown
            value={context.clinic.id}
            options={workspace.contexts.map((item) => ({ label: item.clinic.displayName, value: item.clinic.id, subtitle: item.relationship.professionalTitle ?? undefined }))}
            onSelect={(clinicId) => { void workspace.selectClinic(clinicId); }}
            accessibilityLabel="Cambiar clínica profesional"
            presentation="portal"
          /> : null}
          {context.capabilities.administration.canOpenAdminWorkspace ? <Button size="small" variant="outline" onPress={() => navigation.navigate('ClinicDashboard')}>Administrar esta clínica</Button> : null}
          <Button size="small" variant="ghost" onPress={() => navigation.navigate('ProfessionalHome')}>Consulta privada</Button>
        </View>
      </View>

      <View style={[stylesForTheme.tabsShell, { borderBottomColor: theme.border, backgroundColor: theme.bgCard }]} accessibilityRole="tablist">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stylesForTheme.tabsContent}>
          {sections.map((item) => {
            const active = item.id === section;
            return (
              <AnimatedPressable
                key={item.id}
                onPress={() => openSection(item.id)}
                style={[stylesForTheme.tab, active ? { backgroundColor: theme.primaryAlpha12, borderColor: theme.primary } : { borderColor: 'transparent' }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={item.icon} size={17} color={active ? theme.primary : theme.textMuted} />
                <Text style={[stylesForTheme.tabText, { color: active ? theme.textPrimary : theme.textSecondary, fontFamily: active ? theme.fontSansSemiBold : theme.fontSans }]}>{item.label}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={stylesForTheme.contentScroll} contentContainerStyle={stylesForTheme.content} showsVerticalScrollIndicator>
        {section === 'home' ? <HomeSection clinicId={context.clinic.id} onOpenSection={openSection} /> : null}
        {section === 'agenda' ? <AgendaSection clinicId={context.clinic.id} focusId={focusId} /> : null}
        {section === 'patients' ? <PatientsSection clinicId={context.clinic.id} navigation={navigation} /> : null}
        {section === 'agreement' ? <AgreementSection clinicId={context.clinic.id} focusId={focusId} /> : null}
        {section === 'finance' ? <ProfessionalClinicFinancePanel clinicId={context.clinic.id} /> : null}
        {section === 'info' ? <InformationSection clinicId={context.clinic.id} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  stateTitle: { fontSize: 18, textAlign: 'center' },
  stateText: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 460 },
  sectionStack: { gap: spacing.lg },
  card: { borderWidth: 1, borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md, ...shadows.sm },
  headingBlock: { gap: 4 },
  sectionTitle: { fontSize: 22, lineHeight: 28 },
  sectionSubtitle: { fontSize: 14, lineHeight: 21, maxWidth: 720 },
  homeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  homeColumn: { flex: 1, minWidth: 280, gap: spacing.lg },
  rowAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, paddingVertical: spacing.sm },
  iconShell: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flexShrink: 1, fontSize: 14, lineHeight: 20 },
  rowMeta: { fontSize: 12, lineHeight: 18 },
  emptyText: { fontSize: 14, lineHeight: 21 },
  honestNotice: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  sessionSummary: { minHeight: 56, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  cardTitle: { fontSize: 17, lineHeight: 23 },
  bodyText: { fontSize: 14, lineHeight: 21 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  reschedulePanel: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderRadius: borderRadius.lg },
  rescheduleFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inlineWarning: { fontSize: 12, lineHeight: 18 },
  inlineSuccess: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  patientCard: { minHeight: 82, borderWidth: 1, borderRadius: borderRadius.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadows.sm },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  agreementValue: { fontSize: 22 },
  termGrid: { gap: 5 },
  primaryLabel: { fontSize: 12, fontWeight: '700' },
  instructions: { padding: spacing.md, borderRadius: borderRadius.md, fontSize: 14, lineHeight: 21 },
  scheduleTitle: { fontSize: 13, fontWeight: '700', marginTop: spacing.xs },
});

const createStyles = (theme: Theme, compact: boolean) => StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  accessScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  accessTitle: { fontSize: 24, textAlign: 'center' },
  accessText: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 480 },
  contextBand: { borderBottomWidth: 1, paddingHorizontal: compact ? spacing.md : spacing.xl, paddingVertical: spacing.md, flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'center', gap: spacing.md },
  contextIdentity: { flex: 1, minWidth: 0 },
  contextKicker: { fontSize: 10, letterSpacing: 1.2 },
  contextName: { fontSize: compact ? 24 : 30, lineHeight: compact ? 29 : 36 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  tabsShell: { borderBottomWidth: 1 },
  tabsContent: { paddingHorizontal: compact ? spacing.sm : spacing.xl, paddingVertical: spacing.sm, gap: spacing.xs },
  tab: { minHeight: 42, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tabText: { fontSize: 13 },
  contentScroll: { flex: 1, minHeight: 0 },
  content: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: compact ? spacing.md : spacing.xl, paddingBottom: 80 },
});
