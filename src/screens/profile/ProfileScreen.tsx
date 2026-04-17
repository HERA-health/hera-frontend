import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { borderRadius, shadows, spacing } from '../../constants/colors';
import { ProfileTab } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import * as authService from '../../services/authService';
import * as clientService from '../../services/clientService';
import { resendVerificationEmailWithRefresh } from '../../services/emailVerificationService';
import type { AddressDetails } from '../../components/location/AddressAutocomplete';
import ProfileDatePickerModal from './components/ProfileDatePickerModal';
import ProfileInformationSection from './components/ProfileInformationSection';
import ProfilePaymentSection from './components/ProfilePaymentSection';
import ProfileTabNavigation from './components/ProfileTabNavigation';
import { formatCardNumber, formatExpiry, formatPhoneNumber } from './profileUtils';
import type {
  CardFormState,
  PaymentMethod,
  ProfileFormData,
  ProfileLocationData,
  Transaction,
} from './types';

const mockPaymentMethod: PaymentMethod | null = null;
const mockTransactions: Transaction[] = [];

const initialCardForm: CardFormState = {
  number: '',
  expiry: '',
  cvv: '',
  name: '',
};

const buildProfileFormData = (user: ReturnType<typeof useAuth>['user']): ProfileFormData => ({
  fullName: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  birthDate: user?.birthDate ? user.birthDate.toLocaleDateString('es-ES') : '',
  city: '',
  postalCode: '',
});

const buildLocationData = (): ProfileLocationData => ({
  homeAddress: '',
  homeCity: '',
  homePostalCode: '',
  homeCountry: 'Spain',
  homeLat: null,
  homeLng: null,
});

