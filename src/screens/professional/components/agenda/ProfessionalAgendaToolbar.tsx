import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, SimpleDropdown } from '../../../../components/common';
import { TourTarget } from '../../../../components/onboarding/TourTarget';
import { borderRadius, spacing, typography } from '../../../../constants/colors';
import type { Theme } from '../../../../constants/theme';
import type { SessionViewMode } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import {
  type AgendaOriginFilter,
  capitalizeFirst,
  isToday,
  ORIGIN_FILTER_OPTIONS,
  VIEW_OPTIONS,
} from './professionalAgendaUtils';

interface ProfessionalAgendaToolbarProps {
  viewMode: SessionViewMode;
  selectedDate: Date;
  weekDays: Date[];
  originFilter: AgendaOriginFilter;
  compactOriginFilter: boolean;
  isMobile: boolean;
  onChangeView: (viewMode: SessionViewMode) => void;
  onChangeOrigin: (origin: AgendaOriginFilter) => void;
  onNavigateDate: (direction: number) => void;
  onGoToToday: () => void;
}

export function ProfessionalAgendaToolbar({
  viewMode,
  selectedDate,
  weekDays,
  originFilter,
  compactOriginFilter,
  isMobile,
  onChangeView,
  onChangeOrigin,
  onNavigateDate,
  onGoToToday,
}: ProfessionalAgendaToolbarProps): React.ReactElement {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, isMobile), [isDark, isMobile, theme]);
  const dateTitle = useMemo(() => {
    if (viewMode === 'month') {
      return capitalizeFirst(selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
    }
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
    }
    return capitalizeFirst(selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }));
  }, [selectedDate, viewMode, weekDays]);

  return (
    <View style={styles.container}>
      <TourTarget id="professional.sessions.view-tabs" fill>
        <View style={styles.viewTabs} accessibilityRole="tablist">
          {VIEW_OPTIONS.map((option) => {
            const selected = viewMode === option.value;
            return (
              <AnimatedPressable
                key={option.value}
                onPress={() => onChangeView(option.value)}
                hoverLift={false}
                pressScale={0.98}
                style={selected ? [styles.viewTab, styles.viewTabActive] : styles.viewTab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={option.icon}
                  size={17}
                  color={selected ? theme.textOnPrimary : theme.textSecondary}
                />
                <Text style={selected ? [styles.viewTabText, styles.viewTabTextActive] : styles.viewTabText}>
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </TourTarget>

      {viewMode !== 'list' ? (
        <TourTarget id="professional.sessions.date-controls" fill style={styles.dateTarget}>
          <View style={styles.dateControls}>
            <AnimatedPressable
              onPress={() => onNavigateDate(-1)}
              style={styles.dateNavButton}
              hoverLift={false}
              pressScale={0.98}
              accessibilityLabel="Periodo anterior"
            >
              <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
            </AnimatedPressable>
            <Text style={styles.dateTitle} numberOfLines={1}>{dateTitle}</Text>
            <AnimatedPressable
              onPress={() => onNavigateDate(1)}
              style={styles.dateNavButton}
              hoverLift={false}
              pressScale={0.98}
              accessibilityLabel="Periodo siguiente"
            >
              <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={onGoToToday}
              style={isToday(selectedDate) ? [styles.todayButton, styles.todayButtonActive] : styles.todayButton}
              hoverLift={false}
              pressScale={0.98}
              accessibilityLabel="Ir a hoy"
              accessibilityHint="Vuelve al periodo que contiene la fecha actual"
            >
              <Ionicons name="today-outline" size={15} color={theme.primary} />
              <Text style={styles.todayText}>Hoy</Text>
            </AnimatedPressable>
          </View>
        </TourTarget>
      ) : null}

      <View style={styles.originWrap}>
        {compactOriginFilter ? (
          <SimpleDropdown
            options={ORIGIN_FILTER_OPTIONS}
            value={originFilter}
            onSelect={onChangeOrigin}
            compact
            optionsMinWidth={170}
            optionsAlign="right"
            selectionIndicator="radio"
            highlightSelection={false}
          />
        ) : (
          <View style={styles.originFilters} accessibilityRole="tablist">
            {ORIGIN_FILTER_OPTIONS.map((option) => {
              const selected = originFilter === option.value;
              const color = option.value === 'CLINIC'
                ? theme.primary
                : option.value === 'PRIVATE'
                  ? theme.secondaryDark
                  : theme.textSecondary;
              return (
                <AnimatedPressable
                  key={option.value}
                  onPress={() => onChangeOrigin(option.value)}
                  hoverLift={false}
                  pressScale={0.98}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Mostrar citas: ${option.label}`}
                  style={[styles.originFilter, selected && { backgroundColor: `${color}12` }]}
                >
                  <View style={[styles.originDot, { backgroundColor: color }]} />
                  <Text style={[styles.originText, selected && { color }]}>{option.label}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(theme: Theme, isDark: boolean, isMobile: boolean) {
  return StyleSheet.create({
    container: {
      minHeight: isMobile ? undefined : 48,
      paddingHorizontal: isMobile ? spacing.md : spacing.lg,
      paddingVertical: 5,
      backgroundColor: theme.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      gap: spacing.sm,
      zIndex: 20,
    },
    viewTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      padding: 2,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    viewTab: {
      minHeight: 34,
      paddingHorizontal: isMobile ? spacing.sm : 10,
      borderRadius: borderRadius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    viewTabActive: {
      backgroundColor: theme.primary,
    },
    viewTabText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    viewTabTextActive: {
      color: theme.textOnPrimary,
    },
    dateTarget: {
      minWidth: 0,
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      maxWidth: isMobile ? undefined : 470,
    },
    dateControls: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    dateNavButton: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    dateTitle: {
      minWidth: 0,
      flex: 1,
      color: theme.textPrimary,
      textAlign: 'center',
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.md,
    },
    todayButton: {
      minHeight: 36,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    todayButtonActive: {
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.borderStrong,
    },
    todayText: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
    },
    originWrap: {
      minWidth: 104,
      zIndex: 30,
    },
    originFilters: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    originFilter: {
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    originDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    originText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
  });
}
