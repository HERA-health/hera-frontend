/**
 * ResetPasswordScreen - New password entry after clicking reset link
 * Handles deep link token, validates, and allows password reset
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SuccessScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import {
  validatePassword,
  validatePasswordMatch,
  calculatePasswordStrength,
  getPasswordError,
  getPasswordMatchError,
} from '../../utils/validation';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import type { PasswordStrength } from '../../types/auth';

type ScreenState = 'loading' | 'form' | 'success' | 'error';

export function ResetPasswordScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ResetPassword'>>();

  const { token } = route.params;

  // Screen state
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Animation
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Password validation state
  const passwordStrength: PasswordStrength = calculatePasswordStrength(password);
  const isPasswordValid = validatePassword(password);
  const passwordsMatch = confirmPassword.length > 0 && validatePasswordMatch(password, confirmPassword);
  const passwordsDontMatch = confirmPassword.length > 0 && !validatePasswordMatch(password, confirmPassword);
  const canSubmit = isPasswordValid && passwordsMatch && !isSubmitting;

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setErrorMessage('Enlace de recuperación inválido. Por favor, solicita un nuevo enlace.');
        setScreenState('error');
        return;
      }

      try {
        const result = await authService.validateResetToken(token);
        if (result.valid) {
          if (result.email) {
            setEmail(result.email);
          }
          setScreenState('form');
          // Fade in the form
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          setErrorMessage('El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.');
          setScreenState('error');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al validar el enlace';
        setErrorMessage(message);
        setScreenState('error');
      }
    };

    validateToken();
  }, [token, fadeAnim]);

  // Shake animation for errors
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate password
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setFormError(passwordError);
      triggerShake();
      return;
    }

    // Validate password match
    const matchError = getPasswordMatchError(password, confirmPassword);
    if (matchError) {
      setFormError(matchError);
      triggerShake();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await authService.resetPassword(token, password);
      setScreenState('success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al restablecer la contraseña';
      setFormError(message);
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle navigation to login after success
  const handleContinueToLogin = () => {
    navigation.navigate('Login', { userType: 'CLIENT' });
  };

  // Handle requesting a new reset link
  const handleRequestNewLink = () => {
    navigation.navigate('ForgotPassword');
  };

  // Password Strength Indicator
  const renderPasswordStrength = () => {
    if (!password) return null;

    const strengthColors = {
      weak: heraLanding.warning,
      medium: heraLanding.secondary,
      strong: heraLanding.success,
    };

    const strengthLabels = {
      weak: 'Débil',
      medium: 'Media',
      strong: 'Fuerte',
    };

    const strengthWidth = {
      weak: '33%' as const,
      medium: '66%' as const,
      strong: '100%' as const,
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

  // Loading state
  if (screenState === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
        <Text style={styles.loadingText}>Validando enlace...</Text>
      </View>
    );
  }

  // Error state
  if (screenState === 'error') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle" size={64} color={heraLanding.warning} />
        </View>
        <Text style={styles.errorTitle}>Enlace inválido</Text>
        <Text style={styles.errorDescription}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRequestNewLink}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Solicitar nuevo enlace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={heraLanding.primary} />
          <Text style={styles.secondaryButtonText}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Success state
  if (screenState === 'success') {
    return (
      <SuccessScreen
        type="passwordReset"
        onContinue={handleContinueToLogin}
      />
    );
  }

  // Form state
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={40} color={heraLanding.primary} />
            </View>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.description}>
              {email
                ? `Crea una nueva contraseña para ${email}`
                : 'Crea una nueva contraseña para tu cuenta'}
            </Text>
          </View>

          {/* Error Display */}
          {formError && (
            <Animated.View
              style={[
                styles.formErrorContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={heraLanding.warning} />
              <Text style={styles.formErrorText}>{formError}</Text>
            </Animated.View>
          )}

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nueva contraseña</Text>
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
                autoCapitalize="none"
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
                autoCapitalize="none"
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
            {passwordsDontMatch && (
              <Text style={styles.matchErrorText}>Las contraseñas no coinciden</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={heraLanding.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Restablecer contraseña</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={heraLanding.textOnPrimary} />
              </>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color={heraLanding.primary} />
            <Text style={styles.backLinkText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: heraLanding.textSecondary,
  },

  // Error State
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: heraLanding.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  errorDescription: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxWidth: 400,
  },
  primaryButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // Form Container
  formContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form Error
  formErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.warningLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  formErrorText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.warning,
    fontWeight: '500',
  },

  // Input Group
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.cardBg,
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
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
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: spacing.xs,
  },

  // Password Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
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

  // Match Error
  matchErrorText: {
    fontSize: 13,
    color: heraLanding.warning,
    marginTop: spacing.xs,
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: heraLanding.textMuted,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },

  // Back Link
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.primary,
  },
});

export default ResetPasswordScreen;
