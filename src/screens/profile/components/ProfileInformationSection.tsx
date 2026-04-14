import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Button, AnimatedPressable, Card } from '../../../components/common';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { AddressAutocomplete, AddressDetails } from '../../../components/location/AddressAutocomplete';
import LocationMapPreview from '../../../components/location/LocationMapPreview';
import ProfileFormField from './ProfileFormField';
import type { ProfileFormData, ProfileLocationData } from '../types';
import { formatDateForDisplay, parseDateString } from '../profileUtils';

interface ProfileInformationSectionProps {
  user: {
    name?: string;
    avatar?: string | null;
    emailVerified?: boolean;
  } | null;
  formData: ProfileFormData;
  locationData: ProfileLocationData;
  isUploadingAvatar: boolean;
  isVerifyingEmail: boolean;
  isLoadingLocation: boolean;
  isSavingLocation: boolean;
  locationError: string | null;
  hasChanges: boolean;
  isSaving: boolean;
  selectedDate: Date;
  onChangePhoto: () => void;
  onNameChange: (text: string) => void;
  onPhoneChange: (text: string) => void;
  onVerifyEmail: () => void;
  onOpenDatePicker: () => void;
  onAddressSelect: (details: AddressDetails) => void;
  onClearLocation: () => void;
  onSaveProfile: () => void;
}

