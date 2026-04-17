/**
 * EmailInputScreen - Reusable component for email entry
 * Used for password reset request and email verification resend
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import { getErrorMessage } from '../../constants/errors';
import { validateEmail, getEmailError } from '../../utils/validation';

interface EmailInputScreenProps {
  title: string;
  description: string;
  buttonText: string;
  onSubmit: (email: string) => Promise<void>;
  onBack?: () => void;
}

/**
 * Reusable email input screen component
 * Handles email validation and submission with loading state
 */
export const EmailInputScreen: React.FC<EmailInputScreenProps> = ({
  title,
  description,
  buttonText,
  onSubmit,
  onBack,
}) => {
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Clear validation error on email change
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (validationError) {
      setValidationError(null);
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  // Shake animation for errors
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setValidationError(null);
    setSubmitError(null);

    // Validate email
    const error = getEmailError(email);
    if (error) {
      setValidationError(error);
      triggerShake();
      return;
    }

    // Additional format check
    if (!validateEmail(email)) {
      setValidationError('Por favor, introduce un correo electrónico válido');
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      await onSubmit(email.trim().toLowerCase());
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Error al procesar la solicitud'));
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={heraLanding.textPrimary} />
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={40} color={heraLanding.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Submit Error */}
          {submitError && (
            <Animated.View
              style={[
                styles.errorContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={heraLanding.warning} />
              <Text style={styles.errorText}>{submitError}</Text>
            </Animated.View>
          )}

          {/* Email Input */}
          <Animated.View
            style={[
              styles.inputGroup,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
                validationError && styles.inputContainerError,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={
                  validationError
                    ? heraLanding.warning
                    : emailFocused
                    ? heraLanding.primary
                    : heraLanding.textMuted
                }
              />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={heraLanding.textMuted}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Validation Error */}
            {validationError && (
              <View style={styles.validationErrorContainer}>
                <Ionicons name="alert-circle-outline" size={14} color={heraLanding.warning} />
                <Text style={styles.validationErrorText}>{validationError}</Text>
              </View>
            )}
          </Animated.View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color={heraLanding.textOnPrimary} />
                <Text style={styles.submitButtonText}>Enviando...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>{buttonText}</Text>
                <Ionicons name="arrow-forward" size={20} color={heraLanding.textOnPrimary} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
    zIndex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: heraLanding.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.cardBg,
    borderWidth: 2,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: heraLanding.primary,
    ...shadows.sm,
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
  validationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  validationErrorText: {
    fontSize: 13,
    color: heraLanding.warning,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },
});

export default EmailInputScreen;
