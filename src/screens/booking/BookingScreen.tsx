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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/colors';
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
    <View style={styles.container}>
      {/* Header with Specialist Info */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>

        <View style={styles.specialistInfo}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarBorder}
            >
              <View style={styles.avatarInner}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{specialistName[0]}</Text>
                )}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.specialistDetails}>
            <Text style={styles.specialistName}>{specialistName}</Text>
            <View style={styles.priceRow}>
              <Ionicons name="cash-outline" size={16} color="#666" />
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
                  selectedColor: '#2196F3',
                },
              }}
              theme={{
                backgroundColor: colors.neutral.white,
                calendarBackground: colors.neutral.white,
                textSectionTitleColor: colors.neutral.gray600,
                selectedDayBackgroundColor: colors.primary.main,
                selectedDayTextColor: colors.neutral.white,
                todayTextColor: colors.primary.main,
                dayTextColor: colors.neutral.gray900,
                textDisabledColor: colors.neutral.gray300,
                arrowColor: colors.primary.main,
                monthTextColor: colors.neutral.gray900,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayFontSize: 15,
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
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Cargando horarios...</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
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
                    {selectedSlot?.startTime === slot.startTime ? (
                      <LinearGradient
                        colors={['#2196F3', '#00897B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.slotGradient}
                      >
                        <Ionicons name="time" size={16} color="#fff" />
                        <Text style={styles.slotTextSelected}>{slot.startTime}</Text>
                      </LinearGradient>
                    ) : (
                      <>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.slotText}>{slot.startTime}</Text>
                      </>
                    )}
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
                  {sessionType === type ? (
                    <LinearGradient
                      colors={['#2196F3', '#00897B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.typeGradient}
                    >
                      <Ionicons
                        name={getSessionTypeIcon(type) as any}
                        size={24}
                        color="#fff"
                      />
                      <Text style={styles.typeTextSelected}>
                        {getSessionTypeLabel(type)}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <>
                      <Ionicons
                        name={getSessionTypeIcon(type) as any}
                        size={24}
                        color="#666"
                      />
                      <Text style={styles.typeText}>
                        {getSessionTypeLabel(type)}
                      </Text>
                    </>
                  )}
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
              <Ionicons name="calendar" size={18} color="#666" />
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
              <Ionicons name="time" size={18} color="#666" />
              <Text style={styles.summaryLabel}>Hora:</Text>
              <Text style={styles.summaryValue}>{selectedSlot.startTime}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Ionicons name={getSessionTypeIcon(sessionType) as any} size={18} color="#666" />
              <Text style={styles.summaryLabel}>Tipo:</Text>
              <Text style={styles.summaryValue}>{getSessionTypeLabel(sessionType)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Ionicons name="cash" size={18} color="#2196F3" />
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
            style={styles.confirmButton}
            onPress={handleConfirmBooking}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.confirmText}>Confirmar Reserva</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 12,
  },
  specialistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  specialistDetails: {
    flex: 1,
  },
  specialistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 8,
    textAlign: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotButton: {
    width: '30%',
    minWidth: 100,
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  slotSelected: {
    borderWidth: 0,
  },
  slotGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  slotText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  slotTextSelected: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  typeGrid: {
    gap: 12,
  },
  typeOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  typeSelected: {
    borderWidth: 0,
  },
  typeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeTextSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
    textTransform: 'capitalize',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  summaryPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  confirmText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BookingScreen;
