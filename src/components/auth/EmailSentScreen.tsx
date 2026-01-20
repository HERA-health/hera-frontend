/**
 * EmailSentScreen - Shared component for email sent confirmations
 * Used by both email verification and password reset flows
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import { getErrorMessage } from '../../constants/errors';
import type { EmailType } from '../../types/auth';

interface EmailSentScreenProps {
  type: EmailType;
  email: string;
  onResend: () => Promise<void>;
  onChangeEmail?: () => void;
  onContinue?: () => void;
}

/**
 * Reusable email sent confirmation component
 * Displays success state after sending verification or password reset email
 */
export const EmailSentScreen: React.FC<EmailSentScreenProps> = ({
  type,
  email,
  onResend,
  onChangeEmail,
  onContinue,
}) => {
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    // Show success message for 3 seconds
    if (resendSuccess) {
      Animated.timing(successFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(successFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setResendSuccess(false));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [resendSuccess, successFadeAnim]);

  const handleResend = async () => {
    try {
      setResending(true);
      setError(null);
      await onResend();
      setResendSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al reenviar correo'));
    } finally {
      setResending(false);
    }
  };

  // Content based on type
  const title = type === 'verification'
    ? 'Verifica tu correo'
    : 'Revisa tu correo';

  const description = type === 'verification'
    ? 'Te hemos enviado un enlace de verificación'
    : 'Te hemos enviado instrucciones para restablecer tu contraseña';

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Email Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={48} color={heraLanding.primary} />
          </View>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={16} color={heraLanding.textOnPrimary} />
          </View>
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {/* Email Card */}
        <View style={styles.emailCard}>
          <Ionicons name="at" size={20} color={heraLanding.primary} />
          <Text style={styles.emailText} numberOfLines={1}>
            {email}
          </Text>
        </View>

        {/* Success Message */}
        {resendSuccess && (
          <Animated.View style={[styles.successMessage, { opacity: successFadeAnim }]}>
            <Ionicons name="checkmark-circle" size={18} color={heraLanding.success} />
            <Text style={styles.successText}>Correo reenviado correctamente</Text>
          </Animated.View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={heraLanding.warning} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Resend Button */}
        <TouchableOpacity
          style={[styles.resendButton, resending && styles.resendButtonDisabled]}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.8}
        >
          {resending ? (
            <>
              <ActivityIndicator size="small" color={heraLanding.primary} />
              <Text style={styles.resendButtonText}>Reenviando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={heraLanding.primary} />
              <Text style={styles.resendButtonText}>Reenviar correo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Change Email Option */}
        {onChangeEmail && (
          <TouchableOpacity style={styles.changeEmailButton} onPress={onChangeEmail}>
            <Text style={styles.changeEmailText}>Cambiar correo electrónico</Text>
          </TouchableOpacity>
        )}

        {/* Continue Button (verification only) */}
        {type === 'verification' && onContinue && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={18} color={heraLanding.textOnPrimary} />
          </TouchableOpacity>
        )}

        {/* Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={16} color={heraLanding.textMuted} />
          <Text style={styles.footerText}>
            Si no ves el correo, revisa tu carpeta de spam
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: heraLanding.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: heraLanding.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: heraLanding.background,
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
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.cardBg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  emailText: {
    flex: 1,
    fontSize: 15,
    color: heraLanding.textPrimary,
    fontWeight: '500',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.successBg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: 14,
    color: heraLanding.success,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.warningLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: heraLanding.warning,
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.cardBg,
    borderWidth: 2,
    borderColor: heraLanding.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  changeEmailButton: {
    paddingVertical: spacing.sm,
  },
  changeEmailText: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    textDecorationLine: 'underline',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: 13,
    color: heraLanding.textMuted,
    textAlign: 'center',
  },
});

export default EmailSentScreen;
