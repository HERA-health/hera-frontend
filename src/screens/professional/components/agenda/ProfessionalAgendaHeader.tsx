import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button } from '../../../../components/common';
import { TourTarget } from '../../../../components/onboarding/TourTarget';
import { borderRadius, layout, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { AgendaSummary } from './useProfessionalAgendaController';
import { formatSessionTimeRange } from './professionalAgendaUtils';

interface ProfessionalAgendaHeaderProps {
  summary: AgendaSummary;
  nextSession: ProfessionalSession | null;
  autoConfirmSessionRequests: boolean | null;
  loadingClients: boolean;
  isMobile: boolean;
  onConfigureAgenda: () => void;
  onJumpToNextSession: () => void;
  onCreateSession: () => void;
}

export function ProfessionalAgendaHeader({
  summary,
  nextSession,
  autoConfirmSessionRequests,
  loadingClients,
  isMobile,
  onConfigureAgenda,
  onJumpToNextSession,
  onCreateSession,
}: ProfessionalAgendaHeaderProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isMobile), [isMobile, theme]);
  const modeColor = autoConfirmSessionRequests === null
    ? theme.textSecondary
    : autoConfirmSessionRequests
      ? theme.success
      : theme.warningAmber;
  const modeLabel = autoConfirmSessionRequests === null
    ? 'Configurar agenda'
    : autoConfirmSessionRequests
      ? 'Confirmación automática'
      : 'Confirmación manual';
  const modeIcon: keyof typeof Ionicons.glyphMap = autoConfirmSessionRequests === null
    ? 'settings-outline'
    : autoConfirmSessionRequests
      ? 'flash-outline'
      : 'time-outline';

  return (
    <View style={styles.container}>
      <View style={styles.identityRow}>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.summary} accessibilityLabel={`${summary.today} hoy, ${summary.week} esta semana, ${summary.pending} pendientes`}>
          <Text style={styles.summaryStrong}>{summary.today}</Text> hoy
          <Text style={styles.summaryDivider}> · </Text>
          <Text style={styles.summaryStrong}>{summary.week}</Text> semana
          <Text style={styles.summaryDivider}> · </Text>
          <Text style={[styles.summaryStrong, { color: theme.warningAmber }]}>{summary.pending}</Text> pendientes
        </Text>
      </View>

      <View style={styles.contextActions}>
        {nextSession ? (
          <AnimatedPressable
            onPress={onJumpToNextSession}
            hoverLift={false}
            pressScale={0.98}
            style={styles.nextSession}
            accessibilityLabel={`Próxima en esta vista, ${nextSession.clientName}, ${formatSessionTimeRange(nextSession)}`}
          >
            <Ionicons name="arrow-forward-circle-outline" size={16} color={theme.secondaryDark} />
            <Text style={styles.nextSessionText} numberOfLines={1}>
              Próxima en esta vista · {nextSession.date.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
              })} · {formatSessionTimeRange(nextSession)}
            </Text>
          </AnimatedPressable>
        ) : null}

        <AnimatedPressable
          onPress={onConfigureAgenda}
          style={[
            styles.bookingMode,
            { borderColor: `${modeColor}66`, backgroundColor: `${modeColor}12` },
          ]}
          hoverLift={false}
          pressScale={0.98}
          accessibilityLabel="Configurar modo de confirmación de reservas"
        >
          <Ionicons name={modeIcon} size={15} color={modeColor} />
          <Text style={[styles.bookingModeText, { color: modeColor }]} numberOfLines={1}>
            {modeLabel}
          </Text>
          <Ionicons name="settings-outline" size={13} color={theme.textMuted} />
        </AnimatedPressable>

        <TourTarget id="professional.sessions.new-session" fill style={styles.createTarget}>
          <Button
            variant="primary"
            size="small"
            onPress={onCreateSession}
            loading={loadingClients}
            fullWidth={isMobile}
            icon={<Ionicons name="calendar-outline" size={16} color={theme.textOnPrimary} />}
          >
            Nueva cita
          </Button>
        </TourTarget>
      </View>
    </View>
  );
}

function createStyles(theme: Theme, isMobile: boolean) {
  return StyleSheet.create({
    container: {
      minHeight: isMobile ? undefined : 52,
      paddingHorizontal: spacing.lg,
      paddingLeft: isMobile ? layout.mobileShellLeftInset : spacing.lg,
      paddingVertical: isMobile ? spacing.sm : 7,
      backgroundColor: theme.bgAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    identityRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: isMobile ? 24 : 26,
      lineHeight: isMobile ? 30 : 34,
    },
    summary: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
    },
    summaryStrong: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    summaryDivider: {
      color: theme.borderStrong,
    },
    contextActions: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isMobile ? 'space-between' : 'flex-end',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    nextSession: {
      minHeight: 34,
      maxWidth: isMobile ? '100%' : 270,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: theme.secondaryAlpha12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    nextSessionText: {
      minWidth: 0,
      flexShrink: 1,
      color: theme.secondaryDark,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
    },
    bookingMode: {
      minHeight: 34,
      maxWidth: 220,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    bookingModeText: {
      minWidth: 0,
      flexShrink: 1,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
    },
    createTarget: {
      width: isMobile ? '100%' : undefined,
    },
  });
}
