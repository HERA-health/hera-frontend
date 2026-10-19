import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { StyledLogo } from './StyledLogo';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
  showLogo?: boolean;
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => setReducedMotion(preference.matches);
      onChange();
      preference.addEventListener('change', onChange);
      return () => preference.removeEventListener('change', onChange);
    }

    let active = true;
    const onChange = (enabled: boolean) => {
      if (active) setReducedMotion(enabled);
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', onChange);
    void AccessibilityInfo.isReduceMotionEnabled().then(onChange).catch(() => {
      // Keep the static indicator if the system preference cannot be read.
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  fullScreen = false,
  size = 'large',
  showLogo = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotionPreference();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }

    const entrance = Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: Platform.OS !== 'web',
    });
    entrance.start();
    return () => entrance.stop();
  }, [opacity, reducedMotion, visible]);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Animated.View
        accessible={visible}
        accessibilityRole="progressbar"
        accessibilityLabel={message || 'Cargando...'}
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion={visible ? 'polite' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        aria-hidden={!visible}
        style={[styles.content, { opacity }]}
      >
        {showLogo ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={styles.logo}
          >
            <StyledLogo size={48} />
          </View>
        ) : null}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={[styles.indicatorSlot, size === 'large' && styles.largeIndicatorSlot]}
        >
          {!visible || reducedMotion ? (
            <View style={[styles.staticIndicator, size === 'large' && styles.largeIndicator]} />
          ) : (
            <ActivityIndicator size={size} color={theme.primary} />
          )}
        </View>
        {message ? <Text accessible={false} style={styles.message}>{message}</Text> : null}
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
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
    content: {
      maxWidth: '100%',
      alignItems: 'center',
    },
    logo: {
      marginBottom: 24,
    },
    indicatorSlot: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    largeIndicatorSlot: {
      width: 36,
      height: 36,
    },
    staticIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      borderTopColor: theme.primary,
    },
    largeIndicator: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    message: {
      marginTop: 12,
      maxWidth: 280,
      fontSize: 14,
      lineHeight: 22,
      color: theme.textSecondary,
      textAlign: 'center',
      fontFamily: theme.fontSans,
    },
  });

export default LoadingState;
