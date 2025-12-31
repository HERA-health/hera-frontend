import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius, shadows } from '../../constants/colors';
import * as availabilityService from '../../services/availabilityService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface DayConfig {
  name: DayOfWeek;
  label: string;
  shortLabel: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

interface SlotState {
  available: boolean;
  isBreak: boolean;
}

type DaySlots = { [key: string]: SlotState };
type WeeklySlots = { [key in DayOfWeek]: DaySlots };

interface ExceptionType {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS: DayConfig[] = [
  { name: 'monday', label: 'Lunes', shortLabel: 'Lun' },
  { name: 'tuesday', label: 'Martes', shortLabel: 'Mar' },
  { name: 'wednesday', label: 'Miércoles', shortLabel: 'Mié' },
  { name: 'thursday', label: 'Jueves', shortLabel: 'Jue' },
  { name: 'friday', label: 'Viernes', shortLabel: 'Vie' },
  { name: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
  { name: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
];

// Time slots from 8:00 to 21:00 (30-minute intervals)
const TIME_SLOTS: TimeSlot[] = [];
for (let hour = 8; hour <= 21; hour++) {
  TIME_SLOTS.push({
    hour,
    minute: 0,
    label: `${hour.toString().padStart(2, '0')}:00`,
  });
  if (hour < 21) {
    TIME_SLOTS.push({
      hour,
      minute: 30,
      label: `${hour.toString().padStart(2, '0')}:30`,
    });
  }
}

const EXCEPTION_TYPES: ExceptionType[] = [
  { id: 'vacation', label: 'Vacaciones', icon: 'airplane-outline', color: '#7BA377' },
  { id: 'conference', label: 'Conferencia/Formación', icon: 'school-outline', color: '#8B9D83' },
  { id: 'personal', label: 'Asunto personal', icon: 'person-outline', color: '#B8A8D9' },
  { id: 'holiday', label: 'Día festivo', icon: 'calendar-outline', color: '#E89D88' },
  { id: 'other', label: 'Otro', icon: 'ellipsis-horizontal-outline', color: '#6B7B6B' },
];

const QUICK_PRESETS = [
  { id: 'morning', label: 'Mañana', slots: { start: '09:00', end: '14:00' } },
  { id: 'afternoon', label: 'Tarde', slots: { start: '15:00', end: '20:00' } },
  { id: 'full', label: 'Jornada completa', slots: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '20:00' }] },
];

const BUFFER_OPTIONS = [
  { value: 0, label: 'Sin descanso' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
];

const SESSION_DURATIONS = [
  { value: 45, label: '45 minutos', description: 'Sesión breve' },
  { value: 60, label: '60 minutos', description: 'Sesión estándar' },
  { value: 90, label: '90 minutos', description: 'Sesión extendida' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createEmptyDaySlots = (): DaySlots => {
  const slots: DaySlots = {};
  TIME_SLOTS.forEach((slot) => {
    slots[slot.label] = { available: false, isBreak: false };
  });
  return slots;
};

const createEmptyWeeklySlots = (): WeeklySlots => {
  const weeklySlots: WeeklySlots = {} as WeeklySlots;
  DAYS.forEach((day) => {
    weeklySlots[day.name] = createEmptyDaySlots();
  });
  return weeklySlots;
};

const convertScheduleToSlots = (schedule: availabilityService.WeeklySchedule): WeeklySlots => {
  const weeklySlots = createEmptyWeeklySlots();

  DAYS.forEach((day) => {
    const daySchedule = schedule[day.name];
    if (daySchedule) {
      const startMinutes = parseInt(daySchedule.start.split(':')[0]) * 60 + parseInt(daySchedule.start.split(':')[1]);
      const endMinutes = parseInt(daySchedule.end.split(':')[0]) * 60 + parseInt(daySchedule.end.split(':')[1]);

      TIME_SLOTS.forEach((slot) => {
        const slotMinutes = slot.hour * 60 + slot.minute;
        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
          weeklySlots[day.name][slot.label].available = true;
        }
      });
    }
  });

  return weeklySlots;
};

const convertSlotsToSchedule = (weeklySlots: WeeklySlots): availabilityService.WeeklySchedule => {
  const schedule: availabilityService.WeeklySchedule = {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  };

  DAYS.forEach((day) => {
    const daySlots = weeklySlots[day.name];
    const availableSlots = TIME_SLOTS.filter((slot) => daySlots[slot.label]?.available);

    if (availableSlots.length > 0) {
      const firstSlot = availableSlots[0];
      const lastSlot = availableSlots[availableSlots.length - 1];

      schedule[day.name] = {
        start: firstSlot.label,
        end: `${(lastSlot.hour + (lastSlot.minute === 30 ? 1 : 0)).toString().padStart(2, '0')}:${lastSlot.minute === 30 ? '00' : '30'}`,
      };
    }
  });

  return schedule;
};

const calculateWeeklySummary = (weeklySlots: WeeklySlots) => {
  let totalMinutes = 0;
  let activeDays = 0;
  const dailyHours: { [key: string]: number } = {};

  DAYS.forEach((day) => {
    const daySlots = weeklySlots[day.name];
    const availableCount = TIME_SLOTS.filter((slot) => daySlots[slot.label]?.available).length;
    const dayMinutes = availableCount * 30;
    dailyHours[day.name] = dayMinutes / 60;

    if (dayMinutes > 0) {
      totalMinutes += dayMinutes;
      activeDays++;
    }
  });

  return {
    totalHours: totalMinutes / 60,
    totalMinutes,
    activeDays,
    possibleSessions: Math.floor(totalMinutes / 60),
    dailyHours,
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProfessionalAvailabilityScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlots>(createEmptyWeeklySlots());
  const [enabledDays, setEnabledDays] = useState<{ [key in DayOfWeek]: boolean }>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });
  const [exceptions, setExceptions] = useState<availabilityService.AvailabilityException[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Modal states
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedExceptionDate, setSelectedExceptionDate] = useState<string>('');
  const [selectedExceptionType, setSelectedExceptionType] = useState<string>('vacation');
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState<string>('');

  // Settings
  const [bufferTime, setBufferTime] = useState(15);
  const [sessionDurations, setSessionDurations] = useState<number[]>([60]);
  const [showSettings, setShowSettings] = useState(false);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartSlot, setDragStartSlot] = useState<{ day: DayOfWeek; time: string } | null>(null);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [scheduleData, exceptionsData] = await Promise.all([
        availabilityService.getMyWeeklySchedule(),
        availabilityService.getMyExceptions(),
      ]);

      const slots = convertScheduleToSlots(scheduleData);
      setWeeklySlots(slots);

      // Update enabled days based on schedule
      const newEnabledDays = { ...enabledDays };
      DAYS.forEach((day) => {
        newEnabledDays[day.name] = scheduleData[day.name] !== null;
      });
      setEnabledDays(newEnabledDays);

      setExceptions(exceptionsData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la disponibilidad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // SLOT MANIPULATION
  // ============================================================================

  const toggleSlot = useCallback((day: DayOfWeek, time: string) => {
    if (!enabledDays[day]) return;

    setWeeklySlots((prev) => {
      const newSlots = { ...prev };
      newSlots[day] = { ...newSlots[day] };
      const currentState = newSlots[day][time];
      newSlots[day][time] = {
        ...currentState,
        available: !currentState.available,
        isBreak: false,
      };
      return newSlots;
    });
    setHasChanges(true);
  }, [enabledDays]);

  const toggleDayEnabled = useCallback((day: DayOfWeek) => {
    setEnabledDays((prev) => {
      const newState = { ...prev, [day]: !prev[day] };
      if (!newState[day]) {
        // Clear all slots for this day when disabled
        setWeeklySlots((prevSlots) => {
          const newSlots = { ...prevSlots };
          newSlots[day] = createEmptyDaySlots();
          return newSlots;
        });
      }
      return newState;
    });
    setHasChanges(true);
  }, []);

  const applyPreset = useCallback((presetId: string, targetDay?: DayOfWeek) => {
    const preset = QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const daysToApply = targetDay ? [targetDay] : DAYS.filter((d) => enabledDays[d.name]).map((d) => d.name);

    setWeeklySlots((prev) => {
      const newSlots = { ...prev };

      daysToApply.forEach((day) => {
        newSlots[day] = createEmptyDaySlots();

        const ranges = Array.isArray(preset.slots) ? preset.slots : [preset.slots];
        ranges.forEach((range) => {
          const startMinutes = parseInt(range.start.split(':')[0]) * 60 + parseInt(range.start.split(':')[1]);
          const endMinutes = parseInt(range.end.split(':')[0]) * 60 + parseInt(range.end.split(':')[1]);

          TIME_SLOTS.forEach((slot) => {
            const slotMinutes = slot.hour * 60 + slot.minute;
            if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
              newSlots[day][slot.label] = { available: true, isBreak: false };
            }
          });
        });
      });

      return newSlots;
    });
    setHasChanges(true);
  }, [enabledDays]);

  const copyDayToAll = useCallback((sourceDay: DayOfWeek) => {
    setWeeklySlots((prev) => {
      const newSlots = { ...prev };
      const sourceSlots = prev[sourceDay];

      DAYS.forEach((day) => {
        if (day.name !== sourceDay && enabledDays[day.name]) {
          newSlots[day.name] = { ...sourceSlots };
        }
      });

      return newSlots;
    });
    setHasChanges(true);
  }, [enabledDays]);

  // ============================================================================
  // SAVE HANDLER
  // ============================================================================

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const schedule = convertSlotsToSchedule(weeklySlots);
      await availabilityService.updateWeeklySchedule(schedule);
      setHasChanges(false);

      if (Platform.OS === 'web') {
        window.alert('Disponibilidad actualizada correctamente');
      } else {
        Alert.alert('Éxito', 'Disponibilidad actualizada correctamente');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'No se pudo guardar la disponibilidad';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }, [weeklySlots]);

