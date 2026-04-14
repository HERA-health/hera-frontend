import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../common/AnimatedPressable';
import { getSidebarTheme } from './navConfig';
import { navItemStyles as styles } from './styles';
import { NavItemProps } from './types';

interface PulsingBadgeProps {
  colors: [string, string];
  text: string;
  isUrgent: boolean;
  textColor: string;
}

function PulsingBadge({
  colors,
  text,
  isUrgent,
  textColor,
}: PulsingBadgeProps): React.ReactElement {
  const glowOpacity = useSharedValue(isUrgent ? 0.22 : 0);

  useEffect(() => {
    if (!isUrgent) {
      glowOpacity.value = 0;
      return;
    }

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.34, { duration: 1100 }),
        withTiming(0.14, { duration: 1100 }),
      ),
      -1,
      false,
    );
  }, [glowOpacity, isUrgent]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.badgeWrap}>
      {isUrgent && (
        <Animated.View
          style={[
            styles.badge,
            {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: colors[0],
              transform: [{ scale: 1.06 }],
            },
            glowStyle,
          ]}
        />
      )}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.badge}
      >
        <Text style={[styles.badgeText, { color: textColor }]}>{text}</Text>
      </LinearGradient>
    </View>
  );
}

export function NavItem({
  item,
  isActive,
  onPress,
  isCollapsed = false,
}: NavItemProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  const handlePress = useCallback(() => {
    if (!item.disabled) {
      onPress(item.route);
    }
  }, [item.disabled, item.route, onPress]);

  const indicatorOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    indicatorOpacity.value = withTiming(isActive ? 1 : 0, { duration: 180 });
  }, [indicatorOpacity, isActive]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ scaleY: 0.92 + indicatorOpacity.value * 0.08 }],
  }));

  const iconName = isActive && item.iconActive ? item.iconActive : item.icon;
  const badgeColors = item.badgeColors
    ?? (item.badgeVariant === 'urgent'
      ? sidebarTheme.badge.urgent
      : item.badgeVariant === 'info'
        ? sidebarTheme.badge.info
        : sidebarTheme.badge.default);

  return (
    <View style={styles.container}>
      <AnimatedPressable
        onPress={handlePress}
        disabled={item.disabled}
        hoverTranslateY={-2}
        pressScale={0.985}
        style={item.disabled ? [styles.pressable, styles.disabled] : styles.pressable}
        accessibilityLabel={`Navegar a ${item.label}`}
      >
        <View
          style={[
            styles.inner,
            {
              shadowColor: sidebarTheme.shadow,
              backgroundColor: isActive
                ? sidebarTheme.background.active
                : sidebarTheme.background.secondary,
              borderColor: isActive ? sidebarTheme.borderStrong : sidebarTheme.border,
            },
            isCollapsed ? styles.innerCollapsed : null,
          ]}
        >
          {isActive && !isCollapsed && (
            <Animated.View
              style={[
                styles.activeGlow,
                {
                  backgroundColor: sidebarTheme.background.active,
                  borderColor: sidebarTheme.borderStrong,
                  borderWidth: 1,
                },
              ]}
            />
          )}

          {!isCollapsed && (
            <Animated.View
              style={[
                styles.indicator,
                {
                  backgroundColor: sidebarTheme.activeIndicator,
                },
                indicatorStyle,
              ]}
            />
          )}

          <View
            style={[
              styles.iconShell,
              {
                backgroundColor: isActive
                  ? sidebarTheme.background.hover
                  : sidebarTheme.background.subtle,
              },
              isCollapsed ? styles.iconShellCollapsed : null,
            ]}
          >
            <Ionicons
              name={iconName}
              size={18}
              color={isActive ? sidebarTheme.icon.active : sidebarTheme.icon.inactive}
            />
          </View>

          {!isCollapsed && (
            <View style={styles.labelWrap}>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? sidebarTheme.text.active : sidebarTheme.text.primary,
                    fontFamily: isActive ? theme.fontSansSemiBold : theme.fontSansMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {isActive && (
                <Text
                  style={[
                    styles.caption,
                    {
                      color: sidebarTheme.icon.active,
                      fontFamily: theme.fontSans,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Pantalla actual
                </Text>
              )}
            </View>
          )}

          {!isCollapsed && item.badge && (
            <PulsingBadge
              colors={badgeColors}
              text={item.badge}
              isUrgent={item.badgeVariant === 'urgent'}
              textColor={theme.textOnPrimary}
            />
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

export default NavItem;
