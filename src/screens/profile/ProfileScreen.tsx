/**
 * ProfileScreen - Client Profile & Settings
 *
 * A clean, trustworthy settings interface inspired by Apple Settings, Stripe,
 * and modern healthcare apps. Designed to feel secure, professional, and effortless.
 *
 * Two Essential Tabs:
 * 1. Información Personal - Personal details and profile management
 * 2. Pagos y Facturación - Payment methods and transaction history
 *
 * Design Principles:
 * - Trust: Professional enough to enter payment info confidently
 * - Clarity: Instantly understand what each section does
 * - Security: Visual cues that data is protected
 * - Simplicity: No overwhelming options, just essentials
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

// Only import DateTimePicker for native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { heraLanding, spacing, typography, borderRadius, shadows } from '../../constants/colors';
import { ProfileTab } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import * as authService from '../../services/authService';
import * as clientService from '../../services/clientService';
import { AddressAutocomplete, AddressDetails } from '../../components/location/AddressAutocomplete';
import LocationMapPreview from '../../components/location/LocationMapPreview';
import * as analyticsService from '../../services/analyticsService';

// ============================================================================
// MOCK DATA - Payment & Transactions
// ============================================================================

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  specialistName: string;
  status: 'paid' | 'pending' | 'refunded';
}

// Mock data for demonstration
const mockPaymentMethod: PaymentMethod | null = null; // Set to null to show empty state

const mockTransactions: Transaction[] = [
  // Uncomment to show transactions:
  // {
  //   id: '1',
  //   date: new Date('2024-12-30'),
  //   amount: 65.00,
  //   currency: '€',
  //   description: 'Sesión de terapia',
  //   specialistName: 'Dra. Elena Rodríguez',
  //   status: 'paid',
  // },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format phone number - only allow digits, +, and spaces
 * Auto-formats as: +34 600 123 456
 */
const formatPhoneNumber = (value: string): string => {
  // Only keep digits, + and spaces
  let cleaned = value.replace(/[^\d+\s]/g, '');

  // Ensure + is only at the beginning
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\+/g, '');

  // Remove extra spaces and format
  const digits = cleaned.replace(/\s/g, '');

  if (digits.length === 0) return hasPlus ? '+' : '';

  // Format: +XX XXX XXX XXX
  let formatted = '';
  if (hasPlus) formatted = '+';

  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 5 || i === 8) {
      formatted += ' ';
    }
    formatted += digits[i];
  }

  return formatted;
};

/**
 * Format date for display
 */
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Parse date string (DD/MM/YYYY) to Date object
 */