  // ============================================================================
  // EXCEPTIONS HANDLERS
  // ============================================================================

  const handleAddException = useCallback(async () => {
    if (!selectedExceptionDate) return;

    try {
      const exceptionType = EXCEPTION_TYPES.find((t) => t.id === selectedExceptionType);
      const reason = exceptionReason || exceptionType?.label || 'No disponible';

      await availabilityService.addException(selectedExceptionDate, reason, false);
      await loadData();

      setShowExceptionModal(false);
      setSelectedExceptionDate('');
      setExceptionReason('');
      setExceptionEndDate('');

      if (Platform.OS === 'web') {
        window.alert('Excepción añadida correctamente');
      } else {
        Alert.alert('Éxito', 'Excepción añadida correctamente');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'No se pudo añadir la excepción';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  }, [selectedExceptionDate, selectedExceptionType, exceptionReason, loadData]);

  const handleRemoveException = useCallback(async (date: string) => {
    const confirmRemove = async () => {
      try {
        const dateOnly = date.split('T')[0];
        await availabilityService.removeException(dateOnly);
        await loadData();

        if (Platform.OS === 'web') {
          window.alert('Excepción eliminada');
        } else {
          Alert.alert('Éxito', 'Excepción eliminada');
        }
      } catch (error: any) {
        const errorMessage = error.message || 'No se pudo eliminar la excepción';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas eliminar esta excepción?')) {
        await confirmRemove();
      }
    } else {
      Alert.alert(
        'Eliminar excepción',
        '¿Deseas eliminar esta excepción?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: confirmRemove },
        ]
      );
    }
  }, [loadData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const summary = useMemo(() => calculateWeeklySummary(weeklySlots), [weeklySlots]);

  const markedDates = useMemo(() => {
    return exceptions.reduce((acc, exception) => {
      const dateKey = exception.date.split('T')[0];
      acc[dateKey] = {
        marked: true,
        dotColor: heraLanding.warning,
        selected: false,
      };
      return acc;
    }, {} as any);
  }, [exceptions]);

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.loadingContainer]}>
          <ActivityIndicator size="large" color={heraLanding.primary} />
          <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
        </View>
      </View>
    );
  }

  // ============================================================================
  // RENDER: MAIN CONTENT
  // ============================================================================

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.pageTitle}>Configurar Disponibilidad</Text>
              <Text style={styles.pageSubtitle}>
                Define cuándo estás disponible para sesiones
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => setShowPreviewModal(true)}
              >
                <Ionicons name="eye-outline" size={20} color={heraLanding.textSecondary} />
                <Text style={styles.previewButtonText}>Vista previa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !hasChanges && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Guardar cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {hasChanges && (
            <View style={styles.unsavedBanner}>
              <Ionicons name="warning-outline" size={16} color={heraLanding.warning} />
              <Text style={styles.unsavedText}>Tienes cambios sin guardar</Text>
            </View>
          )}
        </View>

        {/* Quick Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Patrones rápidos</Text>
          <View style={styles.presetsRow}>
            {QUICK_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={styles.presetButton}
                onPress={() => applyPreset(preset.id)}
              >
                <Text style={styles.presetButtonText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.presetButton, styles.copyButton]}
              onPress={() => copyDayToAll('monday')}
            >
              <Ionicons name="copy-outline" size={16} color={heraLanding.primary} />
              <Text style={[styles.presetButtonText, { color: heraLanding.primary }]}>
                Copiar Lun a todos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Schedule Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={22} color={heraLanding.primary} />
            <Text style={styles.sectionTitle}>Horario Semanal</Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridCard}>
              {/* Grid Header - Days */}
              <View style={styles.gridHeader}>
                <View style={styles.timeColumn} />
                {DAYS.map((day) => (
                  <View key={day.name} style={styles.dayColumn}>
                    <TouchableOpacity
                      style={styles.dayHeaderButton}
                      onPress={() => toggleDayEnabled(day.name)}
                    >
                      <View style={[
                        styles.dayCheckbox,
                        enabledDays[day.name] && styles.dayCheckboxChecked,
                      ]}>
                        {enabledDays[day.name] && (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={[
                        styles.dayLabel,
                        !enabledDays[day.name] && styles.dayLabelDisabled,
                      ]}>
                        {isMobile ? day.shortLabel : day.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Grid Body - Time Slots */}
              <ScrollView
                style={styles.gridBody}
                contentContainerStyle={styles.gridBodyContent}
                showsVerticalScrollIndicator={true}
              >
                {TIME_SLOTS.map((slot, index) => (
                  <View key={slot.label} style={styles.gridRow}>
                    <View style={styles.timeColumn}>
                      {slot.minute === 0 && (
                        <Text style={styles.timeLabel}>{slot.label}</Text>
                      )}
                    </View>
                    {DAYS.map((day) => {
                      const slotState = weeklySlots[day.name]?.[slot.label];
                      const isAvailable = slotState?.available || false;
                      const isBreak = slotState?.isBreak || false;
                      const isEnabled = enabledDays[day.name];

                      return (
                        <TouchableOpacity
                          key={`${day.name}-${slot.label}`}
                          style={[
                            styles.slotCell,
                            slot.minute === 0 && styles.slotCellHour,
                            !isEnabled && styles.slotCellDisabled,
                            isAvailable && styles.slotCellAvailable,
                            isBreak && styles.slotCellBreak,
                          ]}
                          onPress={() => toggleSlot(day.name, slot.label)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        />
                      );
                    })}
                  </View>
                ))}
              </ScrollView>

              {/* Legend */}
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
            </View>
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart-outline" size={22} color={heraLanding.primary} />
            <Text style={styles.sectionTitle}>Resumen semanal</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.totalHours.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>Total semanal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>~{summary.possibleSessions}</Text>
                <Text style={styles.statLabel}>Sesiones posibles</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.activeDays}</Text>
                <Text style={styles.statLabel}>Días activos</Text>
              </View>
            </View>

            {/* Daily Hours Bar Chart */}
            <View style={styles.dailyChart}>
              {DAYS.map((day) => {
                const hours = summary.dailyHours[day.name] || 0;
                const maxHours = 12;
                const barWidth = Math.min((hours / maxHours) * 100, 100);

                return (
                  <View key={day.name} style={styles.chartRow}>
                    <Text style={styles.chartLabel}>{day.shortLabel}</Text>
                    <View style={styles.chartBarContainer}>
                      <View
                        style={[
                          styles.chartBar,
                          { width: `${barWidth}%` },
                          hours === 0 && styles.chartBarEmpty,
                        ]}
                      />
                    </View>
                    <Text style={styles.chartValue}>{hours.toFixed(1)}h</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Exceptions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-clear-outline" size={22} color={heraLanding.warning} />
            <Text style={styles.sectionTitle}>Fechas bloqueadas</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Marca vacaciones, días festivos u otras fechas en las que no estarás disponible
          </Text>

          {/* Calendar for picking exception dates */}
          <View style={styles.calendarCard}>
            <Calendar
              onDayPress={(day) => {
                setSelectedExceptionDate(day.dateString);
                setShowExceptionModal(true);
              }}
              markedDates={markedDates}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: heraLanding.textSecondary,
                selectedDayBackgroundColor: heraLanding.primary,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: heraLanding.primary,
                dayTextColor: heraLanding.textPrimary,
                textDisabledColor: heraLanding.textMuted,
                dotColor: heraLanding.warning,
                arrowColor: heraLanding.primary,
                monthTextColor: heraLanding.textPrimary,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayFontSize: 14,
                textMonthFontSize: 16,
              }}
            />
          </View>

          {/* Exceptions List */}
          {exceptions.length > 0 ? (
            <View style={styles.exceptionsList}>
              {exceptions.map((exception) => {
                const exceptionType = EXCEPTION_TYPES.find((t) =>
                  exception.reason?.toLowerCase().includes(t.label.toLowerCase())
                ) || EXCEPTION_TYPES[4];

                return (
                  <View
                    key={exception.id}
                    style={[
                      styles.exceptionCard,
                      { borderLeftColor: exceptionType.color },
                    ]}
                  >
                    <View style={styles.exceptionIcon}>
                      <Ionicons
                        name={exceptionType.icon}
                        size={20}
                        color={exceptionType.color}
                      />
                    </View>
                    <View style={styles.exceptionContent}>
                      <Text style={styles.exceptionDate}>
                        {new Date(exception.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                      {exception.reason && (
                        <Text style={styles.exceptionReason}>{exception.reason}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.exceptionDeleteButton}
                      onPress={() => handleRemoveException(exception.date)}
                    >
                      <Ionicons name="trash-outline" size={18} color={heraLanding.warning} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyExceptions}>
              <Ionicons name="calendar-outline" size={48} color={heraLanding.textMuted} />
              <Text style={styles.emptyTitle}>No hay fechas bloqueadas</Text>
              <Text style={styles.emptySubtitle}>
                Toca una fecha en el calendario para bloquearla
              </Text>
            </View>
          )}
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingsHeader}
            onPress={() => setShowSettings(!showSettings)}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={22} color={heraLanding.primary} />
              <Text style={styles.sectionTitle}>Configuración avanzada</Text>
            </View>
            <Ionicons
              name={showSettings ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={heraLanding.textSecondary}
            />
          </TouchableOpacity>

          {showSettings && (
            <View style={styles.settingsContent}>
              {/* Buffer Time */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Tiempo entre sesiones</Text>
                <Text style={styles.settingDescription}>
                  Descanso automático después de cada sesión
                </Text>
                <View style={styles.settingOptions}>
                  {BUFFER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        bufferTime === option.value && styles.optionButtonSelected,
                      ]}
                      onPress={() => setBufferTime(option.value)}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        bufferTime === option.value && styles.optionButtonTextSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Session Durations */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Duraciones de sesión disponibles</Text>
                <Text style={styles.settingDescription}>
                  Los clientes podrán elegir entre estas opciones
                </Text>
                <View style={styles.settingOptions}>
                  {SESSION_DURATIONS.map((duration) => {
                    const isSelected = sessionDurations.includes(duration.value);
                    return (
                      <TouchableOpacity
                        key={duration.value}
                        style={[
                          styles.durationOption,
                          isSelected && styles.durationOptionSelected,
                        ]}
                        onPress={() => {
                          if (isSelected && sessionDurations.length > 1) {
                            setSessionDurations(prev => prev.filter(d => d !== duration.value));
                          } else if (!isSelected) {
                            setSessionDurations(prev => [...prev, duration.value]);
                          }
                        }}
                      >
                        <View style={[
                          styles.durationCheckbox,
                          isSelected && styles.durationCheckboxSelected,
                        ]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          )}
                        </View>
                        <View>
                          <Text style={styles.durationLabel}>{duration.label}</Text>
                          <Text style={styles.durationDescription}>{duration.description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Exception Modal */}
      <Modal
        visible={showExceptionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExceptionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExceptionModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloquear fecha</Text>
              <TouchableOpacity onPress={() => setShowExceptionModal(false)}>
                <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDateText}>
              {selectedExceptionDate && new Date(selectedExceptionDate + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>

            <Text style={styles.modalLabel}>Tipo de ausencia</Text>
            <View style={styles.exceptionTypeGrid}>
              {EXCEPTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.exceptionTypeButton,
                    selectedExceptionType === type.id && styles.exceptionTypeButtonSelected,
                    { borderColor: type.color },
                  ]}
                  onPress={() => setSelectedExceptionType(type.id)}
                >
                  <Ionicons
                    name={type.icon}
                    size={20}
                    color={selectedExceptionType === type.id ? type.color : heraLanding.textSecondary}
                  />
                  <Text style={[
                    styles.exceptionTypeText,
                    selectedExceptionType === type.id && { color: type.color },
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExceptionModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleAddException}
              >
                <Text style={styles.modalConfirmText}>Bloquear fecha</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewModalHeader}>
              <Text style={styles.previewModalTitle}>Vista previa del cliente</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewBody}>
              <Text style={styles.previewDescription}>
                Así verán los clientes tu disponibilidad cuando quieran agendar una sesión:
              </Text>

              <View style={styles.previewCalendar}>
                <Calendar
                  markedDates={Object.fromEntries(
                    DAYS.filter(d => enabledDays[d.name])
                      .flatMap(d => {
                        // Mark next 4 weeks of available days
                        const dates: [string, any][] = [];
                        for (let i = 0; i < 28; i++) {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          if (date.getDay() === (DAYS.indexOf(d) + 1) % 7) {
                            dates.push([
                              date.toISOString().split('T')[0],
                              { marked: true, dotColor: heraLanding.primary }
                            ]);
                          }
                        }
                        return dates;
                      })
                  )}
                  theme={{
                    backgroundColor: '#FFFFFF',
                    calendarBackground: '#FFFFFF',
                    todayTextColor: heraLanding.primary,
                    dayTextColor: heraLanding.textPrimary,
                    textDisabledColor: heraLanding.textMuted,
                    arrowColor: heraLanding.primary,
                    monthTextColor: heraLanding.textPrimary,
                  }}
                />
              </View>

              <View style={styles.previewSlots}>
                <Text style={styles.previewSlotsTitle}>Horarios disponibles (ejemplo):</Text>
                <View style={styles.previewSlotsGrid}>
                  {TIME_SLOTS.filter((slot, i) => i < 8 && weeklySlots.monday?.[slot.label]?.available).map((slot) => (
                    <View key={slot.label} style={styles.previewSlotButton}>
                      <Text style={styles.previewSlotText}>{slot.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setShowPreviewModal(false)}
            >
              <Text style={styles.previewCloseText}>Cerrar vista previa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Save Button (Mobile) */}
      {isMobile && hasChanges && (
        <View style={styles.floatingSave}>
          <TouchableOpacity
            style={styles.floatingSaveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.floatingSaveText}>Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background, // #F5F7F5 - THE SACRED BACKGROUND
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: heraLanding.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },

  // Header
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: heraLanding.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
  },
  saveButtonDisabled: {
    backgroundColor: heraLanding.textMuted,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    padding: 12,
    backgroundColor: 'rgba(232, 157, 136, 0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.warning,
  },
  unsavedText: {
    fontSize: 14,
    color: heraLanding.warning,
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },

  // Presets
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: heraLanding.primary,
  },

  // Grid
  gridContainer: {
    marginTop: spacing.sm,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  gridHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    backgroundColor: '#FAFBFA',
  },
  timeColumn: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayHeaderButton: {
    alignItems: 'center',
    gap: 4,
  },
  dayCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: heraLanding.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayCheckboxChecked: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  dayLabelDisabled: {
    color: heraLanding.textMuted,
  },
  gridBody: {
    maxHeight: 400,
  },
  gridBodyContent: {
    paddingBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    height: 24,
  },
  timeLabel: {
    fontSize: 11,
    color: heraLanding.textMuted,
    fontWeight: '500',
  },
  slotCell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: heraLanding.borderLight,
    backgroundColor: '#FFFFFF',
  },
  slotCellHour: {
    borderBottomColor: heraLanding.border,
  },
  slotCellDisabled: {
    backgroundColor: '#F8F9F8',
  },
  slotCellAvailable: {
    backgroundColor: '#E8F5E8',
  },
  slotCellBreak: {
    backgroundColor: '#F5F5F5',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  legendAvailable: {
    backgroundColor: '#E8F5E8',
  },
  legendUnavailable: {
    backgroundColor: '#FFFFFF',
  },
  legendText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },

  // Summary
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  statLabel: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: heraLanding.border,
  },
  dailyChart: {
    gap: spacing.sm,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartLabel: {
    width: 32,
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: heraLanding.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: heraLanding.primary,
    borderRadius: 4,
  },
  chartBarEmpty: {
    backgroundColor: 'transparent',
  },
  chartValue: {
    width: 40,
    fontSize: 13,
    color: heraLanding.textSecondary,
    textAlign: 'right',
  },

  // Calendar
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
    marginBottom: spacing.md,
  },

  // Exceptions List
  exceptionsList: {
    gap: spacing.sm,
  },
  exceptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  exceptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: heraLanding.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  exceptionContent: {
    flex: 1,
  },
  exceptionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    textTransform: 'capitalize',
  },
  exceptionReason: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  exceptionDeleteButton: {
    padding: spacing.sm,
  },

  // Empty State
  emptyExceptions: {
    alignItems: 'center',
    padding: spacing.xl * 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: heraLanding.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Settings
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  settingItem: {
    marginBottom: spacing.xl,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginBottom: spacing.md,
  },
  settingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: heraLanding.primary,
    backgroundColor: '#E8F5E8',
  },
  optionButtonText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: heraLanding.primary,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
    minWidth: 160,
  },
  durationOptionSelected: {
    borderColor: heraLanding.primary,
    backgroundColor: '#E8F5E8',
  },
  durationCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: heraLanding.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationCheckboxSelected: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  durationDescription: {
    fontSize: 12,
    color: heraLanding.textSecondary,
  },

  // Exception Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  modalDateText: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.lg,
    textAlign: 'center',
    padding: spacing.md,
    backgroundColor: heraLanding.backgroundAlt,
    borderRadius: borderRadius.md,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
  },
  exceptionTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  exceptionTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
  },
  exceptionTypeButtonSelected: {
    backgroundColor: 'rgba(139, 157, 131, 0.1)',
  },
  exceptionTypeText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: heraLanding.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Preview Modal
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  previewModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...shadows.xl,
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  previewModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  previewBody: {
    padding: spacing.lg,
  },
  previewDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  previewCalendar: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: heraLanding.border,
    marginBottom: spacing.lg,
  },
  previewSlots: {
    marginBottom: spacing.lg,
  },
  previewSlotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.md,
  },
  previewSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewSlotButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.background,
    borderWidth: 1,
    borderColor: heraLanding.primary,
  },
  previewSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  previewCloseButton: {
    margin: spacing.lg,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
    alignItems: 'center',
  },
  previewCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Floating Save Button
  floatingSave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
    ...shadows.lg,
  },
  floatingSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
  },
  floatingSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfessionalAvailabilityScreen;
