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
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { AppointmentDetailSheet } from '../../components/sessions/AppointmentDetailSheet';
import { spacing, typography } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { getErrorMessage } from '../../constants/errors';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { billingService } from '../../services/billingService';
import * as professionalService from '../../services/professionalService';
import { useNavigation, useRoute } from '@react-navigation/native';

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : 'Sin fecha';

const formatSessionDate = (value: string): string =>
  new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const SESSION_TYPE_LABELS: Record<string, string> = {
  VIDEO_CALL: 'Videollamada',
  PHONE_CALL: 'Llamada',
  IN_PERSON: 'Presencial',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const formatConsentStatus = (
  status: clinicService.ClinicPatientConsentStatus,
): string => {
  switch (status) {
    case 'GRANTED':
      return 'Concedido';
    case 'REVOKED':
      return 'Revocado';
    case 'PENDING':
      return 'Pendiente';
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
};

const formatConsentMethod = (
  method: clinicService.ClinicPatientConsentMethod | null,
): string => {
  switch (method) {
    case 'DIGITAL_SIGNATURE':
      return 'Digital HERA';
    case 'CLINIC_ADMIN_ATTESTATION':
      return 'PDF firmado';
    case null:
      return 'Sin método';
    default: {
      const exhaustiveCheck: never = method;
      return exhaustiveCheck;
    }
  }
};

export function ProfessionalClinicPatientDetailScreen(): React.ReactElement {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ProfessionalClinicPatientDetail'>>();
  const { clinicId, clinicPatientId } = route.params;
  const appAlert = useAppAlert();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 820;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const [patient, setPatient] = useState<clinicService.ProfessionalClinicPatientDetail | null>(null);
  const [patientSessions, setPatientSessions] = useState<professionalService.Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<professionalService.ProfessionalSessionDetail | null>(null);
  const [selectedSessionDetailLoading, setSelectedSessionDetailLoading] = useState(false);
  const [selectedSessionDetailError, setSelectedSessionDetailError] = useState('');
  const sessionDetailLoadSeqRef = useRef(0);

  const loadPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const detail = await clinicService.getProfessionalClinicPatient(clinicId, clinicPatientId);
      const sessions = await professionalService.getProfessionalSessions({
        origin: 'CLINIC',
        clinicId,
        clientId: detail.clientId,
      });
      setPatient(detail);
      setPatientSessions(sessions);
    } catch (loadError: unknown) {
      setPatient(null);
      setPatientSessions([]);
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el paciente');
    } finally {
      setLoading(false);
    }
  }, [clinicId, clinicPatientId]);

  const openSessionDetail = useCallback(async (sessionId: string) => {
    const requestSeq = sessionDetailLoadSeqRef.current + 1;
    sessionDetailLoadSeqRef.current = requestSeq;
    setSelectedSessionId(sessionId);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailError('');
    setSelectedSessionDetailLoading(true);

    try {
      const detail = await professionalService.getProfessionalSessionDetail(sessionId);
      if (sessionDetailLoadSeqRef.current !== requestSeq) return;
      setSelectedSessionDetail(detail);
    } catch (detailError: unknown) {
      if (sessionDetailLoadSeqRef.current !== requestSeq) return;
      setSelectedSessionDetailError(detailError instanceof Error
        ? detailError.message
        : 'No se pudo cargar el detalle de la cita');
    } finally {
      if (sessionDetailLoadSeqRef.current === requestSeq) {
        setSelectedSessionDetailLoading(false);
      }
    }
  }, []);

  const closeSessionDetail = useCallback(() => {
    sessionDetailLoadSeqRef.current += 1;
    setSelectedSessionId(null);
    setSelectedSessionDetail(null);
    setSelectedSessionDetailLoading(false);
    setSelectedSessionDetailError('');
  }, []);

  const openSelectedSessionNotes = useCallback(() => {
    const target = selectedSessionDetail?.clinicalTarget;
    if (!target) return;

    closeSessionDetail();
    navigation.navigate('ClientProfile', {
      clientId: target.clientId,
      initialTab: 'clinical',
      clinicalWorkspace: 'sessions',
      focusSessionId: target.sessionId,
    });
  }, [closeSessionDetail, navigation, selectedSessionDetail]);

  const openSelectedSessionPatient = useCallback(() => {
    if (!selectedSessionDetail) return;
    const { clientId } = selectedSessionDetail;
    closeSessionDetail();
    navigation.navigate('ClientProfile', { clientId });
  }, [closeSessionDetail, navigation, selectedSessionDetail]);

  const openSelectedSessionInvoice = useCallback(async () => {
    const invoice = selectedSessionDetail?.invoice;
    if (!invoice) return;

    if (invoice.status === 'DRAFT') {
      closeSessionDetail();
      navigation.navigate('CreateInvoice', { invoiceId: invoice.id });
      return;
    }

    try {
      await billingService.downloadInvoice(invoice.id, invoice.invoiceNumber);
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo abrir la factura'));
    }
  }, [appAlert, closeSessionDetail, navigation, selectedSessionDetail]);

  const joinSelectedSession = useCallback(async () => {
    if (!selectedSessionDetail) return;

    try {
      const meetingData = await professionalService.getMeetingLink(selectedSessionDetail.id);
      if (!meetingData.canJoin) {
        showAppAlert(appAlert, 'Aun no es el momento', meetingData.message);
        return;
      }

      if (!meetingData.meetingLink) {
        showAppAlert(appAlert, 'Enlace no disponible', 'No se pudo preparar el enlace de la videollamada.');
        return;
      }

      const supported = await Linking.canOpenURL(meetingData.meetingLink);
      if (!supported) {
        showAppAlert(appAlert, 'No se pudo abrir', 'Tu dispositivo no pudo abrir el enlace de la videollamada.');
        return;
      }

      await Linking.openURL(meetingData.meetingLink);
    } catch {
      showAppAlert(appAlert, 'Error', 'Hubo un problema al unirte a la sesion');
    }
  }, [appAlert, selectedSessionDetail]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="medium"
          onPress={() => navigation.navigate('ProfessionalClients')}
          icon={<Ionicons name="arrow-back-outline" size={18} color={theme.primary} />}
        >
          Volver
        </Button>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Paciente de clínica</Text>
          <Text style={styles.title}>{patient?.displayName ?? 'Ficha limitada'}</Text>
          <Text style={styles.subtitle}>
            Esta vista muestra solo la información necesaria para la asignación clínica.
          </Text>
        </View>
      </View>

      {loading ? (
        <Card variant="outlined" padding="large" style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.stateText}>Cargando paciente...</Text>
        </Card>
      ) : error ? (
        <Card variant="outlined" padding="large" style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.warning} />
          <Text style={styles.stateTitle}>No se pudo cargar la ficha</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button variant="outline" size="medium" onPress={loadPatient}>
            Reintentar
          </Button>
        </Card>
      ) : patient ? (
        <View style={styles.grid}>
          <Card variant="default" padding="large" style={styles.mainCard}>
            <View style={styles.patientHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{patient.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.patientHeaderCopy}>
                <Text style={styles.patientName}>{patient.displayName}</Text>
                <Text style={styles.patientMeta}>{patient.clinic.name}</Text>
              </View>
            </View>

            <View style={styles.rows}>
              <InfoRow label="Email" value={patient.email ?? 'Sin email'} />
              <InfoRow label="Teléfono" value={patient.phone ?? 'Sin teléfono'} />
              <InfoRow label="Estado" value={patient.status === 'ACTIVE' ? 'Activo' : 'Archivado'} />
              <InfoRow label="Alta en clínica" value={formatDate(patient.createdAt)} />
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-clear-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Citas asignadas</Text>
            </View>
            {patientSessions.length > 0 ? (
              <View style={styles.sessionList}>
                {patientSessions.map((session) => (
                  <AnimatedPressable
                    key={session.id}
                    onPress={() => void openSessionDetail(session.id)}
                    hoverLift={false}
                    pressScale={0.99}
                    style={styles.sessionItem}
                  >
                    <View style={styles.sessionIcon}>
                      <Ionicons name="calendar-outline" size={17} color={theme.primary} />
                    </View>
                    <View style={styles.sessionCopy}>
                      <Text style={styles.sessionTitle}>
                        {formatSessionDate(session.date)}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {SESSION_STATUS_LABELS[session.status] ?? session.status} · {SESSION_TYPE_LABELS[session.type] ?? session.type} · {session.duration} min
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  </AnimatedPressable>
                ))}
              </View>
            ) : (
              <Text style={styles.privacyNote}>No hay citas asignadas visibles para este paciente.</Text>
            )}
          </Card>

          <Card variant="outlined" padding="large" style={styles.sideCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Contexto asistencial</Text>
            </View>
            <View style={styles.rows}>
              <InfoRow label="Clínica" value={patient.clinic.name} />
              <InfoRow label="Responsable" value={patient.responsible.displayName} />
              <InfoRow
                label="Título"
                value={patient.responsible.professionalTitle ?? 'Sin título informado'}
              />
              <InfoRow label="Asignado desde" value={formatDate(patient.assignment.startedAt)} />
              <InfoRow label="Motivo" value={patient.assignment.reason ?? 'Sin motivo registrado'} />
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Consentimiento</Text>
            </View>
            <View style={styles.rows}>
              <InfoRow label="Estado" value={formatConsentStatus(patient.consent.status)} />
              <InfoRow label="Método" value={formatConsentMethod(patient.consent.method)} />
              <InfoRow label="Solicitado" value={formatDate(patient.consent.requestedAt)} />
              <InfoRow label="Concedido" value={formatDate(patient.consent.grantedAt)} />
              <InfoRow label="Versión" value={patient.consent.version ?? 'Sin versión'} />
            </View>
            <Text style={styles.privacyNote}>
              Esta vista no incluye documentos, eventos, historia clínica, sesiones ni facturación.
            </Text>
          </Card>
        </View>
      ) : null}
      <AppointmentDetailSheet
        visible={Boolean(selectedSessionId)}
        mode="professional"
        professionalSession={selectedSessionDetail}
        loading={selectedSessionDetailLoading}
        error={selectedSessionDetailError}
        onClose={closeSessionDetail}
        onRetry={selectedSessionId ? () => void openSessionDetail(selectedSessionId) : undefined}
        onOpenPatient={selectedSessionDetail ? openSelectedSessionPatient : undefined}
        onOpenNotes={selectedSessionDetail?.clinicalTarget ? openSelectedSessionNotes : undefined}
        onOpenInvoice={selectedSessionDetail?.status === 'COMPLETED' && selectedSessionDetail.invoice
          ? () => void openSelectedSessionInvoice()
          : undefined}
        onJoinVideo={selectedSessionDetail?.actions?.canJoinVideo ? () => {
          void joinSelectedSession();
        } : undefined}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createInfoRowStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      width: '100%',
      maxWidth: 1180,
      alignSelf: 'center',
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    headerCopy: {
      gap: spacing.xs,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansBold,
      fontSize: 12,
      lineHeight: 17,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: typography.fontSizes.xxxxl,
      lineHeight: 42,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 15,
      lineHeight: 22,
    },
    grid: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.lg,
      alignItems: 'flex-start',
    },
    mainCard: {
      flex: isCompact ? undefined : 1,
      width: '100%',
      gap: spacing.lg,
    },
    sideCard: {
      width: '100%',
      maxWidth: isCompact ? undefined : 420,
      gap: spacing.md,
    },
    patientHeader: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    avatarText: {
      color: theme.primary,
      fontFamily: theme.fontSansBold,
      fontSize: 22,
      lineHeight: 28,
    },
    patientHeaderCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    patientName: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 21,
      lineHeight: 28,
    },
    patientMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 17,
      lineHeight: 23,
    },
    rows: {
      gap: spacing.xs,
    },
    sessionList: {
      gap: spacing.sm,
    },
    sessionItem: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.md,
    },
    sessionIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    sessionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    sessionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 14,
      lineHeight: 20,
    },
    sessionMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    privacyNote: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    stateCard: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
  });

const createInfoRowStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingVertical: spacing.sm,
    },
    label: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    value: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'right',
    },
  });

export default ProfessionalClinicPatientDetailScreen;
