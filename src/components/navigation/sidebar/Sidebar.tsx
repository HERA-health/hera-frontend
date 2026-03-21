/**
 * Sidebar Component
 *
 * Single Responsibility Principle (SRP):
 * - This component orchestrates the sidebar layout
 * - Delegates navigation items to NavItem component
 * - Delegates user section to UserSection component
 * - No direct DOM manipulation or complex logic
 *
 * Open/Closed Principle (OCP):
 * - Navigation items come from configuration
 * - Easy to add new items without modifying this component
 *
 * Dependency Inversion Principle (DIP):
 * - Depends on abstractions (SidebarProps interface)
 * - Navigation callback abstracted via onNavigate prop
 * - Not coupled to specific routing implementation
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SidebarProps, NavigationSection } from './types';
import { getNavigationSections, SIDEBAR_THEME } from './navConfig';
import { containerStyles, logoStyles, sectionStyles } from './styles';
import { NavItem } from './NavItem';
import { UserSection } from './UserSection';
import { StyledLogo } from '../../common/StyledLogo';
import { spacing } from '../../../constants/colors';

/**
 * Sidebar is the main navigation component for the HERA application
 *
 * Features:
 * - Config-driven navigation items (OCP)
 * - Role-based sections (CLIENT vs PROFESSIONAL)
 * - Active route highlighting
 * - User section with logout
 * - Collapsible: shows only icons when collapsed
 * - Clean, modern design matching HERA landing page
 */
export function Sidebar({
  userRole,
  currentRoute,
  onNavigate,
  user,
  onLogout,
  isAdmin,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps): React.ReactElement {
  // Get navigation sections for the current user role
  const sections = useMemo(
    () => getNavigationSections(userRole, isAdmin),
    [userRole, isAdmin]
  );

  // Determine subtitle based on role
  const subtitle = userRole === 'PROFESSIONAL'
    ? 'Profesional'
    : 'Cuidando tu bienestar';

  // Determine tagline based on role
  const tagline = userRole === 'PROFESSIONAL'
    ? 'Panel Profesional'
    : 'Tu bienestar mental';

  return (
    <View
      style={[containerStyles.sidebar, isCollapsed && collapseStyles.sidebarCollapsed]}
      accessible
      accessibilityLabel="Main navigation"
    >
      {/* Scrollable content area */}
      <ScrollView
        style={containerStyles.scrollView}
        contentContainerStyle={containerStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        {isCollapsed ? (
          <View style={collapseStyles.headerCollapsed}>
            <StyledLogo size={32} />
            {onToggleCollapse && (
              <TouchableOpacity
                style={collapseStyles.toggleButton}
                onPress={onToggleCollapse}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Expandir menú"
              >
                <Ionicons
                  name="menu-outline"
                  size={22}
                  color={SIDEBAR_THEME.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={collapseStyles.headerExpanded}>
            <StyledLogo size={28} />
            <View style={collapseStyles.headerTextContainer}>
              <Text style={logoStyles.brandName} numberOfLines={1} ellipsizeMode="tail">HERA</Text>
              <Text style={logoStyles.tagline} numberOfLines={1} ellipsizeMode="tail">{tagline}</Text>
            </View>
            {onToggleCollapse && (
              <TouchableOpacity
                style={collapseStyles.toggleButton}
                onPress={onToggleCollapse}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Colapsar menú"
              >
                <Ionicons
                  name="menu-outline"
                  size={22}
                  color={SIDEBAR_THEME.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Navigation Sections */}
        {sections.map((section, sectionIndex) => (
          <NavigationSectionComponent
            key={section.id}
            section={section}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            showDivider={sectionIndex > 0}
            isCollapsed={isCollapsed}
          />
        ))}

      </ScrollView>

      {/* User Section (fixed at bottom) */}
      <UserSection
        user={user}
        subtitle={subtitle}
        onLogout={onLogout}
        isCollapsed={isCollapsed}
      />
    </View>
  );
}

/**
 * NavigationSectionComponent renders a single section of navigation items
 */
interface NavigationSectionComponentProps {
  section: NavigationSection;
  currentRoute: string;
  onNavigate: (route: string) => void;
  showDivider: boolean;
  isCollapsed: boolean;
}

function NavigationSectionComponent({
  section,
  currentRoute,
  onNavigate,
  showDivider,
  isCollapsed,
}: NavigationSectionComponentProps): React.ReactElement {
  return (
    <View style={sectionStyles.container}>
      {/* Divider between sections */}
      {showDivider && <View style={sectionStyles.divider} />}

      {/* Section header label — hidden when collapsed */}
      {!isCollapsed && section.label && (
        <Text
          style={sectionStyles.header}
          accessibilityRole="header"
        >
          {section.label}
        </Text>
      )}

      {/* Navigation items */}
      {section.items.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          isActive={currentRoute === item.route}
          onPress={onNavigate}
          isCollapsed={isCollapsed}
        />
      ))}
    </View>
  );
}

const collapseStyles = StyleSheet.create({
  sidebarCollapsed: {
    width: SIDEBAR_THEME.collapsedWidth,
  },
  headerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: SIDEBAR_THEME.border,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerCollapsed: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: SIDEBAR_THEME.border,
  },
  toggleButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Sidebar;
