/**
 * BookingScreen
 * Modern Calendly-style 4-column booking layout
 * Maximizes information density with no unnecessary scrolling
 *
 * Layout (Desktop >1200px):
 * [Sidebar] [Professional Info + Summary] [Calendar] [Time Slots]
 *
 * Responsive:
 * - Tablet (768-1200px): 2-column layout
 * - Mobile (<768px): Stacked layout with sticky summary
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { branding, colors, spacing, borderRadius, shadows, layout } from '../../constants/colors';
import { GradientBackground } from '../../components/common/GradientBackground';
import * as sessionsService from '../../services/sessionsService';
import { SessionType, TimeSlot } from '../../services/sessionsService';
import { ProfessionalInfoColumn, CompactCalendarColumn, TimeSlotsColumn } from './components';

interface BookingScreenProps {
  route: {
    params: {
      specialistId: string;
      specialistName: string;
      pricePerSession: number;
      avatar?: string;
      title?: string;
      specializations?: string[];
    };
  };
  navigation: any;
}

// Layout breakpoints
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
};

export const BookingScreen: React.FC<BookingScreenProps> = ({ route, navigation }) => {
  const { specialistId, specialistName, pricePerSession, avatar, title, specializations } = route.params;
  const { width, height } = useWindowDimensions();

  // Responsive layout detection
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isMobile = width < BREAKPOINTS.tablet;

  // State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('VIDEO_CALL'); // User can change
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Specialist info object for ProfessionalInfoColumn
  const specialist = useMemo(() => ({
    id: specialistId,
    name: specialistName,
    title: title || 'Especialista',
    avatar,
    pricePerSession,
    specializations: specializations || [],
    sessionDuration: 60,
  }), [specialistId, specialistName, title, avatar, pricePerSession, specializations]);

  // Booking state object for dynamic summary
  const bookingState = useMemo(() => ({
    selectedDate,
    selectedTime: selectedSlot?.startTime || null,
    sessionType,
  }), [selectedDate, selectedSlot, sessionType]);

  // Handle session type change
  const handleSessionTypeChange = useCallback((type: SessionType) => {
    setSessionType(type);
  }, []);

  // Load available slots for selected date
  const loadAvailableSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);

    try {
      const slots = await sessionsService.getAvailableSlots(specialistId, date);
      // Filter slots - if 'available' property doesn't exist, treat as available
      const available = slots.filter(slot => slot.available !== false);
      setAvailableSlots(available);
    } catch (error: any) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar los horarios disponibles');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [specialistId]);

  // Handle date selection
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    loadAvailableSlots(date);
  }, [loadAvailableSlots]);

  // Handle time slot selection
  const handleTimeSelect = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
  }, []);

  // Handle booking confirmation
  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert('Error', 'Por favor selecciona fecha y hora');
      return;
    }

    try {
      setLoading(true);

      // Combine date and time into ISO datetime
      const [hours, minutes] = selectedSlot.startTime.split(':');
      const dateObj = new Date(selectedDate);
      dateObj.setHours(parseInt(hours, 10));
      dateObj.setMinutes(parseInt(minutes, 10));
      dateObj.setSeconds(0);
      dateObj.setMilliseconds(0);

      const dateTime = dateObj.toISOString();

      const sessionData = {
        specialistId,
        date: dateTime,
        duration: 60,
        type: sessionType,
      };

      await sessionsService.createSession(sessionData);

      // Navigate to Sessions screen
      navigation.navigate('Sessions', { refresh: true, showSuccess: true });

      // Show success message after navigation
      setTimeout(() => {
        const formattedDate = new Date(dateTime).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const sessionTypeText = sessionType === 'VIDEO_CALL' ? 'Videollamada' : 'Presencial';

        Alert.alert(
          'Reserva confirmada',
          `Tu ${sessionTypeText.toLowerCase()} con ${specialistName} ha sido solicitada.\n\nEstado: Pendiente de confirmacion\nFecha: ${formattedDate}\nHora: ${selectedSlot.startTime}\nTipo: ${sessionTypeText}`,
          [{ text: 'Entendido' }]
        );
      }, 500);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la cita. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedSlot, specialistId, sessionType, specialistName, navigation]);

  // Calculate content height to avoid scrolling
  const contentHeight = Platform.OS === 'web' ? height - 40 : height - 80;

  // Render Desktop Layout (4 columns - sidebar handled by MainLayout)
  const renderDesktopLayout = () => (
    <View style={[styles.desktopContainer, { height: contentHeight }]}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButtonDesktop}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={branding.textSecondary} />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      {/* 3-Column Content (sidebar is handled by MainLayout) */}
      <View style={styles.columnsContainer}>
        {/* Column 1: Professional Info + Summary */}
        <ProfessionalInfoColumn
          specialist={specialist}
          booking={bookingState}
          onConfirm={handleConfirmBooking}
          onSessionTypeChange={handleSessionTypeChange}
          loading={loading}
        />

        {/* Column 2: Calendar */}
        <CompactCalendarColumn
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Column 3: Time Slots */}
        <TimeSlotsColumn
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          selectedTime={selectedSlot?.startTime || null}
          onTimeSelect={handleTimeSelect}
          loading={loadingSlots}
        />
      </View>
    </View>
  );

  // Render Tablet Layout (2 columns)
  const renderTabletLayout = () => (
    <View style={[styles.tabletContainer, { minHeight: contentHeight }]}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButtonTablet}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={branding.textSecondary} />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.tabletContent}>
        {/* Left Column: Professional Info + Calendar */}
        <View style={styles.tabletLeftColumn}>
          <ProfessionalInfoColumn
            specialist={specialist}
            booking={bookingState}
            onConfirm={handleConfirmBooking}
            onSessionTypeChange={handleSessionTypeChange}
            loading={loading}
          />
        </View>

        {/* Right Column: Calendar + Time Slots */}
        <View style={styles.tabletRightColumn}>
          <CompactCalendarColumn
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
          <TimeSlotsColumn
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            selectedTime={selectedSlot?.startTime || null}
            onTimeSelect={handleTimeSelect}
            loading={loadingSlots}
          />
        </View>
      </View>
    </View>
  );

  // Render Mobile Layout (stacked with sticky summary)
  const renderMobileLayout = () => (
    <View style={styles.mobileContainer}>
      {/* Header */}
      <View style={styles.mobileHeader}>
        <TouchableOpacity
          style={styles.backButtonMobile}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={branding.text} />
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>Reservar cita</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.mobileScroll}
        contentContainerStyle={styles.mobileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Specialist Info */}
        <View style={styles.mobileSpecialistCard}>
          <View style={styles.mobileSpecialistRow}>
            <View style={styles.mobileAvatarContainer}>
              {avatar ? (
                <View style={styles.mobileAvatar}>
                  <Text style={styles.mobileAvatarText}>{specialistName[0]}</Text>
                </View>
              ) : (
                <View style={styles.mobileAvatar}>
                  <Text style={styles.mobileAvatarText}>{specialistName[0]}</Text>
                </View>
              )}
            </View>
            <View style={styles.mobileSpecialistInfo}>
              <Text style={styles.mobileSpecialistName}>{specialistName}</Text>
              <Text style={styles.mobileSpecialistPrice}>{pricePerSession} / sesion</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.mobileSection}>
          <CompactCalendarColumn
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </View>

        {/* Time Slots */}
        <View style={styles.mobileSection}>
          <TimeSlotsColumn
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            selectedTime={selectedSlot?.startTime || null}
            onTimeSelect={handleTimeSelect}
            loading={loadingSlots}
          />
        </View>

        {/* Bottom padding for sticky summary */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Bottom Summary */}
      <View style={styles.mobileStickyFooter}>
        <View style={styles.mobileFooterSummary}>
          <View style={styles.mobileFooterInfo}>
            <Text style={styles.mobileFooterDate}>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Fecha'}
            </Text>
            <Text style={styles.mobileFooterTime}>
              {selectedSlot?.startTime || 'Hora'}
            </Text>
          </View>
          <View style={styles.mobileFooterPrice}>
            <Text style={styles.mobileFooterPriceText}>{pricePerSession}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.mobileConfirmButton,
              (!selectedDate || !selectedSlot) && styles.mobileConfirmButtonDisabled,
            ]}
            onPress={handleConfirmBooking}
            disabled={!selectedDate || !selectedSlot || loading}
          >
            <Text style={[
              styles.mobileConfirmButtonText,
              (!selectedDate || !selectedSlot) && styles.mobileConfirmButtonTextDisabled,
            ]}>
              {loading ? 'Reservando...' : 'Confirmar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        {isDesktop && renderDesktopLayout()}
        {isTablet && renderTabletLayout()}
        {isMobile && renderMobileLayout()}
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Desktop Layout Styles
  desktopContainer: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.md,
    overflow: 'hidden', // CRITICAL: Prevent page scroll
  },
  backButtonDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    backgroundColor: `${branding.cardBackground}80`,
    flexShrink: 0, // Don't shrink the back button
  },
  backButtonText: {
    fontSize: 14,
    color: branding.textSecondary,
    fontWeight: '500',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    alignItems: 'stretch', // CRITICAL: Stretch columns to fill height
    overflow: 'hidden', // Prevent overflow
  },

  // Tablet Layout Styles
  tabletContainer: {
    flex: 1,
    padding: spacing.lg,
    overflow: 'hidden', // CRITICAL: Prevent page scroll
  },
  backButtonTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    backgroundColor: `${branding.cardBackground}80`,
    flexShrink: 0, // Don't shrink the back button
  },
  tabletContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    overflow: 'hidden', // Prevent overflow
  },
  tabletLeftColumn: {
    width: 320,
    overflow: 'hidden',
  },
  tabletRightColumn: {
    flex: 1,
    gap: spacing.lg,
    overflow: 'hidden',
  },

  // Mobile Layout Styles
  mobileContainer: {
    flex: 1,
    backgroundColor: branding.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: branding.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    ...shadows.sm,
  },
  backButtonMobile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: branding.text,
  },
  mobileScroll: {
    flex: 1,
  },
  mobileScrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  mobileSpecialistCard: {
    backgroundColor: branding.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  mobileSpecialistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mobileAvatarContainer: {},
  mobileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${branding.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: branding.primary,
  },
  mobileAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: branding.primary,
  },
  mobileSpecialistInfo: {
    flex: 1,
  },
  mobileSpecialistName: {
    fontSize: 16,
    fontWeight: '600',
    color: branding.text,
    marginBottom: 2,
  },
  mobileSpecialistPrice: {
    fontSize: 14,
    color: branding.textSecondary,
  },
  mobileSection: {
    // Container for each section
  },
  mobileStickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: branding.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    ...shadows.lg,
  },
  mobileFooterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mobileFooterInfo: {
    flex: 1,
  },
  mobileFooterDate: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.text,
    textTransform: 'capitalize',
  },
  mobileFooterTime: {
    fontSize: 13,
    color: branding.textSecondary,
  },
  mobileFooterPrice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${branding.accent}20`,
    borderRadius: borderRadius.md,
  },
  mobileFooterPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: branding.accent,
  },
  mobileConfirmButton: {
    backgroundColor: branding.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  mobileConfirmButtonDisabled: {
    backgroundColor: colors.neutral.gray200,
  },
  mobileConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: branding.cardBackground,
  },
  mobileConfirmButtonTextDisabled: {
    color: branding.textLight,
  },
});

export default BookingScreen;
