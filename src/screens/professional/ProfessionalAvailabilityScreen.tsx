import { navigateProfessionalSection } from '../../navigation/professionalNavigation';
import { useFocusEffect } from '@react-navigation/native';
import { useFocusedRateLimitRecovery } from '../../hooks/useGeneralRateLimit';
import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, layout, shadows, spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as availabilityService from '../../services/availabilityService';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { TourTarget } from '../../components/onboarding/TourTarget';
import {
  useProfessionalTourAutoStart,
  useProfessionalTourStepPreparation,
} from '../../components/onboarding/professionalTourContext';
import { useProfessionalTourScrollPreparation } from '../../components/onboarding/useProfessionalTourScrollPreparation';
import {
  type AvailabilityExceptionPeriod,
  formatExceptionPeriodDateRange,
  getDateKeysInRange,
  groupAvailabilityExceptionPeriods,
  getTodayDateKey,
  sortAvailabilityExceptionPeriodsForSidebar,
} from './utils/availabilityExceptionRanges';
import {
  AVAILABILITY_EXCEPTION_TYPES,
  type AvailabilityExceptionTypeId,
} from './utils/availabilityExceptionTypes';
import { ExceptionPeriodsCard } from './components/availability/ExceptionPeriodsCard';
import { ExceptionRangeModal } from './components/availability/ExceptionRangeModal';
import { useExceptionRangeDraft } from './components/availability/useExceptionRangeDraft';

