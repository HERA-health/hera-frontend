import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../../components/common';
import { spacing, typography } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { useNavigation, useRoute } from '@react-navigation/native';

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : 'Sin fecha';

export function ProfessionalClinicPatientDetailScreen(): React.ReactElement {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ProfessionalClinicPatientDetail'>>();
  const { clinicId, clinicPatientId } = route.params;
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 820;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const [patient, setPatient] = useState<clinicService.ProfessionalClinicPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const detail = await clinicService.getProfessionalClinicPatient(clinicId, clinicPatientId);
      setPatient(detail);
    } catch (loadError: unknown) {
      setPatient(null);
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el paciente');
    } finally {
      setLoading(false);
    }
  }, [clinicId, clinicPatientId]);

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
            <Text style={styles.privacyNote}>
              La historia clínica, sesiones, consentimientos y facturación no están disponibles en esta vista.
            </Text>
          </Card>
        </View>
      ) : null}
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
    privacyNote: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
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
