import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, Card } from '../../../../components/common';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  type SessionStatusTone,
  formatSessionTimeRange,
  getSessionTypeLabel,
  getStatusLabel,
} from './professionalAgendaUtils';

interface ProfessionalAgendaSessionCardProps {
  session: ProfessionalSession;
  status: SessionStatusTone;
  accentColor: string;
  compact?: boolean;
  actions?: React.ReactNode;
  onOpen: (sessionId: string) => void;
}

export function ProfessionalAgendaSessionCard({
  session,
  status,
  accentColor,
  compact = false,
  actions,
  onOpen,
}: ProfessionalAgendaSessionCardProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isClinicSession = session.origin === 'CLINIC';
  const originColor = isClinicSession ? theme.primary : theme.secondaryDark;
  const originBackground = isClinicSession ? theme.primaryAlpha12 : theme.secondaryAlpha12;
  const originLabel = isClinicSession ? 'Clínica' : 'Particular';

  return (
    <View>
      <Card
        variant="default"
        padding="medium"
        style={[
          compact ? styles.cardCompact : styles.card,
          { borderLeftWidth: 3, borderLeftColor: originColor },
        ]}
      >
        <AnimatedPressable
          onPress={() => onOpen(session.id)}
          hoverLift={false}
          pressScale={0.99}
          style={styles.detailPressable}
          accessibilityLabel={`Ver detalle de cita de ${session.clientName}`}
        >
          <View style={styles.header}>
            <View style={styles.clientBlock}>
              <View style={[styles.avatar, { backgroundColor: originBackground }]}>
                {session.clientAvatar ? (
                  <Image
                    testID={`professional-session-client-avatar-${session.id}`}
                    source={{ uri: session.clientAvatar }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>{session.clientInitial}</Text>
                )}
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{session.clientName}</Text>
                <Text style={styles.clientMeta}>
                  {formatSessionTimeRange(session)} · {session.duration} min · {getSessionTypeLabel(session.type)}
                </Text>
                {isClinicSession && session.clinicContext ? (
                  <Text style={styles.clientMeta} numberOfLines={1}>
                    {session.clinicContext.clinicName}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.pills}>
              <View style={[styles.pill, { backgroundColor: originBackground }]}>
                <View style={[styles.dot, { backgroundColor: originColor }]} />
                <Text style={[styles.pillText, { color: originColor }]}>{originLabel}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: `${accentColor}20` }]}>
                <View style={[styles.dot, { backgroundColor: accentColor }]} />
                <Text style={[styles.pillText, { color: accentColor }]}>{getStatusLabel(status)}</Text>
              </View>
            </View>
          </View>
        </AnimatedPressable>
        {!compact ? actions : null}
      </Card>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: borderRadius.lg,
    },
    cardCompact: {
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
    detailPressable: {
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    clientBlock: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      color: theme.primary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.md,
    },
    clientInfo: {
      minWidth: 0,
      flex: 1,
    },
    clientName: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.md,
    },
    clientMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
    },
    pills: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    pill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    pillText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
    },
  });
}
