import React, { type ReactNode, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../components/common/Button';
import { DropdownOption, SimpleDropdown } from '../../../components/common/SimpleDropdown';
import { layout, spacing } from '../../../constants/colors';
import { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ClinicMembershipRole, ClinicMembershipSummary } from '../../../services/clinicService';

const ROLE_LABELS: Record<ClinicMembershipRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  SPECIALIST: 'Especialista',
};

interface ClinicWorkspaceScaffoldProps {
  title: string;
  subtitle: string;
  memberships: ClinicMembershipSummary[];
  selectedClinicId: string | null;
  loading: boolean;
  error: string;
  onSelectClinic: (clinicId: string) => void;
  onRetry: () => void;
  children: ReactNode;
  action?: ReactNode;
}

export function ClinicWorkspaceScaffold({
  title,
  subtitle,
  memberships,
  selectedClinicId,
  loading,
  error,
  onSelectClinic,
  onRetry,
  children,
  action,
}: ClinicWorkspaceScaffoldProps): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  const clinicOptions = useMemo<DropdownOption<string>[]>(
    () => memberships.map((membership) => ({
      label: membership.clinic.commercialName,
      value: membership.clinic.id,
      subtitle: ROLE_LABELS[membership.role],
    })),
    [memberships],
  );

  const content = () => {
    if (loading) {
      return (
        <View style={styles.statePanel}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={styles.stateTitle}>Cargando clínica</Text>
          <Text style={styles.stateText}>Estamos preparando el panel con los datos disponibles.</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.statePanel}>
          <Ionicons name="alert-circle-outline" size={26} color={theme.warning} />
          <Text style={styles.stateTitle}>No hemos podido cargar el área de clínica</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button variant="outline" size="medium" onPress={onRetry}>
            Reintentar
          </Button>
        </View>
      );
    }

    return children;
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>HERA Clínicas</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.headerTools}>
            {memberships.length > 1 ? (
              <View style={styles.selector}>
                <Text style={styles.selectorLabel}>Clínica activa</Text>
                <SimpleDropdown
                  options={clinicOptions}
                  value={selectedClinicId}
                  onSelect={onSelectClinic}
                  placeholder="Selecciona clínica"
                  maxHeight={260}
                />
              </View>
            ) : null}
            {action}
          </View>
        </View>

        {content()}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: isCompact ? spacing.lg : spacing.xxl,
      paddingTop: isCompact ? spacing.xxxl + spacing.lg : spacing.xxl,
      paddingBottom: spacing.xxxl,
    },
    shell: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      gap: spacing.xl,
    },
    header: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerCopy: {
      flex: 1,
      maxWidth: 760,
    },
    kicker: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      letterSpacing: 0,
      lineHeight: 17,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontDisplay,
      fontSize: isCompact ? 32 : 42,
      lineHeight: isCompact ? 38 : 50,
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 15,
      lineHeight: 23,
    },
    headerTools: {
      width: isCompact ? '100%' : 320,
      gap: spacing.sm,
      alignItems: 'stretch',
    },
    selector: {
      gap: spacing.xs,
      position: 'relative',
      zIndex: 10,
    },
    selectorLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    statePanel: {
      minHeight: 280,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
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
      maxWidth: 460,
    },
  });
