import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/common/Button';
import { spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import { useClinicWorkspace } from './useClinicWorkspace';

type MetricVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helperText: string;
};

const METRIC_VISUALS: Record<clinicService.ClinicDashboardMetricKey, MetricVisual> = {
  activeSpecialists: {
    icon: 'people-outline',
    label: 'Especialistas activos',
    helperText: 'Profesionales activos dentro de esta clínica.',
  },
  activePatients: {
    icon: 'medical-outline',
    label: 'Pacientes activos',
    helperText: 'Pacientes vinculados administrativamente a la clínica.',
  },
  upcomingSessions: {
    icon: 'calendar-outline',
    label: 'Sesiones próximas',
    helperText: 'Citas futuras no canceladas en la agenda de clínica.',
  },
  pendingConsents: {
    icon: 'document-text-outline',
    label: 'Consentimientos pendientes',
    helperText: 'Pacientes activos sin consentimiento administrativo concedido.',
  },
};

interface NextStep {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NEXT_STEPS: NextStep[] = [
  {
    title: 'Equipo',
    text: 'Ya puedes mantener fichas internas de profesionales sin tocar sus perfiles públicos.',
    icon: 'people-outline',
  },
  {
    title: 'Pacientes',
    text: 'Ya puedes crear fichas administrativas separadas de pacientes privados e identidades registradas.',
    icon: 'medical-outline',
  },
  {
    title: 'Agenda y facturación',
    text: 'Sesiones, facturas y reparto económico se incorporarán sobre asignaciones seguras.',
    icon: 'receipt-outline',
  },
];

export function ClinicDashboardScreen({
  navigation,
}: ScreenProps<'ClinicDashboard'>): React.ReactElement {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 820;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const workspace = useClinicWorkspace();
  const mountedRef = useRef(true);
  const dashboardRequestSeq = useRef(0);
  const [dashboard, setDashboard] = useState<clinicService.ClinicDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const loadDashboard = useCallback(async (clinicId: string) => {
    const requestId = dashboardRequestSeq.current + 1;
    dashboardRequestSeq.current = requestId;
    setDashboardLoading(true);
    setDashboardError('');

    try {
      const nextDashboard = await clinicService.getClinicDashboard(clinicId);
      if (!mountedRef.current || dashboardRequestSeq.current !== requestId) return;
      setDashboard(nextDashboard);
    } catch (error: unknown) {
      if (!mountedRef.current || dashboardRequestSeq.current !== requestId) return;
      setDashboard(null);
      setDashboardError(error instanceof Error ? error.message : 'No se pudo cargar el panel');
    } finally {
      if (mountedRef.current && dashboardRequestSeq.current === requestId) {
        setDashboardLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      dashboardRequestSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!workspace.selectedClinicId) {
      dashboardRequestSeq.current += 1;
      setDashboard(null);
      setDashboardError('');
      setDashboardLoading(false);
      return;
    }

    dashboardRequestSeq.current += 1;
    setDashboard(null);
    setDashboardError('');
    setDashboardLoading(false);
    void loadDashboard(workspace.selectedClinicId);
  }, [loadDashboard, workspace.selectedClinicId]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    void workspace.selectClinic(clinicId);
  }, [workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    if (workspace.selectedClinicId) {
      void loadDashboard(workspace.selectedClinicId);
    }
  }, [loadDashboard, workspace]);

  const clinicName = workspace.selectedMembership?.clinic.commercialName;

  return (
    <ClinicWorkspaceScaffold
      title="Panel de clínica"
      contextLabel={clinicName}
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId ? (
        <View style={styles.headerActions}>
          <Button
            variant="outline"
            size="small"
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('ClinicTeam')}
            icon={<Ionicons name="people-outline" size={16} color={theme.primary} />}
          >
            Equipo
          </Button>
          <Button
            variant="outline"
            size="small"
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('ClinicPatients')}
            icon={<Ionicons name="medical-outline" size={16} color={theme.primary} />}
          >
            Pacientes
          </Button>
          <Button
            variant="outline"
            size="small"
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('ClinicAgenda')}
            icon={<Ionicons name="calendar-outline" size={16} color={theme.primary} />}
          >
            Agenda
          </Button>
        </View>
      ) : undefined}
    >
      {!workspace.selectedMembership ? (
        <View style={styles.emptyPanel}>
          <Ionicons name="business-outline" size={30} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>Esta cuenta no tiene clínica vinculada</Text>
          <Text style={styles.emptyText}>
            La creación de clínicas sigue siendo interna. Cuando el equipo vincule una clínica a esta cuenta,
            el panel aparecerá aquí automáticamente.
          </Text>
          <Button
            variant="outline"
            size="medium"
            onPress={() => { void logout(); }}
            icon={<Ionicons name="log-out-outline" size={18} color={theme.primary} />}
          >
            Cerrar sesión
          </Button>
        </View>
      ) : dashboardLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={styles.stateText}>Actualizando métricas de clínica</Text>
        </View>
      ) : dashboardError ? (
        <View style={styles.statePanel}>
          <Ionicons name="alert-circle-outline" size={26} color={theme.warning} />
          <Text style={styles.stateTitle}>No se pudieron cargar las métricas</Text>
          <Text style={styles.stateText}>{dashboardError}</Text>
          <Button variant="outline" size="medium" onPress={handleRetry}>
            Reintentar
          </Button>
        </View>
      ) : dashboard ? (
        <View style={styles.dashboard}>
          <View style={styles.metricsGrid}>
            {dashboard.metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                metric={metric}
                visual={METRIC_VISUALS[metric.key]}
              />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximos pasos</Text>
              <Text style={styles.sectionText}>
                Equipo y pacientes ya son operativos; el resto de módulos aparecerá solo cuando trabaje con datos reales.
              </Text>
            </View>
            <View style={styles.nextGrid}>
              {NEXT_STEPS.map((step) => (
                <View key={step.title} style={styles.nextCard}>
                  <View style={styles.nextIcon}>
                    <Ionicons name={step.icon} size={20} color={theme.primary} />
                  </View>
                  <Text style={styles.nextTitle}>{step.title}</Text>
                  <Text style={styles.nextText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </ClinicWorkspaceScaffold>
  );
}

interface MetricCardProps {
  metric: clinicService.ClinicDashboardMetric;
  visual: MetricVisual;
}

function MetricCard({ metric, visual }: MetricCardProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createMetricStyles(theme), [theme]);
  const helperText = metric.available ? visual.helperText : visual.helperText || metric.helperText;

  return (
    <View style={[styles.card, !metric.available ? styles.cardMuted : null]}>
      <View style={styles.topRow}>
        <View style={styles.iconShell}>
          <Ionicons name={visual.icon} size={20} color={theme.primary} />
        </View>
        {!metric.available ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Próximamente</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.value}>
        {metric.available ? String(metric.value ?? 0) : 'No disponible'}
      </Text>
      <Text style={styles.label}>{visual.label}</Text>
      <Text style={styles.helper}>{helperText}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    dashboard: {
      gap: spacing.xl,
    },
    headerActions: {
      flexDirection: 'row',
      flexWrap: isCompact ? 'wrap' : 'nowrap',
      gap: spacing.xs,
      alignItems: 'center',
      justifyContent: 'flex-end',
      alignSelf: isCompact ? 'stretch' : 'flex-end',
    },
    headerActionButton: {
      minWidth: isCompact ? 0 : 92,
      flexGrow: isCompact ? 1 : 0,
      flexBasis: isCompact ? '31%' : undefined,
      paddingHorizontal: spacing.sm,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    section: {
      gap: spacing.md,
    },
    sectionHeader: {
      gap: spacing.xs,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 22,
      lineHeight: 28,
    },
    sectionText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 680,
    },
    nextGrid: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.md,
    },
    nextCard: {
      flex: 1,
      minHeight: 156,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    nextIcon: {
      width: 38,
      height: 38,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    nextTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 16,
      lineHeight: 22,
    },
    nextText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
    },
    emptyPanel: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
      gap: spacing.md,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
      textAlign: 'center',
    },
    emptyText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 560,
    },
    statePanel: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
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

const createMetricStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexGrow: 1,
      flexBasis: 230,
      minHeight: 184,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardMuted: {
      backgroundColor: theme.bgMuted,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    iconShell: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    badge: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.bgCard,
    },
    badgeText: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 11,
      lineHeight: 14,
    },
    value: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplay,
      fontSize: 34,
      lineHeight: 40,
      marginTop: spacing.xs,
    },
    label: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 21,
    },
    helper: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
  });

export default ClinicDashboardScreen;
