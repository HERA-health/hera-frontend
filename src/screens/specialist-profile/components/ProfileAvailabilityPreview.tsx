import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common';
import { borderRadius, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import * as sessionsService from '../../../services/sessionsService';
import type { TimeSlot } from '../../../services/sessionsService';
import { formatMadridDateKey, getMadridDateKey } from '../../../utils/madridTime';

interface ProfileAvailabilityPreviewProps {
  specialistId: string;
  nextAvailable?: string | null;
  canBook?: boolean;
  onSlotSelect: (date: string, slot: TimeSlot) => void;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0))
    .toISOString()
    .slice(0, 10);
};

const resolveStartDateKey = (nextAvailable?: string | null): string => {
  const todayKey = getMadridDateKey();

  if (!nextAvailable) {
    return todayKey;
  }

  let resolvedDateKey: string;
  if (DATE_KEY_PATTERN.test(nextAvailable)) {
    resolvedDateKey = nextAvailable;
  } else {
    const parsedDate = new Date(nextAvailable);
    if (Number.isNaN(parsedDate.getTime())) {
      return todayKey;
    }

    resolvedDateKey = getMadridDateKey(parsedDate);
  }

  return resolvedDateKey < todayKey ? todayKey : resolvedDateKey;
};

const getDayLabel = (dateKey: string): string =>
  formatMadridDateKey(dateKey, { weekday: 'short' }).replace('.', '');

const getDayNumberLabel = (dateKey: string): string =>
  formatMadridDateKey(dateKey, { day: 'numeric', month: 'short' });

export const ProfileAvailabilityPreview: React.FC<ProfileAvailabilityPreviewProps> = ({
  specialistId,
  nextAvailable,
  canBook = true,
  onSlotSelect,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const startDate = useMemo(() => resolveStartDateKey(nextAvailable), [nextAvailable]);
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysToDateKey(startDate, index)),
    [startDate],
  );
  const previousStartDateRef = useRef(startDate);

  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [slotCache, setSlotCache] = useState<Record<string, TimeSlot[]>>({});
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [errorDate, setErrorDate] = useState<string | null>(null);

  useEffect(() => {
    if (previousStartDateRef.current === startDate) {
      return;
    }

    previousStartDateRef.current = startDate;
    setSelectedDate(dates[0]);
    setSlotCache({});
    setErrorDate(null);
  }, [dates, startDate]);

  useEffect(() => {
    let active = true;

    const loadSlots = async () => {
      if (!canBook || slotCache[selectedDate]) {
        return;
      }

      setLoadingDate(selectedDate);
      setErrorDate(null);

      try {
        const slots = await sessionsService.getAvailableSlots(specialistId, selectedDate);
        const selectableSlots = slots.filter((slot) => slot.available !== false);

        if (!active) {
          return;
        }

        setSlotCache((current) => ({
          ...current,
          [selectedDate]: selectableSlots,
        }));
      } catch {
        if (active) {
          setSlotCache((current) => ({
            ...current,
            [selectedDate]: [],
          }));
          setErrorDate(selectedDate);
        }
      } finally {
        if (active) {
          setLoadingDate(null);
        }
      }
    };

    void loadSlots();

    return () => {
      active = false;
    };
  }, [canBook, selectedDate, slotCache, specialistId]);

  const selectedSlots = slotCache[selectedDate] ?? [];
  const loading = loadingDate === selectedDate;
  const hasError = errorDate === selectedDate;

  if (!canBook) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Elige tu horario</Text>
          <Text style={styles.subtitle}>Horarios en Europe/Madrid</Text>
        </View>
        <View style={styles.liveBadge}>
          <Ionicons name="flash-outline" size={13} color={theme.secondaryDark} />
          <Text style={styles.liveBadgeText}>Actualizado</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {dates.map((date) => {
          const selected = date === selectedDate;

          return (
            <AnimatedPressable
              key={date}
              onPress={() => setSelectedDate(date)}
              hoverLift={false}
              pressScale={0.97}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.dateButton,
                selected ? styles.dateButtonSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.dateWeekday,
                  selected ? styles.dateWeekdaySelected : null,
                ]}
              >
                {getDayLabel(date)}
              </Text>
              <Text
                style={[
                  styles.dateDay,
                  selected ? styles.dateDaySelected : null,
                ]}
              >
                {getDayNumberLabel(date)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <View style={styles.slotsArea}>
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.stateText}>Consultando horarios</Text>
          </View>
        ) : hasError ? (
          <View style={styles.stateBox}>
            <Ionicons name="cloud-offline-outline" size={18} color={theme.warning} />
            <Text style={styles.stateText}>No pudimos cargar este día.</Text>
            <AnimatedPressable
              onPress={() => {
                setSlotCache((current) => {
                  const nextCache = { ...current };
                  delete nextCache[selectedDate];
                  return nextCache;
                });
                setErrorDate(null);
              }}
              hoverLift={false}
              pressScale={0.98}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </AnimatedPressable>
          </View>
        ) : selectedSlots.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="calendar-clear-outline" size={18} color={theme.textMuted} />
            <Text style={styles.stateText}>No hay horas libres este día.</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {selectedSlots.map((slot) => (
              <AnimatedPressable
                key={`${selectedDate}-${slot.startTime}`}
                onPress={() => onSlotSelect(selectedDate, slot)}
                hoverLift={false}
                pressScale={0.97}
                accessibilityRole="button"
                accessibilityLabel={`Elegir ${slot.startTime}`}
                style={styles.slotButton}
              >
                <Ionicons name="time-outline" size={14} color={theme.primary} />
                <Text style={styles.slotText}>{slot.startTime}</Text>
              </AnimatedPressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) => StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: theme.fontHeading,
    color: theme.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: theme.fontSans,
    color: theme.textSecondary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.secondaryAlpha12,
    borderWidth: 1,
    borderColor: theme.glassBorder,
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: theme.fontSansSemiBold,
    color: theme.secondaryDark,
  },
  dateStrip: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  dateButton: {
    width: 76,
    minHeight: 58,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dateButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  dateWeekday: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textSecondary,
    textTransform: 'capitalize',
  },
  dateWeekdaySelected: {
    color: theme.textOnPrimary,
  },
  dateDay: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
    textTransform: 'capitalize',
  },
  dateDaySelected: {
    color: theme.textOnPrimary,
  },
  slotsArea: {
    minHeight: 78,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotButton: {
    minWidth: 82,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
    backgroundColor: isDark ? theme.bgElevated : theme.primaryAlpha12,
  },
  slotText: {
    fontSize: 13,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
  },
  stateBox: {
    minHeight: 78,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  stateText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: theme.fontSans,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  retryText: {
    fontSize: 12,
    fontFamily: theme.fontSansSemiBold,
    color: theme.primary,
  },
});

export default ProfileAvailabilityPreview;