const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProfileScreen: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    user?.birthDate || new Date(1990, 0, 1)
  );

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(mockPaymentMethod);
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Card form state
  const [cardForm, setCardForm] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  // Email verification state
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Location state
  const [locationData, setLocationData] = useState({
    homeAddress: '',
    homeCity: '',
    homePostalCode: '',
    homeCountry: 'Spain',
    homeLat: null as number | null,
    homeLng: null as number | null,
  });
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Form data - now includes city and postalCode
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate ? user.birthDate.toLocaleDateString('es-ES') : '',
    city: '',
    postalCode: '',
  });

  // Track original values for change detection
  const [originalData, setOriginalData] = useState({ ...formData });

  useEffect(() => {
    analyticsService.trackScreen('client_profile');
  }, []);

  useEffect(() => {
    if (user) {
      const newData = {
        fullName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birthDate: user.birthDate ? user.birthDate.toLocaleDateString('es-ES') : '',
        city: '',
        postalCode: '',
      };
      setFormData(newData);
      setOriginalData(newData);
      if (user.birthDate) {
        setSelectedDate(user.birthDate);
      }
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  // Load client location data on mount
  useEffect(() => {
    const loadLocationData = async () => {
      if (user?.type !== 'client') {
        setIsLoadingLocation(false);
        return;
      }

      try {
        setIsLoadingLocation(true);
        const profile = await clientService.getMyClientProfile();
        setLocationData({
          homeAddress: profile.homeAddress || '',
          homeCity: profile.homeCity || '',
          homePostalCode: profile.homePostalCode || '',
          homeCountry: profile.homeCountry || 'Spain',
          homeLat: profile.homeLat,
          homeLng: profile.homeLng,
        });
      } catch (error) {
        // Silent fail - location is optional
        console.log('Failed to load location data:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    loadLocationData();
  }, [user?.type]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const pickImageFromLibrary = useCallback(async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para cambiar la foto de perfil'
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu cámara para tomar una foto'
        );
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  }, []);

  const uploadAvatar = useCallback(async (base64: string) => {
    setIsUploadingAvatar(true);
    try {
      const updatedUser = await authService.uploadAvatar(base64);

      updateUser({
        avatar: updatedUser.avatar,
      });

      Alert.alert('Foto actualizada', 'Tu foto de perfil se ha guardado correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo subir la foto');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [updateUser]);

  const handleChangePhoto = useCallback(() => {
    if (isUploadingAvatar) return;

    // On web, only show gallery option (camera not supported)
    if (Platform.OS === 'web') {
      pickImageFromLibrary();
      return;
    }

    Alert.alert(
      'Cambiar foto de perfil',
      'Selecciona una opción',
      [
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Elegir de galería', onPress: pickImageFromLibrary },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }, [isUploadingAvatar, pickImageFromLibrary, takePhoto]);

  const handleSaveProfile = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const birthDateISO = formData.birthDate
        ? new Date(formData.birthDate.split('/').reverse().join('-')).toISOString()
        : undefined;

      const updatedUser = await authService.updateProfile({
        name: formData.fullName,
        phone: formData.phone || undefined,
        birthDate: birthDateISO,
      });

      updateUser({
        name: updatedUser.name,
        phone: updatedUser.phone,
        birthDate: updatedUser.birthDate ? new Date(updatedUser.birthDate) : null,
        avatar: updatedUser.avatar,
      });

      setOriginalData({ ...formData });

      // Show success feedback
      Alert.alert('✓ Cambios guardados', 'Tu perfil ha sido actualizado correctamente');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }, [formData, hasChanges, updateUser]);

  // Phone number handler - filters input
  const handlePhoneChange = useCallback((text: string) => {
    const formatted = formatPhoneNumber(text);
    // Limit to reasonable phone length
    if (formatted.replace(/\s/g, '').length <= 15) {
      setFormData(prev => ({ ...prev, phone: formatted }));
    }
  }, []);

  // Email verification handler
  const handleVerifyEmail = useCallback(async () => {
    if (!user?.email) return;

    setIsVerifyingEmail(true);
    analyticsService.track('resend_verification_clicked');
    try {
      await authService.resendVerificationEmail(user.email);
      Alert.alert(
        'Email enviado',
        'Hemos enviado un correo de verificación a tu bandeja de entrada. Revisa también la carpeta de spam.'
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo enviar el email de verificación. Inténtalo de nuevo.'
      );
    } finally {
      setIsVerifyingEmail(false);
    }
  }, [user?.email]);

  // Location handlers
  const handleAddressSelect = useCallback(async (details: AddressDetails) => {
    setLocationError(null);
    setIsSavingLocation(true);

    try {
      await clientService.updateClientLocation({
        address: details.address,
        city: details.city,
        postalCode: details.postalCode,
        country: details.country,
        lat: details.lat,
        lng: details.lng,
      });

      setLocationData({
        homeAddress: details.address,
        homeCity: details.city,
        homePostalCode: details.postalCode,
        homeCountry: details.country,
        homeLat: details.lat,
        homeLng: details.lng,
      });

      Alert.alert('Ubicación guardada', 'Tu ubicación se ha actualizado correctamente.');
    } catch (error) {
      console.error('Error saving location:', error);
      setLocationError('No se pudo guardar la ubicación. Intenta de nuevo.');
      Alert.alert('Error', 'No se pudo guardar la ubicación. Intenta de nuevo.');
    } finally {
      setIsSavingLocation(false);
    }
  }, []);

  const handleClearLocation = useCallback(async () => {
    Alert.alert(
      'Eliminar ubicación',
      '¿Estás seguro de que quieres eliminar tu ubicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsSavingLocation(true);
            try {
              await clientService.clearClientLocation();
              setLocationData({
                homeAddress: '',
                homeCity: '',
                homePostalCode: '',
                homeCountry: 'Spain',
                homeLat: null,
                homeLng: null,
              });
              Alert.alert('Ubicación eliminada', 'Tu ubicación ha sido eliminada.');
            } catch (error) {
              console.error('Error clearing location:', error);
              Alert.alert('Error', 'No se pudo eliminar la ubicación.');
            } finally {
              setIsSavingLocation(false);
            }
          },
        },
      ]
    );
  }, []);

  // Date picker handlers
  const handleOpenDatePicker = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedDate(date);
      const formattedDate = date.toLocaleDateString('es-ES');
      setFormData(prev => ({ ...prev, birthDate: formattedDate }));
    }
  }, []);

  const handleConfirmDate = useCallback(() => {
    const formattedDate = selectedDate.toLocaleDateString('es-ES');
    setFormData(prev => ({ ...prev, birthDate: formattedDate }));
    setShowDatePicker(false);
  }, [selectedDate]);

  const handleCancelDate = useCallback(() => {
    // Reset to original date if exists
    if (formData.birthDate) {
      const parsed = parseDateString(formData.birthDate);
      if (parsed) setSelectedDate(parsed);
    }
    setShowDatePicker(false);
  }, [formData.birthDate]);

  const handleAddCard = useCallback(() => {
    setIsAddingCard(true);
  }, []);

  const handleCancelAddCard = useCallback(() => {
    setIsAddingCard(false);
    setCardForm({ number: '', expiry: '', cvv: '', name: '' });
  }, []);

  const handleSaveCard = useCallback(() => {
    // Validate card (simplified)
    if (cardForm.number.length < 16 || !cardForm.expiry || !cardForm.cvv || !cardForm.name) {
      Alert.alert('Error', 'Por favor, completa todos los campos de la tarjeta.');
      return;
    }

    // Mock saving card
    const newCard: PaymentMethod = {
      id: Date.now().toString(),
      type: cardForm.number.startsWith('4') ? 'visa' : 'mastercard',
      last4: cardForm.number.slice(-4),
      expiryMonth: cardForm.expiry.split('/')[0],
      expiryYear: cardForm.expiry.split('/')[1],
      isDefault: true,
    };

    setPaymentMethod(newCard);
    setIsAddingCard(false);
    setCardForm({ number: '', expiry: '', cvv: '', name: '' });
    Alert.alert('✓ Tarjeta añadida', 'Tu método de pago se ha guardado correctamente.');
  }, [cardForm]);

  const handleRemoveCard = useCallback(() => {
    Alert.alert(
      'Eliminar tarjeta',
      '¿Estás seguro de que quieres eliminar este método de pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setPaymentMethod(null);
            Alert.alert('Tarjeta eliminada', 'Tu método de pago ha sido eliminado.');
          }
        },
      ]
    );
  }, []);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const groups = numbers.match(/.{1,4}/g);
    return groups ? groups.join(' ').slice(0, 19) : '';
  };

  // Format expiry date
  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  // Calculate min/max dates for date picker
  const minDate = new Date(1920, 0, 1);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18); // Must be 18+

  // ============================================================================
  // WEB DATE PICKER - Custom scrollable picker for web
  // ============================================================================

  // Generate arrays for day, month, year selection
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: 0, label: 'Enero' },
    { value: 1, label: 'Febrero' },
    { value: 2, label: 'Marzo' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Mayo' },
    { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Septiembre' },
    { value: 9, label: 'Octubre' },
    { value: 10, label: 'Noviembre' },
    { value: 11, label: 'Diciembre' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 - 17 }, (_, i) => currentYear - 18 - i);

  // Temporary state for web picker
  const [tempDay, setTempDay] = useState(selectedDate.getDate());
  const [tempMonth, setTempMonth] = useState(selectedDate.getMonth());
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear());

  // Reset temp values when picker opens
  useEffect(() => {
    if (showDatePicker) {
      setTempDay(selectedDate.getDate());
      setTempMonth(selectedDate.getMonth());
      setTempYear(selectedDate.getFullYear());
    }
  }, [showDatePicker, selectedDate]);

  const handleWebDateConfirm = useCallback(() => {
    // Validate the day for the selected month/year
    const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
    const validDay = Math.min(tempDay, daysInMonth);
    const newDate = new Date(tempYear, tempMonth, validDay);

    setSelectedDate(newDate);
    const formattedDate = newDate.toLocaleDateString('es-ES');
    setFormData(prev => ({ ...prev, birthDate: formattedDate }));
    setShowDatePicker(false);
  }, [tempDay, tempMonth, tempYear]);

  // ============================================================================
  // RENDER: DATE PICKER MODAL (Cross-platform)
  // ============================================================================

  const renderDatePickerModal = () => {
    if (!showDatePicker) return null;

    // iOS Native Picker
    if (Platform.OS === 'ios' && DateTimePicker) {
      return (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancelDate}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleCancelDate} activeOpacity={0.7}>
                  <Text style={styles.datePickerCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Fecha de nacimiento</Text>
                <TouchableOpacity onPress={handleConfirmDate} activeOpacity={0.7}>
                  <Text style={styles.datePickerConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minDate}
                maximumDate={maxDate}
                locale="es-ES"
                textColor={heraLanding.textPrimary}
                themeVariant="light"
                style={styles.datePickerSpinner}
              />
            </View>
          </View>
        </Modal>
      );
    }

    // Web Custom Picker (also fallback for other platforms)
    return (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDate}
      >
        <Pressable
          style={styles.datePickerModalOverlay}
          onPress={handleCancelDate}
        >
          <Pressable
            style={styles.webDatePickerContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={handleCancelDate} activeOpacity={0.7}>
                <Text style={styles.datePickerCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Fecha de nacimiento</Text>
              <TouchableOpacity onPress={handleWebDateConfirm} activeOpacity={0.7}>
                <Text style={styles.datePickerConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            {/* Date selectors */}
            <View style={styles.webDateSelectors}>
              {/* Day */}
              <View style={styles.webDateColumn}>
                <Text style={styles.webDateColumnLabel}>Día</Text>
                <ScrollView
                  style={styles.webDateScroll}
                  showsVerticalScrollIndicator={true}
                >
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.webDateOption,
                        tempDay === day && styles.webDateOptionSelected,
                      ]}
                      onPress={() => setTempDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.webDateOptionText,
                        tempDay === day && styles.webDateOptionTextSelected,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month */}
              <View style={[styles.webDateColumn, styles.webDateColumnMonth]}>
                <Text style={styles.webDateColumnLabel}>Mes</Text>
                <ScrollView
                  style={styles.webDateScroll}
                  showsVerticalScrollIndicator={true}
                >
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.webDateOption,
                        tempMonth === month.value && styles.webDateOptionSelected,
                      ]}
                      onPress={() => setTempMonth(month.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.webDateOptionText,
                        tempMonth === month.value && styles.webDateOptionTextSelected,
                      ]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={styles.webDateColumn}>
                <Text style={styles.webDateColumnLabel}>Año</Text>
                <ScrollView
                  style={styles.webDateScroll}
                  showsVerticalScrollIndicator={true}
                >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.webDateOption,
                        tempYear === year && styles.webDateOptionSelected,
                      ]}
                      onPress={() => setTempYear(year)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.webDateOptionText,
                        tempYear === year && styles.webDateOptionTextSelected,
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.webDatePreview}>
              <Text style={styles.webDatePreviewText}>
                {tempDay} de {months[tempMonth]?.label} de {tempYear}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // ============================================================================
  // RENDER: TAB NAVIGATION
  // ============================================================================

  const renderTabNavigation = () => {
    const tabs = [
      { id: 'information' as ProfileTab, label: 'Información Personal', icon: 'person-outline' },
      { id: 'payment' as ProfileTab, label: 'Pagos y Facturación', icon: 'card-outline' },
    ];

    if (isDesktop) {
      // Desktop: Sidebar-style tabs
      return (
        <View style={styles.sidebarTabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.sidebarTab,
                activeTab === tab.id && styles.sidebarTabActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? heraLanding.textPrimary : heraLanding.textSecondary}
              />
              <Text
                style={[
                  styles.sidebarTabText,
                  activeTab === tab.id && styles.sidebarTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // Mobile/Tablet: Horizontal pill tabs
    return (
      <View style={styles.pillTabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.pillTab,
              activeTab === tab.id && styles.pillTabActive,
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.id ? heraLanding.textOnCard : heraLanding.textSecondary}
              style={styles.pillTabIcon}
            />
            <Text
              style={[
                styles.pillTabText,
                activeTab === tab.id && styles.pillTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ============================================================================
  // RENDER: FORM INPUT
  // ============================================================================

  const renderFormField = (
    label: string,
    value: string,
    placeholder: string,
    onChangeText: (text: string) => void,
    options?: {
      disabled?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
      isPickerField?: boolean;
      onPickerPress?: () => void;
      helperText?: string;
      isVerified?: boolean;
      isNotVerified?: boolean;
      onVerifyPress?: () => void;
      isVerifying?: boolean;
      secureTextEntry?: boolean;
      maxLength?: number;
      isOptional?: boolean;
      pickerIcon?: string;
    }
  ) => {
    const {
      disabled = false,
      keyboardType = 'default',
      isPickerField = false,
      onPickerPress,
      helperText,
      isVerified,
      isNotVerified,
      onVerifyPress,
      isVerifying,
      secureTextEntry,
      maxLength,
      isOptional,
      pickerIcon = 'chevron-down',
    } = options || {};

    return (
      <View style={styles.formField}>
        <View style={styles.labelRow}>
          <View style={styles.labelWithOptional}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {isOptional && (
              <Text style={styles.optionalBadge}>(Opcional)</Text>
            )}
          </View>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={heraLanding.success} />
              <Text style={styles.verifiedText}>Verificado</Text>
            </View>
          )}
          {isNotVerified && (
            <View style={styles.notVerifiedBadge}>
              <Ionicons name="alert-circle" size={14} color={heraLanding.warning} />
              <Text style={styles.notVerifiedText}>No verificado</Text>
            </View>
          )}
        </View>

        {isPickerField ? (
          <TouchableOpacity
            style={styles.fieldInput}
            onPress={onPickerPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !value && styles.placeholderText]}>
              {value || placeholder}
            </Text>
            <Ionicons name={pickerIcon as any} size={20} color={heraLanding.textMuted} />
          </TouchableOpacity>
        ) : (
          <TextInput
            style={[
              styles.fieldInput,
              disabled && styles.fieldInputDisabled,
            ]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={heraLanding.textMuted}
            onChangeText={onChangeText}
            editable={!disabled}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            maxLength={maxLength}
          />
        )}

        {helperText && (
          <Text style={styles.helperText}>{helperText}</Text>
        )}

        {isNotVerified && onVerifyPress && (
          <TouchableOpacity
            style={styles.verifyNowButton}
            onPress={onVerifyPress}
            disabled={isVerifying}
            activeOpacity={0.8}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color={heraLanding.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="mail-outline" size={16} color={heraLanding.textOnPrimary} />
                <Text style={styles.verifyNowButtonText}>Verificar ahora</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ============================================================================
  // RENDER: INFORMATION TAB
  // ============================================================================

  const renderInformationTab = () => (
    <View style={styles.tabContent}>
      {/* Profile Photo Section */}
      <View style={styles.section}>
        <View style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            {isUploadingAvatar ? (
              <View style={[styles.avatar, styles.avatarLoading]}>
                <ActivityIndicator size="large" color={heraLanding.primary} />
              </View>
            ) : user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <LinearGradient
                colors={[heraLanding.primary, heraLanding.primaryDark]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </LinearGradient>
            )}
          </View>
          <TouchableOpacity
            style={[styles.changePhotoLink, isUploadingAvatar && styles.changePhotoLinkDisabled]}
            onPress={handleChangePhoto}
            activeOpacity={0.7}
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? (
              <Text style={styles.changePhotoText}>Subiendo...</Text>
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color={heraLanding.primary} />
                <Text style={styles.changePhotoText}>Cambiar foto</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Basic Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos personales</Text>
        <View style={styles.formCard}>
          {renderFormField(
            'Nombre completo',
            formData.fullName,
            'Tu nombre completo',
            (text) => setFormData({ ...formData, fullName: text })
          )}

          {renderFormField(
            'Correo electrónico',
            formData.email,
            'tu@email.com',
            () => {},
            {
              disabled: true,
              keyboardType: 'email-address',
              isVerified: user?.emailVerified === true,
              isNotVerified: user?.emailVerified === false,
              onVerifyPress: handleVerifyEmail,
              isVerifying: isVerifyingEmail,
              helperText: user?.emailVerified
                ? 'El email no se puede modificar por seguridad'
                : 'Verifica tu email para mayor seguridad',
            }
          )}

          {renderFormField(
            'Teléfono',
            formData.phone,
            '+34 600 123 456',
            handlePhoneChange,
            { keyboardType: 'phone-pad' }
          )}

          {renderFormField(
            'Fecha de nacimiento',
            formData.birthDate ? formatDateForDisplay(parseDateString(formData.birthDate) || selectedDate) : '',
            'Selecciona fecha',
            () => {},
            {
              isPickerField: true,
              onPickerPress: handleOpenDatePicker,
              helperText: 'Solo visible para tu especialista',
              pickerIcon: 'calendar-outline',
            }
          )}
        </View>
      </View>

      {/* Location Section - Mi Ubicación */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi Ubicación</Text>
        <View style={styles.formCard}>
          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={20} color={heraLanding.primary} />
            <Text style={styles.locationInfoText}>
              Usaremos tu ubicación para mostrarte especialistas cercanos que ofrecen sesiones presenciales.
            </Text>
          </View>

          {isLoadingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={heraLanding.primary} />
              <Text style={styles.locationLoadingText}>Cargando ubicación...</Text>
            </View>
          ) : (
            <>
              <AddressAutocomplete
                value={locationData.homeAddress}
                onAddressSelect={handleAddressSelect}
                placeholder="Buscar tu dirección..."
                label="Dirección"
                error={locationError || undefined}
              />

              {isSavingLocation && (
                <View style={styles.locationSaving}>
                  <ActivityIndicator size="small" color={heraLanding.primary} />
                  <Text style={styles.locationSavingText}>Guardando ubicación...</Text>
                </View>
              )}

              {locationData.homeLat && locationData.homeLng && (
                <View style={styles.locationMapContainer}>
                  <LocationMapPreview
                    lat={locationData.homeLat}
                    lng={locationData.homeLng}
                    address={locationData.homeAddress}
                    city={locationData.homeCity}
                    height={200}
                    interactive={true}
                    showDirectionsButton={false}
                  />

                  <View style={styles.locationDetails}>
                    <View style={styles.locationDetailRow}>
                      <Text style={styles.locationDetailLabel}>Ciudad:</Text>
                      <Text style={styles.locationDetailValue}>{locationData.homeCity || '-'}</Text>
                    </View>
                    <View style={styles.locationDetailRow}>
                      <Text style={styles.locationDetailLabel}>Código Postal:</Text>
                      <Text style={styles.locationDetailValue}>{locationData.homePostalCode || '-'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.clearLocationButton}
                    onPress={handleClearLocation}
                    disabled={isSavingLocation}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={heraLanding.warning} />
                    <Text style={styles.clearLocationText}>Eliminar ubicación</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!locationData.homeLat && !locationData.homeLng && !isSavingLocation && (
                <View style={styles.noLocationState}>
                  <Ionicons name="location-outline" size={32} color={heraLanding.textMuted} />
                  <Text style={styles.noLocationText}>
                    Añade tu ubicación para encontrar especialistas cerca de ti
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            !hasChanges && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveProfile}
          disabled={!hasChanges || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={heraLanding.textOnCard} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={hasChanges ? heraLanding.textOnCard : heraLanding.textMuted}
              />
              <Text style={[
                styles.saveButtonText,
                !hasChanges && styles.saveButtonTextDisabled,
              ]}>
                Guardar cambios
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Android Date Picker (renders inline) */}
      {Platform.OS === 'android' && showDatePicker && DateTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}
    </View>
  );

  // ============================================================================
  // RENDER: PAYMENT TAB
  // ============================================================================

  const renderPaymentTab = () => (
    <View style={styles.tabContent}>
      {/* Security Banner */}
      <View style={styles.securityBanner}>
        <View style={styles.securityIcon}>
          <Ionicons name="lock-closed" size={16} color={heraLanding.success} />
        </View>
        <Text style={styles.securityText}>
          Conexión segura • Datos encriptados
        </Text>
      </View>

      {/* Payment Method Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de pago</Text>

        {paymentMethod && !isAddingCard ? (
          // Show saved card
          <View style={styles.paymentCard}>
            <View style={styles.creditCard}>
              <View style={styles.creditCardHeader}>
                <Ionicons
                  name={paymentMethod.type === 'visa' ? 'card' : 'card-outline'}
                  size={32}
                  color={heraLanding.textPrimary}
                />
                <Text style={styles.cardBrand}>
                  {paymentMethod.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardNumber}>
                •••• •••• •••• {paymentMethod.last4}
              </Text>
              <Text style={styles.cardExpiry}>
                Válida hasta: {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={handleAddCard}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={16} color={heraLanding.primary} />
                <Text style={styles.cardActionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardActionButton, styles.cardActionButtonDanger]}
                onPress={handleRemoveCard}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={heraLanding.warning} />
                <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isAddingCard ? (
          // Add/Edit card form
          <View style={styles.formCard}>
            <View style={styles.cardFormHeader}>
              <Text style={styles.cardFormTitle}>Añadir tarjeta</Text>
              <View style={styles.secureInputBadge}>
                <Ionicons name="shield-checkmark" size={14} color={heraLanding.success} />
                <Text style={styles.secureInputText}>Pago seguro</Text>
              </View>
            </View>

            {renderFormField(
              'Número de tarjeta',
              cardForm.number,
              '1234 5678 9012 3456',
              (text) => setCardForm({ ...cardForm, number: formatCardNumber(text) }),
              { keyboardType: 'number-pad', maxLength: 19 }
            )}

            <View style={styles.formRow}>
              <View style={styles.formRowHalf}>
                {renderFormField(
                  'Fecha de expiración',
                  cardForm.expiry,
                  'MM/AA',
                  (text) => setCardForm({ ...cardForm, expiry: formatExpiry(text) }),
                  { keyboardType: 'number-pad', maxLength: 5 }
                )}
              </View>
              <View style={styles.formRowHalf}>
                {renderFormField(
                  'CVV',
                  cardForm.cvv,
                  '123',
                  (text) => setCardForm({ ...cardForm, cvv: text.replace(/\D/g, '') }),
                  {
                    keyboardType: 'number-pad',
                    secureTextEntry: true,
                    maxLength: 4,
                    helperText: 'Código de seguridad',
                  }
                )}
              </View>
            </View>

            {renderFormField(
              'Nombre en la tarjeta',
              cardForm.name,
              'Como aparece en la tarjeta',
              (text) => setCardForm({ ...cardForm, name: text })
            )}

            <View style={styles.cardFormActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelAddCard}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveCardButton}
                onPress={handleSaveCard}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-closed" size={16} color={heraLanding.textOnCard} />
                <Text style={styles.saveCardButtonText}>Guardar tarjeta</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Empty state - no card
          <View style={styles.emptyPaymentCard}>
            <View style={styles.emptyPaymentIcon}>
              <Ionicons name="card-outline" size={48} color={heraLanding.textMuted} />
            </View>
            <Text style={styles.emptyPaymentTitle}>No tienes método de pago</Text>
            <Text style={styles.emptyPaymentDescription}>
              Añade una tarjeta para reservar sesiones de forma rápida y segura.
            </Text>
            <TouchableOpacity
              style={styles.addCardButton}
              onPress={handleAddCard}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={heraLanding.textOnCard} />
              <Text style={styles.addCardButtonText}>Añadir tarjeta</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Transaction History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial de pagos</Text>

        {transactions.length > 0 ? (
          <View style={styles.transactionList}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={transaction.status === 'paid' ? 'checkmark-circle' : 'time'}
                      size={20}
                      color={transaction.status === 'paid' ? heraLanding.success : heraLanding.warning}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDate}>
                      {transaction.date.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionSpecialist}>
                      {transaction.specialistName}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>
                    {transaction.currency}{transaction.amount.toFixed(2)}
                  </Text>
                  <TouchableOpacity style={styles.receiptLink} activeOpacity={0.7}>
                    <Text style={styles.receiptLinkText}>Ver recibo</Text>
                    <Ionicons name="chevron-forward" size={14} color={heraLanding.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyTransactions}>
            <View style={styles.emptyTransactionsIcon}>
              <Ionicons name="receipt-outline" size={40} color={heraLanding.textMuted} />
            </View>
            <Text style={styles.emptyTransactionsTitle}>Sin transacciones</Text>
            <Text style={styles.emptyTransactionsDescription}>
              Tus pagos aparecerán aquí después de tu primera sesión.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {isDesktop ? (
        // Desktop: Sidebar + Content layout
        <View style={styles.desktopLayout}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Configuración</Text>
            </View>
            {renderTabNavigation()}
          </View>

          {/* Content with visible scrollbar */}
          <ScrollView
            style={styles.contentArea}
            contentContainerStyle={styles.contentAreaInner}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
          >
            {activeTab === 'information' && renderInformationTab()}
            {activeTab === 'payment' && renderPaymentTab()}
          </ScrollView>
        </View>
      ) : (
        // Mobile/Tablet: Tabs on top + Content
        <>
          {renderTabNavigation()}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
          >
            {activeTab === 'information' && renderInformationTab()}
            {activeTab === 'payment' && renderPaymentTab()}
          </ScrollView>
        </>
      )}

      {/* iOS Date Picker Modal */}
      {renderDatePickerModal()}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background, // #F5F7F5 - Light Sage
  },

  // ===== DESKTOP LAYOUT =====
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    backgroundColor: heraLanding.cardBg,
    borderRightWidth: 1,
    borderRightColor: heraLanding.border,
    paddingTop: 32,
  },
  sidebarHeader: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    marginBottom: 16,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  sidebarTabs: {
    paddingHorizontal: 16,
  },
  sidebarTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  sidebarTabActive: {
    backgroundColor: heraLanding.primaryMuted,
    borderLeftWidth: 3,
    borderLeftColor: heraLanding.primary,
  },
  sidebarTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  sidebarTabTextActive: {
    color: heraLanding.textPrimary,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
  },
  contentAreaInner: {
    padding: 40,
    maxWidth: 800,
  },

  // ===== MOBILE TABS =====
  pillTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: heraLanding.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: heraLanding.cardBg,
    borderWidth: 2,
    borderColor: heraLanding.border,
    gap: 6,
  },
  pillTabActive: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  pillTabIcon: {
    marginRight: 2,
  },
  pillTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  pillTabTextActive: {
    color: heraLanding.textOnCard,
    fontWeight: '600',
  },

  // ===== SCROLL VIEW =====
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // ===== TAB CONTENT =====
  tabContent: {
    flex: 1,
  },

  // ===== SECTIONS =====
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 16,
  },

  // ===== AVATAR =====
  avatarCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    ...shadows.lg,
  },
  avatarLoading: {
    backgroundColor: heraLanding.background,
    borderWidth: 2,
    borderColor: heraLanding.border,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: heraLanding.textOnCard,
  },
  changePhotoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.primary,
  },
  changePhotoLinkDisabled: {
    opacity: 0.6,
  },

  // ===== FORM CARD =====
  formCard: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    padding: 24,
    ...shadows.md,
  },

  // ===== FORM FIELDS =====
  formField: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelWithOptional: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: heraLanding.textMuted,
    fontStyle: 'italic',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: heraLanding.success,
    fontWeight: '500',
  },
  notVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notVerifiedText: {
    fontSize: 12,
    color: heraLanding.warning,
    fontWeight: '500',
  },
  verifyNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  verifyNowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  fieldInput: {
    backgroundColor: heraLanding.cardBackground,
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: heraLanding.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  fieldInputDisabled: {
    backgroundColor: heraLanding.cardBackgroundDisabled,
    color: heraLanding.textSecondary,
  },
  inputText: {
    fontSize: 16,
    color: heraLanding.textPrimary,
  },
  placeholderText: {
    color: heraLanding.textMuted,
  },
  helperText: {
    fontSize: 12,
    color: heraLanding.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formRowHalf: {
    flex: 1,
  },

  // ===== SAVE BUTTON =====
  saveButtonContainer: {
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    ...shadows.md,
  },
  saveButtonDisabled: {
    backgroundColor: heraLanding.border,
    ...shadows.none,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textOnCard,
  },
  saveButtonTextDisabled: {
    color: heraLanding.textMuted,
  },

  // ===== DATE PICKER MODAL (iOS) =====
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: heraLanding.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  datePickerCancelText: {
    fontSize: 16,
    color: heraLanding.textSecondary,
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  datePickerSpinner: {
    height: 216,
  },

  // ===== WEB DATE PICKER =====
  webDatePickerContent: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    ...shadows.lg,
  },
  webDateSelectors: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  webDateColumn: {
    flex: 1,
  },
  webDateColumnMonth: {
    flex: 1.5,
  },
  webDateColumnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webDateScroll: {
    height: 200,
    backgroundColor: heraLanding.background,
    borderRadius: 8,
  },
  webDateOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  webDateOptionSelected: {
    backgroundColor: heraLanding.primary,
  },
  webDateOptionText: {
    fontSize: 15,
    color: heraLanding.textPrimary,
  },
  webDateOptionTextSelected: {
    color: heraLanding.textOnCard,
    fontWeight: '600',
  },
  webDatePreview: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
    alignItems: 'center',
  },
  webDatePreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // ===== SECURITY BANNER =====
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123, 163, 119, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  securityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(123, 163, 119, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.success,
  },

  // ===== PAYMENT CARD =====
  paymentCard: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    padding: 24,
    ...shadows.md,
  },
  creditCard: {
    backgroundColor: heraLanding.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  creditCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: '700',
    color: heraLanding.textSecondary,
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  cardExpiry: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: heraLanding.border,
    gap: 6,
  },
  cardActionButtonDanger: {
    borderColor: heraLanding.warning,
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.primary,
  },
  cardActionTextDanger: {
    color: heraLanding.warning,
  },

  // ===== EMPTY PAYMENT STATE =====
  emptyPaymentCard: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    ...shadows.md,
  },
  emptyPaymentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyPaymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 8,
  },
  emptyPaymentDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    ...shadows.md,
  },
  addCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textOnCard,
  },

  // ===== CARD FORM =====
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cardFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  secureInputBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(123, 163, 119, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  secureInputText: {
    fontSize: 12,
    fontWeight: '500',
    color: heraLanding.success,
  },
  cardFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: heraLanding.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  saveCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    ...shadows.md,
  },
  saveCardButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textOnCard,
  },

  // ===== TRANSACTIONS =====
  transactionList: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.md,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: heraLanding.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginBottom: 2,
  },
  transactionSpecialist: {
    fontSize: 13,
    color: heraLanding.textMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  receiptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  receiptLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.primary,
  },

  // ===== EMPTY TRANSACTIONS =====
  emptyTransactions: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    ...shadows.md,
  },
  emptyTransactionsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: heraLanding.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTransactionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 6,
  },
  emptyTransactionsDescription: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ===== LOCATION SECTION =====
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: heraLanding.primaryAlpha12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 12,
  },
  locationInfoText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  locationLoadingText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  locationSaving: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    gap: 8,
    backgroundColor: heraLanding.successLight,
    borderRadius: 8,
  },
  locationSavingText: {
    fontSize: 14,
    color: heraLanding.success,
  },
  locationMapContainer: {
    marginTop: 20,
    gap: 16,
  },
  locationDetails: {
    backgroundColor: heraLanding.background,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  locationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationDetailLabel: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  locationDetailValue: {
    fontSize: 14,
    color: heraLanding.textPrimary,
    fontWeight: '600',
  },
  clearLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: heraLanding.warning,
    borderRadius: 8,
    gap: 6,
  },
  clearLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.warning,
  },
  noLocationState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  noLocationText: {
    fontSize: 14,
    color: heraLanding.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProfileScreen;
