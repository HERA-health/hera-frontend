import React, { useCallback } from 'react';
import { Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../common/AnimatedPressable';
import { ThemeToggleButton } from '../../common/ThemeToggleButton';
import { getSidebarTheme } from './navConfig';
import { userSectionStyles as styles } from './styles';
import { UserSectionProps } from './types';

export function UserSection({
  user,
  subtitle,
  onLogout,
  isCollapsed = false,
}: UserSectionProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: sidebarTheme.background.secondary,
            borderColor: sidebarTheme.border,
            shadowColor: sidebarTheme.shadow,
          },
          isCollapsed ? styles.panelCollapsed : null,
        ]}
      >
        <View style={[styles.topRow, isCollapsed ? styles.topRowCollapsed : null]}>
          {user.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={[
                styles.avatarImage,
                isCollapsed ? styles.avatarCollapsed : null,
              ]}
              accessibilityLabel={`${user.name} avatar`}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.primaryAlpha20,
                },
                isCollapsed ? styles.avatarCollapsed : null,
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  {
                    color: theme.primaryDark,
                    fontFamily: theme.fontSansBold,
                  },
                ]}
              >
                {getInitials(user.name)}
              </Text>
            </View>
          )}

          {!isCollapsed && (
            <View style={styles.infoContainer}>
              <Text
                style={[
                  styles.userName,
                  {
                    color: sidebarTheme.text.primary,
                    fontFamily: theme.fontSansSemiBold,
                  },
                ]}
                numberOfLines={1}
              >
                {user.name}
              </Text>
              <Text
                style={[
                  styles.userSubtitle,
                  {
                    color: sidebarTheme.text.muted,
                    fontFamily: theme.fontSans,
                  },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          )}
        </View>

        {!isCollapsed && (
          <View style={styles.actionRow}>
            <ThemeToggleButton
              size="sm"
              showLabel
              style={{
                flex: 1,
                justifyContent: 'flex-start',
              }}
            />
            <AnimatedPressable
              onPress={handleLogout}
              hoverLift={false}
              pressScale={0.92}
              style={[
                styles.iconButton,
                {
                  backgroundColor: sidebarTheme.background.subtle,
                  borderColor: sidebarTheme.border,
                },
              ]}
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={sidebarTheme.text.secondary}
              />
            </AnimatedPressable>
          </View>
        )}

        {isCollapsed && (
          <AnimatedPressable
            onPress={handleLogout}
            hoverLift={false}
            pressScale={0.92}
            style={[
              styles.iconButton,
              styles.iconButtonCollapsed,
              {
                backgroundColor: sidebarTheme.background.subtle,
                borderColor: sidebarTheme.border,
              },
            ]}
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons
              name="log-out-outline"
              size={16}
              color={sidebarTheme.text.secondary}
            />
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

export default UserSection;
