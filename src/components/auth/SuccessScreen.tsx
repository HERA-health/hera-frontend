/**
 * SuccessScreen - Shared component for success confirmations
 * Used after email verification or password reset completion
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';
import type { SuccessType } from '../../types/auth';

interface SuccessScreenProps {
  type: SuccessType;
  onContinue: () => void;
}

/**
 * Reusable success confirmation component
 * Displays celebratory state after email verification or password reset
 */
export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  type,
  onContinue,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, bounceAnim]);

  // Content based on type
  const title = type === 'emailVerified'
    ? 'Correo verificado'
    : 'Contraseña actualizada';

  const message = type === 'emailVerified'
    ? 'Tu correo ha sido verificado correctamente. Ya puedes acceder a todas las funciones de HERA.'
    : 'Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.';

  const buttonText = type === 'emailVerified'
    ? 'Comenzar'
    : 'Iniciar sesión';

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
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                {
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={72} color={heraLanding.success} />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Decorative Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIcon}>
            <Ionicons name="sparkles" size={16} color={heraLanding.primary} />
          </View>
          <View style={styles.dividerLine} />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>{buttonText}</Text>
          <Ionicons name="arrow-forward" size={20} color={heraLanding.textOnPrimary} />
        </TouchableOpacity>
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
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: heraLanding.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: heraLanding.border,
  },
  dividerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    width: '100%',
    ...shadows.md,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: heraLanding.textOnPrimary,
  },
});

export default SuccessScreen;
