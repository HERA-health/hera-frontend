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
import Ionicons from '@expo/vector-icons/Ionicons';
import { PasswordRequirementsChecklist, SuccessScreen } from '../../components/auth';
import * as authService from '../../services/authService';
import {
  validatePassword,
  validatePasswordMatch,
  getPasswordError,
  getPasswordMatchError,
} from '../../utils/validation';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';

type ScreenState = 'loading' | 'form' | 'success' | 'error';

export function ResetPasswordScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ResetPassword'>>();
  const { theme } = useTheme();

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
  // Use reset() to clear the navigation stack and prevent returning to success screen
  const handleContinueToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: { userType: 'CLIENT' } }],
    });
  };

  // Handle requesting a new reset link
  const handleRequestNewLink = () => {
    navigation.navigate('ForgotPassword');
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
          onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'Login', params: { userType: 'CLIENT' } }],
          })}
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
                { backgroundColor: theme.errorBg },
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={theme.error} />
              <Text
                style={[
                  styles.formErrorText,
                  { color: theme.error, fontFamily: theme.fontSansMedium },
                ]}
              >
                {formError}
              </Text>
            </Animated.View>
          )}

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.inputLabel,
                { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Nueva contraseña
            </Text>
            <View
              style={[
                styles.inputContainer,
                passwordFocused ? { ...shadows.sm, shadowColor: theme.shadowPrimary } : null,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: passwordFocused ? theme.focus : theme.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? theme.focus : theme.textMuted}
              />
              <TextInput
                style={[styles.input, { color: theme.textPrimary, fontFamily: theme.fontSans }]}
                placeholder="Crea una contraseña segura"
                placeholderTextColor={theme.textMuted}
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
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
            <PasswordRequirementsChecklist password={password} />
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.inputLabel,
                { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Confirmar contraseña
            </Text>
            <View
              style={[
                styles.inputContainer,
                confirmPasswordFocused ? { ...shadows.sm, shadowColor: theme.shadowPrimary } : null,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: passwordsMatch
                    ? theme.success
                    : passwordsDontMatch
                    ? theme.error
                    : confirmPasswordFocused
                    ? theme.focus
                    : theme.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={
                  passwordsMatch
                    ? theme.success
                    : passwordsDontMatch
                    ? theme.error
                    : confirmPasswordFocused
                    ? theme.focus
                    : theme.textMuted
                }
              />
              <TextInput
                style={[styles.input, { color: theme.textPrimary, fontFamily: theme.fontSans }]}
                placeholder="Repite tu contraseña"
                placeholderTextColor={theme.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => setConfirmPasswordFocused(false)}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                autoCapitalize="none"
              />
              {passwordsMatch && (
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              )}
              {passwordsDontMatch && (
                <Ionicons name="close-circle" size={20} color={theme.error} />
              )}
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
            {passwordsDontMatch && (
              <Text
                style={[
                  styles.matchErrorText,
                  { color: theme.error, fontFamily: theme.fontSansMedium },
                ]}
              >
                Las contraseñas no coinciden
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: canSubmit ? theme.primary : theme.borderStrong,
                shadowColor: theme.shadowPrimary,
              },
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.textOnPrimary} />
            ) : (
              <>
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: theme.textOnPrimary, fontFamily: theme.fontSansBold },
                  ]}
                >
                  Restablecer contraseña
                </Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={theme.textOnPrimary} />
              </>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Login', params: { userType: 'CLIENT' } }],
            })}
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  formErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  // Input Group
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: spacing.xs,
  },

  // Match Error
  matchErrorText: {
    fontSize: 13,
    marginTop: spacing.xs,
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
