import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { borderRadius, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { TimeSlot } from '../../../services/sessionsService';
import { formatMadridDateKey } from '../../../utils/madridTime';

interface TimeSlotsColumnProps {
  selectedDate: string | null;
  availableSlots: TimeSlot[];
  selectedTime: string | null;
  onTimeSelect: (slot: TimeSlot) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  busy?: boolean;
}

const formatDate = (dateString: string): string =>
  formatMadridDateKey(dateString, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export const TimeSlotsColumn: React.FC<TimeSlotsColumnProps> = ({
  selectedDate,
  availableSlots,
  selectedTime,
  onTimeSelect,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  busy = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );
  const slotGroups = useMemo(() => {
    const groups = [
      { key: 'morning', label: 'Mañana', icon: 'sunny-outline' as const, slots: [] as TimeSlot[] },
      { key: 'afternoon', label: 'Tarde', icon: 'partly-sunny-outline' as const, slots: [] as TimeSlot[] },
      { key: 'evening', label: 'Noche', icon: 'moon-outline' as const, slots: [] as TimeSlot[] },
    ];

    availableSlots.forEach((slot) => {
      const hour = Number(slot.startTime.split(':')[0]);
      if (hour < 12) groups[0].slots.push(slot);
      else if (hour < 18) groups[1].slots.push(slot);
      else groups[2].slots.push(slot);
    });

    return groups.filter((group) => group.slots.length > 0);
  }, [availableSlots]);

  const headingSubtitle = selectedDate
    ? formatDate(selectedDate)
    : 'Selecciona primero una fecha';

  if (loading) {
    return (
      <View
        accessible
        accessibilityLabel="Cargando horarios. Estamos consultando la agenda del profesional."
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true, disabled }}
        style={styles.container}
      >
        <ColumnHeading subtitle={headingSubtitle} />
        <EmptyState
          icon={null}
          title="Cargando horarios"
          description="Estamos consultando la agenda del profesional."
          indicator
        />
      </View>
    );
  }

  if (selectedDate && error) {
    return (
      <View accessibilityState={{ busy, disabled }} style={styles.container}>
        <ColumnHeading subtitle={headingSubtitle} />
        <View accessibilityRole="alert">
          <EmptyState
            icon="cloud-offline-outline"
            title="No hemos podido consultar la agenda"
            description={error}
            action={onRetry}
            actionDisabled={disabled || busy}
          />
        </View>
      </View>
    );
  }

  if (!selectedDate) {
    return (
      <View accessibilityState={{ busy, disabled }} style={styles.container}>
        <ColumnHeading subtitle={headingSubtitle} />
        <EmptyState
          icon="calendar-clear-outline"
          title="Tu horario aparecerá aquí"
          description="Cuando marques un día, te mostraremos las horas disponibles."
        />
      </View>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <View accessibilityState={{ busy, disabled }} style={styles.container}>
        <ColumnHeading subtitle={headingSubtitle} />
        <EmptyState
          icon="calendar-outline"
          title="No hay horas libres"
          description="Prueba con otra fecha para ver más opciones."
        />
      </View>
    );
  }

  return (
    <View accessibilityState={{ busy, disabled }} style={styles.container}>
      <ColumnHeading subtitle={headingSubtitle} />

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Horarios disponibles"
        accessibilityState={{ busy, disabled }}
        style={styles.slotGroups}
      >
        {slotGroups.map((group) => (
          <View key={group.key} style={styles.slotGroup}>
            <View style={styles.slotGroupHeader}>
              <View style={styles.slotGroupTitleWrap}>
                <Ionicons name={group.icon} size={14} color={theme.secondaryDark} />
                <Text style={styles.slotGroupTitle}>{group.label}</Text>
              </View>
              <Text style={styles.slotGroupCount}>
                {group.slots.filter((slot) => slot.available !== false).length}
              </Text>
            </View>

            <View style={styles.slotsGrid}>
              {group.slots.map((slot) => {
                const slotUnavailable = slot.available === false;
                const slotDisabled = disabled || busy || slotUnavailable;
                const selected = !slotUnavailable && selectedTime === slot.startTime;

                return (
                  <AnimatedPressable
                    key={`${slot.startTime}-${slot.endTime}`}
                    onPress={() => onTimeSelect(slot)}
                    disabled={slotDisabled}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      slotUnavailable
                        ? `${slot.startTime}, no disponible`
                        : `Seleccionar las ${slot.startTime}`
                    }
                    accessibilityState={{
                      checked: selected,
                      disabled: slotDisabled,
                    }}
                    style={[
                      styles.slotButton,
                      slotDisabled ? styles.slotButtonDisabled : null,
                      selected ? styles.slotButtonSelected : null,
                    ]}
                  >
                    <View style={styles.slotButtonCopy}>
                      <Text
                        style={[
                          styles.slotButtonText,
                          slotDisabled ? styles.slotButtonTextDisabled : null,
                          selected ? styles.slotButtonTextSelected : null,
                        ]}
                      >
                        {slot.startTime}
                      </Text>
                      {slotUnavailable ? (
                        <Text style={styles.slotUnavailableText}>No disponible</Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark" size={16} color={theme.textOnPrimary} />
                    ) : null}
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const ColumnHeading: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );

  return (
    <View style={styles.heading}>
      <View style={styles.iconShell}>
        <Ionicons name="time-outline" size={17} color={theme.primary} />
      </View>
      <View style={styles.headingCopy}>
        <Text style={styles.title}>Elige una hora</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap | null;
  title: string;
  description: string;
  indicator?: boolean;
  action?: () => void;
  actionDisabled?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  indicator = false,
  action,
  actionDisabled = false,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );

  return (
    <View style={styles.emptyState}>
      {indicator ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : icon ? (
        <Ionicons name={icon} size={32} color={theme.textSecondary} />
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action ? (
        <AnimatedPressable
          onPress={action}
          disabled={actionDisabled}
          accessibilityRole="button"
          accessibilityLabel="Volver a consultar los horarios"
          accessibilityState={{ disabled: actionDisabled }}
          style={styles.retryButton}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.primary} />
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      minWidth: 0,
      gap: spacing.sm,
    },
    heading: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconShell: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.primaryAlpha12,
    },
    headingCopy: {
      flex: 1,
      gap: 1,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 15,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 11,
      lineHeight: 16,
    },
    slotGroups: {
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
    slotGroup: {
      gap: spacing.sm,
    },
    slotGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    slotGroupTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    slotGroupTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
    },
    slotGroupCount: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 10,
    },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    slotButton: {
      width: '31%',
      minWidth: 0,
      maxWidth: 150,
      minHeight: 46,
      flexGrow: 0,
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.textSecondary,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    slotButtonDisabled: {
      backgroundColor: theme.bgMuted,
      opacity: 0.7,
    },
    slotButtonSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    slotButtonCopy: {
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    slotButtonText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
    },
    slotButtonTextDisabled: {
      color: theme.textSecondary,
    },
    slotButtonTextSelected: {
      color: theme.textOnPrimary,
    },
    slotUnavailableText: {
      marginTop: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 9,
      lineHeight: 12,
    },
    emptyState: {
      minHeight: 190,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.borderStrong,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 15,
      textAlign: 'center',
    },
    emptyDescription: {
      maxWidth: 260,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
    },
    retryButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgCard,
    },
    retryButtonText: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
    },
  });

export default TimeSlotsColumn;
