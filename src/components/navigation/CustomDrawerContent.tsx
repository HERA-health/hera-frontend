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

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicWorkspace } from '../../screens/clinic/useClinicWorkspace';
import { Sidebar } from './sidebar';
import { UserRole, SidebarUser } from './sidebar/types';

interface CustomDrawerContentProps {
  currentRoute?: string;
  isUserSectionScrollable?: boolean;
  isCollapsed?: boolean;
  onNavigateComplete?: () => Promise<void> | void;
  onGuideStart?: () => Promise<void> | void;
  onToggleCollapse?: () => void;
}

/**
 * CustomDrawerContent wraps the new Sidebar component and connects it
 * to the application's navigation and authentication systems.
 *
 * @param currentRoute - The currently active route name
 * @param isCollapsed - Whether the sidebar is collapsed
 * @param onToggleCollapse - Callback to toggle collapse state
 */
export function CustomDrawerContent({
  currentRoute = 'Home',
  isUserSectionScrollable = false,
  isCollapsed = false,
  onNavigateComplete,
  onGuideStart,
  onToggleCollapse,
}: CustomDrawerContentProps): React.ReactElement {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user, logout, verificationSubmitted } = useAuth();
  const shouldLoadClinicAdminAccess = user?.type === 'professional'
    && verificationSubmitted !== false;
  const clinicWorkspace = useClinicWorkspace({ enabled: shouldLoadClinicAdminAccess });

  const userRole: UserRole = user?.type === 'professional'
    ? 'PROFESSIONAL'
    : user?.type === 'clinic'
      ? 'CLINIC'
      : 'CLIENT';

  // Create SidebarUser from auth user
  const sidebarUser: SidebarUser = {
    name: user?.name || 'Usuario',
    role: userRole,
    avatarUrl: user?.avatar || undefined,
  };

  const hasClinicAdminAccess = useMemo(
    () => userRole === 'CLINIC'
      || (
        shouldLoadClinicAdminAccess
        && clinicWorkspace.memberships.some((membership) => (
          membership.role === 'OWNER' || membership.role === 'ADMIN'
        ))
      ),
    [clinicWorkspace.memberships, shouldLoadClinicAdminAccess, userRole],
  );

  // Navigation handler - delegates to React Navigation
  const handleNavigate = useCallback(
    (route: string) => {
      navigation.navigate(route);
      void Promise.resolve(onNavigateComplete?.()).catch(() => undefined);
    },
    [navigation, onNavigateComplete]
  );

  // Logout handler - delegates to auth context
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <View style={styles.container}>
      <Sidebar
        userRole={userRole}
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        user={sidebarUser}
        onLogout={handleLogout}
        onGuideStart={onGuideStart}
        isAdmin={user?.isAdmin}
        hasClinicAdminAccess={hasClinicAdminAccess}
        isUserSectionScrollable={isUserSectionScrollable}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CustomDrawerContent;
