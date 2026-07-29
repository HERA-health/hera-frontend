import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/common';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { formatProfileSlotLabel } from '../profilePresentation';
import type { StickyBookingBarProps } from '../types';

export const StickyBookingBarEditorial: React.FC<StickyBookingBarProps> = ({
  specialistName,
  pricePerSession,
  firstVisitFree = false,
  selectedSlot,
  onBookPress,
  visible,
  canBook = true,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const translateY = useRef(new Animated.Value(120)).current;
  const ctaLabel = selectedSlot
    ? `Continuar · ${formatProfileSlotLabel(selectedSlot.date, selectedSlot.slot.startTime)}`
    : 'Reservar sesión';

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible && canBook ? 0 : 120,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  }, [canBook, translateY, visible]);

  if (!canBook) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{specialistName}</Text>
          <Text style={styles.price} numberOfLines={1}>
            {firstVisitFree ? 'Gratis si es tu primera sesión' : `${pricePerSession}€ / sesión`}
          </Text>
        </View>
        <Button variant="primary" size="large" style={styles.button} onPress={onBookPress}>
          {ctaLabel}
        </Button>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
    shadowColor: theme.shadowCard,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
  },
  price: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: theme.fontSans,
    color: theme.textSecondary,
  },
  button: { flex: 1.3, minWidth: 0 },
});

export default StickyBookingBarEditorial;
