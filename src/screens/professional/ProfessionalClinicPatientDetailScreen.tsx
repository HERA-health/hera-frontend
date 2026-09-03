import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { spacing, typography } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getClinicPatient,
  listClinicSessions,
  type ProfessionalClinicPatient,
  type ProfessionalClinicSession,
} from '../../services/clinic/professionalWorkspaceService';

const formatDate = (value?: string | null): string => value
  ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(new Date(value))
  : 'Sin fecha';

const formatDateTime = (value: string): string => new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const consentStatusLabel: Record<ProfessionalClinicPatient['consent']['status'], string> = {
  GRANTED: 'Concedido',
  PENDING: 'Pendiente',
  REVOKED: 'Revocado',
};

const consentMethodLabel: Record<string, string> = {
  DIGITAL_SIGNATURE: 'Digital HERA',
  CLINIC_ADMIN_ATTESTATION: 'PDF firmado',
  EMAIL_LINK_OTP: 'Email verificado',
};

export function ProfessionalClinicPatientDetailScreen(): React.ReactElement {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ProfessionalClinicPatientDetail'>>();
  const { clinicId, clinicPatientId } = route.params;
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const [patient, setPatient] = useState<ProfessionalClinicPatient | null>(null);
  const [sessions, setSessions] = useState<ProfessionalClinicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setPatient(null);
    setSessions([]);
    setLoading(true);
    setError('');
    try {
      const [nextPatient, sessionPage] = await Promise.all([
        getClinicPatient(clinicId, clinicPatientId),
        listClinicSessions(clinicId, { clinicPatientId, page: 1, limit: 30 }),
      ]);
      setPatient(nextPatient);
      setSessions(sessionPage.items);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el paciente.');
    } finally {
      setLoading(false);
    }
  }, [clinicId, clinicPatientId]);

  useEffect(() => { void load(); }, [load]);

  const backToPatients = (): void => {
    navigation.navigate('ProfessionalClinicWorkspace', { clinicId, section: 'patients' });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="medium"
          onPress={backToPatients}
          icon={<Ionicons name="arrow-back-outline" size={18} color={theme.primary} />}
        >
          Pacientes de la clínica
        </Button>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Mi clínica · ficha administrativa</Text>
          <Text style={styles.title}>{patient?.displayName ?? 'Paciente asignado'}</Text>
          <Text style={styles.subtitle}>Contacto, asignación, consentimiento y citas de esta clínica. Sin acceso a la ficha privada ni a contenido clínico.</Text>
        </View>
      </View>

      {loading ? (
        <Card variant="outlined" padding="large" style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.stateText}>Cargando ficha segura…</Text>
        </Card>
      ) : error ? (
        <Card variant="outlined" padding="large" style={styles.stateCard}>
          <Ionicons name="lock-closed-outline" size={26} color={theme.warning} />
          <Text style={styles.stateTitle}>No se pudo abrir esta ficha</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button variant="outline" onPress={() => { void load(); }}>Reintentar</Button>
          <Button variant="ghost" onPress={backToPatients}>Volver a Pacientes</Button>
        </Card>
      ) : patient ? (
        <View style={styles.grid}>
          <Card variant="default" padding="large" style={styles.mainCard}>
            <View style={styles.patientHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{patient.displayName.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.patientHeaderCopy}>
                <Text style={styles.patientName}>{patient.displayName}</Text>
                <Text style={styles.patientMeta}>{patient.clinic.name}</Text>
              </View>
            </View>
            <View style={styles.rows}>
              <InfoRow label="Email" value={patient.email ?? 'Sin email disponible'} />
              <InfoRow label="Teléfono" value={patient.phone ?? 'Sin teléfono disponible'} />
              <InfoRow label="Estado" value={patient.status === 'ACTIVE' ? 'Activo' : 'Archivado'} />
            </View>
            <View style={styles.divider} />
            <View style={styles.sectionHeader}><Ionicons name="calendar-clear-outline" size={20} color={theme.primary} /><Text style={styles.sectionTitle}>Citas de esta clínica</Text></View>
            {sessions.length === 0 ? <Text style={styles.privacyNote}>No hay citas visibles para esta asignación.</Text> : (
              <View style={styles.sessionList}>
                {sessions.map((session) => (
                  <AnimatedPressable
                    key={session.id}
                    onPress={() => navigation.navigate('ProfessionalClinicWorkspace', { clinicId, section: 'agenda', focusId: session.id })}
                    style={styles.sessionItem}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir cita del ${formatDateTime(session.schedule.startsAt)}`}
                  >
                    <View style={styles.sessionIcon}><Ionicons name="calendar-outline" size={17} color={theme.primary} /></View>
                    <View style={styles.sessionCopy}>
                      <Text style={styles.sessionTitle}>{formatDateTime(session.schedule.startsAt)}</Text>
                      <Text style={styles.sessionMeta}>{session.service.name} · {session.schedule.durationMinutes} min · {session.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
                  </AnimatedPressable>
                ))}
              </View>
            )}
          </Card>

          <Card variant="outlined" padding="large" style={styles.sideCard}>
            <View style={styles.sectionHeader}><Ionicons name="people-outline" size={20} color={theme.primary} /><Text style={styles.sectionTitle}>Asignación</Text></View>
            <View style={styles.rows}>
              <InfoRow label="Responsable" value={patient.responsible.displayName} />
              <InfoRow label="Título" value={patient.responsible.professionalTitle ?? 'Sin título informado'} />
              <InfoRow label="Desde" value={formatDate(patient.assignment.startedAt)} />
              <InfoRow label="Motivo administrativo" value={patient.assignment.reason ?? 'Sin motivo registrado'} />
            </View>
            <View style={styles.divider} />
            <View style={styles.sectionHeader}><Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} /><Text style={styles.sectionTitle}>Consentimiento</Text></View>
            <View style={styles.rows}>
              <InfoRow label="Estado" value={consentStatusLabel[patient.consent.status]} />
              <InfoRow label="Método" value={patient.consent.method ? consentMethodLabel[patient.consent.method] ?? 'Método registrado' : 'Sin método'} />
              <InfoRow label="Solicitado" value={formatDate(patient.consent.requestedAt)} />
              <InfoRow label="Concedido" value={formatDate(patient.consent.grantedAt)} />
            </View>
            <View style={styles.lockNotice}><Ionicons name="lock-closed-outline" size={17} color={theme.textMuted} /><Text style={styles.privacyNote}>Historia, notas, documentos y facturación no se exponen en esta ficha.</Text></View>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={[stylesBase.infoRow, { borderBottomColor: theme.borderLight }]}>
      <Text style={[stylesBase.infoLabel, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>{label}</Text>
      <Text style={[stylesBase.infoValue, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{value}</Text>
    </View>
  );
}

const stylesBase = StyleSheet.create({
  infoRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: 1, paddingVertical: spacing.sm },
  infoLabel: { fontSize: 12, lineHeight: 17 },
  infoValue: { flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'right' },
});

const createStyles = (theme: Theme, compact: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { gap: spacing.md, alignItems: 'flex-start' },
  headerCopy: { gap: spacing.xs },
  eyebrow: { color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 11, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: typography.fontSizes.xxxxl, lineHeight: 42 },
  subtitle: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 15, lineHeight: 22, maxWidth: 760 },
  grid: { flexDirection: compact ? 'column' : 'row', gap: spacing.lg, alignItems: 'flex-start' },
  mainCard: { flex: compact ? undefined : 1, width: '100%', gap: spacing.lg },
  sideCard: { width: '100%', maxWidth: compact ? undefined : 420, gap: spacing.md },
  patientHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primaryAlpha12, borderWidth: 1, borderColor: theme.borderLight },
  avatarText: { color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 22 },
  patientHeaderCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  patientName: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 21, lineHeight: 28 },
  patientMeta: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14 },
  rows: { gap: spacing.xs },
  divider: { height: 1, backgroundColor: theme.borderLight },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 17, lineHeight: 23 },
  sessionList: { gap: spacing.sm },
  sessionItem: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 14, backgroundColor: theme.bgMuted, padding: spacing.md },
  sessionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primaryAlpha12 },
  sessionCopy: { flex: 1, minWidth: 0, gap: 2 },
  sessionTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 14 },
  sessionMeta: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 17 },
  privacyNote: { flex: 1, color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 19 },
  lockNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: 12, padding: spacing.md, backgroundColor: theme.bgMuted },
  stateCard: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  stateTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 18, textAlign: 'center' },
  stateText: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});

export default ProfessionalClinicPatientDetailScreen;
