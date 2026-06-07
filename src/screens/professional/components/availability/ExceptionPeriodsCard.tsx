import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable, Card } from '../../../../components/common';
import { borderRadius, spacing } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  type AvailabilityExceptionPeriod,
  formatExceptionPeriodDateRange,
  formatExceptionPeriodDayCount,
} from '../../utils/availabilityExceptionRanges';
import {
  getExceptionToneColor,
  getExceptionVisualType,
} from '../../utils/availabilityExceptionTypes';

interface ExceptionPeriodsCardProps {
  periods: AvailabilityExceptionPeriod[];
  onAddPress: () => void;
  onRemovePeriod: (period: AvailabilityExceptionPeriod) => void;
  maxVisiblePeriods?: number;
}

export function ExceptionPeriodsCard({
  periods,
  onAddPress,
  onRemovePeriod,
  maxVisiblePeriods = 5,
}: ExceptionPeriodsCardProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [isDark, theme]);
  const visiblePeriods = periods.slice(0, maxVisiblePeriods);

  return (
    <Card variant="default" padding="large" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconShell, { backgroundColor: theme.warningBg }]}>
          <Ionicons name="calendar-clear-outline" size={18} color={theme.warning} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>Excepciones</Text>
          <Text style={styles.cardCaption}>Bloquea periodos sin tocar la base semanal</Text>
        </View>
      </View>
      {periods.length > 0 ? (
        <View style={styles.exceptionsList}>
          {visiblePeriods.map((period) => {
            const exceptionType = getExceptionVisualType(period.displayReason);
            const exceptionColor = getExceptionToneColor(theme, exceptionType);

            return (
              <View
                key={period.id}
                style={[styles.exceptionItem, { borderLeftColor: exceptionColor }]}
              >
                <View style={styles.exceptionInfo}>
                  <Ionicons name={exceptionType.icon} size={16} color={exceptionColor} />
                  <View style={styles.exceptionText}>
                    <Text style={styles.exceptionDate} numberOfLines={1}>
                      {formatExceptionPeriodDateRange(period)}
                    </Text>
                    <Text style={styles.exceptionReason} numberOfLines={1}>
                      {period.displayReason} · {formatExceptionPeriodDayCount(period.dayCount)}
                    </Text>
                  </View>
                </View>
                <AnimatedPressable
                  onPress={() => onRemovePeriod(period)}
                  style={styles.exceptionRemoveButton}
                  hoverLift={false}
                  pressScale={0.96}
                  accessibilityLabel={`Eliminar bloqueo ${formatExceptionPeriodDateRange(period)}`}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </AnimatedPressable>
              </View>
            );
          })}
          {periods.length > maxVisiblePeriods ? (
            <Text style={styles.moreExceptions}>+{periods.length - maxVisiblePeriods} más…</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyStateBox}>
          <Ionicons name="calendar-outline" size={22} color={theme.textMuted} />
          <Text style={styles.emptyText}>Sin fechas bloqueadas</Text>
        </View>
      )}
      <AnimatedPressable style={styles.addExceptionButton} onPress={onAddPress} hoverLift={false}>
        <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
        <Text style={styles.addExceptionText}>Añadir excepción</Text>
      </AnimatedPressable>
    </Card>
  );
}

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconShell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: theme.fontHeading,
  },
  cardCaption: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
  },
  exceptionsList: {
    gap: spacing.sm,
  },
  exceptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  exceptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  exceptionText: {
    flex: 1,
  },
  exceptionDate: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
  },
  exceptionReason: {
    marginTop: 2,
    fontSize: 12,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
  },
  exceptionRemoveButton: {
    padding: 4,
  },
  moreExceptions: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xs,
    fontFamily: theme.fontSans,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
  },
  emptyText: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    fontFamily: theme.fontSans,
  },
  addExceptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.primary,
    borderStyle: 'dashed',
    backgroundColor: theme.primaryAlpha12,
  },
  addExceptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
    fontFamily: theme.fontSansSemiBold,
  },
});
