import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { AnimatedPressable, Button } from '../../common';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ProfessionalHomeData,
  ProfessionalHomeSession,
} from '../../../services/dashboardService';
import {
  createProfessionalHomeStyles,
  professionalHomeSmallStyles as smallStyles,
} from './professionalHomeStyles';

const MADRID_TIME_ZONE = 'Europe/Madrid';

const useResponsiveHomeStyles = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  return useMemo(() => createProfessionalHomeStyles(theme, width < 900), [theme, width]);
};

const formatTime = (iso: string): string => new Intl.DateTimeFormat('es-ES', {
  timeZone: MADRID_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(iso));

const formatShortCalendarDate = (date: string): string => new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
}).format(new Date(`${date}T12:00:00.000Z`));

const getTypeLabel = (type: ProfessionalHomeSession['type']): string => ({
  VIDEO_CALL: 'Videollamada',
  PHONE_CALL: 'Teléfono',
  IN_PERSON: 'Presencial',
})[type];

const getTypeIcon = (
  type: ProfessionalHomeSession['type'],
): React.ComponentProps<typeof Ionicons>['name'] => ({
  VIDEO_CALL: 'videocam-outline',
  PHONE_CALL: 'call-outline',
  IN_PERSON: 'location-outline',
})[type] as React.ComponentProps<typeof Ionicons>['name'];

