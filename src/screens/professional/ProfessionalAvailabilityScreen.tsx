import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, layout, shadows, spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as availabilityService from '../../services/availabilityService';
import { billingService, type FullBillingConfig } from '../../services/billingService';
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
interface QuickPreset extends TimeRange {
  id: QuickPresetId;
  label: string;
  description: string;
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

const AVAILABILITY_START_HOUR = 7;
const AVAILABILITY_END_HOUR = 23;

const TIME_SLOTS: TimeSlot[] = [];
for (let hour = AVAILABILITY_START_HOUR; hour < AVAILABILITY_END_HOUR; hour += 1) {
  TIME_SLOTS.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
  TIME_SLOTS.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'morning', label: 'Mañana', description: 'Inicio temprano', start: '08:00', end: '14:00', icon: 'sunny-outline' },
  { id: 'afternoon', label: 'Tarde', description: 'Bloque vespertino', start: '14:00', end: '20:00', icon: 'partly-sunny-outline' },
  { id: 'full', label: 'Completa', description: 'Jornada continua', start: '08:00', end: '20:00', icon: 'calendar-outline' },
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

const getTimeMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const formatPresetHour = (time: string): string => {
  const [hour, minute] = time.split(':');
  return minute === '00' ? String(Number(hour)) : time;
};

const formatPresetRange = (range: TimeRange): string => `${formatPresetHour(range.start)}-${formatPresetHour(range.end)} h`;

const getDayLabel = (dayName: DayOfWeek): string => DAYS.find((day) => day.name === dayName)?.label ?? dayName;

const createDaySlotsForRange = (range: TimeRange): DaySlots => {
  const daySlots = createEmptyDaySlots();
  const startMinutes = getTimeMinutes(range.start);
  const endMinutes = getTimeMinutes(range.end);
  TIME_SLOTS.forEach((slot) => {
    const slotMinutes = slot.hour * 60 + slot.minute;
    if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
      daySlots[slot.label] = { available: true, isBreak: false };
    }
  });
  return daySlots;
};

const getSlotIndex = (time: string): number => TIME_SLOTS.findIndex((slot) => slot.label === time);

const createContinuousDaySlots = (startIndex: number, endIndex: number): DaySlots => {
  const daySlots = createEmptyDaySlots();
  for (let index = startIndex; index <= endIndex; index += 1) {
    const slot = TIME_SLOTS[index];
    if (slot) {
      daySlots[slot.label] = { available: true, isBreak: false };
    }
  }
  return daySlots;
};

const getAvailableSlotIndices = (daySlots: DaySlots): number[] => (
  TIME_SLOTS.reduce<number[]>((indices, slot, index) => {
    if (daySlots[slot.label]?.available) {
      indices.push(index);
    }
    return indices;
  }, [])
);

const isContinuousDaySlots = (daySlots: DaySlots): boolean => {
  const availableIndices = getAvailableSlotIndices(daySlots);
  if (availableIndices.length <= 1) return true;
  return availableIndices.every((slotIndex, index) => index === 0 || slotIndex === availableIndices[index - 1] + 1);
};

const getNonContinuousDayLabels = (weeklySlots: WeeklySlots): string[] => (
  DAYS
    .filter((day) => !isContinuousDaySlots(weeklySlots[day.name]))
    .map((day) => day.label)
);

