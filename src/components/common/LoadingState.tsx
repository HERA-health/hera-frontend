import React, { useMemo, useRef, useEffect } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  fullScreen = false,
  size = 'large',
}) => {
  const { theme, isDark } = useTheme();
  const glow = useRef(new Animated.Value(0.94)).current;
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.94,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Animated.View style={[styles.inner, { transform: [{ scale: glow }] }]}>
        <View style={styles.spinnerShell}>
          <ActivityIndicator size={size} color={theme.primary} />
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Animated.View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    container: {
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    inner: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    spinnerShell: {
      width: 72,
      height: 72,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.bgElevated : theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: isDark ? '#000000' : theme.primary,
      shadowOpacity: isDark ? 0.24 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    message: {
      marginTop: 6,
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      fontFamily: theme.fontSansMedium,
    },
  });

export default LoadingState;
