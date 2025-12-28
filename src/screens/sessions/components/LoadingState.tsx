/**
 * LoadingState Component
 * Beautiful, calming loading state
 *
 * CRITICAL: Background #F5F7F5 (Light Sage) - HERA signature
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, colors, spacing, borderRadius } from '../../../constants/colors';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando tus sesiones...',
}) => {
  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={styles.iconInner}>
          <Ionicons name="calendar" size={32} color={heraLanding.primary} />
        </View>
      </Animated.View>

      <ActivityIndicator
        size="small"
        color={heraLanding.primary}
        style={styles.spinner}
      />

      <Text style={styles.message}>{message}</Text>
      <Text style={styles.submessage}>Preparando tu experiencia...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    backgroundColor: heraLanding.background, // #F5F7F5 Light Sage - CRITICAL
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${heraLanding.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: heraLanding.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  submessage: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    fontWeight: '400',
  },
});

export default LoadingState;
