import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { branding, colors, spacing, borderRadius } from '../../constants/colors';
import { GradientBackground } from '../../components/common/GradientBackground';
import * as sessionsService from '../../services/sessionsService';
import { SessionType, TimeSlot } from '../../services/sessionsService';

interface BookingScreenProps {
  route: {
    params: {
      specialistId: string;
      specialistName: string;
      pricePerSession: number;
      avatar?: string;
    };
  };
  navigation: any;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({ route, navigation }) => {
  console.log('🚀 ========== BOOKING SCREEN MOUNTED ==========');
  console.log('📦 Route params:', route.params);

  const { specialistId, specialistName, pricePerSession, avatar } = route.params;

  console.log('🔍 Extracted params:');
  console.log('   - specialistId:', specialistId);
  console.log('   - specialistName:', specialistName);
  console.log('   - pricePerSession:', pricePerSession);
  console.log('   - avatar:', avatar);

  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const today = new Date().toISOString().split('T')[0];
  console.log('📅 Today\'s date:', today);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('VIDEO_CALL');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    console.log('🚀 BookingScreen useEffect - Component fully mounted');
    console.log('🚀 Ready to receive date selections');
    console.log('🚀 ========== END BOOKING SCREEN MOUNT ==========');
  }, []);

  const loadAvailableSlots = async (date: string) => {
    console.log('📅 ========== BOOKING SCREEN: loadAvailableSlots ==========');
    console.log('📅 Date parameter:', date);
    console.log('📅 Date type:', typeof date);
    console.log('🔍 Specialist ID:', specialistId);
    console.log('🔍 Specialist Name:', specialistName);

    setLoadingSlots(true);
    setSelectedSlot(null);

    try {
      console.log('🔄 Calling sessionsService.getAvailableSlots...');
      const slots = await sessionsService.getAvailableSlots(specialistId, date);

      console.log('✅ Received slots:', slots);
      console.log('📊 Total slots:', slots?.length || 0);
      console.log('📊 Slots details:', JSON.stringify(slots, null, 2));

      // Filter slots - if 'available' property doesn't exist, treat as available
      const availableSlots = slots.filter(slot => slot.available !== false);
      console.log('✅ Available slots after filtering:', availableSlots.length);
      console.log('✅ Available slots:', availableSlots);
      console.log('📝 Note: Slots without "available" property are treated as available');

      setAvailableSlots(availableSlots);
      console.log('📅 ========== END loadAvailableSlots ==========');
    } catch (error: any) {
      console.error('❌ ========== ERROR in loadAvailableSlots ==========');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ ========== END ERROR ==========');

      Alert.alert('Error', error.message || 'No se pudieron cargar los horarios disponibles');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (day: DateData) => {
    console.log('📅 ========== DATE SELECTED ==========');
    console.log('📅 Full day object:', day);
    console.log('📅 day.dateString:', day.dateString);
    console.log('📅 day.timestamp:', day.timestamp);
    console.log('📅 day.year:', day.year);
    console.log('📅 day.month:', day.month);
    console.log('📅 day.day:', day.day);
    console.log('📅 ========== END DATE SELECTED ==========');

    setSelectedDate(day.dateString);
    loadAvailableSlots(day.dateString);
  };

  const handleConfirmBooking = async () => {
    console.log('🎯 ========== CONFIRM BOOKING ==========');
    console.log('📅 Selected date:', selectedDate);
    console.log('⏰ Selected slot:', selectedSlot);
    console.log('📱 Session type:', sessionType);

    if (!selectedDate || !selectedSlot) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    try {
      setLoading(true);

      // Combine date and time into ISO datetime with timezone
      // Create a proper Date object first
      const [hours, minutes] = selectedSlot.startTime.split(':');
      const dateObj = new Date(selectedDate);
      dateObj.setHours(parseInt(hours, 10));
      dateObj.setMinutes(parseInt(minutes, 10));
      dateObj.setSeconds(0);
      dateObj.setMilliseconds(0);

      // Convert to ISO string (includes timezone)
      const dateTime = dateObj.toISOString();

      console.log('📅 Original date string:', selectedDate);
      console.log('⏰ Original time string:', selectedSlot.startTime);
      console.log('📅 Created Date object:', dateObj);
      console.log('📅 ISO DateTime being sent:', dateTime);

      const sessionData = {
        specialistId,
        date: dateTime,
        duration: 60, // Default 60 minutes
        type: sessionType,
      };

      console.log('📤 Sending session data:', sessionData);

      const session = await sessionsService.createSession(sessionData);

      console.log('✅ Session created successfully!');
      console.log('📦 Session data:', session);
      console.log('🎯 ========== END CONFIRM BOOKING ==========');

      // Navigate to Sessions screen with refresh parameter
      navigation.navigate('Sessions', { refresh: true, showSuccess: true });

      // Show success message after navigation
      setTimeout(() => {
        const formattedDate = new Date(dateTime).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const formattedTime = selectedSlot.startTime;

        Alert.alert(
          '¡Reserva confirmada!',
          `Tu sesión con ${specialistName} ha sido solicitada.\n\nEstado: Pendiente de confirmación\nFecha: ${formattedDate}\nHora: ${formattedTime}`,
          [{ text: 'Entendido' }]
        );
      }, 500);
    } catch (error: any) {
      console.error('❌ ========== ERROR CREATING BOOKING ==========');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ ========== END ERROR ==========');
      Alert.alert('Error', error.message || 'No se pudo crear la cita. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getSessionTypeIcon = (type: SessionType): string => {
    switch (type) {
      case 'VIDEO_CALL':
        return 'videocam';
      case 'PHONE_CALL':
        return 'call';
      case 'IN_PERSON':
        return 'location';
    }
  };

  const getSessionTypeLabel = (type: SessionType): string => {
    switch (type) {
      case 'VIDEO_CALL':
        return 'Videollamada';
      case 'PHONE_CALL':
        return 'Llamada';
      case 'IN_PERSON':
        return 'Presencial';
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Header with Specialist Info */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={branding.accent} />
        </TouchableOpacity>

        <View style={styles.specialistInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarText}>{specialistName[0]}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.specialistDetails}>
            <Text style={styles.specialistName}>{specialistName}</Text>
            <View style={styles.priceRow}>
              <Ionicons name="cash-outline" size={16} color={branding.textSecondary} />
              <Text style={styles.priceText}>€{pricePerSession} / sesión</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciona una fecha</Text>
          <View style={styles.calendarCard}>
            <Calendar
              current={today}
              minDate={today}
              onDayPress={handleDateSelect}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: branding.accent,
                },
              }}
              theme={{
                backgroundColor: branding.cardBackground,
                calendarBackground: branding.cardBackground,
                textSectionTitleColor: branding.textSecondary,
                selectedDayBackgroundColor: branding.accent,
                selectedDayTextColor: branding.cardBackground,
                todayTextColor: branding.accent,
                dayTextColor: branding.text,
                textDisabledColor: branding.textLight,
                arrowColor: branding.accent,
                monthTextColor: branding.text,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayFontSize: 16,
                textMonthFontSize: 18,
              }}
            />
          </View>
        </View>

        {/* Time Slots Section */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horarios disponibles</Text>

            {loadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={branding.accent} />
                <Text style={styles.loadingText}>Cargando horarios...</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={branding.textLight} />
                <Text style={styles.emptyText}>No hay horarios disponibles</Text>
                <Text style={styles.emptySubtext}>
                  Selecciona otra fecha para ver más opciones
                </Text>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {availableSlots.map((slot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.slotButton,
                      selectedSlot?.startTime === slot.startTime && styles.slotSelected,
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="time"
                      size={16}
                      color={selectedSlot?.startTime === slot.startTime ? branding.cardBackground : branding.textSecondary}
                    />
                    <Text style={[
                      styles.slotText,
                      selectedSlot?.startTime === slot.startTime && styles.slotTextSelected
                    ]}>
                      {slot.startTime}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Session Type Selector */}
        {selectedDate && availableSlots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de sesión</Text>
            <View style={styles.typeGrid}>
              {(['VIDEO_CALL', 'PHONE_CALL', 'IN_PERSON'] as SessionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    sessionType === type && styles.typeSelected,
                  ]}
                  onPress={() => setSessionType(type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={getSessionTypeIcon(type) as any}
                    size={24}
                    color={sessionType === type ? branding.cardBackground : branding.primary}
                  />
                  <Text style={[
                    styles.typeText,
                    sessionType === type && styles.typeTextSelected
                  ]}>
                    {getSessionTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Summary Card */}
        {selectedDate && selectedSlot && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen de la reserva</Text>

            <View style={styles.summaryRow}>
              <Ionicons name="calendar" size={18} color={branding.textSecondary} />
              <Text style={styles.summaryLabel}>Fecha:</Text>
              <Text style={styles.summaryValue}>
                {new Date(selectedDate).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Ionicons name="time" size={18} color={branding.textSecondary} />
              <Text style={styles.summaryLabel}>Hora:</Text>
              <Text style={styles.summaryValue}>{selectedSlot.startTime}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Ionicons name={getSessionTypeIcon(sessionType) as any} size={18} color={branding.textSecondary} />
              <Text style={styles.summaryLabel}>Tipo:</Text>
              <Text style={styles.summaryValue}>{getSessionTypeLabel(sessionType)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Ionicons name="cash" size={18} color={branding.accent} />
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryPrice}>€{pricePerSession}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Confirm Button */}
      {selectedDate && selectedSlot && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              loading && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmBooking}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={branding.cardBackground} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={branding.cardBackground} />
                <Text style={styles.confirmText}>Confirmar Reserva</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // GradientBackground handles the background
  },
  header: {
    backgroundColor: branding.cardBackground,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.md,
  },
  specialistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: branding.primary,
    overflow: 'hidden',
    backgroundColor: branding.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    backgroundColor: `${branding.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: branding.primary,
  },
  specialistDetails: {
    flex: 1,
  },
  specialistName: {
    fontSize: 18,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
    fontSize: 16,
    color: branding.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg, // 20px - Generous spacing
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl, // 24px - Section spacing
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.md,
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
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: branding.textSecondary,
  },
  emptyState: {
    padding: spacing.xl * 2, // 48px - Generous empty state padding
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
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  slotButton: {
    width: '30%',
    minWidth: 100,
    height: 56,
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  slotSelected: {
    backgroundColor: branding.accent, // Lavanda
    borderColor: branding.accent,
  },
  slotText: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.text,
  },
  slotTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: branding.cardBackground,
  },
  typeGrid: {
    gap: spacing.md,
  },
  typeOption: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeSelected: {
    backgroundColor: branding.primary, // Verde Salvia
    borderColor: branding.primary,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.text,
  },
  typeTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: branding.cardBackground,
  },
  summaryCard: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: branding.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: branding.textSecondary,
    marginRight: spacing.sm,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginVertical: spacing.md,
  },
  summaryPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: branding.accent,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: branding.cardBackground,
    padding: spacing.lg, // Generous padding
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButton: {
    backgroundColor: branding.accent, // Lavanda
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
  confirmButtonDisabled: {
    backgroundColor: branding.textLight,
    shadowOpacity: 0,
  },
  confirmText: {
    color: branding.cardBackground,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default BookingScreen;