export const ProfileInformationSection: React.FC<ProfileInformationSectionProps> = ({
  user,
  formData,
  locationData,
  isUploadingAvatar,
  isVerifyingEmail,
  isLoadingLocation,
  isSavingLocation,
  locationError,
  hasChanges,
  isSaving,
  selectedDate,
  onChangePhoto,
  onNameChange,
  onPhoneChange,
  onVerifyEmail,
  onOpenDatePicker,
  onAddressSelect,
  onClearLocation,
  onSaveProfile,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.content}>
      <Card style={styles.avatarCard}>
        <View style={styles.avatarContainer}>
          {isUploadingAvatar ? (
            <View style={[styles.avatarShell, { backgroundColor: theme.bgMuted }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={[theme.secondary, theme.primary]} style={styles.avatarShell}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </LinearGradient>
          )}
        </View>

        <AnimatedPressable
          style={[styles.photoAction, isUploadingAvatar && styles.photoActionDisabled]}
          onPress={onChangePhoto}
          disabled={isUploadingAvatar}
        >
          <Ionicons name="camera-outline" size={16} color={theme.primary} />
          <Text style={[styles.photoActionText, { color: theme.primary }]}>
            {isUploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
          </Text>
        </AnimatedPressable>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos personales</Text>
        <Card style={styles.formCard}>
          <ProfileFormField
            label="Nombre completo"
            value={formData.fullName}
            placeholder="Tu nombre completo"
            onChangeText={onNameChange}
          />

          <ProfileFormField
            label="Correo electrónico"
            value={formData.email}
            placeholder="tu@email.com"
            onChangeText={() => {}}
            disabled
            keyboardType="email-address"
            isVerified={user?.emailVerified === true}
            isNotVerified={user?.emailVerified === false}
            onVerifyPress={onVerifyEmail}
            isVerifying={isVerifyingEmail}
            helperText={
              user?.emailVerified
                ? 'El email no se puede modificar por seguridad'
                : 'Verifica tu email para mayor seguridad'
            }
          />

          <ProfileFormField
            label="Teléfono"
            value={formData.phone}
            placeholder="+34 600 123 456"
            onChangeText={onPhoneChange}
            keyboardType="phone-pad"
          />

          <ProfileFormField
            label="Fecha de nacimiento"
            value={formData.birthDate ? formatDateForDisplay(parseDateString(formData.birthDate) || selectedDate) : ''}
            placeholder="Selecciona fecha"
            onChangeText={() => {}}
            isPickerField
            onPickerPress={onOpenDatePicker}
            helperText="Solo visible para tu especialista"
            pickerIcon="calendar-outline"
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi ubicación</Text>
        <Card style={styles.formCard}>
          <View style={[styles.infoBanner, { backgroundColor: theme.primaryAlpha12 }]}>
            <Ionicons name="location-outline" size={20} color={theme.primary} />
            <Text style={styles.infoBannerText}>
              Usaremos tu ubicación para mostrarte especialistas cercanos que ofrecen sesiones presenciales.
            </Text>
          </View>

          {isLoadingLocation ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={styles.locationLoadingText}>Cargando ubicación...</Text>
            </View>
          ) : (
            <>
              <AddressAutocomplete
                value={locationData.homeAddress}
                onAddressSelect={onAddressSelect}
                placeholder="Buscar tu dirección..."
                label="Dirección"
                error={locationError || undefined}
              />

              {isSavingLocation ? (
                <View style={[styles.locationSaving, { backgroundColor: theme.primaryAlpha12 }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.locationSavingText, { color: theme.primary }]}>Guardando ubicación...</Text>
                </View>
              ) : null}

              {locationData.homeLat && locationData.homeLng ? (
                <View style={styles.locationMapContainer}>
                  <LocationMapPreview
                    lat={locationData.homeLat}
                    lng={locationData.homeLng}
                    address={locationData.homeAddress}
                    city={locationData.homeCity}
                    height={220}
                    interactive
                    showDirectionsButton={false}
                  />

                  <View style={[styles.locationDetails, { backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted }]}>
                    <View style={styles.locationDetailRow}>
                      <Text style={styles.locationDetailLabel}>Ciudad:</Text>
                      <Text style={styles.locationDetailValue}>{locationData.homeCity || '-'}</Text>
                    </View>
                    <View style={styles.locationDetailRow}>
                      <Text style={styles.locationDetailLabel}>Código postal:</Text>
                      <Text style={styles.locationDetailValue}>{locationData.homePostalCode || '-'}</Text>
                    </View>
                  </View>

                  <AnimatedPressable
                    style={[styles.clearLocationButton, { borderColor: theme.error }]}
                    onPress={onClearLocation}
                    disabled={isSavingLocation}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.error} />
                    <Text style={[styles.clearLocationText, { color: theme.error }]}>Eliminar ubicación</Text>
                  </AnimatedPressable>
                </View>
              ) : !isSavingLocation ? (
                <View style={styles.noLocationState}>
                  <Ionicons name="location-outline" size={32} color={theme.textMuted} />
                  <Text style={styles.noLocationText}>
                    Añade tu ubicación para encontrar especialistas cerca de ti
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </Card>
      </View>

      <View style={styles.saveActionRow}>
        <Button
          onPress={onSaveProfile}
          disabled={!hasChanges}
          loading={isSaving}
          fullWidth
          size="large"
          icon={<Ionicons name="checkmark-circle-outline" size={18} color={theme.textOnPrimary} />}
        >
          Guardar cambios
        </Button>
      </View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    content: {
      gap: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    avatarCard: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
      ...shadows.md,
    },
    avatarContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarShell: {
      width: 124,
      height: 124,
      borderRadius: 62,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 124,
      height: 124,
      borderRadius: 62,
    },
    avatarText: {
      fontSize: 44,
      color: '#FFFFFF',
      fontFamily: theme.fontDisplayBold,
    },
    photoAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: theme.primaryAlpha12,
    },
    photoActionDisabled: {
      opacity: 0.55,
    },
    photoActionText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
    formCard: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      gap: spacing.lg,
      ...shadows.md,
    },
    infoBanner: {
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    infoBannerText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: theme.fontSansMedium,
    },
    locationLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    locationLoadingText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: theme.fontSansMedium,
    },
    locationSaving: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    locationSavingText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
    locationMapContainer: {
      gap: spacing.md,
    },
    locationDetails: {
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    locationDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    locationDetailLabel: {
      color: theme.textSecondary,
      fontSize: 15,
      fontFamily: theme.fontSansSemiBold,
    },
    locationDetailValue: {
      color: theme.textPrimary,
      fontSize: 15,
      fontFamily: theme.fontSansBold,
    },
    clearLocationButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    clearLocationText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
    noLocationState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
      borderRadius: borderRadius.lg,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
    noLocationText: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      fontFamily: theme.fontSansMedium,
      paddingHorizontal: spacing.lg,
    },
    saveActionRow: {
      paddingTop: spacing.sm,
    },
  });

export default ProfileInformationSection;
