import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { branding, colors, spacing, borderRadius } from '../../constants/colors';
import { GradientBackground } from '../../components/common/GradientBackground';
import * as availabilityService from '../../services/availabilityService';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface DayConfig {
  name: DayOfWeek;
  label: string;
}

const DAYS: DayConfig[] = [
  { name: 'monday', label: 'Lunes' },
  { name: 'tuesday', label: 'Martes' },
  { name: 'wednesday', label: 'Miércoles' },
  { name: 'thursday', label: 'Jueves' },
  { name: 'friday', label: 'Viernes' },
  { name: 'saturday', label: 'Sábado' },
  { name: 'sunday', label: 'Domingo' },
];

export function ProfessionalAvailabilityScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<availabilityService.WeeklySchedule>({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  });
  const [exceptions, setExceptions] = useState<availabilityService.AvailabilityException[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedTimeType, setSelectedTimeType] = useState<'start' | 'end'>('start');
  const [tempTime, setTempTime] = useState(new Date());

  // Exception picker state
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedExceptionDate, setSelectedExceptionDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scheduleData, exceptionsData] = await Promise.all([
        availabilityService.getMyWeeklySchedule(),
        availabilityService.getMyExceptions(),
      ]);
      setSchedule(scheduleData);
      setExceptions(exceptionsData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cargar la disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { start: '09:00', end: '17:00' },
    }));
    setHasChanges(true);
  };

  const openTimePicker = (day: DayOfWeek, type: 'start' | 'end') => {
    console.log('🔥🔥🔥 ========== OPEN TIME PICKER ==========');
    console.log('🔥 Day:', day);
    console.log('🔥 Type:', type);
    console.log('🔥 Platform:', Platform.OS);
    console.log('🔥 Current schedule:', schedule[day]);

    setSelectedDay(day);
    setSelectedTimeType(type);

    const currentTime = schedule[day]?.[type] || '09:00';
    console.log('🔥 Current time string:', currentTime);

    const [hours, minutes] = currentTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    console.log('🔥 Date object created:', date);
    console.log('🔥 Setting showTimePicker to TRUE');

    setTempTime(date);
    setShowTimePicker(true);

    console.log('🔥 State updated, modal should appear now');
    console.log('🔥 ========== END OPEN TIME PICKER ==========');
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    console.log(`⏰ [AvailabilityScreen] Time changed:`, {
      event: event?.type,
      selectedDate,
      platform: Platform.OS
    });

    // On Android, dismiss is automatic
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    // Handle dismiss without selection
    if (event?.type === 'dismissed') {
      console.log(`⏰ [AvailabilityScreen] User dismissed picker`);
      setShowTimePicker(false);
      return;
    }

    // Update time if a date was selected
    if (selectedDate && selectedDay) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      console.log(`⏰ [AvailabilityScreen] Updating ${selectedDay} ${selectedTimeType} to ${timeString}`);

      setSchedule((prev) => ({
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay]!,
          [selectedTimeType]: timeString,
        },
      }));
      setHasChanges(true);

      // For iOS, keep picker open for continuous editing
      // User can tap elsewhere to close
      if (Platform.OS !== 'ios') {
        setShowTimePicker(false);
      }
    }
  };

  const closeTimePicker = () => {
    console.log(`⏰ [AvailabilityScreen] Closing time picker`);
    setShowTimePicker(false);
  };

  const handleSave = async () => {
    // Validate schedule
    for (const day of DAYS) {
      const daySchedule = schedule[day.name];
      if (daySchedule) {
        const start = daySchedule.start.split(':').map(Number);
        const end = daySchedule.end.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];

        if (startMinutes >= endMinutes) {
          Alert.alert(
            'Error de validación',
            `La hora de inicio debe ser anterior a la hora de fin para ${day.label}`
          );
          return;
        }
      }
    }

    try {
      setSaving(true);
      await availabilityService.updateWeeklySchedule(schedule);
      setHasChanges(false);
      Alert.alert('Éxito', 'Horario actualizado correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar el horario');
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = (dateString: string) => {
    console.log('🔥🔥🔥 ========== HANDLE ADD EXCEPTION ==========');
    console.log('🔥 Function called!');
    console.log('🔥 Date string:', dateString);
    console.log('🔥 Platform:', Platform.OS);

    // Format date for display
    const displayDate = new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    console.log('🔥 Formatted date:', displayDate);
    console.log('🔥 About to show confirmation dialog...');

    // Use platform-specific dialog
    if (Platform.OS === 'web') {
      console.log('🔥 Using window.confirm for web');
      const confirmed = window.confirm(
        `¿Deseas marcar ${displayDate} como no disponible?`
      );

      console.log('🔥 User response:', confirmed);

      if (confirmed) {
        console.log('🔥 User confirmed, adding exception...');
        (async () => {
          try {
            await availabilityService.addException(dateString, 'No disponible', false);
            console.log('✅ Exception added successfully');
            await loadData();
            window.alert('Fecha marcada como no disponible');
          } catch (error: any) {
            console.error('❌ Error adding exception:', error);
            window.alert('Error: ' + (error.message || 'No se pudo agregar la excepción'));
          }
        })();
      } else {
        console.log('🔥 User cancelled');
      }
    } else {
      console.log('🔥 Using Alert.alert for mobile');
      Alert.alert(
        'Marcar fecha como no disponible',
        `¿Deseas marcar ${displayDate} como no disponible?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => console.log('🔥 User cancelled')
          },
          {
            text: 'Confirmar',
            onPress: async () => {
              console.log('🔥 User confirmed, adding exception...');
              try {
                await availabilityService.addException(dateString, 'No disponible', false);
                console.log('✅ Exception added successfully');
                await loadData(); // Reload to get updated exceptions
                Alert.alert('Éxito', 'Fecha marcada como no disponible');
              } catch (error: any) {
                console.error('❌ Error adding exception:', error);
                Alert.alert('Error', error.message || 'No se pudo agregar la excepción');
              }
            },
          },
        ]
      );
    }
    console.log('🔥 ========== END HANDLE ADD EXCEPTION ==========');
  };

  const handleRemoveException = async (exceptionId: string, date: string) => {
    Alert.alert(
      'Eliminar excepción',
      `¿Deseas eliminar esta excepción?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Extract just the date part (YYYY-MM-DD)
              const dateOnly = date.split('T')[0];
              await availabilityService.removeException(dateOnly);
              await loadData(); // Reload to get updated exceptions
              Alert.alert('Éxito', 'Excepción eliminada');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar la excepción');
            }
          },
        },
      ]
    );
  };

  // Create marked dates object for calendar
  const markedDates = exceptions.reduce((acc, exception) => {
    const dateKey = exception.date.split('T')[0];
    acc[dateKey] = {
      marked: true,
      dotColor: exception.isAvailable ? branding.primary : branding.error,
      selected: false,
    };
    return acc;
  }, {} as any);

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={branding.accent} />
          <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={branding.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Disponibilidad</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Weekly Schedule Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={24} color={branding.primary} />
              <Text style={styles.sectionTitle}>Horario Semanal</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Configura los días y horarios en los que estás disponible para sesiones
            </Text>

            <View style={styles.card}>
              {DAYS.map((day) => {
                const isEnabled = schedule[day.name] !== null;
                const daySchedule = schedule[day.name];

                return (
                  <View key={day.name} style={styles.dayRow}>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleDay(day.name)}
                        trackColor={{
                          false: colors.neutral.gray300,
                          true: branding.primary + '80',
                        }}
                        thumbColor={isEnabled ? branding.primary : colors.neutral.gray400}
                      />
                    </View>

                    {isEnabled && daySchedule && (
                      <View style={styles.timePickersRow}>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => openTimePicker(day.name, 'start')}
                        >
                          <Ionicons name="time-outline" size={16} color={branding.textSecondary} />
                          <Text style={styles.timeText}>{daySchedule.start}</Text>
                        </TouchableOpacity>

                        <Text style={styles.timeSeparator}>—</Text>

                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => openTimePicker(day.name, 'end')}
                        >
                          <Ionicons name="time-outline" size={16} color={branding.textSecondary} />
                          <Text style={styles.timeText}>{daySchedule.end}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Unavailable Dates Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="close-circle-outline" size={24} color={branding.error} />
              <Text style={styles.sectionTitle}>Fechas No Disponibles</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Marca días específicos en los que no estarás disponible (vacaciones, días festivos, etc.)
            </Text>

            {/* Calendar */}
            <View style={styles.calendarCard}>
              <Calendar
                onDayPress={(day) => {
                  console.log('🔥🔥🔥 CALENDAR DAY PRESSED!!!');
                  console.log('🔥 Full day object:', day);
                  console.log('🔥 Date string:', day.dateString);
                  console.log('🔥 Calling handleAddException...');
                  handleAddException(day.dateString);
                }}
                markedDates={markedDates}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: branding.cardBackground,
                  calendarBackground: branding.cardBackground,
                  textSectionTitleColor: branding.textSecondary,
                  selectedDayBackgroundColor: branding.accent,
                  selectedDayTextColor: branding.cardBackground,
                  todayTextColor: branding.accent,
                  dayTextColor: branding.text,
                  textDisabledColor: branding.textLight,
                  dotColor: branding.error,
                  selectedDotColor: branding.cardBackground,
                  arrowColor: branding.accent,
                  monthTextColor: branding.text,
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                }}
              />
            </View>

            {/* Exceptions List */}
            {exceptions.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.exceptionsTitle}>Fechas marcadas</Text>
                {exceptions.map((exception) => (
                  <View key={exception.id} style={styles.exceptionRow}>
                    <View style={styles.exceptionInfo}>
                      <Ionicons
                        name="calendar"
                        size={20}
                        color={exception.isAvailable ? branding.primary : branding.error}
                      />
                      <View style={styles.exceptionText}>
                        <Text style={styles.exceptionDate}>
                          {new Date(exception.date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </Text>
                        {exception.reason && (
                          <Text style={styles.exceptionReason}>{exception.reason}</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveException(exception.id, exception.date)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={branding.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {exceptions.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={branding.textLight} />
                <Text style={styles.emptyText}>No hay fechas marcadas</Text>
                <Text style={styles.emptySubtext}>
                  Toca una fecha en el calendario para marcarla como no disponible
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={branding.cardBackground} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color={branding.cardBackground} />
                  <Text style={styles.saveText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Time Picker Modal */}
        {showTimePicker && Platform.OS === 'ios' && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showTimePicker}
            onRequestClose={closeTimePicker}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeTimePicker}>
                    <Text style={styles.modalButton}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>
                    Seleccionar hora
                  </Text>
                  <TouchableOpacity onPress={closeTimePicker}>
                    <Text style={[styles.modalButton, styles.modalButtonDone]}>Listo</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleTimeChange}
                  minuteInterval={15}
                  textColor={branding.text}
                  style={styles.timePicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Time Picker */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
            minuteInterval={15}
          />
        )}

        {/* Web Time Picker - Use Native HTML Input */}
        {showTimePicker && Platform.OS === 'web' && (
          <Modal
            transparent={true}
            animationType="fade"
            visible={showTimePicker}
            onRequestClose={closeTimePicker}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={closeTimePicker}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeTimePicker}>
                    <Text style={styles.modalButton}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Seleccionar hora</Text>
                  <TouchableOpacity onPress={() => {
                    console.log('🔥 [Web] Done pressed, current tempTime:', tempTime);
                    handleTimeChange({ type: 'set' }, tempTime);
                    closeTimePicker();
                  }}>
                    <Text style={[styles.modalButton, styles.modalButtonDone]}>Listo</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.webTimePickerContainer}>
                  <input
                    type="time"
                    value={tempTime.toTimeString().slice(0, 5)}
                    onChange={(e) => {
                      console.log('🔥 [Web] Time input changed:', e.target.value);
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDate = new Date();
                      newDate.setHours(hours);
                      newDate.setMinutes(minutes);
                      setTempTime(newDate);
                    }}
                    step="900"
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '18px',
                      border: `2px solid ${branding.accent}`,
                      borderRadius: '8px',
                      backgroundColor: branding.cardBackground,
                      color: branding.text,
                    }}
                  />
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: branding.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: branding.cardBackground,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: branding.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: branding.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: branding.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  card: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dayRow: {
    marginBottom: spacing.md,
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.text,
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral.gray100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.text,
  },
  timeSeparator: {
    fontSize: 16,
    color: branding.textSecondary,
  },
  calendarCard: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.md,
  },
  exceptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.text,
    marginBottom: spacing.md,
  },
  exceptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  exceptionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exceptionText: {
    flex: 1,
  },
  exceptionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.text,
    textTransform: 'capitalize',
  },
  exceptionReason: {
    fontSize: 12,
    color: branding.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  emptyState: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: branding.textLight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: branding.cardBackground,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    backgroundColor: branding.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: branding.textLight,
    shadowOpacity: 0,
  },
  saveText: {
    color: branding.cardBackground,
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal styles for time picker
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: branding.cardBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: branding.text,
  },
  modalButton: {
    fontSize: 16,
    color: branding.textSecondary,
    padding: spacing.sm,
  },
  modalButtonDone: {
    color: branding.accent,
    fontWeight: '600',
  },
  timePicker: {
    height: 200,
    backgroundColor: branding.cardBackground,
  },
  webTimePickerContainer: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
});

export default ProfessionalAvailabilityScreen;
