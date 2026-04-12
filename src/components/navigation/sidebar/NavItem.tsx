/**
 * NavItem Component — HERA Design System v5.0
 *
 * Single navigation item with:
 * - Reanimated spring scale on press (replaces TouchableOpacity activeOpacity)
 * - Animated active indicator bar (width spring: 0 → 3px)
 * - Animated active pill background (opacity spring)
 * - Hover translateX on web
 * - Dark mode via useTheme() + getSidebarTheme()
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NavItemProps } from './types';
import { navItemStyles as styles } from './styles';
import { getSidebarTheme } from './navConfig';
import { useTheme } from '../../../contexts/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── PulsingBadge (migrated to Reanimated) ────────────────────────────────────

const PulsingBadge: React.FC<{
  colors: [string, string];
  text: string;
  isUrgent: boolean;
}> = ({ colors, text, isUrgent }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (!isUrgent) return;

    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1, // infinite
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 }),
      ),
      -1,
      false,
    );

    return () => {
      scale.value = 1;
      glowOpacity.value = 0.3;
    };
  }, [isUrgent]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[pulsingBadgeStyles.container, isUrgent && scaleStyle]}>
      {isUrgent && (
        <Animated.View
          style={[
            pulsingBadgeStyles.glow,
            glowStyle,
            { backgroundColor: colors[0] },
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

// ─── NavItem ──────────────────────────────────────────────────────────────────

export function NavItem({ item, isActive, onPress, isCollapsed = false }: NavItemProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  const handlePress = useCallback(() => {
    if (!item.disabled) onPress(item.route);
  }, [item.disabled, item.route, onPress]);

  const iconName = isActive && item.iconActive ? item.iconActive : item.icon;
  const iconColor = isActive ? sidebarTheme.icon.active : sidebarTheme.icon.inactive;

  // ── Reanimated: press scale + hover translateX ─────────────────────────
  const pressScale = useSharedValue(1);
  const hoverX = useSharedValue(0);

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { translateX: hoverX.value },
    ],
  }));

  // ── Reanimated: active indicator bar (width 0 → 3) ─────────────────────
  const barWidth = useSharedValue(isActive ? 3 : 0);
  const pillOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    barWidth.value = withSpring(isActive ? 3 : 0, { damping: 20, stiffness: 300 });
    pillOpacity.value = withTiming(isActive ? 1 : 0, { duration: 150 });
  }, [isActive]);

  const barAnimStyle = useAnimatedStyle(() => ({
    width: barWidth.value,
    opacity: barWidth.value / 3,
  }));

  const pillAnimStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
  }));

  const getBadgeColors = (): [string, string] => {
    if (item.badgeColors) return item.badgeColors;
    switch (item.badgeVariant) {
      case 'urgent': return sidebarTheme.badge.urgent;
      case 'info':   return sidebarTheme.badge.info;
      default:       return sidebarTheme.badge.default;
    }
  };

  return (
    <Animated.View style={containerAnimStyle}>
      <AnimatedPressable
        onPress={handlePress}
        disabled={item.disabled}
        onPressIn={() => {
          pressScale.value = withSpring(0.96, { damping: 15 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12 });
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Navegar a ${item.label}`}
        accessibilityState={{ selected: isActive, disabled: item.disabled }}
        style={(state: { hovered?: boolean; pressed?: boolean }) => {
          if (Platform.OS === 'web' && state.hovered && !state.pressed) {
            hoverX.value = withSpring(2, { damping: 20 });
          } else {
            hoverX.value = withSpring(0, { damping: 20 });
          }
          return [
            styles.container,
            item.disabled && styles.disabled,
          ];
        }}
      >
        <View
          style={[
            styles.inner,
            styles.default,
            isCollapsed && collapsedStyles.inner,
          ]}
        >
          {/* Animated active pill background */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              pillAnimStyle,
              {
                borderRadius: 8,
                backgroundColor: sidebarTheme.background.active,
              },
            ]}
          />

          {/* Animated active indicator bar (left edge) */}
          <Animated.View
            style={[
              barAnimStyle,
              {
                position: 'absolute',
                left: 0,
                top: 6,
                bottom: 6,
                borderRadius: 3,
                backgroundColor: sidebarTheme.activeIndicator,
              },
            ]}
          />

          {/* Icon */}
          <View style={[styles.iconContainer, isCollapsed && collapsedStyles.iconContainer]}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>

          {/* Label — hidden when collapsed */}
          {!isCollapsed && (
            <Text
              style={[
                styles.label,
                { color: isActive ? sidebarTheme.text.active : sidebarTheme.text.secondary },
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          )}

          {/* Badge — hidden when collapsed */}
          {!isCollapsed && item.badge && (
            <PulsingBadge
              colors={getBadgeColors()}
              text={item.badge}
              isUrgent={item.badgeVariant === 'urgent'}
            />
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const collapsedStyles = StyleSheet.create({
  inner: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  iconContainer: {
    marginRight: 0,
  },
});

export default NavItem;
