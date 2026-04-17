import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { shadows, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando tus sesiones...',
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconOuter, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.iconInner}>
          <Ionicons name="calendar-outline" size={30} color={theme.primary} />
        </View>
      </Animated.View>

      <ActivityIndicator size="small" color={theme.primary} style={styles.spinner} />

      <Text style={styles.message}>{message}</Text>
      <Text style={styles.submessage}>Preparando tu agenda con calma…</Text>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
      backgroundColor: theme.bg,
    },
    iconOuter: {
      width: 82,
      height: 82,
      borderRadius: 26,
      backgroundColor: theme.primaryAlpha12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    iconInner: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    spinner: {
      marginBottom: spacing.md,
    },
    message: {
      fontSize: 16,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    submessage: {
      fontSize: 14,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
  });

export default LoadingState;
