import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../common/AnimatedPressable';
import { TourTarget } from '../../onboarding/TourTarget';
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
      <View style={[styles.badge, { backgroundColor: colors[0] }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{text}</Text>
      </View>
    </View>
  );
}

export function NavItem({
  item,
  isActive,
  onPress,
  isCollapsed = false,
  notice,
  onNoticePress,
}: NavItemProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  const handlePress = useCallback(() => {
    if (!item.disabled) {
      if (notice && onNoticePress) {
        onNoticePress(notice);
      } else {
        onPress(item.route);
      }
    }
  }, [item.disabled, item.route, notice, onNoticePress, onPress]);

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
  const noticeColor = notice?.tone === 'critical'
    ? theme.error
    : notice?.tone === 'info'
      ? theme.info
      : theme.warningAmber;
  const noticeIcon = notice?.tone === 'info' ? 'time-outline' : 'alert-circle';

  const innerContent = (
    <View
      style={[
        styles.inner,
        {
          backgroundColor: isActive
            ? sidebarTheme.background.active
            : 'transparent',
          borderColor: isActive ? sidebarTheme.borderStrong : 'transparent',
        },
        isCollapsed ? styles.innerCollapsed : null,
      ]}
    >
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
              : 'transparent',
          },
          isCollapsed ? styles.iconShellCollapsed : null,
        ]}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={isActive ? sidebarTheme.icon.active : sidebarTheme.icon.inactive}
        />
        {isCollapsed && notice ? (
          <View
            style={[
              styles.noticeDot,
              { backgroundColor: sidebarTheme.background.primary, borderColor: noticeColor },
            ]}
          >
            <Ionicons name={noticeIcon} size={12} color={noticeColor} />
          </View>
        ) : null}
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
          {notice ? (
            <Text
              style={[
                styles.noticeLabel,
                { color: noticeColor, fontFamily: theme.fontSansMedium },
              ]}
              numberOfLines={1}
            >
              {notice.label}
            </Text>
          ) : null}
        </View>
      )}

      {!isCollapsed && notice ? (
        <View style={[styles.noticeIcon, { backgroundColor: sidebarTheme.background.subtle }]}>
          <Ionicons name={noticeIcon} size={17} color={noticeColor} />
        </View>
      ) : null}

      {!isCollapsed && item.badge && (
        <PulsingBadge
          colors={badgeColors}
          text={item.badge}
          isUrgent={item.badgeVariant === 'urgent'}
          textColor={theme.textOnPrimary}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.container, isCollapsed ? styles.containerCollapsed : null]}>
      <AnimatedPressable
        onPress={handlePress}
        disabled={item.disabled}
        hoverLift={false}
        pressScale={0.985}
        style={item.disabled ? [styles.pressable, styles.disabled] : styles.pressable}
        accessibilityLabel={notice
          ? `${item.label}. ${notice.label}. Abrir sección pendiente`
          : `Navegar a ${item.label}`}
        accessibilityHint={notice ? 'Abre directamente la información que requiere atención' : undefined}
      >
        {item.tourTargetId ? (
          <TourTarget id={item.tourTargetId} fill style={styles.tourTarget}>
            {innerContent}
          </TourTarget>
        ) : (
          innerContent
        )}
      </AnimatedPressable>
    </View>
  );
}

export default NavItem;
