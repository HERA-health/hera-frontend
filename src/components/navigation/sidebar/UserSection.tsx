/**
 * UserSection Component
 *
 * Single Responsibility Principle (SRP):
 * - This component is ONLY responsible for displaying user info and logout action
 * - It receives user data and callbacks via props
 * - No internal state management or business logic
 *
 * Interface Segregation Principle (ISP):
 * - Only depends on the minimal props it needs (UserSectionProps)
 * - Doesn't require full user object, just name/role/avatar
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSectionProps } from './types';
import { userSectionStyles as styles } from './styles';
import { SIDEBAR_THEME } from './navConfig';

/**
 * UserSection displays the current user's info at the bottom of the sidebar
 *
 * @param user - User information (name, role, avatarUrl)
 * @param subtitle - Subtitle text to display under the name
 * @param onLogout - Callback when logout button is pressed
 */
export function UserSection({ user, subtitle, onLogout, isCollapsed = false }: UserSectionProps): React.ReactElement {
  const [isHovering, setIsHovering] = useState(false);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  // Get initials from user name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Web hover handlers
  const hoverProps = Platform.OS === 'web'
    ? {
        onMouseEnter: () => setIsHovering(true),
        onMouseLeave: () => setIsHovering(false),
      }
    : {};

  return (
    <View
      style={[styles.container, isCollapsed && collapsedUserStyles.container]}
      accessible
      accessibilityLabel="User section"
    >
      {/* Avatar */}
      {user.avatarUrl ? (
        <Image
          source={{ uri: user.avatarUrl }}
          style={[styles.avatarImage, isCollapsed && collapsedUserStyles.avatar]}
          accessibilityLabel={`${user.name}'s avatar`}
        />
      ) : (
        <View style={[styles.avatar, isCollapsed && collapsedUserStyles.avatar]}>
          <Text style={styles.avatarText}>
            {getInitials(user.name)}
          </Text>
        </View>
      )}

      {/* User Info — hidden when collapsed */}
      {!isCollapsed && (
        <View style={styles.infoContainer}>
          <Text
            style={styles.userName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user.name}
          </Text>
          <Text
            style={styles.userSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      )}

      {/* Logout Button — hidden when collapsed */}
      {!isCollapsed && (
        <TouchableOpacity
          style={[
            styles.logoutButton,
            isHovering && styles.logoutButtonHover,
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Log out"
          accessibilityHint="Double tap to sign out of your account"
          {...hoverProps}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={isHovering ? '#EF4444' : SIDEBAR_THEME.text.secondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

import { spacing } from '../../../constants/colors';

const collapsedUserStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  avatar: {
    marginRight: 0,
  },
});

export default UserSection;