const toggleContinuousSlot = (
  daySlots: DaySlots,
  time: string,
): { slots: DaySlots; changed: boolean; blocked: boolean } => {
  const targetIndex = getSlotIndex(time);
  if (targetIndex < 0) return { slots: daySlots, changed: false, blocked: false };
  if (!isContinuousDaySlots(daySlots)) return { slots: daySlots, changed: false, blocked: true };

  const availableIndices = getAvailableSlotIndices(daySlots);
  if (availableIndices.length === 0) {
    return { slots: createContinuousDaySlots(targetIndex, targetIndex), changed: true, blocked: false };
  }

  const firstIndex = availableIndices[0];
  const lastIndex = availableIndices[availableIndices.length - 1];
  const targetIsAvailable = availableIndices.includes(targetIndex);

  if (!targetIsAvailable) {
    return {
      slots: createContinuousDaySlots(Math.min(firstIndex, targetIndex), Math.max(lastIndex, targetIndex)),
      changed: true,
      blocked: false,
    };
  }

  if (availableIndices.length === 1) {
    return { slots: createEmptyDaySlots(), changed: true, blocked: false };
  }

  if (targetIndex === firstIndex) {
    return { slots: createContinuousDaySlots(firstIndex + 1, lastIndex), changed: true, blocked: false };
  }

  if (targetIndex === lastIndex) {
    return { slots: createContinuousDaySlots(firstIndex, lastIndex - 1), changed: true, blocked: false };
  }

  return { slots: daySlots, changed: false, blocked: true };
};

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

const getDayNameFromDate = (dateString: string): DayOfWeek => {
  const weekday = new Date(`${dateString}T12:00:00`).getDay();
  const dayMap: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  return dayMap[weekday];
};

const getInitialPreviewDate = (enabledDays: EnabledDays): string => {
  const today = new Date();
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const dateString = candidate.toISOString().split('T')[0];
    if (enabledDays[getDayNameFromDate(dateString)]) {
      return dateString;
    }
  }
  return today.toISOString().split('T')[0];
};

const convertScheduleToSlots = (schedule: availabilityService.WeeklySchedule): WeeklySlots => {
  const weeklySlots = createEmptyWeeklySlots();
  DAYS.forEach((day) => {
    const daySchedule = schedule[day.name];
    if (!daySchedule) return;
    const startMinutes = getTimeMinutes(daySchedule.start);
    const endMinutes = getTimeMinutes(daySchedule.end);
    TIME_SLOTS.forEach((slot) => {
      const slotMinutes = slot.hour * 60 + slot.minute;
      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) weeklySlots[day.name][slot.label] = { available: true, isBreak: false };
    });
  });
  return weeklySlots;
};

