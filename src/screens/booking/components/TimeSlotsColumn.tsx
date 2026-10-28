import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { CompactTimeSlotPicker } from '../../../components/common/CompactTimeSlotPicker';
import { borderRadius, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { TimeSlot } from '../../../services/sessionsService';
import { formatMadridDateKey } from '../../../utils/madridTime';

interface TimeSlotsColumnProps {
  availabilityKey?: string;
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
  availabilityKey = '',
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
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(theme, isDark),
    [isDark, theme],
  );
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
      <View accessibilityState={{ busy, disabled }} style={styles.pendingDate}>
        <Ionicons name="time-outline" size={18} color={theme.primary} />
        <Text style={styles.pendingText}>Elige un día para ver los horarios disponibles.</Text>
      </View>
    );
  }

  if (!availableSlots.some(slot => slot.available !== false)) {
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

      <View accessibilityRole="radiogroup" accessibilityLabel="Horarios disponibles">
        <CompactTimeSlotPicker
          columns={width < 768 ? 2 : 3}
          slots={availableSlots}
          selectedTime={selectedTime}
          resetKey={`${availabilityKey}-${selectedDate}-${availableSlots[0]?.endTime}`}
          disabled={disabled || busy}
          onSelect={onTimeSelect}
          renderSlot={(slot) => {
            const selected = selectedTime === slot.startTime;
            return (
              <AnimatedPressable
                key={slot.startTime}
                onPress={() => onTimeSelect(slot)}
                disabled={disabled || busy}
                accessibilityRole="radio"
                accessibilityLabel={`Seleccionar las ${slot.startTime}`}
                accessibilityState={{ checked: selected, disabled: disabled || busy }}
                style={[styles.slotButton, (disabled || busy) && styles.slotButtonDisabled, selected && styles.slotButtonSelected]}
              >
                <Ionicons name="time-outline" size={16} color={selected ? theme.textOnPrimary : theme.primary} accessible={false} />
                <Text style={[styles.slotButtonText, (disabled || busy) && styles.slotButtonTextDisabled, selected && styles.slotButtonTextSelected]}>
                  {slot.startTime}
                </Text>
                {selected && <Ionicons name="checkmark" size={16} color={theme.textOnPrimary} />}
              </AnimatedPressable>
            );
          }}
        />
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
      <View style={styles.headingCopy}>
        <Text style={styles.title}>Horarios disponibles</Text>
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
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyDescription}>{description}</Text>
      </View>
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
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
      width: '100%',
      minWidth: 0,
      gap: spacing.sm,
    },
    heading: {
      minHeight: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    pendingDate: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pendingText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    headingCopy: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: 10,
      rowGap: 2,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 15,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 18,
    },
    slotButton: {
      width: '100%',
      minWidth: 0,
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
      borderColor: theme.borderLight,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgCard,
    },
    slotButtonDisabled: {
      backgroundColor: theme.bgMuted,
      opacity: 0.7,
    },
    slotButtonSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
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
    emptyState: {
      minHeight: 64,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderWidth: 1,

      borderColor: theme.borderStrong,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontHeading,
      fontSize: 15,
      textAlign: 'left',
    },
    emptyDescription: {
      maxWidth: 460,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'left',
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
