/**
 * NavItem Component
 *
 * Single Responsibility Principle (SRP):
 * - This component is ONLY responsible for rendering a single navigation item
 * - It receives all data via props and has no internal business logic
 * - Styling is based on props (isActive, item.disabled)
 * - Navigation is delegated to parent via onPress callback
 *
 * Liskov Substitution Principle (LSP):
 * - All navigation items use this same component
 * - Consistent interface and behavior for all items
 * - No special cases breaking expectations
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NavItemProps } from './types';
import { navItemStyles as styles } from './styles';
import { SIDEBAR_THEME } from './navConfig';

/**
 * PulsingBadge - Animated badge wrapper for urgent items
 * Creates a subtle pulse effect to draw attention without being annoying
 */
const PulsingBadge: React.FC<{
  colors: [string, string];
  text: string;
  isUrgent: boolean;
}> = ({ colors, text, isUrgent }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isUrgent) return;

    // Subtle pulse animation - 2 second cycle, not distracting
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [isUrgent, pulseAnim, glowAnim]);

  return (
    <Animated.View
      style={[
        pulsingBadgeStyles.container,
        isUrgent && {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Glow effect for urgent badges */}
      {isUrgent && (
        <Animated.View
          style={[
            pulsingBadgeStyles.glow,
            {
              opacity: glowAnim,
              backgroundColor: colors[0],
            },
          ]}
        />
      )}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.badge}
      >
        <Text style={styles.badgeText}>{text}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const pulsingBadgeStyles = StyleSheet.create({
  container: {
    marginLeft: 'auto',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 9,
  },
});

/**
 * NavItem renders a single navigation item in the sidebar
 *
 * @param item - Navigation item configuration
 * @param isActive - Whether this item represents the current route
 * @param onPress - Callback when item is pressed
 */
export function NavItem({ item, isActive, onPress }: NavItemProps): React.ReactElement {
  const handlePress = useCallback(() => {
    if (!item.disabled) {
      onPress(item.route);
    }
  }, [item.disabled, item.route, onPress]);

  // Determine icon to display (filled when active, outline when not)
  const iconName = isActive && item.iconActive ? item.iconActive : item.icon;
  const iconColor = isActive
    ? SIDEBAR_THEME.icon.active
    : SIDEBAR_THEME.icon.inactive;

  // Get badge colors based on variant
  const getBadgeColors = (): [string, string] => {
    if (item.badgeColors) return item.badgeColors;
    switch (item.badgeVariant) {
      case 'urgent':
        return SIDEBAR_THEME.badge.urgent;
      case 'info':
        return SIDEBAR_THEME.badge.info;
      default:
        return SIDEBAR_THEME.badge.default;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        item.disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={item.disabled}
      activeOpacity={0.7}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Navigate to ${item.label}`}
      accessibilityState={{
        selected: isActive,
        disabled: item.disabled,
      }}
    >
      <View
        style={[
          styles.inner,
          styles.default,
          isActive && styles.active,
        ]}
      >
        {/* Active indicator bar */}
        {isActive && <View style={styles.activeBar} />}

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName}
            size={20}
            color={iconColor}
          />
        </View>

        {/* Label */}
        <Text
          style={[
            styles.label,
            isActive && styles.labelActive,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>

        {/* Optional Badge - with pulse animation for urgent items */}
        {item.badge && (
          <PulsingBadge
            colors={getBadgeColors()}
            text={item.badge}
            isUrgent={item.badgeVariant === 'urgent'}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default NavItem;
