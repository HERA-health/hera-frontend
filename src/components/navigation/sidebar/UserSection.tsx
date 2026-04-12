import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSectionProps } from './types';
import { userSectionStyles as styles } from './styles';
import { getSidebarTheme } from './navConfig';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../common/AnimatedPressable';
import { ThemeToggleButton } from '../../common/ThemeToggleButton';
import { spacing } from '../../../constants/colors';

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
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: sidebarTheme.border },
        isCollapsed && collapsedUserStyles.container,
      ]}
      accessible
      accessibilityLabel="User section"
    >
      {user.avatarUrl ? (
        <Image
          source={{ uri: user.avatarUrl }}
          style={[styles.avatarImage, isCollapsed && collapsedUserStyles.avatar]}
          accessibilityLabel={`${user.name}'s avatar`}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.primaryAlpha20 },
            isCollapsed && collapsedUserStyles.avatar,
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: theme.primaryDark, fontFamily: theme.fontSansBold },
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
              { color: sidebarTheme.text.primary, fontFamily: theme.fontSansSemiBold },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user.name}
          </Text>
          <Text
            style={[
              styles.userSubtitle,
              { color: sidebarTheme.text.muted, fontFamily: theme.fontSans },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      )}

      {!isCollapsed && (
        <View style={actionStyles.row}>
          <ThemeToggleButton size="sm" />
          <AnimatedPressable
            onPress={handleLogout}
            pressScale={0.88}
            hoverLift={false}
            style={[
              actionStyles.iconButton,
              { backgroundColor: theme.primaryAlpha12, borderColor: theme.border },
            ]}
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
          pressScale={0.88}
          hoverLift={false}
          style={[
            actionStyles.iconButton,
            {
              backgroundColor: theme.primaryAlpha12,
              borderColor: theme.border,
              marginTop: 4,
            },
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={16}
            color={sidebarTheme.text.secondary}
          />
        </AnimatedPressable>
      )}
    </View>
  );
}

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

const collapsedUserStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 0,
    marginBottom: 4,
  },
});

export default UserSection;
