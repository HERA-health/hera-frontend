/**
 * CustomDrawerContent
 *
 * Adapter component that connects the new SOLID-compliant Sidebar
 * to the existing navigation and authentication contexts.
 *
 * Dependency Inversion Principle (DIP):
 * - This adapter depends on abstractions (Sidebar props interface)
 * - Translates between React Navigation and our Sidebar component
 * - Easy to swap navigation implementations if needed
 *
 * Single Responsibility Principle (SRP):
 * - Only responsible for connecting contexts to Sidebar
 * - All UI logic delegated to Sidebar component
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './sidebar';
import { UserRole, SidebarUser } from './sidebar/types';
import { GradientBackground } from '../common/GradientBackground';

interface CustomDrawerContentProps {
  currentRoute?: string;
}

/**
 * CustomDrawerContent wraps the new Sidebar component and connects it
 * to the application's navigation and authentication systems.
 *
 * @param currentRoute - The currently active route name
 */
export function CustomDrawerContent({
  currentRoute = 'Home',
}: CustomDrawerContentProps): React.ReactElement {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  // Determine user role from auth context
  const userRole: UserRole =
    user?.type === 'professional' ? 'PROFESSIONAL' : 'CLIENT';

  // Create SidebarUser from auth user
  const sidebarUser: SidebarUser = {
    name: user?.name || 'Usuario',
    role: userRole,
    avatarUrl: user?.avatar || undefined,
  };

  // Navigation handler - delegates to React Navigation
  const handleNavigate = useCallback(
    (route: string) => {
      navigation.navigate(route);
    },
    [navigation]
  );

  // Logout handler - delegates to auth context
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Sidebar
          userRole={userRole}
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          user={sidebarUser}
          onLogout={handleLogout}
          isAdmin={user?.isAdmin}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CustomDrawerContent;
