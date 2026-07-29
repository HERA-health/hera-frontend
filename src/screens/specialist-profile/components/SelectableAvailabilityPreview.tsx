import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../../../components/common';
import { borderRadius, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import * as sessionsService from '../../../services/sessionsService';
import type { TimeSlot } from '../../../services/sessionsService';
import { formatMadridDateKey, getMadridDateKey } from '../../../utils/madridTime';
import type { SelectedProfileSlot } from '../types';

interface SelectableAvailabilityPreviewProps {
  specialistId: string;
  nextAvailable?: string | null;
  canBook?: boolean;
  selectedSlot?: SelectedProfileSlot | null;
  onSlotChange: (selection: SelectedProfileSlot | null) => void;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_RANGE_DAYS = 28;
const DATE_SCROLL_STEP = 252;

interface DateScrollMetrics {
  contentWidth: number;
  offsetX: number;
  viewportWidth: number;
}

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
};

const resolveStartDateKey = (nextAvailable?: string | null): string => {
  const todayKey = getMadridDateKey();
  if (!nextAvailable) return todayKey;
  if (DATE_KEY_PATTERN.test(nextAvailable)) {
    return nextAvailable < todayKey ? todayKey : nextAvailable;
  }
  const parsedDate = new Date(nextAvailable);
  if (Number.isNaN(parsedDate.getTime())) return todayKey;
  const resolvedDateKey = getMadridDateKey(parsedDate);
  return resolvedDateKey < todayKey ? todayKey : resolvedDateKey;
};

const getDayLabel = (dateKey: string): string =>
  formatMadridDateKey(dateKey, { weekday: 'short' }).replace('.', '');

const getDayNumberLabel = (dateKey: string): string =>
  formatMadridDateKey(dateKey, { day: 'numeric', month: 'short' });

export const SelectableAvailabilityPreview: React.FC<SelectableAvailabilityPreviewProps> = ({
  specialistId,
  nextAvailable,
  canBook = true,
  selectedSlot,
  onSlotChange,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const startDate = useMemo(() => resolveStartDateKey(nextAvailable), [nextAvailable]);
  const dates = useMemo(
    () => Array.from({ length: DATE_RANGE_DAYS }, (_, index) => addDaysToDateKey(startDate, index)),
    [startDate],
  );
  const dateScrollRef = useRef<ScrollView>(null);
  const previousAvailabilityContextRef = useRef({ specialistId, startDate });
  const [selectedDate, setSelectedDate] = useState(selectedSlot?.date ?? dates[0]);
  const [slotCache, setSlotCache] = useState<Record<string, TimeSlot[]>>({});
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [errorDate, setErrorDate] = useState<string | null>(null);
  const [dateScrollMetrics, setDateScrollMetrics] = useState<DateScrollMetrics>({
    contentWidth: 0,
    offsetX: 0,
    viewportWidth: 0,
  });

  useEffect(() => {
    const previousContext = previousAvailabilityContextRef.current;
    if (
      previousContext.specialistId === specialistId
      && previousContext.startDate === startDate
    ) return;
    previousAvailabilityContextRef.current = { specialistId, startDate };
    setSelectedDate(dates[0]);
    setSlotCache({});
    setErrorDate(null);
    dateScrollRef.current?.scrollTo({ x: 0, animated: false });
    setDateScrollMetrics((current) => ({ ...current, offsetX: 0 }));
    onSlotChange(null);
  }, [dates, onSlotChange, specialistId, startDate]);

  useEffect(() => {
    let active = true;
    const loadSlots = async () => {
      if (!canBook || slotCache[selectedDate]) return;
      setLoadingDate(selectedDate);
      setErrorDate(null);
      try {
        const slots = await sessionsService.getAvailableSlots(specialistId, selectedDate);
        if (!active) return;
        setSlotCache((current) => ({
          ...current,
          [selectedDate]: slots.filter((slot) => slot.available !== false),
        }));
      } catch {
        if (active) {
          setSlotCache((current) => ({ ...current, [selectedDate]: [] }));
          setErrorDate(selectedDate);
        }
      } finally {
        if (active) setLoadingDate(null);
      }
    };
    void loadSlots();
    return () => { active = false; };
  }, [canBook, selectedDate, slotCache, specialistId]);

  if (!canBook) return null;

  const selectedSlots = slotCache[selectedDate] ?? [];
  const loading = loadingDate === selectedDate;
  const hasError = errorDate === selectedDate;
  const maximumDateScroll = Math.max(
    0,
    dateScrollMetrics.contentWidth - dateScrollMetrics.viewportWidth,
  );
  const canScrollDatesBack = dateScrollMetrics.offsetX > 1;
  const canScrollDatesForward = dateScrollMetrics.offsetX < maximumDateScroll - 1;

  const scrollDates = (direction: -1 | 1) => {
    const nextOffset = Math.max(
      0,
      Math.min(maximumDateScroll, dateScrollMetrics.offsetX + direction * DATE_SCROLL_STEP),
    );
    dateScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
    setDateScrollMetrics((current) => ({ ...current, offsetX: nextOffset }));
  };

  const handleDateSelect = (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    if (selectedSlot && selectedSlot.date !== date) onSlotChange(null);
  };

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

      <View style={styles.dateNavigation}>
        <Text style={styles.dateRangeLabel}>Próximos {DATE_RANGE_DAYS} días</Text>
        <View style={styles.dateNavigationActions}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Ver días anteriores"
            accessibilityState={{ disabled: !canScrollDatesBack }}
            disabled={!canScrollDatesBack}
            hoverLift={false}
            pressScale={0.95}
            onPress={() => scrollDates(-1)}
            style={[styles.dateNavButton, !canScrollDatesBack && styles.dateNavButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={17} color={theme.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Ver días siguientes"
            accessibilityState={{ disabled: !canScrollDatesForward }}
            disabled={!canScrollDatesForward}
            hoverLift={false}
            pressScale={0.95}
            onPress={() => scrollDates(1)}
            style={[styles.dateNavButton, !canScrollDatesForward && styles.dateNavButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={17} color={theme.textPrimary} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView
        ref={dateScrollRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
        onContentSizeChange={(contentWidth) => {
          setDateScrollMetrics((current) => ({ ...current, contentWidth }));
        }}
        onLayout={(event) => {
          const viewportWidth = event.nativeEvent.layout.width;
          setDateScrollMetrics((current) => ({ ...current, viewportWidth }));
        }}
        onScroll={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          setDateScrollMetrics((current) => (
            Math.abs(current.offsetX - offsetX) < 1
              ? current
              : { ...current, offsetX }
          ));
        }}
        scrollEventThrottle={32}
      >
        {dates.map((date) => {
          const active = date === selectedDate;
          return (
            <AnimatedPressable
              key={date}
              testID={`availability-date-${date}`}
              accessibilityRole="button"
              accessibilityLabel={`Ver disponibilidad del ${formatMadridDateKey(date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}`}
              accessibilityState={{ selected: active }}
              hoverLift={false}
              pressScale={0.97}
              onPress={() => handleDateSelect(date)}
              style={[styles.dateButton, active && styles.dateButtonSelected]}
            >
              <Text style={[styles.dateWeekday, active && styles.dateTextSelected]}>{getDayLabel(date)}</Text>
              <Text style={[styles.dateDay, active && styles.dateTextSelected]}>{getDayNumberLabel(date)}</Text>
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
              hoverLift={false}
              pressScale={0.98}
              onPress={() => {
                setSlotCache((current) => {
                  const next = { ...current };
                  delete next[selectedDate];
                  return next;
                });
                setErrorDate(null);
              }}
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
            {selectedSlots.map((slot) => {
              const active = selectedSlot?.date === selectedDate
                && selectedSlot.slot.startTime === slot.startTime;
              return (
                <AnimatedPressable
                  key={`${selectedDate}-${slot.startTime}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${active ? 'Quitar' : 'Elegir'} ${slot.startTime}`}
                  accessibilityState={{ selected: active }}
                  hoverLift={false}
                  pressScale={0.97}
                  onPress={() => onSlotChange(active ? null : { date: selectedDate, slot })}
                  style={[styles.slotButton, active && styles.slotButtonSelected]}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'time-outline'}
                    size={15}
                    color={active ? theme.textOnPrimary : theme.primary}
                  />
                  <Text style={[styles.slotText, active && styles.slotTextSelected]}>{slot.startTime}</Text>
                </AnimatedPressable>
              );
            })}
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
  container: { gap: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { fontSize: 18, lineHeight: 23, fontFamily: theme.fontHeading, color: theme.textPrimary },
  subtitle: { marginTop: 2, fontSize: 12, color: theme.textSecondary },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.secondaryAlpha12,
  },
  liveBadgeText: { fontSize: 11, fontFamily: theme.fontSansSemiBold, color: theme.secondaryDark },
  dateNavigation: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dateRangeLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateNavigationActions: { flexDirection: 'row', gap: spacing.xs },
  dateNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
  },
  dateNavButtonDisabled: { opacity: 0.34 },
  dateStrip: { gap: spacing.xs, paddingRight: spacing.xs },
  dateButton: {
    width: 76,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.bgElevated : theme.primaryMuted,
  },
  dateButtonSelected: { borderColor: theme.primary, backgroundColor: theme.primary },
  dateWeekday: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: theme.fontSansSemiBold,
    color: isDark ? theme.textSecondary : theme.textPrimary,
    textTransform: 'capitalize',
  },
  dateDay: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
    textTransform: 'capitalize',
  },
  dateTextSelected: { color: theme.textOnPrimary },
  slotsArea: { minHeight: 78 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  slotButtonSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  slotText: { fontSize: 13, fontFamily: theme.fontSansSemiBold, color: theme.textPrimary },
  slotTextSelected: { color: theme.textOnPrimary },
  stateBox: {
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: isDark ? theme.bgElevated : theme.primaryMuted,
  },
  stateText: {
    fontSize: 12,
    lineHeight: 17,
    color: isDark ? theme.textSecondary : theme.textPrimary,
    textAlign: 'center',
  },
  retryButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.sm },
  retryText: { fontSize: 12, fontFamily: theme.fontSansSemiBold, color: theme.primary },
});

export default SelectableAvailabilityPreview;
