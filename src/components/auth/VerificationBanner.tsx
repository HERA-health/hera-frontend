/**
 * VerificationBanner - Reminder banner for users with an explicitly unverified email.
 * Dismissible with 24-hour memory per user account.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import { resendVerificationEmailWithRefresh } from '../../services/emailVerificationService';
import { getErrorMessage } from '../../constants/errors';
import { spacing, borderRadius } from '../../constants/colors';

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type BannerState = 'visible' | 'loading' | 'success' | 'error' | 'hidden';

interface VerificationBannerProps {
  /** Optional callback when verification email is sent */
  onVerificationSent?: () => void;
}

const getDismissKey = (userId: string) => `@hera/verification_banner_dismissed:${userId}`;

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  onVerificationSent,
}) => {
  const { user, refreshCurrentUser } = useAuth();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const [message, setMessage] = useState<string>('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoHideTimeout = useCallback(() => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
  }, []);

  const clearDismissal = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    await AsyncStorage.removeItem(getDismissKey(user.id));
  }, [user?.id]);

  const hideBanner = useCallback(async (persistDismissal: boolean) => {
    clearAutoHideTimeout();

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      setBannerState('hidden');
      setMessage('');

      if (!user?.id) {
        return;
      }

      try {
        if (persistDismissal) {
          await AsyncStorage.setItem(getDismissKey(user.id), Date.now().toString());
        } else {
          await AsyncStorage.removeItem(getDismissKey(user.id));
        }
      } catch {
        // Silently fail - banner will reconcile next render.
      }
    });
  }, [clearAutoHideTimeout, fadeAnim, user?.id]);

  useEffect(() => {
    const checkBannerVisibility = async () => {
      clearAutoHideTimeout();

      if (!user) {
        fadeAnim.setValue(0);
        setBannerState('hidden');
        setMessage('');
        return;
      }

      if (user.emailVerified !== false) {
        fadeAnim.setValue(0);
        setBannerState('hidden');
        setMessage('');

        try {
          await clearDismissal();
        } catch {
          // Non-blocking cleanup.
        }
        return;
      }

      const dismissalKey = getDismissKey(user.id);

      try {
        const dismissedAt = await AsyncStorage.getItem(dismissalKey);

        if (dismissedAt) {
          const dismissedTime = parseInt(dismissedAt, 10);
          const now = Date.now();

          if (now - dismissedTime < DISMISS_DURATION_MS) {
            fadeAnim.setValue(0);
            setBannerState('hidden');
            setMessage('');
            return;
          }

          await AsyncStorage.removeItem(dismissalKey);
        }

        fadeAnim.setValue(0);
        setBannerState('visible');
        setMessage('');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch {
        fadeAnim.setValue(0);
        setBannerState('visible');
        setMessage('');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };

    checkBannerVisibility();

    return () => {
      clearAutoHideTimeout();
    };
  }, [clearAutoHideTimeout, clearDismissal, fadeAnim, user]);

  const handleVerifyNow = useCallback(async () => {
    if (!user?.email) {
      return;
    }

    setBannerState('loading');
    setMessage('');

    try {
      const result = await resendVerificationEmailWithRefresh(user.email, refreshCurrentUser);

      if (result.outcome === 'already_verified') {
        await clearDismissal();
        fadeAnim.setValue(0);
        setBannerState('hidden');
        setMessage('');
        return;
      }

      setBannerState('success');
      setMessage(result.message);
      onVerificationSent?.();

      autoHideTimeoutRef.current = setTimeout(() => {
        void hideBanner(true);
      }, 5000);
    } catch (error: unknown) {
      setBannerState('error');
      setMessage(getErrorMessage(error, 'No se pudo enviar el email. Inténtalo de nuevo.'));
    }
  }, [
    clearDismissal,
    fadeAnim,
    hideBanner,
    onVerificationSent,
    refreshCurrentUser,
    user?.email,
  ]);

  if (bannerState === 'hidden') {
    return null;
  }

  const isLoading = bannerState === 'loading';
  const isSuccess = bannerState === 'success';
  const isError = bannerState === 'error';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View
        style={[
          styles.banner,
          isSuccess && styles.bannerSuccess,
          isError && styles.bannerError,
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={isSuccess ? 'checkmark-circle' : isError ? 'alert-circle' : 'mail-unread-outline'}
            size={22}
            color={isSuccess ? theme.success : isError ? theme.warning : theme.primary}
          />
        </View>

        <View style={styles.content}>
          {message ? (
            <Text
              style={[
                styles.message,
                isSuccess && styles.messageSuccess,
                isError && styles.messageError,
              ]}
            >
              {message}
            </Text>
          ) : (
            <>
              <Text style={styles.title}>Verifica tu email para acceso completo</Text>
              <Text style={styles.subtitle}>
                Te enviaremos un enlace seguro a {user?.email}.
              </Text>
            </>
          )}
        </View>

        {!message ? (
          <TouchableOpacity
            style={[
              styles.verifyButton,
              isLoading && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerifyNow}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.textOnPrimary} />
            ) : (
              <Text style={styles.verifyButtonText}>Verificar</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => void hideBanner(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    bannerSuccess: {
      backgroundColor: theme.successBg,
      borderColor: theme.successLight,
      borderLeftColor: theme.success,
    },
    bannerError: {
      backgroundColor: isDark ? theme.errorBg : theme.warningBg,
      borderColor: isDark ? theme.borderStrong : theme.warning,
      borderLeftColor: theme.warning,
    },
    iconContainer: {
      marginRight: spacing.sm,
      alignSelf: 'flex-start',
      paddingTop: 2,
    },
    content: {
      flex: 1,
      marginRight: spacing.sm,
      gap: 2,
    },
    title: {
      fontSize: 14,
      color: theme.textPrimary,
      lineHeight: 20,
      fontFamily: theme.fontSansSemiBold,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
      fontFamily: theme.fontSans,
    },
    message: {
      fontSize: 14,
      color: theme.textPrimary,
      lineHeight: 20,
      fontFamily: theme.fontSansMedium,
    },
    messageSuccess: {
      color: theme.success,
    },
    messageError: {
      color: theme.warning,
    },
    verifyButton: {
      backgroundColor: theme.primary,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      minWidth: 88,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      shadowColor: isDark ? '#000000' : theme.primary,
      shadowOpacity: isDark ? 0.18 : 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    verifyButtonDisabled: {
      opacity: 0.8,
    },
    verifyButtonText: {
      fontSize: 13,
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    dismissButton: {
      padding: spacing.xs,
      alignSelf: 'flex-start',
      marginTop: 1,
    },
  });

export default VerificationBanner;
