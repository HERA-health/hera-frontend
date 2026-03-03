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
  useWindowDimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import * as availabilityService from '../../services/availabilityService';
import * as analyticsService from '../../services/analyticsService';

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
  TIME_SLOTS.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
  if (hour < 21) {
    TIME_SLOTS.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
  }
}

const EXCEPTION_TYPES: ExceptionType[] = [
  { id: 'vacation', label: 'Vacaciones', icon: 'airplane-outline', color: '#7BA377' },
  { id: 'conference', label: 'Conferencia', icon: 'school-outline', color: '#8B9D83' },
  { id: 'personal', label: 'Personal', icon: 'person-outline', color: '#B8A8D9' },
  { id: 'holiday', label: 'Festivo', icon: 'calendar-outline', color: '#E89D88' },
  { id: 'other', label: 'Otro', icon: 'ellipsis-horizontal-outline', color: '#6B7B6B' },
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

const SESSION_DURATIONS = [
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
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
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
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
  const useTwoColumns = width >= 900;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlots>(createEmptyWeeklySlots());
  const [enabledDays, setEnabledDays] = useState<{ [key in DayOfWeek]: boolean }>({
    monday: true, tuesday: true, wednesday: true, thursday: true,
    friday: true, saturday: false, sunday: false,
  });
  const [exceptions, setExceptions] = useState<availabilityService.AvailabilityException[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Modal states
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedExceptionDate, setSelectedExceptionDate] = useState<string>('');
  const [selectedExceptionType, setSelectedExceptionType] = useState<string>('vacation');

  // Settings
  const [bufferTime, setBufferTime] = useState(15);
  const [sessionDurations, setSessionDurations] = useState<number[]>([60]);

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
    analyticsService.trackScreen('availability');
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ============================================================================
  // SLOT MANIPULATION
  // ============================================================================

  const toggleSlot = useCallback((day: DayOfWeek, time: string) => {
    if (!enabledDays[day]) return;
    setWeeklySlots((prev) => {
      const newSlots = { ...prev };
      newSlots[day] = { ...newSlots[day] };
      const currentState = newSlots[day][time];
      newSlots[day][time] = { ...currentState, available: !currentState.available, isBreak: false };
      return newSlots;
    });
    setHasChanges(true);
  }, [enabledDays]);

  const toggleDayEnabled = useCallback((day: DayOfWeek) => {
    setEnabledDays((prev) => {
      const newState = { ...prev, [day]: !prev[day] };
      if (!newState[day]) {
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

  const applyPreset = useCallback((presetId: string) => {
    const preset = QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const daysToApply = DAYS.filter((d) => enabledDays[d.name]).map((d) => d.name);
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
      const totalSlots = Object.values(weeklySlots).reduce((sum, daySlots) =>
        sum + Object.values(daySlots).filter(s => s.available).length, 0
      );
      analyticsService.track('availability_updated', { slotsCount: totalSlots });
      if (Platform.OS === 'web') {
        window.alert('Disponibilidad actualizada correctamente');
      } else {
        Alert.alert('Éxito', 'Disponibilidad actualizada correctamente');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'No se pudo guardar';
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
      const reason = exceptionType?.label || 'No disponible';
      await availabilityService.addException(selectedExceptionDate, reason, false);
      await loadData();
      setShowExceptionModal(false);
      setSelectedExceptionDate('');
    } catch (error: any) {
      const errorMessage = error.message || 'No se pudo añadir';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  }, [selectedExceptionDate, selectedExceptionType, loadData]);

  const handleRemoveException = useCallback(async (date: string) => {
    const confirmRemove = async () => {
      try {
        const dateOnly = date.split('T')[0];
        await availabilityService.removeException(dateOnly);
        await loadData();
      } catch (error: any) {
        const errorMessage = error.message || 'No se pudo eliminar';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar esta excepción?')) await confirmRemove();
    } else {
      Alert.alert('Eliminar', '¿Eliminar esta excepción?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmRemove },
      ]);
    }
  }, [loadData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const summary = useMemo(() => calculateWeeklySummary(weeklySlots), [weeklySlots]);

  const markedDates = useMemo(() => {
    return exceptions.reduce((acc, exception) => {
      const dateKey = exception.date.split('T')[0];
      acc[dateKey] = { marked: true, dotColor: heraLanding.warning };
      return acc;
    }, {} as any);
  }, [exceptions]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={heraLanding.primary} />
          <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
        </View>
      </View>
    );
  }

  // ============================================================================
  // RENDER: SIDEBAR CONTENT (Right Column)
  // ============================================================================

  const renderSidebar = () => (
    <View style={[styles.sidebar, !useTwoColumns && styles.sidebarStacked]}>
      {/* Summary Card */}
      <View style={styles.sidebarCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart-outline" size={18} color={heraLanding.primary} />
          <Text style={styles.cardTitle}>Resumen semanal</Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{summary.totalHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Total</Text>
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
        {/* Mini Chart */}
        <View style={styles.miniChart}>
          {DAYS.map((day) => {
            const hours = summary.dailyHours[day.name] || 0;
            const barHeight = Math.min((hours / 10) * 40, 40);
            return (
              <View key={day.name} style={styles.miniChartCol}>
                <View style={styles.miniChartBarBg}>
                  <View style={[styles.miniChartBar, { height: barHeight }]} />
                </View>
                <Text style={styles.miniChartLabel}>{day.shortLabel.charAt(0)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Exceptions Card */}
      <View style={styles.sidebarCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-clear-outline" size={18} color={heraLanding.warning} />
          <Text style={styles.cardTitle}>Excepciones</Text>
        </View>

        {exceptions.length > 0 ? (
          <View style={styles.exceptionsList}>
            {exceptions.slice(0, 5).map((exception) => {
              const exType = EXCEPTION_TYPES.find((t) =>
                exception.reason?.toLowerCase().includes(t.label.toLowerCase())
              ) || EXCEPTION_TYPES[4];
              return (
                <View key={exception.id} style={[styles.exceptionItem, { borderLeftColor: exType.color }]}>
                  <View style={styles.exceptionInfo}>
                    <Ionicons name={exType.icon} size={16} color={exType.color} />
                    <View style={styles.exceptionText}>
                      <Text style={styles.exceptionDate} numberOfLines={1}>
                        {new Date(exception.date).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'short',
                        })}
                      </Text>
                      <Text style={styles.exceptionReason} numberOfLines={1}>{exception.reason}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveException(exception.date)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={heraLanding.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
            {exceptions.length > 5 && (
              <Text style={styles.moreExceptions}>+{exceptions.length - 5} más...</Text>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>Sin fechas bloqueadas</Text>
        )}

        <TouchableOpacity
          style={styles.addExceptionButton}
          onPress={() => setShowExceptionModal(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color={heraLanding.primary} />
          <Text style={styles.addExceptionText}>Añadir excepción</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Card */}
      <View style={styles.sidebarCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="settings-outline" size={18} color={heraLanding.primary} />
          <Text style={styles.cardTitle}>Configuración</Text>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Buffer entre sesiones</Text>
          <View style={styles.settingOptions}>
            {BUFFER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.settingOption, bufferTime === opt.value && styles.settingOptionActive]}
                onPress={() => setBufferTime(opt.value)}
              >
                <Text style={[styles.settingOptionText, bufferTime === opt.value && styles.settingOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Duración de sesión</Text>
          <View style={styles.settingOptions}>
            {SESSION_DURATIONS.map((dur) => {
              const isActive = sessionDurations.includes(dur.value);
              return (
                <TouchableOpacity
                  key={dur.value}
                  style={[styles.settingOption, isActive && styles.settingOptionActive]}
                  onPress={() => {
                    if (isActive && sessionDurations.length > 1) {
                      setSessionDurations((prev) => prev.filter((d) => d !== dur.value));
                    } else if (!isActive) {
                      setSessionDurations((prev) => [...prev, dur.value]);
                    }
                  }}
                >
                  <Text style={[styles.settingOptionText, isActive && styles.settingOptionTextActive]}>
                    {dur.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );

  // ============================================================================
  // RENDER: MAIN CONTENT
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>Configurar Disponibilidad</Text>
          {hasChanges && (
            <View style={styles.unsavedBadge}>
              <Ionicons name="ellipse" size={8} color={heraLanding.warning} />
              <Text style={styles.unsavedText}>Sin guardar</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.previewBtn} onPress={() => setShowPreviewModal(true)}>
            <Ionicons name="eye-outline" size={18} color={heraLanding.textSecondary} />
            {!isMobile && <Text style={styles.previewBtnText}>Vista previa</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content - 2 Column Layout */}
      <View style={styles.mainContent}>
        {/* LEFT COLUMN: Grid */}
        <ScrollView
          style={[styles.leftColumn, useTwoColumns && styles.leftColumnDesktop]}
          contentContainerStyle={styles.leftColumnContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Quick Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.presetsLabel}>Patrones rápidos:</Text>
            <View style={styles.presetsRow}>
              {QUICK_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={styles.presetBtn}
                  onPress={() => applyPreset(preset.id)}
                >
                  <Text style={styles.presetBtnText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyDayToAll('monday')}>
                <Ionicons name="copy-outline" size={14} color={heraLanding.primary} />
                <Text style={styles.copyBtnText}>Copiar Lun</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekly Grid */}
          <View style={styles.gridCard}>
            {/* Grid Header */}
            <View style={styles.gridHeader}>
              <View style={styles.timeCol} />
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.name}
                  style={styles.dayCol}
                  onPress={() => toggleDayEnabled(day.name)}
                >
                  <View style={[styles.dayCheck, enabledDays[day.name] && styles.dayCheckActive]}>
                    {enabledDays[day.name] && <Ionicons name="checkmark" size={10} color="#FFF" />}
                  </View>
                  <Text style={[styles.dayLabel, !enabledDays[day.name] && styles.dayLabelDisabled]}>
                    {isMobile ? day.shortLabel.charAt(0) : isTablet ? day.shortLabel : day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grid Body */}
            <ScrollView
              style={styles.gridBody}
              contentContainerStyle={styles.gridBodyContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {TIME_SLOTS.map((slot) => (
                <View key={slot.label} style={styles.gridRow}>
                  <View style={styles.timeCol}>
                    {slot.minute === 0 && <Text style={styles.timeLabel}>{slot.label}</Text>}
                  </View>
                  {DAYS.map((day) => {
                    const slotState = weeklySlots[day.name]?.[slot.label];
                    const isAvailable = slotState?.available || false;
                    const isEnabled = enabledDays[day.name];
                    return (
                      <TouchableOpacity
                        key={`${day.name}-${slot.label}`}
                        style={[
                          styles.slotCell,
                          slot.minute === 0 && styles.slotCellHour,
                          !isEnabled && styles.slotCellDisabled,
                          isAvailable && styles.slotCellAvailable,
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

          {/* Show sidebar content below grid on mobile */}
          {!useTwoColumns && renderSidebar()}
        </ScrollView>

        {/* RIGHT COLUMN: Sidebar (Desktop only) */}
        {useTwoColumns && (
          <ScrollView
            style={styles.rightColumn}
            contentContainerStyle={styles.rightColumnContent}
            showsVerticalScrollIndicator={true}
          >
            {renderSidebar()}
          </ScrollView>
        )}
      </View>

      {/* Exception Modal */}
      <Modal visible={showExceptionModal} transparent animationType="fade" onRequestClose={() => setShowExceptionModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowExceptionModal(false)}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloquear fecha</Text>
              <TouchableOpacity onPress={() => setShowExceptionModal(false)}>
                <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalCalendar}>
              <Calendar
                onDayPress={(day) => setSelectedExceptionDate(day.dateString)}
                markedDates={{
                  ...markedDates,
                  ...(selectedExceptionDate ? { [selectedExceptionDate]: { selected: true, selectedColor: heraLanding.primary } } : {}),
                }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: '#FFFFFF',
                  calendarBackground: '#FFFFFF',
                  todayTextColor: heraLanding.primary,
                  selectedDayBackgroundColor: heraLanding.primary,
                  selectedDayTextColor: '#FFFFFF',
                  dayTextColor: heraLanding.textPrimary,
                  textDisabledColor: heraLanding.textMuted,
                  arrowColor: heraLanding.primary,
                  monthTextColor: heraLanding.textPrimary,
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                }}
              />
            </View>

            {selectedExceptionDate && (
              <>
                <Text style={styles.modalLabel}>Tipo de ausencia</Text>
                <View style={styles.exTypeGrid}>
                  {EXCEPTION_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.exTypeBtn,
                        selectedExceptionType === type.id && { backgroundColor: type.color + '20', borderColor: type.color },
                      ]}
                      onPress={() => setSelectedExceptionType(type.id)}
                    >
                      <Ionicons name={type.icon} size={18} color={selectedExceptionType === type.id ? type.color : heraLanding.textSecondary} />
                      <Text style={[styles.exTypeBtnText, selectedExceptionType === type.id && { color: type.color }]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddException}>
                  <Text style={styles.modalConfirmText}>Bloquear fecha</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Vista del cliente</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewBody}>
              <Text style={styles.previewDesc}>
                Así verán los clientes tu disponibilidad cuando agenden una sesión:
              </Text>
              <View style={styles.previewCalendar}>
                <Calendar
                  theme={{
                    backgroundColor: '#FFFFFF',
                    calendarBackground: '#FFFFFF',
                    todayTextColor: heraLanding.primary,
                    dayTextColor: heraLanding.textPrimary,
                    arrowColor: heraLanding.primary,
                    monthTextColor: heraLanding.textPrimary,
                  }}
                />
              </View>
              <Text style={styles.previewSlotsTitle}>Horarios disponibles (Lunes):</Text>
              <View style={styles.previewSlots}>
                {TIME_SLOTS.filter((slot) => weeklySlots.monday?.[slot.label]?.available).slice(0, 8).map((slot) => (
                  <View key={slot.label} style={styles.previewSlot}>
                    <Text style={styles.previewSlotText}>{slot.label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setShowPreviewModal(false)}>
              <Text style={styles.previewCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 15,
    color: heraLanding.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  unsavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: heraLanding.warning + '20',
    borderRadius: borderRadius.full,
  },
  unsavedText: {
    fontSize: 12,
    color: heraLanding.warning,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
  },
  previewBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
  },
  saveBtnDisabled: {
    backgroundColor: heraLanding.textMuted,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Main Content
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnDesktop: {
    flex: 0.6,
    borderRightWidth: 1,
    borderRightColor: heraLanding.border,
  },
  leftColumnContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  rightColumn: {
    flex: 0.4,
    backgroundColor: heraLanding.background,
  },
  rightColumnContent: {
    padding: spacing.lg,
  },

  // Presets
  presetsSection: {
    marginBottom: spacing.md,
  },
  presetsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.xs,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textPrimary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.primary,
    backgroundColor: '#FFFFFF',
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.primary,
  },

  // Grid
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  gridHeader: {
    flexDirection: 'row',
    backgroundColor: '#FAFBFA',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  timeCol: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  dayCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: heraLanding.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayCheckActive: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  dayLabelDisabled: {
    color: heraLanding.textMuted,
  },
  gridBody: {
    maxHeight: 520,
  },
  gridBodyContent: {
    flexGrow: 1,
  },
  gridRow: {
    flexDirection: 'row',
    height: 20,
  },
  timeLabel: {
    fontSize: 10,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
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
    fontSize: 12,
    color: heraLanding.textSecondary,
  },

  // Sidebar
  sidebar: {
    gap: spacing.md,
  },
  sidebarStacked: {
    marginTop: spacing.xl,
  },
  sidebarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // Summary
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statBlock: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  statLabel: {
    fontSize: 11,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: heraLanding.border,
  },
  miniChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  miniChartCol: {
    alignItems: 'center',
    gap: 4,
  },
  miniChartBarBg: {
    width: 20,
    height: 40,
    backgroundColor: heraLanding.borderLight,
    borderRadius: 4,
    justifyContent: 'flex-end',
  },
  miniChartBar: {
    width: '100%',
    backgroundColor: heraLanding.primary,
    borderRadius: 4,
  },
  miniChartLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: heraLanding.textMuted,
  },

  // Exceptions
  exceptionsList: {
    gap: spacing.xs,
  },
  exceptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: heraLanding.backgroundAlt,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  exceptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  exceptionText: {
    flex: 1,
  },
  exceptionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  exceptionReason: {
    fontSize: 11,
    color: heraLanding.textSecondary,
  },
  moreExceptions: {
    fontSize: 12,
    color: heraLanding.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: heraLanding.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  addExceptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.primary,
    borderStyle: 'dashed',
  },
  addExceptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.primary,
  },

  // Settings
  settingRow: {
    marginBottom: spacing.md,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textSecondary,
    marginBottom: spacing.xs,
  },
  settingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  settingOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
  },
  settingOptionActive: {
    borderColor: heraLanding.primary,
    backgroundColor: '#E8F5E8',
  },
  settingOptionText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  settingOptionTextActive: {
    color: heraLanding.primary,
  },

  // Modals
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
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  modalCalendar: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
  },
  exTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  exTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
  },
  exTypeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  modalConfirmBtn: {
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
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  previewContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    ...shadows.xl,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  previewBody: {
    padding: spacing.lg,
  },
  previewDesc: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  previewCalendar: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: heraLanding.border,
    marginBottom: spacing.lg,
  },
  previewSlotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    marginBottom: spacing.sm,
  },
  previewSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  previewSlot: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.background,
    borderWidth: 1,
    borderColor: heraLanding.primary,
  },
  previewSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.primary,
  },
  previewCloseBtn: {
    margin: spacing.lg,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: heraLanding.primary,
    alignItems: 'center',
  },
  previewCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfessionalAvailabilityScreen;
