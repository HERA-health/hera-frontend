/**
 * ProfessionalVerificationScreen - Professional Identity Verification
 * Shown after specialist registration to collect colegiado number and carnet de colegiado photo.
 * Follows the exact same visual design as RegisterScreen for a seamless flow.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { heraLanding, spacing, shadows } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as professionalService from '../../services/professionalService';
import * as authService from '../../services/authService';
import { getErrorMessage } from '../../constants/errors';
import * as analyticsService from '../../services/analyticsService';
import type { AppNavigationProp } from '../../constants/types';
import type { UploadAsset } from '../../utils/multipartUpload';

export function ProfessionalVerificationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { width } = useWindowDimensions();
  const { user, markVerificationSubmitted } = useAuth();

  // Responsive breakpoints
  const isDesktop = width >= 768;
  const isLargeDesktop = width >= 1200;

  // Form state
  const [colegiadoNumber, setColegiadoNumber] = useState('');
  const [dniImage, setDniImage] = useState<UploadAsset | null>(null);
  const [dniImageUri, setDniImageUri] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localError, setLocalError] = useState('');

  // Focus states
  const [colegiadoFocused, setColegiadoFocused] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formSlideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    analyticsService.trackScreen('professional_verification');

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formSlideAnim, {
        toValue: 0,
        duration: 700,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Shake animation for errors
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para subir la foto del carnet de colegiado.'
        );
        return;
      }

      setIsUploadingImage(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setDniImage({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        setDniImageUri(asset.uri);
        analyticsService.track('verification_photo_selected');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Intenta de nuevo.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu cámara para tomar una foto del carnet de colegiado.'
        );
        return;
      }

      setIsUploadingImage(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setDniImage({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        setDniImageUri(asset.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    // On web, only show gallery option
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }

    Alert.alert(
      'Foto del carnet de colegiado',
      'Selecciona cómo quieres añadir la foto',
      [
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Elegir de galería', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const getFriendlyVerificationErrorMessage = (error: unknown): string =>
    getErrorMessage(
      error,
      'No hemos podido enviar tu verificación. Inténtalo de nuevo en un momento.'
    );

  const handleSubmit = async () => {
    setLocalError('');

    if (!colegiadoNumber.trim()) {
      setLocalError('Introduce tu número de colegiado para continuar.');
      triggerShake();
      return;
    }

    if (!dniImage) {
      setLocalError('Añade una foto de tu carnet de colegiado para continuar.');
      triggerShake();
      return;
    }

    if (!consentAccepted) {
      setLocalError('Necesitamos tu consentimiento para poder revisar esta verificación.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      await professionalService.submitVerification({
        colegiadoNumber: colegiadoNumber.trim(),
        dniImage,
      });

      analyticsService.track('verification_submitted');
      markVerificationSubmitted();

      if (user?.email) {
        try {
          await authService.sendVerificationEmail(user.email);
        } catch (_emailError: unknown) {
          // If sending email fails, still proceed.
        }

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'EmailSentVerification',
              params: { email: user.email, userType: 'PROFESSIONAL' },
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfessionalHome' }],
        });
      }
    } catch (error: unknown) {
      setLocalError(getFriendlyVerificationErrorMessage(error));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Brand Side Content
  const renderBrandSide = () => (
    <LinearGradient
      colors={[heraLanding.primary, heraLanding.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.brandSide,
        isDesktop && styles.brandSideDesktop,
        !isDesktop && styles.brandSideMobile,
      ]}
    >
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      <View style={[styles.decorCircle, styles.decorCircle3]} />

      <Animated.View
        style={[
          styles.brandContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={isDesktop ? 40 : 32} color={heraLanding.primary} />
          </View>
          <Text style={[styles.logoText, !isDesktop && styles.logoTextMobile]}>HERA</Text>
        </View>

        {isDesktop && (
          <View style={styles.brandDesktopContent}>
            <Text style={styles.brandTitle}>Verificación Profesional</Text>
            <Text style={styles.brandSubtitle}>
              Garantizamos la calidad de{'\n'}
              nuestros especialistas.
            </Text>

            {/* Features */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Verificación segura</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Datos protegidos</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Proceso rápido</Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </LinearGradient>
  );

  // Form Side Content
  const renderFormSide = () => (
    <Animated.View
      style={[
        styles.formSide,
        isDesktop && styles.formSideDesktop,
        {
          opacity: fadeAnim,
          transform: [{ translateY: formSlideAnim }],
        },
      ]}
    >
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.formContainer, isLargeDesktop && styles.formContainerLarge]}>
          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Verifica tu identidad profesional</Text>
            <Text style={styles.formSubtitle}>
              Para garantizar la calidad del servicio, todos los especialistas deben verificar su número de colegiado.
            </Text>
          </View>

          {/* Error Display */}
          {localError && (
            <Animated.View
              style={[
                styles.errorContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={heraLanding.warning} />
              <Text style={styles.errorText}>{localError}</Text>
            </Animated.View>
          )}

          {/* Colegiado Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de colegiado</Text>
            <View
              style={[
                styles.inputContainer,
                colegiadoFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={colegiadoFocused ? heraLanding.primary : heraLanding.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Ej: M-12345"
                placeholderTextColor={heraLanding.textMuted}
                value={colegiadoNumber}
                onChangeText={setColegiadoNumber}
                onFocus={() => setColegiadoFocused(true)}
                onBlur={() => setColegiadoFocused(false)}
                autoCapitalize="characters"
              />
            </View>
            <Text style={styles.inputHint}>
              El número de colegiado de tu comunidad autónoma
            </Text>
          </View>

          {/* Carnet de colegiado Photo Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Foto del carnet de colegiado</Text>
            <TouchableOpacity
              style={[
                styles.imageUploadContainer,
                dniImageUri && styles.imageUploadContainerWithImage,
              ]}
              onPress={showImageOptions}
              activeOpacity={0.85}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <View style={styles.imageUploadPlaceholder}>
                  <ActivityIndicator size="large" color={heraLanding.primary} />
                  <Text style={styles.imageUploadText}>Procesando imagen...</Text>
                </View>
              ) : dniImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: dniImageUri }} style={styles.imagePreview} />
                  <View style={styles.imageOverlay}>
                    <View style={styles.changeImageButton}>
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                      <Text style={styles.changeImageText}>Cambiar foto</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.imageUploadPlaceholder}>
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="camera-outline" size={32} color={heraLanding.primary} />
                  </View>
                  <Text style={styles.imageUploadText}>Toca para subir foto del carnet de colegiado</Text>
                  <Text style={styles.imageUploadHint}>JPG, PNG - Máx 5MB</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.inputHint}>
              Asegúrate de que se vea claramente tu número de colegiado y tus datos personales en la fotografía
            </Text>
          </View>

          {/* Consent Checkbox */}
          <TouchableOpacity
            style={styles.consentContainer}
            onPress={() => setConsentAccepted(!consentAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, consentAccepted && styles.checkboxChecked]}>
              {consentAccepted && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.consentText}>
              Acepto que HERA procese mi número de colegiado y carnet de colegiado únicamente para verificar mi identidad profesional. Estos datos serán eliminados una vez completada la verificación.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isLoading || !consentAccepted) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !consentAccepted}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[heraLanding.primary, heraLanding.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <View style={styles.primaryButtonContent}>
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Enviando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Enviar para verificación</Text>
                </>
              )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info Notice */}
          <View style={styles.infoNotice}>
            <Ionicons name="information-circle-outline" size={20} color={heraLanding.info} />
            <Text style={styles.infoNoticeText}>
              La verificación del número de colegiado es obligatoria para garantizar la calidad de nuestros profesionales. Tras enviar tus datos, podrás verificar tu email y acceder a la plataforma.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {renderBrandSide()}
        {renderFormSide()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  content: {
    flex: 1,
  },
  contentDesktop: {
    flexDirection: 'row',
  },

  // Brand Side
  brandSide: {
    overflow: 'hidden',
    position: 'relative',
  },
  brandSideDesktop: {
    width: '40%',
    minHeight: '100%',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  brandSideMobile: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  brandContent: {
    zIndex: 1,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: 50,
    left: -80,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    top: '50%',
    right: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...shadows.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoTextMobile: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 44,
  },
  brandSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 26,
    marginBottom: 40,
  },
  brandDesktopContent: {
    width: '100%',
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },

  // Form Side
  formSide: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  formSideDesktop: {
    width: '60%',
    justifyContent: 'center',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  formContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  formContainerLarge: {
    maxWidth: 520,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 12,
    lineHeight: 36,
  },
  formSubtitle: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    lineHeight: 24,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(232, 157, 136, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: heraLanding.warning,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.warning,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: heraLanding.primary,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: heraLanding.textPrimary,
    marginLeft: 12,
    paddingVertical: 0,
  },
  inputHint: {
    fontSize: 12,
    color: heraLanding.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },

  // Image Upload
  imageUploadContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 160,
  },
  imageUploadContainerWithImage: {
    borderStyle: 'solid',
    borderColor: heraLanding.primary,
  },
  imageUploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 160,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageUploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  imageUploadHint: {
    fontSize: 13,
    color: heraLanding.textMuted,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Consent Checkbox
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: heraLanding.border,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },

  // Primary Button
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.md,
    shadowColor: heraLanding.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Info Notice
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: heraLanding.backgroundAlt,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 13,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },
});

