/**
 * StickyBookingBar - Fixed bottom CTA bar
 * Shows on scroll when hero is out of view
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { StickyBookingBarProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

export const StickyBookingBar: React.FC<StickyBookingBarProps> = ({
  specialistName,
  pricePerSession,
  onBookPress,
  visible,
}) => {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;
  const translateY = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 100,
      useNativeDriver: true,
      friction: 8,
      tension: 65,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.content, isWideScreen && styles.contentWide]}>
        {/* Info - Hidden on mobile */}
        {isWideScreen && (
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {specialistName}
            </Text>
            <Text style={styles.price}>€{pricePerSession}/sesión</Text>
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, !isWideScreen && styles.ctaButtonFull]}
          onPress={onBookPress}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Reservar sesión</Text>
          {!isWideScreen && (
            <Text style={styles.ctaPrice}>€{pricePerSession}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: heraLanding.cardBg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
    ...shadows.lg,
    ...Platform.select({
      ios: {
        paddingBottom: 20,
      },
      android: {
        paddingBottom: 10,
      },
      default: {
        paddingBottom: 0,
      },
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
  contentWide: {
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: spacing.lg,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  price: {
    fontSize: 14,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: heraLanding.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaButtonFull: {
    flex: 1,
  },
  ctaText: {
    color: heraLanding.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  ctaPrice: {
    color: heraLanding.textOnPrimary,
    fontSize: 14,
    opacity: 0.9,
  },
});

export default StickyBookingBar;
