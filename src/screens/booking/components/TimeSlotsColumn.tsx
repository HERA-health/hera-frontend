import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { TimeSlot } from '../../../services/sessionsService';

interface TimeSlotsColumnProps {
  selectedDate: string | null;
  availableSlots: TimeSlot[];
  selectedTime: string | null;
  onTimeSelect: (slot: TimeSlot) => void;
  loading?: boolean;
}

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('es-ES', {
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
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isCompact), [theme, isDark, isCompact]);

  const slotGroups = useMemo(() => {
    const groups = [
      { key: 'morning', label: 'Manana', icon: 'sunny-outline' as const, slots: [] as TimeSlot[] },
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

  const renderEmpty = (icon: keyof typeof Ionicons.glyphMap, title: string, description: string) => (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={34} color={theme.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );

  if (!selectedDate) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Horarios disponibles</Text>
        <Text style={styles.subtitle}>
          Selecciona primero una fecha para desbloquear las horas.
        </Text>
        {renderEmpty(
          'calendar-clear-outline',
          'Elige una fecha',
          'Cuando marques un dia, te mostraremos las franjas disponibles al momento.',
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Horarios disponibles</Text>
        <Text style={styles.subtitle}>{formatDate(selectedDate)}</Text>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.emptyTitle}>Cargando horarios</Text>
          <Text style={styles.emptyDescription}>Estamos consultando la agenda del especialista.</Text>
        </View>
      </View>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Horarios disponibles</Text>
        <Text style={styles.subtitle}>{formatDate(selectedDate)}</Text>
        {renderEmpty(
          'sad-outline',
          'No hay horas libres',
          'Prueba con otra fecha para ver mas opciones.',
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Horarios disponibles</Text>
      <Text style={styles.subtitle}>{formatDate(selectedDate)}</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {slotGroups.map((group) => (
          <View key={group.key} style={styles.slotGroup}>
            <View style={styles.slotGroupHeader}>
              <View style={styles.slotGroupTitleWrap}>
                <Ionicons name={group.icon} size={14} color={theme.secondaryDark} />
                <Text style={styles.slotGroupTitle}>{group.label}</Text>
              </View>
              <Text style={styles.slotGroupCount}>{group.slots.length}</Text>
            </View>

            <View style={styles.slotsGrid}>
              {group.slots.map((slot) => {
                const selected = selectedTime === slot.startTime;
                return (
                  <AnimatedPressable
                    key={slot.startTime}
                    onPress={() => onTimeSelect(slot)}
                    style={[styles.slotButton, selected ? styles.slotButtonSelected : null]}
                  >
                    <Text style={[styles.slotButtonText, selected ? styles.slotButtonTextSelected : null]}>
                      {slot.startTime}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={16} color={theme.textOnPrimary} />
                    )}
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
  isCompact: boolean,
) =>
  StyleSheet.create({
    container: {
      flexGrow: isCompact ? 0 : 1,
      flexShrink: 0,
      flexBasis: isCompact ? 'auto' : 0,
      width: '100%',
      minWidth: isCompact ? 0 : 270,
      maxWidth: isCompact ? 9999 : 320,
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
      gap: spacing.sm,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    title: {
      fontSize: 16,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    subtitle: {
      marginTop: -4,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    scrollView: {
      flex: isCompact ? 0 : 1,
    },
    scrollContent: {
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
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
    },
    slotGroupCount: {
      fontSize: 11,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
    },
    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    slotButton: {
      minWidth: 92,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    slotButtonSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    slotButtonText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
    },
    slotButtonTextSelected: {
      color: theme.textOnPrimary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });

export default TimeSlotsColumn;
