import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList } from '../../../constants/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../common/AnimatedPressable';
import { StyledLogo } from '../../common/StyledLogo';
import { NavItem } from './NavItem';
import { getNavigationSections, getSidebarTheme } from './navConfig';
import { containerStyles, logoStyles, sectionStyles } from './styles';
import { UserSection } from './UserSection';
import { NavigationSection, SidebarProps } from './types';

export function Sidebar({
  userRole,
  currentRoute,
  onNavigate,
  user,
  onLogout,
  onGuideStart,
  isAdmin,
  hasClinicAdminAccess,
  isUserSectionScrollable = false,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);
  const sections = useMemo(
    () => getNavigationSections(userRole, isAdmin, hasClinicAdminAccess),
    [hasClinicAdminAccess, isAdmin, userRole],
  );
  const profileRoute: keyof RootStackParamList = userRole === 'PROFESSIONAL'
    ? 'ProfessionalProfile'
    : userRole === 'CLINIC'
      ? 'ClinicSettings'
      : 'Profile';
  const handleProfilePress = useCallback(() => {
    onNavigate(profileRoute);
  }, [onNavigate, profileRoute]);

  const subtitle = userRole === 'PROFESSIONAL'
    ? ''
    : userRole === 'CLINIC'
      ? 'Gestión de clínica'
      : 'Tu espacio de bienestar';

  const collapseButtonBase = {
    backgroundColor: sidebarTheme.background.subtle,
    borderColor: sidebarTheme.border,
  };
  const userSection = (
    <UserSection
      user={user}
      subtitle={subtitle}
      onProfilePress={handleProfilePress}
      onLogout={onLogout}
      onGuideStart={onGuideStart}
      isCollapsed={isCollapsed}
    />
  );

  return (
    <View
      style={[
        containerStyles.sidebar,
        { backgroundColor: sidebarTheme.background.primary },
      ]}
      accessible
      accessibilityLabel="Main navigation"
    >
      <ScrollView
        style={containerStyles.scrollView}
        contentContainerStyle={isCollapsed
          ? [containerStyles.scrollContent, containerStyles.scrollContentCollapsed]
          : containerStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            logoStyles.headerBlock,
            {
              borderColor: sidebarTheme.border,
            },
            isCollapsed ? styles.headerBlockCollapsed : null,
          ]}
        >
          <View
            style={[
              logoStyles.headerRow,
              !isCollapsed ? styles.headerRowExpanded : null,
              isCollapsed ? logoStyles.headerCollapsed : null,
            ]}
          >
            {isCollapsed && onToggleCollapse && (
              <AnimatedPressable
                onPress={onToggleCollapse}
                hoverLift={false}
                pressScale={0.92}
                style={[styles.collapseButton, styles.collapseButtonCollapsed, collapseButtonBase]}
                accessibilityLabel="Expandir menú"
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={sidebarTheme.text.secondary}
                />
              </AnimatedPressable>
            )}

            <View
              style={[
                logoStyles.logoWrap,
                {
                  backgroundColor: isCollapsed
                    ? sidebarTheme.background.subtle
                    : 'transparent',
                },
                isCollapsed ? styles.logoWrapCollapsed : styles.logoWrapExpanded,
              ]}
            >
              <StyledLogo
                size={isCollapsed ? 30 : 44}
                variant={isCollapsed ? 'mark' : 'wordmark'}
              />
            </View>

            {!isCollapsed && onToggleCollapse && (
              <AnimatedPressable
                onPress={onToggleCollapse}
                hoverLift={false}
                pressScale={0.92}
                style={[styles.collapseButton, styles.collapseButtonExpanded, collapseButtonBase]}
                accessibilityLabel="Colapsar menú"
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={sidebarTheme.text.secondary}
                />
              </AnimatedPressable>
            )}
          </View>
        </View>

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

        {isUserSectionScrollable ? (
          <View style={styles.userSectionInScroll}>
            {userSection}
          </View>
        ) : null}
      </ScrollView>

      {!isUserSectionScrollable ? userSection : null}
    </View>
  );
}

interface NavigationSectionComponentProps {
  section: NavigationSection;
  currentRoute: string;
  onNavigate: (route: keyof RootStackParamList) => void;
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
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);

  return (
    <View style={[sectionStyles.container, isCollapsed ? sectionStyles.containerCollapsed : null]}>
      {showDivider && (
        <View
          style={[
            sectionStyles.divider,
            { backgroundColor: sidebarTheme.border },
          ]}
        />
      )}

      {!isCollapsed && section.label && (
        <View style={sectionStyles.headerRow}>
          <Text
            style={[
              sectionStyles.header,
              { color: sidebarTheme.text.muted, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            {section.label}
          </Text>
        </View>
      )}

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

const styles = StyleSheet.create({
  headerBlockCollapsed: {
    width: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  headerRowExpanded: {
    minHeight: 56,
    justifyContent: 'center',
    position: 'relative',
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  collapseButtonExpanded: {
    position: 'absolute',
    right: 0,
    top: 12,
  },
  collapseButtonCollapsed: {
    marginBottom: 2,
  },
  logoWrapExpanded: {
    width: 132,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapCollapsed: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  userSectionInScroll: {
    marginTop: 10,
  },
});

export default Sidebar;
