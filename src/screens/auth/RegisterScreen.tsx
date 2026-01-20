/**
 * RegisterScreen - Premium Split-Screen Design
 * Modern registration with user type selector and password strength indicator
 * Follows HERA design language with sage green and lavender palette
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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import { useAuth, UserType } from '../../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as authService from '../../services/authService';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp } from '../../constants/types';

// Password strength levels
type PasswordStrength = 'weak' | 'medium' | 'strong';

export function RegisterScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<any>(); // Keep as any for optional params
  const { width } = useWindowDimensions();
  const { register, loading: authLoading, clearError } = useAuth();

  // Responsive breakpoints
  const isDesktop = width >= 768;
  const isLargeDesktop = width >= 1200;

  // Get userType from navigation params
  const paramUserType = route.params?.userType;
  const initialUserType: UserType = paramUserType === 'PROFESSIONAL' ? 'professional' : 'client';

  // Form state
  const [userType, setUserType] = useState<UserType>(initialUserType);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localError, setLocalError] = useState('');

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formSlideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  // Password strength calculation
  const getPasswordStrength = (pwd: string): PasswordStrength => {
    if (!pwd) return 'weak';

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsDontMatch = confirmPassword && password !== confirmPassword;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    setLocalError('');
    clearError();

    // Validation
    if (!name.trim()) {
      setLocalError('Por favor, ingresa tu nombre');
      triggerShake();
      return;
    }

    if (!email.trim()) {
      setLocalError('Por favor, ingresa tu email');
      triggerShake();
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('Por favor, ingresa un email válido');
      triggerShake();
      return;
    }

    if (!password) {
      setLocalError('Por favor, ingresa una contraseña');
      triggerShake();
      return;
    }

    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres');
      triggerShake();
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      triggerShake();
      return;
    }

    if (!termsAccepted) {
      setLocalError('Debes aceptar los términos y condiciones');
      triggerShake();
      return;
    }

    try {
      // Register the user
      await register(email, password, name, userType);

      // Send verification email
      try {
        await authService.sendVerificationEmail(email);
      } catch (_emailError: unknown) {
        // If sending email fails, still proceed to the email sent screen
        // The user can retry from there
      }

      // Get backend userType format for navigation
      const backendUserType = userType === 'client' ? 'CLIENT' : 'PROFESSIONAL';

      // Navigate to email sent verification screen
      navigation.navigate('EmailSentVerification', {
        email,
        userType: backendUserType,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Error al registrarse. Intenta de nuevo');
      setLocalError(errorMessage);
      triggerShake();
    }
  };

  const handleGoogleRegister = () => {
    // TODO: Implement Google SSO
    console.log('Google register pressed');
  };

  const openTerms = () => {
    Linking.openURL('https://hera.com/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://hera.com/privacy');
  };

  // Brand Side Content
  const renderBrandSide = () => (
    <LinearGradient
      colors={[heraLanding.secondary, heraLanding.secondaryDark]}
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
            <Ionicons name="heart" size={isDesktop ? 40 : 32} color={heraLanding.secondary} />
          </View>
          <Text style={[styles.logoText, !isDesktop && styles.logoTextMobile]}>HERA</Text>
        </View>

        {isDesktop && (
          <>
            <Text style={styles.brandTitle}>Únete a HERA</Text>
            <Text style={styles.brandSubtitle}>
              Comienza tu camino hacia{'\n'}
              el bienestar mental hoy.
            </Text>

            {/* Features */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="heart" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Matching personalizado</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="calendar" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Reserva flexible</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>Datos protegidos</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </LinearGradient>
  );

  // User Type Selector
  const renderUserTypeSelector = () => (
    <View style={styles.userTypeContainer}>
      <Text style={styles.inputLabel}>Soy:</Text>
      <View style={styles.userTypeButtons}>
        <TouchableOpacity
          style={[
            styles.userTypeButton,
            userType === 'client' && styles.userTypeButtonActive,
          ]}
          onPress={() => setUserType('client')}
          activeOpacity={0.85}
        >
          <View style={[
            styles.userTypeIconContainer,
            userType === 'client' && styles.userTypeIconContainerActive,
          ]}>
            <Ionicons
              name="person"
              size={24}
              color={userType === 'client' ? heraLanding.secondary : heraLanding.textMuted}
            />
          </View>
          <Text style={[
            styles.userTypeText,
            userType === 'client' && styles.userTypeTextActive,
          ]}>Cliente</Text>
          {userType === 'client' && (
            <View style={styles.userTypeCheck}>
              <Ionicons name="checkmark-circle" size={20} color={heraLanding.secondary} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.userTypeButton,
            userType === 'professional' && styles.userTypeButtonActivePro,
          ]}
          onPress={() => setUserType('professional')}
          activeOpacity={0.85}
        >
          <View style={[
            styles.userTypeIconContainer,
            userType === 'professional' && styles.userTypeIconContainerActivePro,
          ]}>
            <Ionicons
              name="medical"
              size={24}
              color={userType === 'professional' ? heraLanding.primary : heraLanding.textMuted}
            />
          </View>
          <Text style={[
            styles.userTypeText,
            userType === 'professional' && styles.userTypeTextActivePro,
          ]}>Especialista</Text>
          {userType === 'professional' && (
            <View style={styles.userTypeCheck}>
              <Ionicons name="checkmark-circle" size={20} color={heraLanding.primary} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Password Strength Indicator
  const renderPasswordStrength = () => {
    if (!password) return null;

    const strengthColors = {
      weak: '#E89D88',
      medium: '#F5C26B',
      strong: heraLanding.success,
    };

    const strengthLabels = {
      weak: 'Débil',
      medium: 'Media',
      strong: 'Fuerte',
    };

    const strengthWidth = {
      weak: '33%',
      medium: '66%',
      strong: '100%',
    };

    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthProgress,
              {
                width: strengthWidth[passwordStrength],
                backgroundColor: strengthColors[passwordStrength],
              },
            ]}
          />
        </View>
        <Text style={[styles.strengthText, { color: strengthColors[passwordStrength] }]}>
          {strengthLabels[passwordStrength]}
        </Text>
      </View>
    );
  };

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
        {/* Back button (mobile only) */}
        {!isDesktop && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={heraLanding.textPrimary} />
          </TouchableOpacity>
        )}

        <View style={[styles.formContainer, isLargeDesktop && styles.formContainerLarge]}>
          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Crear cuenta</Text>
            <Text style={styles.formSubtitle}>
              Únete a HERA y comienza tu camino
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

          {/* User Type Selector */}
          {renderUserTypeSelector()}

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre completo</Text>
            <View
              style={[
                styles.inputContainer,
                nameFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={nameFocused ? heraLanding.primary : heraLanding.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={heraLanding.textMuted}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? heraLanding.primary : heraLanding.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={heraLanding.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? heraLanding.primary : heraLanding.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={heraLanding.textMuted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={heraLanding.textMuted}
                />
              </TouchableOpacity>
            </View>
            {renderPasswordStrength()}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirmar contraseña</Text>
            <View
              style={[
                styles.inputContainer,
                confirmPasswordFocused && styles.inputContainerFocused,
                passwordsMatch && styles.inputContainerSuccess,
                passwordsDontMatch && styles.inputContainerError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={
                  passwordsMatch
                    ? heraLanding.success
                    : passwordsDontMatch
                    ? heraLanding.warning
                    : confirmPasswordFocused
                    ? heraLanding.primary
                    : heraLanding.textMuted
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor={heraLanding.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => setConfirmPasswordFocused(false)}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
              {passwordsMatch && (
                <Ionicons name="checkmark-circle" size={20} color={heraLanding.success} />
              )}
              {passwordsDontMatch && (
                <Ionicons name="close-circle" size={20} color={heraLanding.warning} />
              )}
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={heraLanding.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.termsText}>
              Acepto los{' '}
              <Text style={styles.termsLink} onPress={openTerms}>
                Términos de Servicio
              </Text>
              {' '}y la{' '}
              <Text style={styles.termsLink} onPress={openPrivacy}>
                Política de Privacidad
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              authLoading && styles.primaryButtonDisabled,
              !termsAccepted && styles.primaryButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={authLoading || !termsAccepted}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                userType === 'professional'
                  ? [heraLanding.primary, heraLanding.primaryDark]
                  : [heraLanding.secondary, heraLanding.secondaryDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              {authLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Creando cuenta...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Crear cuenta</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google SSO */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleRegister}
            activeOpacity={0.85}
          >
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIcon}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Desktop back button */}
      {isDesktop && (
        <TouchableOpacity
          style={styles.backButtonDesktop}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={heraLanding.textSecondary} />
          <Text style={styles.backButtonDesktopText}>Volver</Text>
        </TouchableOpacity>
      )}
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  backButtonDesktop: {
    position: 'absolute',
    top: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonDesktopText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  formContainer: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  formContainerLarge: {
    maxWidth: 460,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: heraLanding.textSecondary,
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

  // User Type Selector
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  userTypeButtonActive: {
    borderColor: heraLanding.secondary,
    backgroundColor: heraLanding.secondaryMuted,
  },
  userTypeButtonActivePro: {
    borderColor: heraLanding.primary,
    backgroundColor: heraLanding.primaryMuted,
  },
  userTypeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: heraLanding.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTypeIconContainerActive: {
    backgroundColor: heraLanding.secondaryLight,
  },
  userTypeIconContainerActivePro: {
    backgroundColor: heraLanding.primaryLight,
  },
  userTypeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textSecondary,
  },
  userTypeTextActive: {
    color: heraLanding.secondaryDark,
  },
  userTypeTextActivePro: {
    color: heraLanding.primaryDark,
  },
  userTypeCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
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
  inputContainerSuccess: {
    borderColor: heraLanding.success,
  },
  inputContainerError: {
    borderColor: heraLanding.warning,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: heraLanding.textPrimary,
    marginLeft: 12,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: 8,
  },

  // Password Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: heraLanding.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthProgress: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
  },

  // Terms
  termsContainer: {
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
  termsText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: heraLanding.primary,
    fontWeight: '600',
  },

  // Primary Button
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.md,
    shadowColor: heraLanding.secondary,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: heraLanding.border,
  },
  dividerText: {
    fontSize: 14,
    color: heraLanding.textMuted,
    marginHorizontal: 16,
  },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 12,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  loginText: {
    fontSize: 15,
    color: heraLanding.textSecondary,
  },
  loginLink: {
    fontSize: 15,
    color: heraLanding.primary,
    fontWeight: '700',
  },
});
