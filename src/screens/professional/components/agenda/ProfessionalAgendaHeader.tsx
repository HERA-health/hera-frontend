import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../../components/common';
import { borderRadius, layout, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { AgendaSummary } from './useProfessionalAgendaController';
import { formatSessionTimeRange } from './professionalAgendaUtils';

interface ProfessionalAgendaHeaderProps {
  summary: AgendaSummary;
  summaryAvailable?: boolean;
  nextSession: ProfessionalSession | null;
  autoConfirmSessionRequests: boolean | null;
  loadingClients: boolean;
  isMobile: boolean;
  onConfigureAgenda: () => void;
  onJumpToNextSession: () => void;
  onOpenGoogleCalendar: () => void;
}

export function ProfessionalAgendaHeader({
  summary,
  summaryAvailable = true,
  nextSession,
  autoConfirmSessionRequests,
  loadingClients,
  isMobile,
  onConfigureAgenda,
  onJumpToNextSession,
  onOpenGoogleCalendar,
}: ProfessionalAgendaHeaderProps): React.ReactElement {
  const { theme, isDark } = useTheme();
  const [googleHovered, setGoogleHovered] = useState(false);
  const [googleFocused, setGoogleFocused] = useState(false);
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
        {summaryAvailable ? <Text style={styles.summary} accessibilityLabel={`${summary.today} hoy, ${summary.week} esta semana, ${summary.pending} pendientes`}>
          <Text style={styles.summaryStrong}>{summary.today}</Text> hoy
          <Text style={styles.summaryDivider}> · </Text>
          <Text style={styles.summaryStrong}>{summary.week}</Text> semana
          <Text style={styles.summaryDivider}> · </Text>
          <Text style={[styles.summaryStrong, { color: theme.warningAmber }]}>{summary.pending}</Text> pendientes
        </Text> : <Text style={styles.summary}>Resumen no disponible</Text>}
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

        <Pressable
          onPress={onOpenGoogleCalendar}
          onHoverIn={() => setGoogleHovered(true)}
          onHoverOut={() => setGoogleHovered(false)}
          onFocus={() => setGoogleFocused(true)}
          onBlur={() => setGoogleFocused(false)}
          accessibilityRole="button"
          accessibilityLabel="Configurar Google Calendar"
          accessibilityHint="Abre los ajustes de vinculación de tu calendario"
          style={({ pressed }) => [styles.googleCalendar, {
            backgroundColor: pressed || googleHovered ? (isDark ? '#303134' : '#F0F5FF') : (isDark ? '#202124' : '#FFFFFF'),
            borderColor: googleFocused ? '#4285F4' : (isDark ? '#5F6368' : '#DADCE0'),
            boxShadow: googleFocused ? '0 0 0 3px rgba(66, 133, 244, 0.24)' : '0 1px 2px rgba(60, 64, 67, 0.08)',
          }]}
        >
          <Image source={require('../../../../../assets/google-calendar.png')} style={styles.googleIcon} accessible={false} />
          {!isMobile ? <>
            <Text style={[styles.googleLabel, { color: isDark ? '#E8EAED' : '#3C4043' }]}>Google Calendar</Text>
            <Ionicons name="chevron-forward" size={14} color={isDark ? '#9AA0A6' : '#80868B'} />
          </> : null}
        </Pressable>

        {loadingClients ? (
          <View style={styles.loadingState} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.summary}>Preparando cita…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: Theme, isMobile: boolean) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingLeft: isMobile ? layout.mobileShellLeftInset : spacing.lg,
      paddingVertical: isMobile ? spacing.sm : spacing.xs,
      backgroundColor: theme.bgAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      flexDirection: isMobile ? 'column' : 'row',
      flexWrap: 'wrap',
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
      maxWidth: '100%',
      flexShrink: 1,
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
    googleCalendar: {
      minHeight: isMobile ? 44 : 38,
      minWidth: 44,
      paddingHorizontal: isMobile ? 10 : 12,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      flexShrink: 0,
    },
    googleIcon: { width: 22, height: 22 },
    googleLabel: { fontFamily: theme.fontSansMedium, fontSize: 13 },
    loadingState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
  });
}
