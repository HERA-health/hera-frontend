import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions, Platform } from 'react-native';
import { StickyBookingBarProps } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { Button } from '../../../components/common';

export const StickyBookingBar: React.FC<StickyBookingBarProps> = ({
  specialistName,
  pricePerSession,
  onBookPress,
  visible,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isWideScreen = width > 768;
  const translateY = useRef(new Animated.Value(100)).current;
  const ctaStyle = isWideScreen ? styles.ctaButton : { ...styles.ctaButton, ...styles.ctaButtonFull };

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 100,
      useNativeDriver: true,
      friction: 8,
      tension: 65,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={[styles.content, isWideScreen && styles.contentWide]}>
        {isWideScreen && (
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{specialistName}</Text>
            <Text style={styles.price}>€{pricePerSession}/sesión</Text>
          </View>
        )}
        <Button variant="primary" size="large" style={ctaStyle} onPress={onBookPress}>
          Reservar sesión
        </Button>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    ...shadows.lg,
    ...Platform.select({
      ios: { paddingBottom: 20 },
      android: { paddingBottom: 10 },
      default: { paddingBottom: 0 },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  contentWide: { justifyContent: 'space-between' },
  info: { flex: 1, marginRight: spacing.lg },
  name: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
  price: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  ctaButton: { minWidth: 240 },
  ctaButtonFull: { flex: 1, minWidth: 0 },
});

export default StickyBookingBar;
