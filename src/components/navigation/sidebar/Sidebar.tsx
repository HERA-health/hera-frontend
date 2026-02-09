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
import { View, Text, ScrollView } from 'react-native';
import { SidebarProps, NavigationSection } from './types';
import { getNavigationSections, SIDEBAR_THEME } from './navConfig';
import { containerStyles, logoStyles, sectionStyles } from './styles';
import { NavItem } from './NavItem';
import { UserSection } from './UserSection';
import { StyledLogo } from '../../common/StyledLogo';
import { BrandText } from '../../common/BrandText';

/**
 * Sidebar is the main navigation component for the HERA application
 *
 * Features:
 * - Config-driven navigation items (OCP)
 * - Role-based sections (CLIENT vs PROFESSIONAL)
 * - Active route highlighting
 * - User section with logout
 * - Clean, modern design matching HERA landing page
 *
 * @param userRole - Current user's role (CLIENT or PROFESSIONAL)
 * @param currentRoute - Name of the currently active route
 * @param onNavigate - Callback to navigate to a route
 * @param user - Current user information
 * @param onLogout - Callback when user logs out
 */
export function Sidebar({
  userRole,
  currentRoute,
  onNavigate,
  user,
  onLogout,
  isAdmin,
}: SidebarProps): React.ReactElement {
  // Get navigation sections for the current user role
  // Memoized to prevent recalculation on every render
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
      style={containerStyles.sidebar}
      accessible
      accessibilityLabel="Main navigation"
    >
      {/* Scrollable content area */}
      <ScrollView
        style={containerStyles.scrollView}
        contentContainerStyle={containerStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={logoStyles.container}>
          <StyledLogo size={56} />
          <BrandText style={logoStyles.brandName}>HERA</BrandText>
          <Text style={logoStyles.tagline}>{tagline}</Text>
        </View>

        {/* Navigation Sections */}
        {sections.map((section, sectionIndex) => (
          <NavigationSectionComponent
            key={section.id}
            section={section}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            showDivider={sectionIndex > 0}
          />
        ))}
      </ScrollView>

      {/* User Section (fixed at bottom) */}
      <UserSection
        user={user}
        subtitle={subtitle}
        onLogout={onLogout}
      />
    </View>
  );
}

/**
 * NavigationSectionComponent renders a single section of navigation items
 * This is an internal component, not exported
 */
interface NavigationSectionComponentProps {
  section: NavigationSection;
  currentRoute: string;
  onNavigate: (route: string) => void;
  showDivider: boolean;
}

function NavigationSectionComponent({
  section,
  currentRoute,
  onNavigate,
  showDivider,
}: NavigationSectionComponentProps): React.ReactElement {
  return (
    <View style={sectionStyles.container}>
      {/* Divider between sections */}
      {showDivider && <View style={sectionStyles.divider} />}

      {/* Section header label */}
      {section.label && (
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
        />
      ))}
    </View>
  );
}

export default Sidebar;