const convertSlotsToSchedule = (weeklySlots: WeeklySlots): availabilityService.WeeklySchedule => {
  const schedule: availabilityService.WeeklySchedule = { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null };
  DAYS.forEach((day) => {
    const availableSlots = TIME_SLOTS.filter((slot) => weeklySlots[day.name][slot.label]?.available);
    if (availableSlots.length === 0) return;
    const firstSlot = availableSlots[0];
    const lastSlot = availableSlots[availableSlots.length - 1];
    const endHour = lastSlot.hour + (lastSlot.minute === 30 ? 1 : 0);
    const endMinute = lastSlot.minute === 30 ? '00' : '30';
    schedule[day.name] = { start: firstSlot.label, end: `${endHour.toString().padStart(2, '0')}:${endMinute}` };
  });
  return schedule;
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedExceptionType, setSelectedExceptionType] =
    useState<AvailabilityExceptionTypeId>('vacation');
  const [savingExceptionRange, setSavingExceptionRange] = useState(false);
  const [previewSelectedDate, setPreviewSelectedDate] = useState('');
  const [bufferTime, setBufferTime] = useState(15);
  const [billingConfig, setBillingConfig] = useState<FullBillingConfig | null>(null);
  const [billingConfigError, setBillingConfigError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<QuickPresetId | null>(null);
  const [selectedPresetDays, setSelectedPresetDays] = useState<DayOfWeek[]>([]);
  const [quickPatternsExpanded, setQuickPatternsExpanded] = useState(false);
  const [rangeNoticeVisible, setRangeNoticeVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      setBillingConfigError(null);
      const [scheduleResult, exceptionsResult, bufferResult, billingConfigResult] = await Promise.allSettled([
        availabilityService.getMyWeeklySchedule(),
        availabilityService.getMyExceptions(),
        availabilityService.getMyBufferTime(),
        billingService.getConfig(),
      ]);
      const scheduleData = getSettledValue(scheduleResult, 'No se pudo cargar el horario semanal');
      const exceptionsData = getSettledValue(exceptionsResult, 'No se pudieron cargar las excepciones');
      const savedBufferTime = getSettledValue(bufferResult, 'No se pudo cargar el descanso entre sesiones');
      setWeeklySlots(convertScheduleToSlots(scheduleData));
      const nextEnabledDays = createDefaultEnabledDays();
      DAYS.forEach((day) => { nextEnabledDays[day.name] = scheduleData[day.name] !== null; });
      setEnabledDays(nextEnabledDays);
      setExceptions(exceptionsData);
      setBufferTime(savedBufferTime);

      if (billingConfigResult.status === 'fulfilled') {
        setBillingConfig(billingConfigResult.value);
        setBillingConfigError(null);
      } else {
        setBillingConfig(null);
        setBillingConfigError(getErrorMessage(
          billingConfigResult.reason,
          'No se pudo cargar la configuración de facturación'
        ));
      }
    } catch (error: unknown) {
      setLoadError(true);
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo cargar la disponibilidad'));
    } finally {
      setLoading(false);
    }
  }, [appAlert]);

  const defaultTariff = useMemo(
    () =>
      billingConfig?.tariffs?.find((tariff) => tariff.isDefault && tariff.isActive)
      ?? billingConfig?.tariffs?.find((tariff) => tariff.isActive)
      ?? null,
    [billingConfig]
  );

  const billingDuration = defaultTariff?.durationMinutes ?? billingConfig?.slotDuration ?? 60;
  const billingPrice = defaultTariff?.price ?? billingConfig?.pricePerSession ?? 0;
  const billingDurationText = billingConfigError
    ? 'No disponible'
    : `${billingDuration} min · ${formatCurrency(billingPrice)}`;
  const billingDurationHint = billingConfigError
    ?? 'Las reservas públicas usan la tarifa por defecto de Facturación.';
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
      return `${selectedPreset.label} (${formatPresetRange(selectedPreset)}) -> selecciona días destino.`;
    }

    return `${selectedPreset.label} (${formatPresetRange(selectedPreset)}) -> ${selectedPresetDayLabels.join(', ')}`;
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
  useEffect(() => { void loadData(); }, [loadData]);
  useProfessionalTourAutoStart(
    'professional_availability_v1',
    !loading && !loadError && !showExceptionModal && !showPreviewModal && !isAppAlertVisible,
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

  useEffect(() => {
    if (isMobile && showPreviewModal) {
      setShowPreviewModal(false);
    }
  }, [isMobile, showPreviewModal]);

  useEffect(() => {
    if (showPreviewModal) {
      setPreviewSelectedDate(getInitialPreviewDate(enabledDays));
    }
  }, [enabledDays, showPreviewModal]);

  useEffect(() => {
    if (!rangeNoticeVisible) return undefined;
    const timeout = setTimeout(() => setRangeNoticeVisible(false), 4500);
    return () => clearTimeout(timeout);
  }, [rangeNoticeVisible]);

  const toggleSlot = useCallback((day: DayOfWeek, time: string) => {
    if (!enabledDays[day]) return;
    const result = toggleContinuousSlot(weeklySlots[day], time);
    if (result.blocked) {
      setRangeNoticeVisible(true);
      return;
    }
    if (!result.changed) return;
    setWeeklySlots((prev) => ({ ...prev, [day]: result.slots }));
    setRangeNoticeVisible(false);
    setHasChanges(true);
  }, [enabledDays, weeklySlots]);

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
        nextSlots[day] = createDaySlotsForRange(selectedPreset);
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
    const nonContinuousDays = getNonContinuousDayLabels(weeklySlots);
    if (nonContinuousDays.length > 0) {
      showAppAlert(appAlert, 'Error', 'Cada día debe tener un único tramo continuo de disponibilidad.');
      return;
    }

    try {
      setSaving(true);
      const schedule = convertSlotsToSchedule(weeklySlots);
      await Promise.all([availabilityService.updateWeeklySchedule(schedule), availabilityService.updateBufferTime(bufferTime)]);
      setHasChanges(false);
      const totalSlots = Object.values(weeklySlots).reduce((sum, daySlots) => sum + Object.values(daySlots).filter((slot) => slot.available).length, 0);
      analyticsService.track('availability_updated', { slotsCount: totalSlots });
      showAppAlert(appAlert, 'Éxito', 'Disponibilidad actualizada correctamente');
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  }, [appAlert, bufferTime, weeklySlots]);

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
  const previewDayName = useMemo<DayOfWeek>(
    () => getDayNameFromDate(previewSelectedDate || getInitialPreviewDate(enabledDays)),
    [enabledDays, previewSelectedDate]
  );
  const previewSlots = useMemo(
    () => TIME_SLOTS.filter((slot) => weeklySlots[previewDayName][slot.label]?.available),
    [previewDayName, weeklySlots]
  );
  const previewMarkedDates = useMemo<CalendarMarkedDates>(() => (
    previewSelectedDate
      ? { [previewSelectedDate]: { selected: true, selectedColor: theme.primary } }
      : {}
  ), [previewSelectedDate, theme.primary]);
  const previewDayLabel = useMemo(
    () => getDayLabel(previewDayName).toLowerCase(),
    [previewDayName]
  );
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
                billingConfigError ? styles.billingDurationHintError : null,
              ]}>
                {billingDurationHint}
              </Text>
            </View>
            <Button
              variant="secondary"
              size="small"
              onPress={() => navigation.navigate('ProfessionalBilling')}
            >
              Facturación
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
        <View style={styles.headerCopy}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.pageTitle}>Configurar disponibilidad</Text>
            {hasChanges ? (
              <View style={styles.unsavedBadge}>
                <Ionicons name="ellipse" size={8} color={theme.warning} />
                <Text style={styles.unsavedText}>Cambios sin guardar</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.pageSubtitle}>Define tu patrón semanal y las excepciones sin perder visibilidad de la agenda.</Text>
        </View>
        <View style={styles.headerActions}>
          {!isMobile ? (
            <View style={styles.headerButtonWrap}>
              <Button variant="outline" size="medium" onPress={() => setShowPreviewModal(true)} icon={<Ionicons name="eye-outline" size={18} color={theme.primary} />} fullWidth>
                Vista previa
              </Button>
            </View>
          ) : null}
          <View style={styles.headerButtonWrap}>
            <TourTarget id="professional.availability.save" fill style={styles.fullWidthTourTarget}>
              <Button variant="primary" size="medium" onPress={handleSave} disabled={!hasChanges || saving} loading={saving} icon={<Ionicons name="checkmark" size={18} color={theme.textOnPrimary} />} fullWidth>
                Guardar
              </Button>
            </TourTarget>
          </View>
        </View>
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
                            <Text style={styles.quickStepText}>Selecciona el rango base que quieres replicar.</Text>
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
                                  <Text style={[styles.quickPresetLabel, isSelected && styles.quickPresetLabelActive]}>{preset.label}</Text>
                                  <Text style={[styles.quickPresetRange, isSelected && styles.quickPresetRangeActive]}>
                                    {formatPresetRange(preset)}
                                  </Text>
                                  <Text style={[styles.quickPresetDescription, isSelected && styles.quickPresetDescriptionActive]}>
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
                        <View style={styles.quickDaysGrid}>
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
                        </View>
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
                <Text style={styles.gridSubtitle}>Activa días y pulsa en las franjas para ajustar el tramo continuo en el que ofreces sesiones.</Text>
                {rangeNoticeVisible ? (
                  <View style={styles.rangeNotice}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.warning} />
                    <Text style={styles.rangeNoticeText}>
                      Cada día guarda un único tramo continuo. Ajusta el inicio o el final desde los extremos.
                    </Text>
                  </View>
                ) : null}
              </View>
            </TourTarget>
            <View style={styles.gridHeader}>
              <View style={styles.timeCol} />
              {DAYS.map((day) => (
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
                </AnimatedPressable>
              ))}
            </View>
            <View style={styles.gridBody}>
              {TIME_SLOTS.map((slot) => (
                <View key={slot.label} style={styles.gridRow}>
                  <View style={styles.timeCol}>
                    {slot.minute === 0 ? <Text style={styles.timeLabel}>{slot.label}</Text> : null}
                  </View>
                  {DAYS.map((day) => {
                    const slotState = weeklySlots[day.name][slot.label];
                    const isAvailable = slotState?.available ?? false;
                    const isEnabled = enabledDays[day.name];
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
                        accessibilityLabel={`${day.label} ${slot.label}`}
                      >
                        <View style={styles.slotCellFiller} />
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ))}
            </View>
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

      <Modal visible={!isMobile && showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderCopy}>
                <View style={styles.previewBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
                  <Text style={styles.previewBadgeText}>Vista de cliente</Text>
                </View>
                <Text style={styles.previewTitle}>Vista del cliente</Text>
                <Text style={styles.previewSubtitle}>Así se verá tu agenda al reservar una sesión.</Text>
              </View>
              <AnimatedPressable onPress={() => setShowPreviewModal(false)} style={styles.modalCloseButton} hoverLift={false}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </AnimatedPressable>
            </View>
            <ScrollView
              style={styles.previewBody}
              contentContainerStyle={styles.previewBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.previewLayout}>
                <View style={styles.previewCalendarPanel}>
                  <Text style={styles.previewSectionTitle}>Calendario visible</Text>
                  <Text style={styles.previewSectionCaption}>El cliente seleccionará el día y verá solo tus franjas activas.</Text>
                  <View style={styles.previewCalendarShell}>
                    <View style={styles.previewCalendar}>
                      <Calendar
                        theme={calendarTheme}
                        markedDates={previewMarkedDates}
                        onDayPress={(day) => setPreviewSelectedDate(day.dateString)}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.previewAside}>
                  <View style={styles.previewInfoCard}>
                    <View style={styles.previewInfoHeader}>
                      <View style={[styles.iconShell, { backgroundColor: theme.primaryAlpha12 }]}>
                        <Ionicons name="time-outline" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.previewInfoCopy}>
                        <Text style={styles.previewInfoTitle}>Horarios disponibles</Text>
                        <Text style={styles.previewInfoText}>Ejemplo de bloques visibles para el {previewDayLabel}.</Text>
                      </View>
                    </View>

                    <ScrollView
                      style={styles.previewSlotsScroll}
                      contentContainerStyle={styles.previewSlots}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={previewSlots.length > 12}
                    >
                      {previewSlots.length > 0 ? (
                        previewSlots.map((slot) => (
                          <View key={slot.label} style={styles.previewSlot}>
                            <Text style={styles.previewSlotText}>{slot.label}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Todavía no hay horarios disponibles para el {previewDayLabel}.</Text>
                      )}
                    </ScrollView>
                  </View>

                  <View style={styles.previewInfoCard}>
                    <View style={styles.previewInfoHeader}>
                      <View style={[styles.iconShell, { backgroundColor: theme.secondaryAlpha12 }]}>
                        <Ionicons name="information-circle-outline" size={18} color={theme.secondary} />
                      </View>
                      <View style={styles.previewInfoCopy}>
                        <Text style={styles.previewInfoTitle}>Qué transmite esta vista</Text>
                        <Text style={styles.previewInfoText}>
                          Una agenda clara, profesional y fácil de reservar desde cualquier dispositivo.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.previewFooter}>
              <Button variant="outline" size="medium" onPress={() => setShowPreviewModal(false)} fullWidth>
                Cerrar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, width: number) => {
  const isMobile = width < 768;
  const useTwoColumns = width >= 1080;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: spacing.md, fontSize: 15, color: theme.textSecondary, fontFamily: theme.fontSans },
    header: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingLeft: isMobile ? layout.mobileShellLeftInset : spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.bgCard,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      ...shadows.sm,
    },
    headerCopy: { flex: 1, gap: 6 },
    headerTitleRow: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: spacing.sm,
    },
    pageTitle: { fontSize: isMobile ? 28 : 18, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontHeading },
    pageSubtitle: { fontSize: 14, lineHeight: 20, color: theme.textSecondary, maxWidth: 640, fontFamily: theme.fontSans },
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
    headerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: isMobile ? '100%' as unknown as number : undefined,
    },
    headerButtonWrap: { minWidth: isMobile ? 0 : 144, flex: isMobile ? 1 : 0 },
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
      gap: spacing.sm,
    },
    quickPresetOption: {
      flex: isMobile ? 0 : 1,
      minWidth: isMobile ? undefined : 0,
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
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
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    quickPresetIconActive: {
      backgroundColor: theme.primary,
    },
    quickPresetCopy: { flex: 1, minWidth: 0 },
    quickPresetLabel: { fontSize: 14, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    quickPresetLabelActive: { color: theme.primary },
    quickPresetRange: { marginTop: 2, fontSize: 13, fontWeight: '700', color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
    quickPresetRangeActive: { color: theme.primary },
    quickPresetDescription: { marginTop: 2, fontSize: 11, lineHeight: 15, color: theme.textMuted, fontFamily: theme.fontSans },
    quickPresetDescriptionActive: { color: theme.textSecondary },
    quickDaysHeader: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    quickDaysHint: { flex: 1, fontSize: 12, color: theme.textSecondary, fontFamily: theme.fontSans },
    quickSelectAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: isMobile ? 'stretch' : 'flex-start',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
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
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    quickDayChip: {
      minWidth: isMobile ? 76 : 96,
      minHeight: 46,
      paddingVertical: 9,
      paddingHorizontal: 12,
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
    quickDayState: { marginTop: 2, fontSize: 10, fontWeight: '600', color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
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
    rangeNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: spacing.sm,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.warning,
      backgroundColor: theme.warningBg,
    },
    rangeNoticeText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
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
    gridBody: { backgroundColor: theme.bgCard },
    gridRow: { flexDirection: 'row', height: 22 },
    timeLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
    slotCell: { flex: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgCard },
    slotCellFiller: { flex: 1 },
    slotCellHour: { borderBottomColor: theme.border },
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
    emptyText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', fontFamily: theme.fontSans },
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
    modalCloseButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    previewOverlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    previewContent: {
      width: '100%',
      maxWidth: 980,
      maxHeight: '92%',
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.xl,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    previewHeaderCopy: { flex: 1, gap: spacing.sm, paddingRight: spacing.sm },
    previewBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    previewBadgeText: { fontSize: 12, fontWeight: '700', color: theme.primary, fontFamily: theme.fontSansBold },
    previewTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontHeading },
    previewSubtitle: { marginTop: 2, fontSize: 13, lineHeight: 18, color: theme.textSecondary, fontFamily: theme.fontSans },
    previewBody: {
      flexShrink: 1,
    },
    previewBodyContent: {
      padding: spacing.lg,
      paddingBottom: spacing.lg,
    },
    previewLayout: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'stretch',
    },
    previewCalendarPanel: {
      flex: 1,
      width: '100%',
      flexShrink: 0,
      marginBottom: 0,
    },
    previewAside: {
      width: 300,
      gap: spacing.md,
      flexShrink: 0,
      marginTop: 0,
    },
    previewSectionTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontHeading },
    previewSectionCaption: {
      marginTop: 4,
      marginBottom: spacing.md,
      fontSize: 13,
      lineHeight: 18,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    previewCalendarShell: {
      flexShrink: 0,
      position: 'relative',
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgElevated,
    },
    previewCalendar: {
      backgroundColor: theme.bgElevated,
    },
    previewInfoCard: {
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      gap: spacing.md,
    },
    previewInfoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    previewInfoCopy: { flex: 1, gap: 2 },
    previewInfoTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    previewInfoText: { fontSize: 12, lineHeight: 17, color: theme.textSecondary, fontFamily: theme.fontSans },
    previewSlotsScroll: {
      maxHeight: isMobile ? 156 : 220,
    },
    previewSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingRight: spacing.xs },
    previewSlot: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: borderRadius.md,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    previewSlotText: { fontSize: 13, fontWeight: '600', color: theme.primary, fontFamily: theme.fontSansSemiBold },
    previewFooter: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.bgElevated,
    },
  });
};

export default ProfessionalAvailabilityScreen;