type Props = ScreenProps<'ProfessionalAvailability'>;
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
interface DayConfig { name: DayOfWeek; label: string; shortLabel: string; }
interface TimeSlot { hour: number; minute: number; label: string; }
interface SlotState { available: boolean; isBreak: boolean; }
type DaySlots = Record<string, SlotState>;
type WeeklySlots = Record<DayOfWeek, DaySlots>;
type EnabledDays = Record<DayOfWeek, boolean>;
type CalendarMarkedDates = Record<string, {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  color?: string;
  textColor?: string;
  startingDay?: boolean;
  endingDay?: boolean;
}>;
type QuickPresetId = 'morning' | 'afternoon' | 'full';
interface TimeRange { start: string; end: string; }
interface QuickPreset {
  id: QuickPresetId;
  label: string;
  description: string;
  ranges: TimeRange[];
  icon: keyof typeof Ionicons.glyphMap;
}
const DAYS: DayConfig[] = [
  { name: 'monday', label: 'Lunes', shortLabel: 'Lun' },
  { name: 'tuesday', label: 'Martes', shortLabel: 'Mar' },
  { name: 'wednesday', label: 'Miércoles', shortLabel: 'Mié' },
  { name: 'thursday', label: 'Jueves', shortLabel: 'Jue' },
  { name: 'friday', label: 'Viernes', shortLabel: 'Vie' },
  { name: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
  { name: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
];

const GRID_ROW_HEIGHT = 22;
const GRID_ROW_GAP = 1;
const GRID_HOUR_HEIGHT = 2 * (GRID_ROW_HEIGHT + GRID_ROW_GAP);
const GRID_INITIAL_HOUR = 7;
const GRID_VISIBLE_HOURS = 16;

const TIME_SLOTS: TimeSlot[] = [];
for (let hour = 0; hour < 24; hour += 1) {
  TIME_SLOTS.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
  TIME_SLOTS.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'morning', label: 'Mañana', description: 'Inicio temprano', ranges: [{ start: '08:00', end: '14:00' }], icon: 'sunny-outline' },
  { id: 'afternoon', label: 'Tarde', description: 'Bloque vespertino', ranges: [{ start: '14:00', end: '20:00' }], icon: 'partly-sunny-outline' },
  {
    id: 'full',
    label: 'Completa',
    description: 'Con pausa 14-16 h',
    ranges: [
      { start: '08:00', end: '14:00' },
      { start: '16:00', end: '20:00' },
    ],
    icon: 'calendar-outline',
  },
];

const BUFFER_OPTIONS = [
  { value: 0, label: 'Sin descanso' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

const formatCurrency = (amount: number): string =>
  amount.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

const createEmptyDaySlots = (): DaySlots => {
  const slots: DaySlots = {};
  TIME_SLOTS.forEach((slot) => { slots[slot.label] = { available: false, isBreak: false }; });
  return slots;
};

const createEmptyWeeklySlots = (): WeeklySlots => ({
  monday: createEmptyDaySlots(),
  tuesday: createEmptyDaySlots(),
  wednesday: createEmptyDaySlots(),
  thursday: createEmptyDaySlots(),
  friday: createEmptyDaySlots(),
  saturday: createEmptyDaySlots(),
  sunday: createEmptyDaySlots(),
});

const createDefaultEnabledDays = (): EnabledDays => ({
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
});

const isValidTimeValue = (time: unknown): time is string => (
  typeof time === 'string' && /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)
);

const isValidTimeRange = (range: Partial<TimeRange> | null | undefined): range is TimeRange => (
  isValidTimeValue(range?.start) && (range.end === '24:00' || isValidTimeValue(range.end))
);

const getTimeMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const formatPresetHour = (time: string): string => {
  if (time !== '24:00' && !isValidTimeValue(time)) return '';
  const [hour, minute] = time.split(':');
  return minute === '00' ? String(Number(hour)) : time;
};

const formatCompactTimeRange = (range: TimeRange): string => (
  isValidTimeRange(range) ? `${formatPresetHour(range.start)}-${formatPresetHour(range.end)}` : ''
);
const formatCompactTimeRanges = (ranges: TimeRange[]): string => (
  ranges.map(formatCompactTimeRange).filter(Boolean).join(' · ')
);
const formatPresetRanges = (ranges: TimeRange[]): string => `${formatCompactTimeRanges(ranges)} h`;
const getDayLabel = (dayName: DayOfWeek): string => DAYS.find((day) => day.name === dayName)?.label ?? dayName;

const createDaySlotsForRanges = (ranges: TimeRange[]): DaySlots => {
  const daySlots = createEmptyDaySlots();

  ranges.forEach((range) => {
    if (!isValidTimeRange(range)) {
      return;
    }

    const startMinutes = getTimeMinutes(range.start);
    const endMinutes = getTimeMinutes(range.end);
    TIME_SLOTS.forEach((slot) => {
      const slotMinutes = slot.hour * 60 + slot.minute;
      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        daySlots[slot.label] = { available: true, isBreak: false };
      }
    });
  });

  return daySlots;
};

const getSlotIndex = (time: string): number => TIME_SLOTS.findIndex((slot) => slot.label === time);

const getAvailableSlotIndices = (daySlots: DaySlots): number[] => (
  TIME_SLOTS.reduce<number[]>((indices, slot, index) => {
    if (daySlots[slot.label]?.available) {
      indices.push(index);
    }
    return indices;
  }, [])
);

const getErrorMessage = (error: unknown, fallback: string): string => error instanceof Error ? error.message : fallback;

const getSettledValue = <T,>(
  result: PromiseSettledResult<T>,
  fallbackMessage: string
): T => {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  throw result.reason instanceof Error ? result.reason : new Error(fallbackMessage);
};

const convertScheduleToSlots = (schedule: availabilityService.WeeklySchedule): WeeklySlots => {
  const weeklySlots = createEmptyWeeklySlots();
  DAYS.forEach((day) => {
    const daySchedules = schedule[day.name];
    weeklySlots[day.name] = createDaySlotsForRanges(daySchedules ?? []);
  });
  return weeklySlots;
};

const getSlotEndTime = (slot: TimeSlot): string => {
  const endMinutes = slot.hour * 60 + slot.minute + 30;
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
};

const getRangesFromDaySlots = (daySlots: DaySlots): availabilityService.DaySchedule[] => {
  const availableIndices = getAvailableSlotIndices(daySlots);
  if (availableIndices.length === 0) return [];

  const ranges: availabilityService.DaySchedule[] = [];
  let rangeStartIndex = availableIndices[0];
  let previousIndex = availableIndices[0];

  for (let index = 1; index <= availableIndices.length; index += 1) {
    const currentIndex = availableIndices[index];
    const shouldCloseRange = currentIndex === undefined || currentIndex !== previousIndex + 1;

    if (shouldCloseRange) {
      const firstSlot = TIME_SLOTS[rangeStartIndex];
      const lastSlot = TIME_SLOTS[previousIndex];
      if (firstSlot && lastSlot) {
        ranges.push({ start: firstSlot.label, end: getSlotEndTime(lastSlot) });
      }
      if (currentIndex !== undefined) {
        rangeStartIndex = currentIndex;
      }
    }

    if (currentIndex !== undefined) {
      previousIndex = currentIndex;
    }
  }

  return ranges;
};

const convertSlotsToSchedule = (weeklySlots: WeeklySlots): availabilityService.WeeklySchedule => {
  const schedule: availabilityService.WeeklySchedule = { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null };
  DAYS.forEach((day) => {
    const ranges = getRangesFromDaySlots(weeklySlots[day.name]);

    schedule[day.name] = ranges.length > 0 ? ranges : null;
  });
  return schedule;
};

const createEnabledDaysFromSchedule = (schedule: availabilityService.WeeklySchedule): EnabledDays => {
  const enabledDays = createDefaultEnabledDays();
  DAYS.forEach((day) => {
    enabledDays[day.name] = schedule[day.name] !== null;
  });
  return enabledDays;
};

const calculateWeeklySummary = (weeklySlots: WeeklySlots) => {
  let totalMinutes = 0;
  let activeDays = 0;
  const dailyHours: Record<DayOfWeek, number> = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
  DAYS.forEach((day) => {
    const availableCount = TIME_SLOTS.filter((slot) => weeklySlots[day.name][slot.label]?.available).length;
    const dayMinutes = availableCount * 30;
    dailyHours[day.name] = dayMinutes / 60;
    if (dayMinutes > 0) { totalMinutes += dayMinutes; activeDays += 1; }
  });
  return { totalHours: totalMinutes / 60, activeDays, possibleSessions: Math.floor(totalMinutes / 60), dailyHours };
};

export function ProfessionalAvailabilityScreen({ navigation }: Props) {
  const appAlert = useAppAlert();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const gridRef = useRef<ScrollView>(null);
  const initializedGridRef = useRef<ScrollView | null>(null);
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;
  const useTwoColumns = width >= 1080;
  const availabilityTourScroll = useProfessionalTourScrollPreparation();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlots>(createEmptyWeeklySlots());
  const [enabledDays, setEnabledDays] = useState<EnabledDays>(createDefaultEnabledDays());
  const [exceptions, setExceptions] = useState<availabilityService.AvailabilityException[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedExceptionType, setSelectedExceptionType] =
    useState<AvailabilityExceptionTypeId>('vacation');
  const [savingExceptionRange, setSavingExceptionRange] = useState(false);
  const [bufferTime, setBufferTime] = useState(15);
  const [scheduleRevision, setScheduleRevision] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<QuickPresetId | null>(null);
  const [selectedPresetDays, setSelectedPresetDays] = useState<DayOfWeek[]>([]);
  const [quickPatternsExpanded, setQuickPatternsExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [scheduleResult, exceptionsResult, bufferResult] = await Promise.allSettled([
        availabilityService.getMyWeeklyScheduleSnapshot(),
        availabilityService.getMyExceptions(),
        availabilityService.getMyBufferTime(),
      ]);
      const scheduleSnapshot = getSettledValue(scheduleResult, 'No se pudo cargar el horario semanal');
      const exceptionsData = getSettledValue(exceptionsResult, 'No se pudieron cargar las excepciones');
      const savedBufferTime = getSettledValue(bufferResult, 'No se pudo cargar el descanso entre sesiones');
      setWeeklySlots(convertScheduleToSlots(scheduleSnapshot.schedule));
      setEnabledDays(createEnabledDaysFromSchedule(scheduleSnapshot.schedule));
      setScheduleRevision(scheduleSnapshot.scheduleRevision);
      setExceptions(exceptionsData);
      setBufferTime(savedBufferTime);

    } catch (error: unknown) {
      setLoadError(true);
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo cargar la disponibilidad'));
    } finally {
      setLoading(false);
    }
  }, [appAlert]);

  const billingDurationText = 'Duración según la opción reservada';
  const billingDurationHint = 'Gestiona precios y duraciones en Servicios y bonos. Los descansos se aplican a todas las opciones.';
  const selectedPreset = useMemo(
    () => QUICK_PRESETS.find((preset) => preset.id === selectedPresetId),
    [selectedPresetId]
  );
  const selectedPresetDaysSet = useMemo(
    () => new Set<DayOfWeek>(selectedPresetDays),
    [selectedPresetDays]
  );
  const selectedPresetDayLabels = useMemo(
    () => selectedPresetDays.map((dayName) => getDayLabel(dayName)),
    [selectedPresetDays]
  );
  const allPresetDaysSelected = selectedPresetDays.length === DAYS.length;
  const canApplySelectedPreset = selectedPreset !== undefined && selectedPresetDays.length > 0;
  const presetSummaryText = useMemo(() => {
    if (!selectedPreset) {
      return 'Elige un horario para empezar.';
    }

    if (selectedPresetDayLabels.length === 0) {
      return `${selectedPreset.label} (${formatPresetRanges(selectedPreset.ranges)}) -> selecciona días destino.`;
    }

    return `${selectedPreset.label} (${formatPresetRanges(selectedPreset.ranges)}) -> ${selectedPresetDayLabels.join(', ')}`;
  }, [selectedPreset, selectedPresetDayLabels]);
  const exceptionRangeDraft = useExceptionRangeDraft({
    isOpen: showExceptionModal,
    loadImpact: availabilityService.getExceptionRangeImpact,
  });
  const selectedExceptionTypeConfig = useMemo(
    () =>
      AVAILABILITY_EXCEPTION_TYPES.find((type) => type.id === selectedExceptionType)
      ?? AVAILABILITY_EXCEPTION_TYPES[0],
    [selectedExceptionType]
  );
  const selectedExceptionReason = selectedExceptionTypeConfig.label;
  const canAddExceptionRange = exceptionRangeDraft.canSubmit && !savingExceptionRange;

  useEffect(() => { analyticsService.trackScreen('availability'); }, []);
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;
  useFocusEffect(useCallback(() => { if (!hasChangesRef.current) void loadData(); }, [loadData]));
  useFocusedRateLimitRecovery(() => { if (!hasChanges) void loadData(); });
  useProfessionalTourAutoStart(
    'professional_availability_v1',
    !loading && !loadError && !showExceptionModal && !isAppAlertVisible,
  );

  const prepareAvailabilityPresetsStep = useCallback(
    () => {
      setQuickPatternsExpanded(true);
      return availabilityTourScroll.scrollToTop();
    },
    [availabilityTourScroll],
  );
  const prepareAvailabilityGridStep = useCallback(
    () => availabilityTourScroll.prepareTarget('professional.availability.weekly-grid'),
    [availabilityTourScroll],
  );
  const prepareAvailabilitySidebarStep = useCallback(
    () => availabilityTourScroll.prepareTarget('professional.availability.sidebar'),
    [availabilityTourScroll],
  );
  const prepareAvailabilitySaveStep = useCallback(
    () => availabilityTourScroll.scrollToTop(),
    [availabilityTourScroll],
  );

  useProfessionalTourStepPreparation(
    'professional.availability.presets',
    prepareAvailabilityPresetsStep,
  );
  useProfessionalTourStepPreparation(
    'professional.availability.weekly-grid',
    prepareAvailabilityGridStep,
  );
  useProfessionalTourStepPreparation(
    'professional.availability.sidebar',
    prepareAvailabilitySidebarStep,
  );
  useProfessionalTourStepPreparation(
    'professional.availability.save',
    prepareAvailabilitySaveStep,
  );

  const toggleSlot = useCallback((day: DayOfWeek, time: string) => {
    if (!enabledDays[day]) return;
    if (getSlotIndex(time) < 0) return;
    setWeeklySlots((prev) => {
      const daySlots = prev[day];
      const currentSlot = daySlots[time] ?? { available: false, isBreak: false };
      return {
        ...prev,
        [day]: {
          ...daySlots,
          [time]: { available: !currentSlot.available, isBreak: false },
        },
      };
    });
    setHasChanges(true);
  }, [enabledDays]);

  const toggleDayEnabled = useCallback((day: DayOfWeek) => {
    setEnabledDays((prev) => {
      const nextState = { ...prev, [day]: !prev[day] };
      if (!nextState[day]) setWeeklySlots((prevSlots) => ({ ...prevSlots, [day]: createEmptyDaySlots() }));
      return nextState;
    });
    setHasChanges(true);
  }, []);

  const togglePresetDay = useCallback((day: DayOfWeek) => {
    setSelectedPresetDays((prev) => (
      prev.includes(day)
        ? prev.filter((selectedDay) => selectedDay !== day)
        : [...prev, day]
    ));
  }, []);

  const toggleAllPresetDays = useCallback(() => {
    setSelectedPresetDays((prev) => (
      prev.length === DAYS.length ? [] : DAYS.map((day) => day.name)
    ));
  }, []);

  const applySelectedPreset = useCallback(() => {
    if (!selectedPreset || selectedPresetDays.length === 0) return;
    const daysToApply = selectedPresetDays;
    setWeeklySlots((prev) => {
      const nextSlots = { ...prev };
      daysToApply.forEach((day) => {
        nextSlots[day] = createDaySlotsForRanges(selectedPreset.ranges);
      });
      return nextSlots;
    });
    setEnabledDays((prev) => {
      const nextState = { ...prev };
      daysToApply.forEach((day) => { nextState[day] = true; });
      return nextState;
    });
    setHasChanges(true);
  }, [selectedPreset, selectedPresetDays]);

  const openExceptionModal = useCallback(() => {
    exceptionRangeDraft.reset();
    setShowExceptionModal(true);
  }, [exceptionRangeDraft.reset]);

  const closeExceptionModal = useCallback(() => {
    setShowExceptionModal(false);
    setSavingExceptionRange(false);
    exceptionRangeDraft.reset();
  }, [exceptionRangeDraft.reset]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const schedule = convertSlotsToSchedule(weeklySlots);
      const updatedScheduleSnapshot = await availabilityService.updateWeeklySchedule(schedule, scheduleRevision);
      const updatedWeeklySlots = convertScheduleToSlots(updatedScheduleSnapshot.schedule);
      setWeeklySlots(updatedWeeklySlots);
      setEnabledDays(createEnabledDaysFromSchedule(updatedScheduleSnapshot.schedule));
      setScheduleRevision(updatedScheduleSnapshot.scheduleRevision);

      try {
        await availabilityService.updateBufferTime(bufferTime);
      } catch {
        setHasChanges(true);
        showAppAlert(
          appAlert,
          'Guardado parcial',
          'Tu disponibilidad se actualizó, pero no se pudo guardar el descanso entre sesiones. Inténtalo de nuevo.'
        );
        return;
      }

      setHasChanges(false);
      const totalSlots = Object.values(updatedWeeklySlots).reduce((sum, daySlots) => sum + Object.values(daySlots).filter((slot) => slot.available).length, 0);
      analyticsService.track('availability_updated', { slotsCount: totalSlots });
      showAppAlert(appAlert, 'Éxito', 'Disponibilidad actualizada correctamente');
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  }, [appAlert, bufferTime, scheduleRevision, weeklySlots]);

  const handleAddExceptionRange = useCallback(async () => {
    if (!exceptionRangeDraft.selectedRange || exceptionRangeDraft.isTooLong) return;

    try {
      setSavingExceptionRange(true);
      await availabilityService.addExceptionRange(
        exceptionRangeDraft.selectedRange.startDate,
        exceptionRangeDraft.selectedRange.endDate,
        selectedExceptionReason
      );
      await loadData();
      analyticsService.track('availability_exception_range_created', {
        dayCount: exceptionRangeDraft.dayCount,
      });
      closeExceptionModal();
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo bloquear el periodo'));
    } finally {
      setSavingExceptionRange(false);
    }
  }, [
    appAlert,
    closeExceptionModal,
    exceptionRangeDraft.dayCount,
    exceptionRangeDraft.isTooLong,
    exceptionRangeDraft.selectedRange,
    loadData,
    selectedExceptionReason,
  ]);

  const handleRemoveExceptionPeriod = useCallback((period: AvailabilityExceptionPeriod) => {
    const periodDateText = formatExceptionPeriodDateRange(period);
    showAppAlert(
      appAlert,
      'Eliminar periodo',
      `¿Quieres eliminar el bloqueo de ${periodDateText}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await availabilityService.removeExceptionRange(
                period.startDate,
                period.endDate,
                period.deleteReason
              );

              await loadData();
            } catch (error: unknown) {
              showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo eliminar el periodo'));
            }
          },
        },
      ]
    );
  }, [appAlert, loadData]);

  const summary = useMemo(() => calculateWeeklySummary(weeklySlots), [weeklySlots]);
  const weeklyRangeSummary = useMemo(() => {
    const rangesByDay = {} as Record<DayOfWeek, availabilityService.DaySchedule[]>;
    DAYS.forEach((day) => {
      rangesByDay[day.name] = getRangesFromDaySlots(weeklySlots[day.name]);
    });
    return rangesByDay;
  }, [weeklySlots]);
  const mobileRangeChips = useMemo(() => (
    DAYS.flatMap((day) => {
      const ranges = weeklyRangeSummary[day.name];
      return ranges.length > 0
        ? [{ day, ranges }]
        : [];
    })
  ), [weeklyRangeSummary]);
  const exceptionPeriods = useMemo(
    () => groupAvailabilityExceptionPeriods(exceptions),
    [exceptions]
  );
  const sidebarExceptionPeriods = useMemo(
    () => sortAvailabilityExceptionPeriodsForSidebar(exceptionPeriods),
    [exceptionPeriods]
  );
  const exceptionCalendarMarkedDates = useMemo<CalendarMarkedDates>(() => {
    const dates = exceptionPeriods.reduce<CalendarMarkedDates>((acc, period) => {
      const periodDates = getDateKeysInRange(period.startDate, period.endDate);
      periodDates.forEach((dateKey, index) => {
        acc[dateKey] = {
          color: theme.warningBg,
          textColor: theme.textPrimary,
          startingDay: index === 0,
          endingDay: index === periodDates.length - 1,
        };
      });
      return acc;
    }, {});

    if (exceptionRangeDraft.selectedRange) {
      const selectedDates = getDateKeysInRange(
        exceptionRangeDraft.selectedRange.startDate,
        exceptionRangeDraft.selectedRange.endDate
      );
      selectedDates.forEach((dateKey, index) => {
        dates[dateKey] = {
          color: theme.primary,
          textColor: theme.textOnPrimary,
          startingDay: index === 0,
          endingDay: index === selectedDates.length - 1,
        };
      });
    }

    return dates;
  }, [
    exceptionRangeDraft.selectedRange,
    exceptionPeriods,
    theme.primary,
    theme.textOnPrimary,
    theme.textPrimary,
    theme.warningBg,
  ]);
  const calendarTheme = useMemo(() => ({
    backgroundColor: theme.bgElevated,
    calendarBackground: theme.bgElevated,
    todayTextColor: theme.primary,
    todayBackgroundColor: theme.primaryAlpha12,
    selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: theme.textOnPrimary,
    dayTextColor: theme.textPrimary,
    textDisabledColor: theme.textMuted,
    arrowColor: theme.primary,
    monthTextColor: theme.textPrimary,
    textDayFontSize: isMobile ? 15 : 14,
    textMonthFontSize: isMobile ? 17 : 16,
    textDayFontWeight: '500' as const,
    textMonthFontWeight: '700' as const,
  }), [isMobile, theme]);

  const renderSidebar = () => (
    <TourTarget id="professional.availability.sidebar" fill style={styles.sidebarTourTarget}>
      <View style={[styles.sidebar, !useTwoColumns && styles.sidebarStacked]}>
      <Card variant="default" padding="large" style={styles.sidebarCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconShell, { backgroundColor: theme.primaryAlpha12 }]}>
            <Ionicons name="stats-chart-outline" size={18} color={theme.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Resumen semanal</Text>
            <Text style={styles.cardCaption}>Tu agenda base de esta semana tipo</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{summary.totalHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>~{summary.possibleSessions}</Text>
            <Text style={styles.statLabel}>Sesiones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{summary.activeDays}</Text>
            <Text style={styles.statLabel}>Días</Text>
          </View>
        </View>
        <View style={styles.miniChart}>
          {DAYS.map((day) => {
            const hours = summary.dailyHours[day.name] || 0;
            const barHeight = Math.min((hours / 10) * 52, 52);
            const dayEnabled = enabledDays[day.name];
            return (
              <View key={day.name} style={styles.miniChartCol}>
                <View style={styles.miniChartBarBg}>
                  <View style={[styles.miniChartBar, { height: barHeight, backgroundColor: dayEnabled ? theme.primary : theme.border }]} />
                </View>
                <Text style={styles.miniChartLabel}>{day.shortLabel.charAt(0)}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <ExceptionPeriodsCard
        periods={sidebarExceptionPeriods}
        onAddPress={openExceptionModal}
        onRemovePeriod={handleRemoveExceptionPeriod}
      />

      <Card variant="default" padding="large" style={styles.sidebarCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconShell, { backgroundColor: theme.secondaryAlpha12 }]}>
            <Ionicons name="settings-outline" size={18} color={theme.secondary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Configuración</Text>
            <Text style={styles.cardCaption}>Ajustes que afectan a cómo se agenda</Text>
          </View>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Descanso entre sesiones</Text>
          <View style={styles.settingOptions}>
            {BUFFER_OPTIONS.map((option) => {
              const isActive = bufferTime === option.value;
              return (
                <AnimatedPressable key={option.value} style={isActive ? [styles.settingOption, styles.settingOptionActive] : styles.settingOption} onPress={() => { setBufferTime(option.value); setHasChanges(true); }} hoverLift={false}>
                  <Text style={[styles.settingOptionText, isActive && styles.settingOptionTextActive]}>{option.label}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
        <View style={styles.settingRowLast}>
          <Text style={styles.settingLabel}>Duración pública de sesión</Text>
          <View style={styles.billingDurationCard}>
            <View style={styles.billingDurationIcon}>
              <Ionicons name="card-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.billingDurationCopy}>
              <Text style={styles.billingDurationValue}>
                {billingDurationText}
              </Text>
              <Text style={[
                styles.billingDurationHint,
              ]}>
                {billingDurationHint}
              </Text>
            </View>
            <Button
              variant="secondary"
              size="small"
              onPress={() => navigateProfessionalSection(navigation, 'ProfessionalTariffs')}
            >
              Servicios y bonos
            </Button>
          </View>
        </View>
      </Card>
      </View>
    </TourTarget>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Cargando disponibilidad…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.pageTitle}>Configurar disponibilidad</Text>
          {hasChanges ? (
            <View style={styles.unsavedBadge}>
              <Ionicons name="ellipse" size={8} color={theme.warning} />
              <Text style={styles.unsavedText}>Cambios sin guardar</Text>
            </View>
          ) : null}
        </View>
        <TourTarget id="professional.availability.save">
          <Button variant="primary" size={isMobile ? "medium" : "small"} onPress={handleSave} disabled={!hasChanges || saving} loading={saving} icon={<Ionicons name="checkmark" size={18} color={theme.textOnPrimary} />}>
            Guardar
          </Button>
        </TourTarget>
      </View>

      <ScrollView
        ref={availabilityTourScroll.scrollRef}
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        onContentSizeChange={availabilityTourScroll.scrollProps.onContentSizeChange}
        onLayout={availabilityTourScroll.scrollProps.onLayout}
        onScroll={availabilityTourScroll.scrollProps.onScroll}
        scrollEventThrottle={availabilityTourScroll.scrollProps.scrollEventThrottle}
        showsVerticalScrollIndicator
      >
        <View style={styles.mainContent}>
          <View style={[styles.leftColumn, useTwoColumns && styles.leftColumnDesktop]}>
            <View style={styles.leftColumnContent}>
              <TourTarget id="professional.availability.presets" fill style={styles.fullWidthTourTarget}>
                <Card variant="default" padding="large" style={styles.controlsCard}>
                  <AnimatedPressable
                    style={[styles.controlsHeader, quickPatternsExpanded && styles.controlsHeaderExpanded]}
                    onPress={() => setQuickPatternsExpanded((current) => !current)}
                    hoverLift={false}
                    pressScale={0.995}
                    accessibilityLabel={quickPatternsExpanded ? 'Cerrar patrones rápidos' : 'Abrir patrones rápidos'}
                    accessibilityState={{ expanded: quickPatternsExpanded }}
                  >
                    <View style={styles.controlsHeaderCopy}>
                      <View style={[styles.iconShell, { backgroundColor: theme.primaryAlpha12 }]}>
                        <Ionicons name="albums-outline" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.controlsHeaderText}>
                        <Text style={styles.controlsTitle}>Patrones rápidos</Text>
                        <Text style={styles.controlsSubtitle}>
                          {quickPatternsExpanded
                            ? 'Aplica una base inicial en tres pasos y luego ajusta solo donde necesites.'
                            : 'Configura un patrón base en 3 pasos.'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.controlsHeaderAction}>
                      {!isMobile ? (
                        <Text style={styles.controlsHeaderActionText}>
                          {quickPatternsExpanded ? 'Ocultar' : 'Abrir'}
                        </Text>
                      ) : null}
                      <Ionicons
                        name={quickPatternsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={theme.textSecondary}
                      />
                    </View>
                  </AnimatedPressable>
                  {quickPatternsExpanded ? (
                    <View style={styles.quickFlow}>
                      <View style={styles.quickStep}>
                        <View style={styles.quickStepHeader}>
                          <View style={styles.quickStepBadge}>
                            <Text style={styles.quickStepBadgeText}>1</Text>
                          </View>
                          <View style={styles.quickStepCopy}>
                            <Text style={styles.quickStepTitle}>Elegir horario</Text>
                            <Text style={styles.quickStepText}>Selecciona los bloques base que quieres replicar.</Text>
                          </View>
                        </View>
                        <View style={styles.quickPresetGrid}>
                          {QUICK_PRESETS.map((preset) => {
                            const isSelected = selectedPresetId === preset.id;
                            return (
                              <AnimatedPressable
                                key={preset.id}
                                style={[styles.quickPresetOption, isSelected && styles.quickPresetOptionActive]}
                                onPress={() => setSelectedPresetId(preset.id)}
                                hoverLift={false}
                                accessibilityLabel={`Elegir patrón ${preset.label}`}
                              >
                                <View style={[styles.quickPresetIcon, isSelected && styles.quickPresetIconActive]}>
                                  <Ionicons name={preset.icon} size={18} color={isSelected ? theme.textOnPrimary : theme.primary} />
                                </View>
                                <View style={styles.quickPresetCopy}>
                                  {isMobile ? (
                                    <View style={styles.quickPresetMobileLine}>
                                      <Text
                                        style={[styles.quickPresetLabel, isSelected && styles.quickPresetLabelActive]}
                                        numberOfLines={1}
                                      >
                                        {preset.label}
                                      </Text>
                                      <Text
                                        style={[styles.quickPresetRange, isSelected && styles.quickPresetRangeActive]}
                                        numberOfLines={1}
                                      >
                                        {formatPresetRanges(preset.ranges)}
                                      </Text>
                                    </View>
                                  ) : (
                                    <>
                                      <Text style={[styles.quickPresetLabel, isSelected && styles.quickPresetLabelActive]}>{preset.label}</Text>
                                      <Text style={[styles.quickPresetRange, isSelected && styles.quickPresetRangeActive]}>
                                        {formatPresetRanges(preset.ranges)}
                                      </Text>
                                    </>
                                  )}
                                  <Text
                                    style={[styles.quickPresetDescription, isSelected && styles.quickPresetDescriptionActive]}
                                    numberOfLines={1}
                                  >
                                    {preset.description}
                                  </Text>
                                </View>
                              </AnimatedPressable>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.quickStep}>
                        <View style={styles.quickStepHeader}>
                          <View style={styles.quickStepBadge}>
                            <Text style={styles.quickStepBadgeText}>2</Text>
                          </View>
                          <View style={styles.quickStepCopy}>
                            <Text style={styles.quickStepTitle}>Seleccionar días destino</Text>
                            <Text style={styles.quickStepText}>Puedes incluir días sin horario; se activarán al aplicar.</Text>
                          </View>
                        </View>
                        <View style={styles.quickDaysHeader}>
                          <Text style={styles.quickDaysHint}>{selectedPresetDays.length} de {DAYS.length} días seleccionados</Text>
                          <AnimatedPressable
                            style={[styles.quickSelectAllButton, allPresetDaysSelected && styles.quickSelectAllButtonActive]}
                            onPress={toggleAllPresetDays}
                            hoverLift={false}
                            accessibilityLabel="Seleccionar todos los días para patrón"
                          >
                            <Ionicons
                              name={allPresetDaysSelected ? 'checkbox-outline' : 'square-outline'}
                              size={16}
                              color={allPresetDaysSelected ? theme.primary : theme.textSecondary}
                            />
                            <Text style={[styles.quickSelectAllText, allPresetDaysSelected && styles.quickSelectAllTextActive]}>
                              {allPresetDaysSelected ? 'Quitar todos' : 'Seleccionar todos'}
                            </Text>
                          </AnimatedPressable>
                        </View>
                        <ScrollView horizontal contentContainerStyle={styles.quickDaysGrid}>
                          {DAYS.map((day) => {
                            const isSelected = selectedPresetDaysSet.has(day.name);
                            const isEnabled = enabledDays[day.name];
                            return (
                              <AnimatedPressable
                                key={day.name}
                                style={[
                                  styles.quickDayChip,
                                  !isEnabled && styles.quickDayChipInactive,
                                  isSelected && styles.quickDayChipActive,
                                ]}
                                onPress={() => togglePresetDay(day.name)}
                                accessibilityState={{ selected: isSelected }}
                                hoverLift={false}
                                accessibilityLabel={`Seleccionar ${day.label} para patrón`}
                              >
                                <Text style={[styles.quickDayText, isSelected && styles.quickDayTextActive]}>
                                  {isMobile ? day.shortLabel : day.label}
                                </Text>
                                {!isEnabled ? <Text style={[styles.quickDayState, isSelected && styles.quickDayStateActive]}>Sin horario</Text> : null}
                              </AnimatedPressable>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={styles.quickStep}>
                        <View style={styles.quickStepHeader}>
                          <View style={styles.quickStepBadge}>
                            <Text style={styles.quickStepBadgeText}>3</Text>
                          </View>
                          <View style={styles.quickStepCopy}>
                            <Text style={styles.quickStepTitle}>Confirmar</Text>
                            <Text style={styles.quickStepText}>Revisa el resumen antes de modificar la semana.</Text>
                          </View>
                        </View>
                        <View style={styles.quickConfirmPanel}>
                          <View style={styles.quickSummaryIcon}>
                            <Ionicons name="checkmark-done-outline" size={18} color={canApplySelectedPreset ? theme.primary : theme.textMuted} />
                          </View>
                          <View style={styles.quickSummaryCopy}>
                            <Text style={styles.quickSummaryLabel}>Resumen</Text>
                            <Text style={styles.quickSummaryText}>{presetSummaryText}</Text>
                          </View>
                          <View style={styles.quickApplyWrap}>
                            <Button
                              variant="primary"
                              size="medium"
                              onPress={applySelectedPreset}
                              disabled={!canApplySelectedPreset}
                              icon={<Ionicons name="flash-outline" size={17} color={canApplySelectedPreset ? theme.textOnPrimary : theme.textMuted} />}
                              fullWidth
                            >
                              Aplicar
                            </Button>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </Card>
              </TourTarget>

          <Card variant="default" padding="none" style={styles.gridCard}>
            <TourTarget id="professional.availability.weekly-grid" fill style={styles.fullWidthTourTarget}>
              <View style={styles.gridIntro}>
                <Text style={styles.gridTitle}>Disponibilidad semanal</Text>
                <Text style={styles.gridSubtitle}>Activa los días y pulsa las franjas para editar tu horario. Desplázate para ver las 24 horas.</Text>
                {isMobile && mobileRangeChips.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.mobileRangeChipsScroll}
                    contentContainerStyle={styles.mobileRangeChipsContent}
                  >
                    {mobileRangeChips.map(({ day, ranges }) => (
                      <View key={day.name} style={styles.mobileRangeChip}>
                        <Text style={styles.mobileRangeChipDay}>{day.shortLabel}</Text>
                        <Text style={styles.mobileRangeChipText}>{formatCompactTimeRanges(ranges)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </TourTarget>
            <View style={styles.gridHeader}>
              <View style={styles.timeCol} />
              {DAYS.map((day) => {
                const dayRanges = weeklyRangeSummary[day.name];
                const daySummaryText = dayRanges.length > 0
                  ? formatCompactTimeRanges(dayRanges)
                  : 'Sin horario';

                return (
                  <AnimatedPressable
                    key={day.name}
                    style={styles.dayCol}
                    onPress={() => toggleDayEnabled(day.name)}
                    hoverLift={false}
                    accessibilityLabel={`${enabledDays[day.name] ? 'Desactivar' : 'Activar'} ${day.label}`}
                  >
                    <View style={[styles.dayCheck, enabledDays[day.name] && styles.dayCheckActive]}>
                      {enabledDays[day.name] ? <Ionicons name="checkmark" size={10} color={theme.textOnPrimary} /> : null}
                    </View>
                    <Text style={[styles.dayLabel, !enabledDays[day.name] && styles.dayLabelDisabled]}>
                      {isMobile ? day.shortLabel.charAt(0) : isTablet ? day.shortLabel : day.label}
                    </Text>
                    {!isMobile ? (
                      <Text
                        style={[styles.dayRangeSummary, !enabledDays[day.name] && styles.dayRangeSummaryDisabled]}
                        numberOfLines={1}
                      >
                        {daySummaryText}
                      </Text>
                    ) : null}
                  </AnimatedPressable>
                );
              })}
            </View>
            <ScrollView
              ref={gridRef}
              style={styles.gridBody}
              nestedScrollEnabled
              onContentSizeChange={() => {
                const grid = gridRef.current;
                if (grid && initializedGridRef.current !== grid) {
                  grid.scrollTo({ y: GRID_INITIAL_HOUR * GRID_HOUR_HEIGHT, animated: false });
                  initializedGridRef.current = grid;
                }
              }}
            >
              {TIME_SLOTS.map((slot) => (
                <View key={slot.label} style={styles.gridRow}>
                  <View style={[styles.timeCol, styles.timeColBody]}>
                    {slot.minute === 0 ? <Text style={styles.timeLabel}>{slot.label}</Text> : null}
                  </View>
                  {DAYS.map((day) => {
                    const slotState = weeklySlots[day.name][slot.label];
                    const isAvailable = slotState?.available ?? false;
                    const isEnabled = enabledDays[day.name];
                    const slotIntervalLabel = `${slot.label}-${getSlotEndTime(slot)}`;
                    return (
                      <AnimatedPressable
                        key={`${day.name}-${slot.label}`}
                        style={[
                          styles.slotCell,
                          ...(slot.minute === 0 ? [styles.slotCellHour] : []),
                          ...(!isEnabled ? [styles.slotCellDisabled] : []),
                          ...(isAvailable ? [styles.slotCellAvailable] : []),
                        ]}
                        onPress={() => toggleSlot(day.name, slot.label)}
                        disabled={!isEnabled}
                        hoverLift={false}
                        pressScale={0.99}
                        accessibilityLabel={`${day.label} ${slotIntervalLabel}`}
                        accessibilityState={{ disabled: !isEnabled, selected: isAvailable }}
                      >
                        <View style={styles.slotCellFiller} />
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendAvailable]} />
                <Text style={styles.legendText}>Disponible</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendUnavailable]} />
                <Text style={styles.legendText}>No disponible</Text>
              </View>
            </View>
          </Card>

          {!useTwoColumns ? renderSidebar() : null}
            </View>
          </View>

        {useTwoColumns ? (
          <View style={styles.rightColumn}>
            <View style={styles.rightColumnContent}>
              {renderSidebar()}
            </View>
          </View>
        ) : null}
        </View>
      </ScrollView>

      <ExceptionRangeModal
        visible={showExceptionModal}
        rangeLabel={exceptionRangeDraft.rangeLabel}
        selectionStep={exceptionRangeDraft.selectionStep}
        markedDates={exceptionCalendarMarkedDates}
        calendarTheme={calendarTheme}
        minDate={getTodayDateKey()}
        isTooLong={exceptionRangeDraft.isTooLong}
        impact={exceptionRangeDraft.impact}
        impactLoading={exceptionRangeDraft.impactLoading}
        impactError={exceptionRangeDraft.impactError}
        selectedTypeId={selectedExceptionType}
        saving={savingExceptionRange}
        canSubmit={canAddExceptionRange}
        onClose={closeExceptionModal}
        onDayPress={exceptionRangeDraft.handleDayPress}
        onSelectType={setSelectedExceptionType}
        onSubmit={handleAddExceptionRange}
      />
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, width: number) => {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const useTwoColumns = width >= 1080;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: spacing.md, fontSize: 15, color: theme.textSecondary, fontFamily: theme.fontSans },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingLeft: isMobile ? layout.mobileShellLeftInset : spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: theme.bgCard,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      ...shadows.sm,
    },
    headerTitleRow: {
      flex: 1,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    pageTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontHeading },
    unsavedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.warningBg,
      borderWidth: 1,
      borderColor: isDark ? theme.warning : theme.border,
    },
    unsavedText: { fontSize: 12, fontWeight: '600', color: theme.warning, fontFamily: theme.fontSansSemiBold },
    fullWidthTourTarget: { width: '100%' },
    mainScroll: { flex: 1 },
    mainScrollContent: { paddingBottom: 120 },
    mainContent: {
      flexDirection: useTwoColumns ? 'row' : 'column',
      alignItems: useTwoColumns ? 'flex-start' : 'stretch',
    },
    leftColumn: { flex: 1 },
    leftColumnDesktop: { flex: 0.62 },
    leftColumnContent: {
      padding: isMobile ? spacing.md : spacing.lg,
      paddingBottom: 120,
      gap: isMobile ? spacing.md : spacing.lg,
    },
    rightColumn: { flex: 0.38, alignSelf: 'flex-start' },
    rightColumnContent: { padding: spacing.lg, paddingBottom: 120 },
    controlsCard: { borderWidth: 1, borderColor: theme.border },
    controlsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      minHeight: 48,
    },
    controlsHeaderExpanded: { marginBottom: spacing.md },
    controlsHeaderCopy: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    controlsHeaderText: { flex: 1, minWidth: 0 },
    controlsTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontHeading },
    controlsSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: theme.textSecondary, fontFamily: theme.fontSans },
    controlsHeaderAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: isMobile ? 8 : 10,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    controlsHeaderActionText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      fontFamily: theme.fontSansBold,
    },
    quickFlow: { gap: isMobile ? spacing.md : spacing.lg },
    quickStep: { gap: spacing.sm },
    quickStepHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    quickStepBadge: {
      width: 28,
      height: 28,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    quickStepBadgeText: { fontSize: 12, fontWeight: '800', color: theme.primary, fontFamily: theme.fontSansBold },
    quickStepCopy: { flex: 1, gap: 2 },
    quickStepTitle: { fontSize: 13, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    quickStepText: { fontSize: 12, lineHeight: 17, color: theme.textSecondary, fontFamily: theme.fontSans },
    quickPresetGrid: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 8 : spacing.sm,
    },
    quickPresetOption: {
      flex: isMobile ? 0 : 1,
      minWidth: isMobile ? undefined : 0,
      minHeight: isMobile ? 52 : undefined,
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: isMobile ? 8 : spacing.sm,
      paddingHorizontal: isMobile ? 10 : spacing.md,
      paddingVertical: isMobile ? 8 : spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    quickPresetOptionActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    quickPresetIcon: {
      width: isMobile ? 30 : 36,
      height: isMobile ? 30 : 36,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    quickPresetIconActive: {
      backgroundColor: theme.primary,
    },
    quickPresetCopy: { flex: 1, minWidth: 0, justifyContent: 'center' },
    quickPresetMobileLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      minWidth: 0,
    },
    quickPresetLabel: { flexShrink: 1, fontSize: isMobile ? 13 : 14, lineHeight: isMobile ? 16 : undefined, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    quickPresetLabelActive: { color: theme.primary },
    quickPresetRange: { marginTop: isMobile ? 0 : 2, fontSize: isMobile ? 12 : 13, lineHeight: isMobile ? 15 : undefined, fontWeight: '700', color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
    quickPresetRangeActive: { color: theme.primary },
    quickPresetDescription: { marginTop: isMobile ? 1 : 2, fontSize: isMobile ? 10 : 11, lineHeight: isMobile ? 13 : 15, color: theme.textMuted, fontFamily: theme.fontSans },
    quickPresetDescriptionActive: { color: theme.textSecondary },
    quickDaysHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    quickDaysHint: { flex: 1, fontSize: 12, color: theme.textSecondary, fontFamily: theme.fontSans },
    quickSelectAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? 44 : 32,
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    quickSelectAllButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    quickSelectAllText: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, fontFamily: theme.fontSansBold },
    quickSelectAllTextActive: { color: theme.primary },
    quickDaysGrid: {
      flexDirection: 'row',
      flexGrow: 1,
      gap: spacing.xs,
    },
    quickDayChip: {
      flex: 1,
      minWidth: isMobile ? 44 : 68,
      minHeight: 44,
      paddingVertical: spacing.xs,
      paddingHorizontal: 2,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgCard,
    },
    quickDayChipInactive: {
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderColor: theme.borderLight,
    },
    quickDayChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    quickDayText: { fontSize: 13, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    quickDayTextActive: { color: theme.primary },
    quickDayState: { textAlign: 'center', marginTop: 2, fontSize: 10, fontWeight: '600', color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
    quickDayStateActive: { color: theme.primary },
    quickConfirmPanel: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    quickSummaryIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    quickSummaryCopy: { flex: 1, minWidth: 0, gap: 2 },
    quickSummaryLabel: { fontSize: 11, fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: theme.fontSansBold },
    quickSummaryText: { fontSize: 13, lineHeight: 18, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
    quickApplyWrap: {
      minWidth: isMobile ? 0 : 132,
      alignSelf: isMobile ? 'stretch' : 'center',
    },
    gridCard: { overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    gridIntro: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.bgCard,
    },
    gridTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontHeading },
    gridSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: theme.textSecondary, fontFamily: theme.fontSans },
    mobileRangeChipsScroll: { marginTop: spacing.sm },
    mobileRangeChipsContent: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    mobileRangeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 30,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    mobileRangeChipDay: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    mobileRangeChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    gridHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    timeCol: { width: isMobile ? 38 : 54, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8 },
    dayCol: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: 6 },
    dayCheck: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: theme.borderStrong,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
    },
    dayCheckActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    dayLabel: { fontSize: isMobile ? 11 : 12, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    dayLabelDisabled: { color: theme.textMuted },
    dayRangeSummary: {
      maxWidth: '100%',
      fontSize: isTablet ? 9 : 10,
      lineHeight: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      textAlign: 'center',
    },
    dayRangeSummaryDisabled: { color: theme.textMuted },
    gridBody: { height: GRID_VISIBLE_HOURS * GRID_HOUR_HEIGHT, flexGrow: 0, backgroundColor: theme.borderLight },
    gridRow: { flexDirection: 'row', height: GRID_ROW_HEIGHT, gap: 1, marginBottom: GRID_ROW_GAP },
    timeLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
    timeColBody: { backgroundColor: theme.bgCard },
    slotCell: { flex: 1, backgroundColor: theme.bgCard },
    slotCellFiller: { flex: 1 },
    slotCellHour: {},
    slotCellDisabled: { backgroundColor: theme.surfaceMuted },
    slotCellAvailable: { backgroundColor: theme.successLight },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.lg,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendBox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: theme.borderStrong },
    legendAvailable: { backgroundColor: theme.successLight },
    legendUnavailable: { backgroundColor: theme.bgCard },
    legendText: { fontSize: 12, color: theme.textSecondary, fontFamily: theme.fontSans },
    sidebarTourTarget: { width: '100%' },
    sidebar: { gap: spacing.lg },
    sidebarStacked: { marginTop: spacing.xs },
    sidebarCard: { borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
    iconShell: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardHeaderText: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontHeading },
    cardCaption: { fontSize: 12, lineHeight: 18, color: theme.textSecondary, fontFamily: theme.fontSans },
    summaryStats: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    statBlock: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
    statValue: { fontSize: 24, fontWeight: '800', color: theme.primary, fontFamily: theme.fontHeading },
    statLabel: { fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: theme.fontSansSemiBold },
    statDivider: { width: 1, backgroundColor: theme.border },
    miniChart: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    miniChartCol: { alignItems: 'center', gap: 6, flex: 1 },
    miniChartBarBg: {
      width: 24,
      height: 52,
      justifyContent: 'flex-end',
      borderRadius: 8,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      overflow: 'hidden',
    },
    miniChartBar: { width: '100%', borderRadius: 8 },
    miniChartLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
    settingRow: { marginBottom: spacing.md },
    settingRowLast: { marginBottom: 0 },
    settingLabel: { marginBottom: spacing.sm, fontSize: 13, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    settingOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    settingOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    settingOptionActive: { borderColor: theme.primary, backgroundColor: theme.primaryAlpha12 },
    settingOptionText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
    settingOptionTextActive: { color: theme.primary },
    billingDurationCard: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    billingDurationIcon: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    billingDurationCopy: {
      flex: 1,
      gap: 2,
    },
    billingDurationValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    billingDurationHint: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    billingDurationHintError: {
      color: theme.warning,
    },
  });
};

export default ProfessionalAvailabilityScreen;
