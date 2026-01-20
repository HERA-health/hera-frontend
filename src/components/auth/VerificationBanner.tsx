/**
 * VerificationBanner - Reminder banner for unverified email users
 * Shows at the top of main screens for users who haven't verified their email
 * Dismissible with 24-hour memory using AsyncStorage
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as authService from '../../services/authService';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';

const BANNER_DISMISSED_KEY = '@hera/verification_banner_dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type BannerState = 'visible' | 'loading' | 'success' | 'error' | 'hidden';

interface VerificationBannerProps {
  /** Optional callback when verification email is sent */
  onVerificationSent?: () => void;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  onVerificationSent,
}) => {
  const { user } = useAuth();
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const [message, setMessage] = useState<string>('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Check if banner should be visible
  useEffect(() => {
    const checkBannerVisibility = async () => {
      // Don't show if user is verified or not logged in
      if (!user || user.emailVerified) {
        setBannerState('hidden');
        return;
      }

      try {
        const dismissedAt = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);

        if (dismissedAt) {
          const dismissedTime = parseInt(dismissedAt, 10);
          const now = Date.now();

          // Check if 24 hours have passed since dismissal
          if (now - dismissedTime < DISMISS_DURATION_MS) {
            setBannerState('hidden');
            return;
          }

          // Clear old dismissal
          await AsyncStorage.removeItem(BANNER_DISMISSED_KEY);
        }

        // Show banner
        setBannerState('visible');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        // If AsyncStorage fails, show banner anyway
        setBannerState('visible');
      }
    };

    checkBannerVisibility();
  }, [user, fadeAnim]);

  // Handle send verification email
  const handleVerifyNow = useCallback(async () => {
    if (!user?.email) return;

    setBannerState('loading');
    setMessage('');

    try {
      await authService.resendVerificationEmail(user.email);
      setBannerState('success');
      setMessage('Email enviado. Revisa tu bandeja de entrada.');
      onVerificationSent?.();

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        handleDismiss();
      }, 5000);
    } catch (error) {
      setBannerState('error');
      setMessage('No se pudo enviar el email. Inténtalo de nuevo.');
    }
  }, [user?.email, onVerificationSent]);

  // Handle dismiss banner
  const handleDismiss = useCallback(async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      setBannerState('hidden');
      try {
        await AsyncStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
      } catch (error) {
        // Silently fail - banner will just reappear next time
      }
    });
  }, [fadeAnim]);

  // Don't render if hidden
  if (bannerState === 'hidden') {
    return null;
  }

  const isLoading = bannerState === 'loading';
  const isSuccess = bannerState === 'success';
  const isError = bannerState === 'error';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[
        styles.banner,
        isSuccess && styles.bannerSuccess,
        isError && styles.bannerError,
      ]}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={isSuccess ? 'checkmark-circle' : isError ? 'alert-circle' : 'mail-unread-outline'}
            size={24}
            color={isSuccess ? heraLanding.success : isError ? heraLanding.warning : heraLanding.primary}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {message ? (
            <Text style={[
              styles.message,
              isSuccess && styles.messageSuccess,
              isError && styles.messageError,
            ]}>
              {message}
            </Text>
          ) : (
            <Text style={styles.title}>
              Verifica tu email para acceso completo
            </Text>
          )}
        </View>

        {/* Action button or loading */}
        {!message && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerifyNow}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={heraLanding.textOnPrimary} />
            ) : (
              <Text style={styles.verifyButtonText}>Verificar</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Dismiss button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={heraLanding.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primaryMuted,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: heraLanding.primary,
    ...shadows.sm,
  },
  bannerSuccess: {
    backgroundColor: heraLanding.successBg,
    borderLeftColor: heraLanding.success,
  },
  bannerError: {
    backgroundColor: heraLanding.warningLight,
    borderLeftColor: heraLanding.warning,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textPrimary,
    lineHeight: 20,
  },
  messageSuccess: {
    color: heraLanding.success,
  },
  messageError: {
    color: heraLanding.warning,
  },
  verifyButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  verifyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  dismissButton: {
    padding: spacing.xs,
  },
});

export default VerificationBanner;
