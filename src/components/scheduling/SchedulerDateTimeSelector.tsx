import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { borderRadius, spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { normalizeSchedulerTimeInput } from '../../utils/schedulerDateTime';
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from '../common/AnimatedPressable';
import type {
  SchedulerAvailabilityState,
  SchedulerDateTimeValue,
  SchedulerLegendLabels,
  SchedulerOpenPanel,
  SchedulerSlotOption,
  SchedulerSlotState,
  SchedulerTimeChangeSource,
} from './schedulerTypes';
import { SchedulerCalendar } from './SchedulerCalendar';

export interface SchedulerDateTimeSelectorProps {
  value: SchedulerDateTimeValue;
  dateLabel: string;
  minDate: string;
  timeZone: string;
  timeZoneLabel: string;
  slots: readonly SchedulerSlotOption[];
  availabilityState: SchedulerAvailabilityState;
  availabilityError?: string | null;
  openPanel: SchedulerOpenPanel;
  dateError?: string;
  timeError?: string;
  disabled?: boolean;
  allowManualTimeEntry?: boolean;
  legendLabels?: SchedulerLegendLabels;
  legendStates?: readonly SchedulerSlotState[];
  testIDPrefix?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string, source: SchedulerTimeChangeSource) => void;
  onOpenPanelChange: (panel: SchedulerOpenPanel) => void;
  onRetryAvailability?: () => void;
}

const DEFAULT_LEGEND_LABELS: SchedulerLegendLabels = {
  available: 'Disponible',
  unavailable: 'No disponible',
  caution: 'Con aviso',
};

const getLegendColors = (
  state: SchedulerSlotState,
  theme: ReturnType<typeof useTheme>['theme'],
): { border: string; background: string; icon: string } => {
  if (state === 'available') {
    return {
      border: theme.primary,
      background: theme.primaryAlpha12,
      icon: theme.primary,
    };
  }
  if (state === 'caution') {
    return {
      border: theme.warning,
      background: theme.warningBg,
      icon: theme.warning,
    };
  }
  return {
    border: theme.border,
    background: theme.bgMuted,
    icon: theme.textMuted,
  };
};