const ProfileScreen: React.FC = () => {
  const { user, updateUser, refreshCurrentUser } = useAuth();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;

  const [activeTab, setActiveTab] = useState<ProfileTab>('information');
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(user?.birthDate || new Date(1990, 0, 1));

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(mockPaymentMethod);
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardForm, setCardForm] = useState<CardFormState>(initialCardForm);

  const [locationData, setLocationData] = useState<ProfileLocationData>(buildLocationData);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>(() => buildProfileFormData(user));
  const [originalData, setOriginalData] = useState<ProfileFormData>(() => buildProfileFormData(user));

  useEffect(() => {
    analyticsService.trackScreen('client_profile');
  }, []);

  useEffect(() => {
    const nextData = buildProfileFormData(user);
    setFormData(nextData);
    setOriginalData(nextData);
    if (user?.birthDate) {
      setSelectedDate(user.birthDate);
    }
  }, [user]);

  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

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
        console.log('Failed to load location data:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    loadLocationData();
  }, [user?.type]);

  const uploadAvatar = useCallback(
    async (base64: string) => {
      setIsUploadingAvatar(true);
      try {
        const updatedUser = await authService.uploadAvatar(base64);
        updateUser({ avatar: updatedUser.avatar });
        Alert.alert('Foto actualizada', 'Tu foto de perfil se ha guardado correctamente.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir la foto.';
        Alert.alert('Error', message);
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [updateUser]
  );

  const pickImageFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  }, [uploadAvatar]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar una foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  }, [uploadAvatar]);

  const handleChangePhoto = useCallback(() => {
    if (isUploadingAvatar) {
      return;
    }

    if (Platform.OS === 'web') {
      pickImageFromLibrary();
      return;
    }

    Alert.alert('Cambiar foto de perfil', 'Selecciona una opción', [
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Elegir de galería', onPress: pickImageFromLibrary },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [isUploadingAvatar, pickImageFromLibrary, takePhoto]);

  const handleSaveProfile = useCallback(async () => {
    if (!hasChanges) {
      return;
    }

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
      Alert.alert('Cambios guardados', 'Tu perfil ha sido actualizado correctamente.');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  }, [formData, hasChanges, updateUser]);

  const handlePhoneChange = useCallback((text: string) => {
    const formatted = formatPhoneNumber(text);
    if (formatted.replace(/\s/g, '').length <= 15) {
      setFormData((prev) => ({ ...prev, phone: formatted }));
    }
  }, []);

  const handleVerifyEmail = useCallback(async () => {
    if (!user?.email) {
      return;
    }

    setIsVerifyingEmail(true);
    analyticsService.track('resend_verification_clicked');
    try {
      const result = await resendVerificationEmailWithRefresh(user.email, refreshCurrentUser);
      Alert.alert(result.outcome === 'sent' ? 'Email enviado' : 'Email actualizado', result.message);
    } catch {
      Alert.alert('Error', 'No se pudo enviar el email de verificación. Inténtalo de nuevo.');
    } finally {
      setIsVerifyingEmail(false);
    }
  }, [refreshCurrentUser, user?.email]);

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

  const handleClearLocation = useCallback(() => {
    Alert.alert('Eliminar ubicación', '¿Estás seguro de que quieres eliminar tu ubicación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setIsSavingLocation(true);
          try {
            await clientService.clearClientLocation();
            setLocationData(buildLocationData());
            Alert.alert('Ubicación eliminada', 'Tu ubicación ha sido eliminada.');
          } catch (error) {
            console.error('Error clearing location:', error);
            Alert.alert('Error', 'No se pudo eliminar la ubicación.');
          } finally {
            setIsSavingLocation(false);
          }
        },
      },
    ]);
  }, []);

  const handleOpenDatePicker = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  const handleConfirmDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setFormData((prev) => ({ ...prev, birthDate: date.toLocaleDateString('es-ES') }));
    setShowDatePicker(false);
  }, []);

  const handleCancelDate = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleAddCard = useCallback(() => {
    setIsAddingCard(true);
  }, []);

  const handleCancelAddCard = useCallback(() => {
    setIsAddingCard(false);
    setCardForm(initialCardForm);
  }, []);

  const handleCardFormChange = useCallback((updates: Partial<CardFormState>) => {
    setCardForm((prev) => ({
      ...prev,
      ...updates,
      number: updates.number !== undefined ? formatCardNumber(updates.number) : prev.number,
      expiry: updates.expiry !== undefined ? formatExpiry(updates.expiry) : prev.expiry,
      cvv: updates.cvv !== undefined ? updates.cvv.replace(/\D/g, '').slice(0, 4) : prev.cvv,
    }));
  }, []);

  const handleSaveCard = useCallback(() => {
    const normalizedNumber = cardForm.number.replace(/\s/g, '');
    if (normalizedNumber.length < 16 || !cardForm.expiry || !cardForm.cvv || !cardForm.name) {
      Alert.alert('Error', 'Por favor, completa todos los campos de la tarjeta.');
      return;
    }

    const [expiryMonth = '', expiryYear = ''] = cardForm.expiry.split('/');
    const newCard: PaymentMethod = {
      id: Date.now().toString(),
      type: normalizedNumber.startsWith('4') ? 'visa' : 'mastercard',
      last4: normalizedNumber.slice(-4),
      expiryMonth,
      expiryYear,
      isDefault: true,
    };

    setPaymentMethod(newCard);
    setIsAddingCard(false);
    setCardForm(initialCardForm);
    Alert.alert('Tarjeta añadida', 'Tu método de pago se ha guardado correctamente.');
  }, [cardForm]);

  const handleRemoveCard = useCallback(() => {
    Alert.alert('Eliminar tarjeta', '¿Estás seguro de que quieres eliminar este método de pago?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setPaymentMethod(null);
          Alert.alert('Tarjeta eliminada', 'Tu método de pago ha sido eliminado.');
        },
      },
    ]);
  }, []);

  const content = activeTab === 'information' ? (
    <ProfileInformationSection
      user={user}
      formData={formData}
      locationData={locationData}
      isUploadingAvatar={isUploadingAvatar}
      isVerifyingEmail={isVerifyingEmail}
      isLoadingLocation={isLoadingLocation}
      isSavingLocation={isSavingLocation}
      locationError={locationError}
      hasChanges={hasChanges}
      isSaving={isSaving}
      selectedDate={selectedDate}
      onChangePhoto={handleChangePhoto}
      onNameChange={(text) => setFormData((prev) => ({ ...prev, fullName: text }))}
      onPhoneChange={handlePhoneChange}
      onVerifyEmail={handleVerifyEmail}
      onOpenDatePicker={handleOpenDatePicker}
      onAddressSelect={handleAddressSelect}
      onClearLocation={handleClearLocation}
      onSaveProfile={handleSaveProfile}
    />
  ) : (
    <ProfilePaymentSection
      paymentMethod={paymentMethod}
      transactions={transactions}
      isAddingCard={isAddingCard}
      cardForm={cardForm}
      onAddCard={handleAddCard}
      onCancelAddCard={handleCancelAddCard}
      onSaveCard={handleSaveCard}
      onRemoveCard={handleRemoveCard}
      onCardFormChange={handleCardFormChange}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isDesktop ? (
        <View style={styles.desktopLayout}>
          <View style={[styles.sidebar, { backgroundColor: theme.bgCard, borderRightColor: theme.border }]}>
            <View style={[styles.sidebarHeader, { borderBottomColor: theme.border }]}>
              <Text style={styles.sidebarTitle}>Configuración</Text>
            </View>
            <ProfileTabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isDesktop
            />
          </View>

          <ScrollView
            style={styles.contentArea}
            contentContainerStyle={styles.contentAreaInner}
            showsVerticalScrollIndicator
            indicatorStyle={isDark ? 'white' : 'black'}
          >
            {content}
          </ScrollView>
        </View>
      ) : (
        <>
          <ProfileTabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isDesktop={false}
          />
          <ScrollView
            style={styles.contentArea}
            contentContainerStyle={styles.mobileContent}
            showsVerticalScrollIndicator
            indicatorStyle={isDark ? 'white' : 'black'}
          >
            {content}
          </ScrollView>
        </>
      )}

      <ProfileDatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onConfirm={handleConfirmDate}
        onCancel={handleCancelDate}
      />
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    desktopLayout: {
      flex: 1,
      flexDirection: 'row',
    },
    sidebar: {
      width: 280,
      borderRightWidth: 1,
      paddingTop: spacing.xxl,
    },
    sidebarHeader: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
      borderBottomWidth: 1,
      marginBottom: spacing.lg,
    },
    sidebarTitle: {
      color: theme.textPrimary,
      fontSize: 24,
      fontFamily: theme.fontDisplayBold,
    },
    contentArea: {
      flex: 1,
    },
    contentAreaInner: {
      padding: spacing.xxxl,
      paddingBottom: spacing.xxxl,
      maxWidth: 840,
      width: '100%',
    },
    mobileContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
  });

export default ProfileScreen;
