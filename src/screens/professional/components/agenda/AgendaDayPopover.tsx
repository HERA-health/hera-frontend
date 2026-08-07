import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../../components/common';
import { borderRadius, shadows, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { ProfessionalSession } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import { capitalizeFirst, formatSessionTimeRange, getSessionTypeLabel } from './professionalAgendaUtils';

export interface AgendaPopoverAnchor {
  x: number;
  y: number;
}

interface AgendaDayPopoverProps {
  visible: boolean;
  date: Date | null;
  sessions: ProfessionalSession[];
  anchor: AgendaPopoverAnchor | null;
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
}

const POPOVER_WIDTH = 330;
const POPOVER_MAX_HEIGHT = 360;

export function AgendaDayPopover({
  visible,
  date,
  sessions,
  anchor,
  onClose,
  onOpenSession,
}: AgendaDayPopoverProps): React.ReactElement | null {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!visible || !date || !anchor) return null;

  const left = Math.max(spacing.md, Math.min(anchor.x - POPOVER_WIDTH / 2, width - POPOVER_WIDTH - spacing.md));
  const top = Math.max(spacing.md, Math.min(anchor.y + spacing.xs, height - POPOVER_MAX_HEIGHT - spacing.md));
  const orderedSessions = [...sessions].sort((leftSession, rightSession) => (
    leftSession.date.getTime() - rightSession.date.getTime()
  ));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar citas del día">
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.popover, { left, top, width: Math.min(POPOVER_WIDTH, width - spacing.lg) }]}
          accessibilityViewIsModal
        >
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>Citas del día</Text>
              <Text style={styles.title} numberOfLines={1}>
                {capitalizeFirst(date.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }))}
              </Text>
            </View>
            <AnimatedPressable
              onPress={onClose}
              style={styles.closeButton}
              hoverLift={false}
              pressScale={0.96}
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
          <ScrollView style={styles.list} showsVerticalScrollIndicator>
            {orderedSessions.map((session) => {
              const originColor = session.origin === 'CLINIC' ? theme.primary : theme.secondaryDark;
              return (
                <AnimatedPressable
                  key={session.id}
                  onPress={() => {
                    onClose();
                    onOpenSession(session.id);
                  }}
                  hoverLift={false}
                  pressScale={0.98}
                  style={[styles.session, { borderLeftColor: originColor }]}
                  accessibilityLabel={`Abrir cita de ${session.clientName}, ${formatSessionTimeRange(session)}`}
                >
                  <Text style={styles.sessionTime}>{formatSessionTimeRange(session)}</Text>
                  <Text style={styles.sessionName} numberOfLines={1}>{session.clientName}</Text>
                  <Text style={styles.sessionMeta} numberOfLines={1}>
                    {session.duration} min · {getSessionTypeLabel(session.type)} · {session.origin === 'CLINIC' ? 'Clínica' : 'Particular'}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.overlay,
    },
    popover: {
      position: 'absolute',
      maxHeight: POPOVER_MAX_HEIGHT,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgElevated,
      ...shadows.lg,
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    headingCopy: {
      minWidth: 0,
      flex: 1,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: 2,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.md,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.sm,
      backgroundColor: theme.bgMuted,
    },
    list: {
      maxHeight: 278,
    },
    session: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderLeftWidth: 3,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    sessionTime: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
    },
    sessionName: {
      marginTop: 2,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.sm,
    },
    sessionMeta: {
      marginTop: 2,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
  });
}