export function NextSessionHero({ session, joining, onOpen, onJoin, onCreate }: {
  session: ProfessionalHomeSession | null;
  joining: boolean;
  onOpen: (id: string) => void;
  onJoin: (id: string) => void;
  onCreate: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useResponsiveHomeStyles();
  if (!session) {
    return (
      <View style={[styles.hero, styles.emptyHero, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: theme.primaryAlpha12 }]}><Ionicons name="calendar-outline" size={24} color={theme.primary} /></View>
        <View style={styles.emptyHeroCopy}>
          <Text style={[styles.heroEyebrow, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>PRÓXIMA CITA</Text>
          <Text style={[styles.emptyHeroTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Tu agenda está despejada</Text>
          <Text style={[styles.heroMeta, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Configura una cita cuando la necesites; tu disponibilidad y automatizaciones siguen trabajando.</Text>
        </View>
        <Button onPress={onCreate} size="small" icon={<Ionicons name="add" size={17} color={theme.actionPrimaryText} />}>Crear cita</Button>
      </View>
    );
  }

  return (
    <View style={[styles.hero, { backgroundColor: theme.actionPrimary, borderColor: theme.actionPrimary }]}>
      <View style={styles.heroTopline}>
        <View style={[styles.livePill, { backgroundColor: session.inProgress ? theme.warning : theme.primaryAlpha20 }]}>
          <View style={[styles.liveDot, { backgroundColor: session.inProgress ? theme.textOnPrimary : theme.secondaryLight }]} />
          <Text style={[styles.liveText, { color: theme.textOnPrimary, fontFamily: theme.fontSansSemiBold }]}>{session.inProgress ? 'EN CURSO' : 'PRÓXIMA CITA'}</Text>
        </View>
        <Text style={[styles.heroOrigin, { color: theme.landingCtaMutedText, fontFamily: theme.fontSansSemiBold }]}>{session.origin === 'CLINIC' ? session.clinicName ?? 'Clínica' : 'Consulta particular'}</Text>
      </View>
      <View style={styles.heroBody}>
        <View style={styles.heroTimeBlock}>
          <Text style={[styles.heroTime, { color: theme.textOnPrimary, fontFamily: theme.fontDisplay }]}>{formatTime(session.startsAt)}</Text>
          <Text style={[styles.heroDuration, { color: theme.landingCtaMutedText, fontFamily: theme.fontSans }]}>{session.durationMinutes} min</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroPatientBlock}>
          <Text style={[styles.heroPatient, { color: theme.textOnPrimary, fontFamily: theme.fontDisplay }]} numberOfLines={1}>{session.patient.displayName}</Text>
          <View style={styles.heroMetaRow}>
            <Ionicons name={getTypeIcon(session.type)} size={16} color={theme.landingCtaMutedText} />
            <Text style={[styles.heroMetaLight, { color: theme.landingCtaMutedText, fontFamily: theme.fontSans }]}>{getTypeLabel(session.type)}</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          {session.canJoinVideo ? <Button onPress={() => onJoin(session.id)} loading={joining} size="small" style={styles.lightButton} textStyle={{ color: theme.actionPrimary }}>Unirse</Button> : null}
          <Button onPress={() => onOpen(session.id)} variant="outline" size="small" style={{ borderColor: theme.landingCtaMutedText }} textStyle={{ color: theme.textOnPrimary }}>Ver detalle</Button>
        </View>
      </View>
    </View>
  );
}

export function ActivationHero({ pendingSteps, onProfile, onAvailability }: {
  pendingSteps: number;
  onProfile: () => void;
  onAvailability: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useResponsiveHomeStyles();
  return (
    <View style={[styles.activationHero, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={[styles.activationOrb, { backgroundColor: theme.secondaryMuted }]}><Ionicons name="sparkles-outline" size={26} color={theme.selection} /></View>
      <View style={styles.activationCopy}>
        <Text style={[styles.heroEyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>PREPARA TU ESPACIO</Text>
        <Text style={[styles.activationTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Deja HERA lista para trabajar por ti</Text>
        <Text style={[styles.heroMeta, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Quedan {pendingSteps} pasos reales de perfil, verificación o facturación. Después, configura tu horario base.</Text>
      </View>
      <View style={styles.activationActions}>
        <Button onPress={onProfile} size="small">Continuar activación</Button>
        <Button onPress={onAvailability} variant="ghost" size="small">Disponibilidad</Button>
      </View>
    </View>
  );
}

export function TodayAgenda({ sessions, onOpen, onAgenda }: {
  sessions: ProfessionalHomeSession[];
  onOpen: (id: string) => void;
  onAgenda: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useResponsiveHomeStyles();
  const subtitle = sessions.length === 0
    ? 'Sin citas programadas'
    : sessions.length === 1
      ? '1 cita en orden cronológico'
      : `${sessions.length} citas en orden cronológico`;
  return (
    <SectionCard title="Hoy" subtitle={subtitle} action="Abrir Agenda" onAction={onAgenda}>
      {sessions.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <View style={[styles.emptyLineIcon, { backgroundColor: theme.successLight }]}><Ionicons name="leaf-outline" size={20} color={theme.success} /></View>
          <View style={styles.emptyLineCopy}>
            <Text style={[styles.emptyLineTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Un día sin citas pendientes</Text>
            <Text style={[styles.emptyLineText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Tu resumen semanal y automatizaciones siguen visibles a la derecha.</Text>
          </View>
        </View>
      ) : sessions.map((session, index) => (
        <AnimatedPressable key={session.id} onPress={() => onOpen(session.id)} style={styles.timelineRow} hoverLift={false} pressScale={0.995}>
          <View style={styles.timelineRail}>
            <View style={[styles.timelineDot, { backgroundColor: session.status === 'PENDING' ? theme.warning : theme.primary }]} />
            {index < sessions.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: theme.borderLight }]} /> : null}
          </View>
          <Text style={[styles.timelineTime, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{formatTime(session.startsAt)}</Text>
          <View style={styles.timelineCopy}>
            <Text style={[styles.timelineName, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]} numberOfLines={1}>{session.patient.displayName}</Text>
            <Text style={[styles.timelineMeta, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{session.durationMinutes} min · {getTypeLabel(session.type)} · {session.origin === 'CLINIC' ? 'Clínica' : 'Particular'}</Text>
          </View>
          <StatusPill status={session.status} />
          <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
        </AnimatedPressable>
      ))}
    </SectionCard>
  );
}

export function WeeklyPulse({ data, onNavigate }: {
  data: ProfessionalHomeData;
  onNavigate: (route: 'ProfessionalSessions' | 'ProfessionalAvailability' | 'ProfessionalDashboard') => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useResponsiveHomeStyles();
  const maxSessions = Math.max(1, ...data.week.days.map((day) => day.sessions));
  const hours = Math.round(data.week.bookedMinutes / 6) / 10;
  const enabledAutomation = Object.values(data.automation).filter(Boolean).length;
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return (
    <SectionCard title="Resumen semanal" subtitle={`${formatShortCalendarDate(data.week.startDate)} – ${formatShortCalendarDate(data.week.endDate)} · actividad de agenda`}>
      <View style={styles.pulseStats}>
        <Metric value={String(data.week.totalSessions)} label="sesiones" />
        <Metric value={`${hours} h`} label="reservadas" />
        <Metric value={String(data.week.completedSessions)} label="completadas" />
      </View>
      <View style={styles.weekChart}>
        {data.week.days.map((day, index) => (
          <View key={day.date} style={styles.dayBarColumn}>
            <View style={[styles.dayBarTrack, { backgroundColor: theme.bgMuted }]}>
              <View style={[styles.dayBar, { backgroundColor: day.sessions ? theme.primary : theme.border, height: `${Math.max(day.sessions ? 18 : 4, day.sessions / maxSessions * 100)}%` }]} />
            </View>
            <Text style={[styles.dayLabel, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>{dayLabels[index]}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.pulseInfo, { borderTopColor: theme.borderLight }]}>
        <InfoLine icon="time-outline" label="Días con horario base" value={`${data.availabilityConfiguredDays}/7`} />
        <InfoLine icon="flash-outline" label="Automatizaciones activas" value={`${enabledAutomation}/3`} />
      </View>
      <View style={styles.linkRow}>
        <TextLink label="Agenda" onPress={() => onNavigate('ProfessionalSessions')} />
        <TextLink label="Disponibilidad" onPress={() => onNavigate('ProfessionalAvailability')} />
        <TextLink label="Estadísticas" onPress={() => onNavigate('ProfessionalDashboard')} />
      </View>
    </SectionCard>
  );
}

export function AttentionPanel({
  data,
  profileItems,
  unreadSupport,
  ready,
  onAgenda,
  onBilling,
  onProfile,
  onSupport,
}: {
  data: ProfessionalHomeData;
  profileItems: number;
  unreadSupport: number;
  ready: boolean;
  onAgenda: () => void;
  onBilling: () => void;
  onProfile: () => void;
  onSupport: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useResponsiveHomeStyles();
  const count = data.pendingRequests.total + data.draftInvoices + profileItems + unreadSupport;
  const automation = [
    data.automation.sessionConfirmation && 'confirmación',
    data.automation.invoiceGeneration && 'generación',
    data.automation.invoiceDelivery && 'envío',
  ].filter(Boolean).join(', ');
  return (
    <View style={[styles.attentionCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={styles.attentionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Necesita tu atención</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{count ? `${count} elementos que requieren una decisión` : ready ? 'Sin tareas manuales pendientes' : 'Pendientes sin confirmar'}</Text>
        </View>
        {count === 0 && ready ? <View style={[styles.clearPill, { backgroundColor: theme.successLight }]}><Ionicons name="checkmark-circle" size={16} color={theme.success} /><Text style={[styles.clearText, { color: theme.success, fontFamily: theme.fontSansSemiBold }]}>Todo al día</Text></View> : null}
      </View>
      {count === 0 ? (
        <View style={[styles.automationSummary, { backgroundColor: theme.bgMuted }]}>
          <Ionicons name={ready ? 'flash-outline' : 'sync-outline'} size={18} color={theme.primary} />
          <Text style={[styles.automationText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{ready ? (automation ? `HERA automatiza: ${automation}.` : 'Las automatizaciones están desactivadas; no hay acciones pendientes ahora.') : 'No hemos podido confirmar todos los pendientes. Revisa el aviso superior o vuelve a intentarlo.'}</Text>
        </View>
      ) : (
        <View style={styles.attentionGrid}>
          {data.pendingRequests.total ? <AttentionItem icon="calendar-outline" value={data.pendingRequests.total} title="Solicitudes de cita" action="Revisar" onPress={onAgenda} warning /> : null}
          {data.draftInvoices ? <AttentionItem icon="document-text-outline" value={data.draftInvoices} title="Facturas en borrador" action="Continuar" onPress={onBilling} /> : null}
          {profileItems ? <AttentionItem icon="shield-checkmark-outline" value={profileItems} title="Pasos de activación" action="Completar" onPress={onProfile} warning /> : null}
          {unreadSupport ? <AttentionItem icon="chatbubble-ellipses-outline" value={unreadSupport} title="Respuestas de soporte" action="Ver" onPress={onSupport} /> : null}
        </View>
      )}
    </View>
  );
}

function SectionCard({ title, subtitle, action, onAction, children }: {
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useResponsiveHomeStyles();
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{title}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{subtitle}</Text>
        </View>
        {action && onAction ? <TextLink label={action} onPress={onAction} /> : null}
      </View>
      {children}
    </View>
  );
}

function StatusPill({ status }: { status: ProfessionalHomeSession['status'] }): React.ReactElement {
  const { theme } = useTheme();
  const pending = status === 'PENDING';
  const label = pending ? 'Pendiente' : status === 'CONFIRMED' ? 'Confirmada' : 'Completada';
  const tone = pending ? theme.status.pending : status === 'CONFIRMED' ? theme.status.confirmed : theme.status.completed;
  return <View style={[smallStyles.statusPill, { backgroundColor: tone.bg }]}><Text style={[smallStyles.statusText, { color: tone.text, fontFamily: theme.fontSansSemiBold }]}>{label}</Text></View>;
}

function Metric({ value, label }: { value: string; label: string }): React.ReactElement {
  const { theme } = useTheme();
  return <View style={smallStyles.metric}><Text style={[smallStyles.metricValue, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{value}</Text><Text style={[smallStyles.metricLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{label}</Text></View>;
}

function InfoLine({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }): React.ReactElement {
  const { theme } = useTheme();
  return <View style={smallStyles.infoLine}><Ionicons name={icon} size={16} color={theme.textMuted} /><Text style={[smallStyles.infoLabel, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{label}</Text><Text style={[smallStyles.infoValue, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{value}</Text></View>;
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }): React.ReactElement {
  const { theme } = useTheme();
  return <AnimatedPressable onPress={onPress} hoverLift={false} style={smallStyles.textLink}><Text style={[smallStyles.textLinkLabel, { color: theme.link, fontFamily: theme.fontSansSemiBold }]}>{label}</Text><Ionicons name="arrow-forward" size={13} color={theme.link} /></AnimatedPressable>;
}

function AttentionItem({ icon, value, title, action, onPress, warning = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  title: string;
  action: string;
  onPress: () => void;
  warning?: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[smallStyles.attentionItem, { backgroundColor: warning ? theme.warningBg : theme.bgMuted, borderColor: warning ? theme.warning : theme.borderLight }]} hoverLift={false}>
      <View style={[smallStyles.attentionIcon, { backgroundColor: theme.bgCard }]}><Ionicons name={icon} size={17} color={warning ? theme.warning : theme.primary} /></View>
      <Text style={[smallStyles.attentionTitle, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]} numberOfLines={1}>{title}</Text>
      <View style={[smallStyles.attentionCount, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}><Text style={[smallStyles.attentionValue, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{value}</Text></View>
      <Text style={[smallStyles.attentionAction, { color: theme.link, fontFamily: theme.fontSansSemiBold }]}>{action}</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
    </AnimatedPressable>
  );
}
