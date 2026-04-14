import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyledLogo } from '../components/common/StyledLogo';
import { useTheme } from '../contexts/ThemeContext';

const LoadingScreen = () => {
  const { theme, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.96)).current;
  const backgroundGradient: readonly [string, string, string] = isDark
    ? ['rgba(183, 166, 216, 0.10)', 'rgba(138, 152, 127, 0.06)', 'rgba(10, 13, 11, 0)']
    : ['rgba(184, 168, 217, 0.16)', 'rgba(139, 157, 131, 0.10)', 'rgba(245, 247, 245, 0)'];
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.96,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    shimmerLoop.start();
    pulseLoop.start();

    return () => {
      shimmerLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGlow}
      />

      <Animated.View style={[styles.panelWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.panel}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Preparando tu espacio</Text>
          </View>

          <View style={styles.logoShell}>
            <StyledLogo size={74} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.logoShimmer,
                {
                  transform: [{ translateX: shimmerTranslate }, { rotate: '18deg' }],
                },
              ]}
            />
          </View>

          <Text style={styles.wordmark}>HERA</Text>
          <Text style={styles.message}>
            Estamos cargando tu experiencia con la configuración más reciente.
          </Text>

          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loaderText}>Cargando tu espacio seguro...</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    backgroundGlow: {
      position: 'absolute',
      width: 420,
      height: 420,
      borderRadius: 210,
      opacity: isDark ? 0.9 : 1,
    },
    panelWrap: {
      width: '100%',
      maxWidth: 460,
    },
    panel: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 30,
      paddingHorizontal: 28,
      paddingVertical: 30,
      alignItems: 'center',
      shadowColor: isDark ? '#000000' : theme.primary,
      shadowOpacity: isDark ? 0.32 : 0.10,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 18 },
      elevation: 12,
      overflow: 'hidden',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? theme.primaryAlpha12 : theme.secondaryAlpha12,
      marginBottom: 22,
    },
    badgeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    badgeText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      letterSpacing: 0.2,
    },
    logoShell: {
      width: 100,
      height: 100,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
      marginBottom: 18,
      overflow: 'hidden',
    },
    logoShimmer: {
      position: 'absolute',
      width: 42,
      height: 140,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
    },
    wordmark: {
      fontSize: 34,
      lineHeight: 38,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
      marginBottom: 12,
    },
    message: {
      color: theme.textSecondary,
      fontSize: 17,
      lineHeight: 28,
      fontFamily: theme.fontSansMedium,
      textAlign: 'center',
      maxWidth: 340,
      marginBottom: 24,
    },
    loaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    loaderText: {
      color: theme.textMuted,
      fontSize: 14,
      fontFamily: theme.fontSansMedium,
    },
  });

export default LoadingScreen;