export function SchedulerDateTimeSelector({
  value,
  dateLabel,
  minDate,
  timeZone,
  timeZoneLabel,
  slots,
  availabilityState,
  availabilityError,
  openPanel,
  dateError,
  timeError,
  disabled = false,
  allowManualTimeEntry = true,
  legendLabels = DEFAULT_LEGEND_LABELS,
  legendStates = ['available', 'unavailable', 'caution'],
  testIDPrefix = 'scheduler',
  onDateChange,
  onTimeChange,
  onOpenPanelChange,
  onRetryAvailability,
}: SchedulerDateTimeSelectorProps): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const dateTriggerRef = useRef<AnimatedPressableHandle>(null);
  const timeTriggerRef = useRef<AnimatedPressableHandle>(null);
  const previousOpenPanelRef = useRef<SchedulerOpenPanel>(null);
  const datePickerOpen = openPanel === 'date';
  const timePickerOpen = openPanel === 'time';
  const loading = availabilityState === 'loading';
  const selectedSlot = slots.find((slot) => slot.startTime === value.time);
  const timeOutsideGrid = Boolean(value.time) && !selectedSlot;
  const selectedUnavailable = selectedSlot ? !selectedSlot.selectable : false;
  const selectedCaution = selectedSlot?.state === 'caution';
  const resolvedTimeError = timeError
    ?? (timeOutsideGrid ? 'Selecciona una franja horaria de la lista' : undefined)
    ?? (selectedUnavailable ? selectedSlot?.message : undefined);

  const markedDates = useMemo(
    () => value.date
      ? {
          [value.date]: {
            selected: true,
            selectedColor: theme.primary,
            selectedTextColor: theme.textOnPrimary,
          },
        }
      : {},
    [theme.primary, theme.textOnPrimary, value.date],
  );
  useEffect(() => {
    const previousPanel = previousOpenPanelRef.current;
    previousOpenPanelRef.current = openPanel;
    if (previousPanel && openPanel === null && Platform.OS === 'web') {
      const trigger = previousPanel === 'date' ? dateTriggerRef.current : timeTriggerRef.current;
      setTimeout(() => trigger?.focus(), 0);
    }
  }, [openPanel]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !openPanel || typeof document === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenPanelChange(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onOpenPanelChange, openPanel]);

  const fieldBorderColor = resolvedTimeError
    ? theme.error
    : selectedCaution
      ? theme.warning
      : theme.border;
  const timeControlColor = resolvedTimeError
    ? theme.error
    : selectedCaution
      ? theme.warning
      : theme.primary;

  return (
    <View style={styles.container}>
      <View style={styles.scheduleRow}>
        <View
          style={[
            styles.scheduleField,
            styles.scheduleDateField,
            compact ? styles.scheduleFieldFull : null,
            datePickerOpen && !compact ? styles.scheduleFieldOpen : null,
          ]}
        >
          <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Fecha</Text>
          <AnimatedPressable
            focusRef={dateTriggerRef}
            testID={`${testIDPrefix}-date-trigger`}
            onPress={() => onOpenPanelChange(datePickerOpen ? null : 'date')}
            disabled={disabled}
            hoverLift={false}
            pressScale={0.98}
            accessibilityLabel="Seleccionar fecha"
            accessibilityHint={`Zona horaria ${timeZoneLabel}`}
            accessibilityState={{ expanded: datePickerOpen, disabled }}
            style={[
              styles.selectorTrigger,
              {
                borderColor: dateError ? theme.error : datePickerOpen ? theme.primary : theme.border,
                backgroundColor: datePickerOpen ? theme.primaryAlpha12 : theme.bgMuted,
              },
            ]}
          >
            <View style={styles.selectorTextWrap}>
              <Text
                style={[styles.selectorPrimaryText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}
                numberOfLines={1}
              >
                {dateLabel}
              </Text>
              <Text style={[styles.selectorSecondaryText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                {value.date}
              </Text>
            </View>
            <Ionicons
              name={datePickerOpen ? 'chevron-up-outline' : 'calendar-outline'}
              size={19}
              color={dateError ? theme.error : theme.primary}
            />
          </AnimatedPressable>
          {datePickerOpen ? (
            <View
              style={[
                styles.dropdownPanel,
                styles.dateDropdownPanel,
                compact ? styles.compactDropdownPanel : null,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.bgElevated,
                  shadowColor: theme.shadowNeutral,
                },
              ]}
            >
              <SchedulerCalendar
                testID={`${testIDPrefix}-date-calendar`}
                current={value.date || minDate}
                minDate={minDate}
                markedDates={markedDates}
                onSelectDate={(date) => {
                  onDateChange(date);
                  onOpenPanelChange(null);
                }}
              />
            </View>
          ) : null}
          {dateError ? (
            <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
              {dateError}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.scheduleField,
            styles.scheduleTimeField,
            compact ? styles.scheduleFieldFull : null,
            timePickerOpen && !compact ? styles.scheduleFieldOpen : null,
          ]}
        >
          <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Hora</Text>
          <View
            accessibilityState={{ busy: loading, disabled }}
            style={[
              styles.selectorTrigger,
              styles.timeSelectorTrigger,
              {
                borderColor: fieldBorderColor,
                backgroundColor: timePickerOpen ? theme.primaryAlpha12 : theme.bgMuted,
              },
            ]}
          >
            {allowManualTimeEntry ? (
              <TextInput
                testID={`${testIDPrefix}-time-input`}
                accessibilityLabel="Hora de la cita"
                accessibilityHint={`Formato HH:MM. Zona horaria ${timeZoneLabel}`}
                value={value.time}
                onChangeText={(nextValue) => onTimeChange(nextValue.trim().slice(0, 5), 'manual')}
                onBlur={() => {
                  const normalized = normalizeSchedulerTimeInput(value.time);
                  if (normalized !== value.time) onTimeChange(normalized, 'manual');
                }}
                onFocus={() => {
                  if (datePickerOpen) onOpenPanelChange(null);
                }}
                onKeyPress={(event) => {
                  if (event.nativeEvent.key === 'Escape' && timePickerOpen) {
                    onOpenPanelChange(null);
                  }
                }}
                editable={!disabled}
                placeholder="HH:MM"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={5}
                style={[
                  styles.timeInput,
                  {
                    color: resolvedTimeError
                      ? theme.error
                      : selectedCaution
                        ? theme.warning
                        : theme.textPrimary,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
              />
            ) : (
              <Text style={[styles.fixedTimeText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                {value.time || 'Selecciona hora'}
              </Text>
            )}
            <AnimatedPressable
              focusRef={timeTriggerRef}
              testID={`${testIDPrefix}-time-trigger`}
              onPress={() => onOpenPanelChange(timePickerOpen ? null : 'time')}
              disabled={disabled}
              hoverLift={false}
              pressScale={0.92}
              accessibilityLabel="Seleccionar hora"
              accessibilityHint={`Zona horaria ${timeZoneLabel}`}
              accessibilityState={{ expanded: timePickerOpen, busy: loading, disabled }}
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: timePickerOpen ? theme.primaryAlpha12 : 'transparent',
                  borderLeftColor: fieldBorderColor,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={timeControlColor} />
              ) : (
                <>
                  <Ionicons name="time-outline" size={17} color={timeControlColor} />
                  <Ionicons
                    name={timePickerOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={13}
                    color={timeControlColor}
                  />
                </>
              )}
            </AnimatedPressable>
          </View>

          {timePickerOpen ? (
            <View
              style={[
                styles.dropdownPanel,
                styles.timeDropdownPanel,
                compact ? styles.compactDropdownPanel : null,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.bgElevated,
                  shadowColor: theme.shadowNeutral,
                },
              ]}
            >
              <View style={[styles.timeLegend, { borderBottomColor: theme.border }]}>
                {legendStates.map((state) => {
                  const colors = getLegendColors(state, theme);
                  return (
                    <View key={state} style={styles.timeLegendItem}>
                      <View
                        style={[
                          styles.timeLegendSample,
                          { borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                      >
                        <Ionicons
                          name={state === 'available'
                            ? 'checkmark-outline'
                            : state === 'caution'
                              ? 'warning-outline'
                              : 'close-outline'}
                          size={state === 'available' ? 9 : 10}
                          color={colors.icon}
                        />
                      </View>
                      <Text style={[styles.timeLegendText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                        {legendLabels[state]}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={Platform.OS === 'web'}
                style={styles.timeOptionsScroll}
                contentContainerStyle={styles.timeOptionsGrid}
              >
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={`Horarios en ${timeZoneLabel}`}
                  style={styles.timeOptionsGridInner}
                >
                  {slots.map((slot) => {
                    const active = value.time === slot.startTime;
                    const caution = slot.state === 'caution';
                    const unavailable = slot.state === 'unavailable';
                    const slotDisabled = disabled || !slot.selectable;
                    return (
                      <AnimatedPressable
                        key={`${slot.startTime}-${slot.endTime}`}
                        testID={`${testIDPrefix}-time-option-${slot.startTime}`}
                        accessibilityRole="radio"
                        accessibilityLabel={`Hora ${slot.startTime}, ${slot.accessibilityStatus}`}
                        accessibilityState={{ checked: active, disabled: slotDisabled }}
                        onPress={() => {
                          onTimeChange(slot.startTime, 'slot');
                          onOpenPanelChange(null);
                        }}
                        disabled={slotDisabled}
                        hoverLift={false}
                        style={[
                          styles.timeOption,
                          {
                            borderColor: active
                              ? theme.primary
                              : caution
                                ? theme.warning
                                : theme.border,
                            backgroundColor: active
                              ? theme.primaryAlpha12
                              : caution
                                ? theme.warningBg
                                : slotDisabled
                                  ? theme.bgMuted
                                  : theme.bgElevated,
                            opacity: unavailable ? 0.46 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            {
                              color: active
                                ? theme.primary
                                : caution
                                  ? theme.warning
                                  : unavailable
                                    ? theme.textMuted
                                    : theme.textSecondary,
                              fontFamily: active ? theme.fontSansSemiBold : theme.fontSans,
                              textDecorationLine: unavailable ? 'line-through' : 'none',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {slot.startTime}
                        </Text>
                        {caution ? <Ionicons name="warning-outline" size={11} color={theme.warning} /> : null}
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {loading ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.helperText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}
            >
              Comprobando disponibilidad…
            </Text>
          ) : null}
          {availabilityState === 'error' && availabilityError ? (
            <View
              testID={`${testIDPrefix}-availability-error`}
              accessibilityRole="alert"
              style={styles.availabilityErrorRow}
            >
              <Text style={[styles.warningText, { color: theme.warning, fontFamily: theme.fontSans }]}>
                {availabilityError}
              </Text>
              {onRetryAvailability ? (
                <AnimatedPressable
                  accessibilityLabel="Reintentar disponibilidad"
                  onPress={onRetryAvailability}
                  disabled={disabled}
                  hoverLift={false}
                  style={[styles.retryButton, { borderColor: theme.warning, backgroundColor: theme.warningBg }]}
                >
                  <Ionicons name="refresh-outline" size={14} color={theme.warning} />
                  <Text style={[styles.retryText, { color: theme.warning, fontFamily: theme.fontSansSemiBold }]}>Reintentar</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : null}
          {selectedCaution && selectedSlot?.message && !timeError ? (
            <Text style={[styles.warningText, { color: theme.warning, fontFamily: theme.fontSans }]}>
              {selectedSlot.message}
            </Text>
          ) : null}
          {resolvedTimeError ? (
            <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
              {resolvedTimeError}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        accessibilityLabel={`Zona horaria ${timeZoneLabel}, ${timeZone}`}
        style={[styles.timeZoneRow, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
      >
        <Ionicons name="globe-outline" size={14} color={theme.textMuted} />
        <Text style={[styles.timeZoneText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          {timeZoneLabel} · {timeZone}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    zIndex: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    zIndex: 20,
  },
  scheduleField: {
    gap: spacing.sm,
    position: 'relative',
  },
  scheduleDateField: {
    flex: 1.5,
    minWidth: 260,
  },
  scheduleTimeField: {
    flex: 0.8,
    minWidth: 160,
  },
  scheduleFieldFull: {
    flexBasis: '100%',
    minWidth: '100%',
  },
  scheduleFieldOpen: {
    zIndex: 1000,
  },
  label: {
    fontSize: 13,
  },
  selectorTrigger: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  selectorPrimaryText: {
    fontSize: 14,
  },
  selectorSecondaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  timeSelectorTrigger: {
    gap: spacing.xs,
    overflow: 'hidden',
    paddingRight: spacing.xs,
  },
  timeInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 34,
    minWidth: 0,
    outlineStyle: 'none' as never,
    padding: 0,
  },
  fixedTimeText: {
    flex: 1,
    fontSize: 15,
  },
  timePickerButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 34,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    width: 44,
  },
  dropdownPanel: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    elevation: 12,
    marginTop: spacing.xs,
    overflow: 'hidden',
    position: 'absolute',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    top: '100%',
    zIndex: 1000,
  },
  dateDropdownPanel: {
    left: 0,
    padding: spacing.xs,
    width: 334,
  },
  timeDropdownPanel: {
    maxHeight: 250,
    right: 0,
    width: 292,
  },
  compactDropdownPanel: {
    left: 0,
    position: 'relative',
    right: undefined,
    top: 0,
    width: '100%',
  },
  timeLegend: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timeLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minWidth: 0,
  },
  timeLegendSample: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    height: 14,
    justifyContent: 'center',
    width: 18,
  },
  timeLegendText: {
    fontSize: 10,
  },
  timeOptionsScroll: {
    flexGrow: 0,
    maxHeight: 210,
  },
  timeOptionsGrid: {
    padding: spacing.sm,
  },
  timeOptionsGridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeOption: {
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    width: '23%',
  },
  timeOptionText: {
    fontSize: 11,
  },
  availabilityErrorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  retryText: {
    fontSize: 11,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
  },
  warningText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
  },
  timeZoneRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  timeZoneText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
