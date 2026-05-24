import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

type Props = ScreenProps<'ProfessionalAvailability'>;
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
interface DayConfig { name: DayOfWeek; label: string; shortLabel: string; }
interface TimeSlot { hour: number; minute: number; label: string; }
interface SlotState { available: boolean; isBreak: boolean; }
type DaySlots = Record<string, SlotState>;
type WeeklySlots = Record<DayOfWeek, DaySlots>;
type EnabledDays = Record<DayOfWeek, boolean>;
type CalendarMarkedDates = Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }>;
interface ExceptionType { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'primary' | 'secondary' | 'warning' | 'muted'; }

const DAYS: DayConfig[] = [
  { name: 'monday', label: 'Lunes', shortLabel: 'Lun' },
  { name: 'tuesday', label: 'Martes', shortLabel: 'Mar' },
  { name: 'wednesday', label: 'Miércoles', shortLabel: 'Mié' },
  { name: 'thursday', label: 'Jueves', shortLabel: 'Jue' },
  { name: 'friday', label: 'Viernes', shortLabel: 'Vie' },
  { name: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
  { name: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
];

const TIME_SLOTS: TimeSlot[] = [];
for (let hour = 8; hour <= 21; hour += 1) {
  TIME_SLOTS.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
  if (hour < 21) TIME_SLOTS.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
}

const EXCEPTION_TYPES: ExceptionType[] = [
  { id: 'vacation', label: 'Vacaciones', icon: 'airplane-outline', tone: 'primary' },
  { id: 'conference', label: 'Conferencia', icon: 'school-outline', tone: 'secondary' },
  { id: 'personal', label: 'Personal', icon: 'person-outline', tone: 'warning' },
  { id: 'holiday', label: 'Festivo', icon: 'calendar-outline', tone: 'warning' },
  { id: 'other', label: 'Otro', icon: 'ellipsis-horizontal-outline', tone: 'muted' },
];

const QUICK_PRESETS = [
  { id: 'morning', label: 'Mañana', slots: { start: '09:00', end: '14:00' } },
  { id: 'afternoon', label: 'Tarde', slots: { start: '15:00', end: '20:00' } },
  { id: 'full', label: 'Completa', slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
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

const getExceptionToneColor = (theme: Theme, type: ExceptionType): string => {
  switch (type.tone) {
    case 'primary': return theme.primary;
    case 'secondary': return theme.secondary;
    case 'warning': return theme.warning;
    default: return theme.textMuted;
  }
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
    const startMinutes = Number(daySchedule.start.split(':')[0]) * 60 + Number(daySchedule.start.split(':')[1]);
    const endMinutes = Number(daySchedule.end.split(':')[0]) * 60 + Number(daySchedule.end.split(':')[1]);
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
  const [selectedExceptionDate, setSelectedExceptionDate] = useState('');
  const [selectedExceptionType, setSelectedExceptionType] = useState('vacation');
  const [previewSelectedDate, setPreviewSelectedDate] = useState('');
  const [bufferTime, setBufferTime] = useState(15);
  const [billingConfig, setBillingConfig] = useState<FullBillingConfig | null>(null);
  const [billingConfigError, setBillingConfigError] = useState<string | null>(null);

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

  useEffect(() => { analyticsService.trackScreen('availability'); }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  useProfessionalTourAutoStart(
    'professional_availability_v1',
    !loading && !loadError && !showExceptionModal && !showPreviewModal && !isAppAlertVisible,
  );

  const prepareAvailabilityPresetsStep = useCallback(
    () => availabilityTourScroll.scrollToTop(),
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

  const toggleSlot = useCallback((day: DayOfWeek, time: string) => {
    setWeeklySlots((prev) => {
      if (!enabledDays[day]) return prev;
      const nextSlots = { ...prev };
      const currentState = nextSlots[day][time];
      nextSlots[day] = { ...nextSlots[day], [time]: { ...currentState, available: !currentState.available, isBreak: false } };
      return nextSlots;
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

  const applyPreset = useCallback((presetId: string) => {
    const preset = QUICK_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const daysToApply = DAYS.filter((day) => enabledDays[day.name]).map((day) => day.name);
    setWeeklySlots((prev) => {
      const nextSlots = { ...prev };
      daysToApply.forEach((day) => {
        nextSlots[day] = createEmptyDaySlots();
        const ranges = Array.isArray(preset.slots) ? preset.slots : [preset.slots];
        ranges.forEach((range) => {
          const startMinutes = Number(range.start.split(':')[0]) * 60 + Number(range.start.split(':')[1]);
          const endMinutes = Number(range.end.split(':')[0]) * 60 + Number(range.end.split(':')[1]);
          TIME_SLOTS.forEach((slot) => {
            const slotMinutes = slot.hour * 60 + slot.minute;
            if (slotMinutes >= startMinutes && slotMinutes < endMinutes) nextSlots[day][slot.label] = { available: true, isBreak: false };
          });
        });
      });
      return nextSlots;
    });
    setHasChanges(true);
  }, [enabledDays]);

  const copyDayToAll = useCallback((sourceDay: DayOfWeek) => {
    setWeeklySlots((prev) => {
      const nextSlots = { ...prev };
      const sourceSlots = prev[sourceDay];
      DAYS.forEach((day) => { if (day.name !== sourceDay && enabledDays[day.name]) nextSlots[day.name] = { ...sourceSlots }; });
      return nextSlots;
    });
    setHasChanges(true);
  }, [enabledDays]);

  const handleSave = useCallback(async () => {
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
  }, [bufferTime, weeklySlots]);

  const handleAddException = useCallback(async () => {
    if (!selectedExceptionDate) return;
    try {
      const exceptionType = EXCEPTION_TYPES.find((type) => type.id === selectedExceptionType);
      await availabilityService.addException(selectedExceptionDate, exceptionType?.label ?? 'No disponible', false);
      await loadData();
      setShowExceptionModal(false);
      setSelectedExceptionDate('');
    } catch (error: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo añadir la excepción'));
    }
  }, [loadData, selectedExceptionDate, selectedExceptionType]);

  const handleRemoveException = useCallback((date: string) => {
    showAppAlert(appAlert, 'Eliminar excepción', '¿Quieres eliminar esta excepción?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await availabilityService.removeException(date.split('T')[0]);
          await loadData();
        } catch (error: unknown) {
          showAppAlert(appAlert, 'Error', getErrorMessage(error, 'No se pudo eliminar la excepción'));
        }
      } },
    ]);
  }, [loadData]);

  const summary = useMemo(() => calculateWeeklySummary(weeklySlots), [weeklySlots]);
  const markedDates = useMemo<CalendarMarkedDates>(() => exceptions.reduce<CalendarMarkedDates>((acc, exception) => {
    acc[exception.date.split('T')[0]] = { marked: true, dotColor: theme.warning };
    return acc;
  }, {}), [exceptions, theme.warning]);
  const previewDayName = useMemo<DayOfWeek>(
    () => getDayNameFromDate(previewSelectedDate || getInitialPreviewDate(enabledDays)),
    [enabledDays, previewSelectedDate]
  );
  const previewSlots = useMemo(
    () => TIME_SLOTS.filter((slot) => weeklySlots[previewDayName][slot.label]?.available).slice(0, 8),
    [previewDayName, weeklySlots]
  );
  const previewMarkedDates = useMemo<CalendarMarkedDates>(() => (
    previewSelectedDate
      ? { [previewSelectedDate]: { selected: true, selectedColor: theme.primary } }
      : {}
  ), [previewSelectedDate, theme.primary]);
  const previewDayLabel = useMemo(
    () => DAYS.find((day) => day.name === previewDayName)?.label.toLowerCase() ?? 'lunes',
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

      <Card variant="default" padding="large" style={styles.sidebarCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconShell, { backgroundColor: theme.warningBg }]}>
            <Ionicons name="calendar-clear-outline" size={18} color={theme.warning} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Excepciones</Text>
            <Text style={styles.cardCaption}>Bloquea días concretos sin tocar la base</Text>
          </View>
        </View>
        {exceptions.length > 0 ? (
          <View style={styles.exceptionsList}>
            {exceptions.slice(0, 5).map((exception) => {
              const exceptionType = EXCEPTION_TYPES.find((type) => exception.reason?.toLowerCase().includes(type.label.toLowerCase())) ?? EXCEPTION_TYPES[4];
              const exceptionColor = getExceptionToneColor(theme, exceptionType);
              return (
                <View key={exception.id} style={[styles.exceptionItem, { borderLeftColor: exceptionColor }]}>
                  <View style={styles.exceptionInfo}>
                    <Ionicons name={exceptionType.icon} size={16} color={exceptionColor} />
                    <View style={styles.exceptionText}>
                      <Text style={styles.exceptionDate} numberOfLines={1}>
                        {new Date(exception.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.exceptionReason} numberOfLines={1}>{exception.reason ?? 'No disponible'}</Text>
                    </View>
                  </View>
                  <AnimatedPressable onPress={() => handleRemoveException(exception.date)} style={styles.exceptionRemoveButton} hoverLift={false} pressScale={0.96}>
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                  </AnimatedPressable>
                </View>
              );
            })}
            {exceptions.length > 5 ? <Text style={styles.moreExceptions}>+{exceptions.length - 5} más…</Text> : null}
          </View>
        ) : (
          <View style={styles.emptyStateBox}>
            <Ionicons name="calendar-outline" size={22} color={theme.textMuted} />
            <Text style={styles.emptyText}>Sin fechas bloqueadas</Text>
          </View>
        )}
        <AnimatedPressable style={styles.addExceptionButton} onPress={() => setShowExceptionModal(true)} hoverLift={false}>
          <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
          <Text style={styles.addExceptionText}>Añadir excepción</Text>
        </AnimatedPressable>
      </Card>

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
            <View style={styles.controlsHeader}>
              <View>
                <Text style={styles.controlsTitle}>Patrones rápidos</Text>
                <Text style={styles.controlsSubtitle}>Aplica una base inicial y luego ajusta solo donde necesites.</Text>
              </View>
            </View>
            <View style={styles.presetsRow}>
              {QUICK_PRESETS.map((preset) => (
                <AnimatedPressable key={preset.id} style={styles.presetBtn} onPress={() => applyPreset(preset.id)} hoverLift={false}>
                  <Text style={styles.presetBtnText}>{preset.label}</Text>
                </AnimatedPressable>
              ))}
              <AnimatedPressable style={styles.copyBtn} onPress={() => copyDayToAll('monday')} hoverLift={false}>
                <Ionicons name="copy-outline" size={14} color={theme.primary} />
                <Text style={styles.copyBtnText}>Copiar lunes</Text>
              </AnimatedPressable>
            </View>
            </Card>
          </TourTarget>

          <Card variant="default" padding="none" style={styles.gridCard}>
            <TourTarget id="professional.availability.weekly-grid" fill style={styles.fullWidthTourTarget}>
              <View style={styles.gridIntro}>
                <Text style={styles.gridTitle}>Disponibilidad semanal</Text>
                <Text style={styles.gridSubtitle}>Activa días y pulsa en las franjas para marcar cuándo ofreces sesiones.</Text>
              </View>
            </TourTarget>
            <View style={styles.gridHeader}>
              <View style={styles.timeCol} />
              {DAYS.map((day) => (
                <AnimatedPressable key={day.name} style={styles.dayCol} onPress={() => toggleDayEnabled(day.name)} hoverLift={false}>
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

      <Modal visible={showExceptionModal} transparent animationType="fade" onRequestClose={() => setShowExceptionModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowExceptionModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloquear fecha</Text>
              <AnimatedPressable onPress={() => setShowExceptionModal(false)} style={styles.modalCloseButton} hoverLift={false}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </AnimatedPressable>
            </View>
            <View style={styles.modalCalendar}>
              <Calendar
                onDayPress={(day) => setSelectedExceptionDate(day.dateString)}
                markedDates={{
                  ...markedDates,
                  ...(selectedExceptionDate ? { [selectedExceptionDate]: { selected: true, selectedColor: theme.primary } } : {}),
                }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={calendarTheme}
              />
            </View>
            {selectedExceptionDate ? (
              <>
                <Text style={styles.modalLabel}>Tipo de ausencia</Text>
                <View style={styles.exTypeGrid}>
                  {EXCEPTION_TYPES.map((type) => {
                    const typeColor = getExceptionToneColor(theme, type);
                    const isSelected = selectedExceptionType === type.id;
                    return (
                      <AnimatedPressable
                        key={type.id}
                        style={isSelected ? [styles.exTypeBtn, { backgroundColor: `${typeColor}20`, borderColor: typeColor }] : styles.exTypeBtn}
                        onPress={() => setSelectedExceptionType(type.id)}
                        hoverLift={false}
                      >
                        <Ionicons name={type.icon} size={18} color={isSelected ? typeColor : theme.textSecondary} />
                        <Text style={[styles.exTypeBtnText, isSelected && { color: typeColor }]}>{type.label}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
                <View style={styles.modalActionWrap}>
                  <Button variant="primary" size="large" onPress={handleAddException} fullWidth>
                    Bloquear fecha
                  </Button>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

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

                    <View style={styles.previewSlots}>
                      {previewSlots.length > 0 ? (
                        previewSlots.map((slot) => (
                          <View key={slot.label} style={styles.previewSlot}>
                            <Text style={styles.previewSlotText}>{slot.label}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Todavía no hay horarios disponibles en lunes.</Text>
                      )}
                    </View>
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
    controlsHeader: { marginBottom: spacing.md },
    controlsTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontHeading },
    controlsSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: theme.textSecondary, fontFamily: theme.fontSans },
    presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    presetBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    presetBtnText: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    copyBtnText: { fontSize: 13, fontWeight: '600', color: theme.primary, fontFamily: theme.fontSansSemiBold },
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
    exceptionsList: { gap: spacing.sm },
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
    exceptionInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    exceptionText: { flex: 1 },
    exceptionDate: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    exceptionReason: { marginTop: 2, fontSize: 12, color: theme.textSecondary, fontFamily: theme.fontSans },
    exceptionRemoveButton: { padding: 4 },
    moreExceptions: { fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingTop: spacing.xs, fontFamily: theme.fontSans },
    emptyStateBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.xs,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    emptyText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', fontFamily: theme.fontSans },
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
    addExceptionText: { fontSize: 13, fontWeight: '600', color: theme.primary, fontFamily: theme.fontSansSemiBold },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.xl,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    modalTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, fontFamily: theme.fontHeading },
    modalCloseButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    modalCalendar: {
      marginBottom: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgElevated,
    },
    modalLabel: { marginBottom: spacing.sm, fontSize: 13, fontWeight: '700', color: theme.textPrimary, fontFamily: theme.fontSansBold },
    exTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    modalActionWrap: { marginTop: spacing.xs, paddingBottom: spacing.sm },
    exTypeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    exTypeBtnText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
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
    previewSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
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
