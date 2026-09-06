import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { RootStackParamList } from '../../../constants/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { NavigationControl } from '../NavigationControl';
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
  hasProfessionalClinicAccess,
  isUserSectionScrollable = false,
  isCollapsed = false,
  onToggleCollapse,
  notices = {},
  onNoticeNavigate,
}: SidebarProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);
  const sections = useMemo(
    () => getNavigationSections(
      userRole,
      isAdmin,
      hasClinicAdminAccess,
      hasProfessionalClinicAccess,
    ),
    [hasClinicAdminAccess, hasProfessionalClinicAccess, isAdmin, userRole],
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
  const shouldShowUserSection = userRole !== 'PROFESSIONAL';

  return (
    <View
      style={[
        containerStyles.sidebar,
        { backgroundColor: sidebarTheme.background.primary },
      ]}
      accessible
      accessibilityLabel="Main navigation"
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
            <NavigationControl
              onPress={onToggleCollapse}
              accessibilityLabel="Expandir menú"
              expanded={false}
            >
              <SidebarToggleIcon color={sidebarTheme.text.secondary} />
            </NavigationControl>
          )}

          {(!isCollapsed || !onToggleCollapse) && <View
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
              tone="brand"
              tintColor={theme.logoTint}
            />
          </View>}

          {!isCollapsed && onToggleCollapse && (
            <NavigationControl
              onPress={onToggleCollapse}
              style={styles.collapseButtonExpanded}
              accessibilityLabel="Colapsar menú"
            >
              <SidebarToggleIcon color={sidebarTheme.text.secondary} />
            </NavigationControl>
          )}
        </View>
      </View>

      <ScrollView
        testID="hera-sidebar-scroll"
        style={containerStyles.scrollView}
        contentContainerStyle={isCollapsed
          ? [containerStyles.scrollContent, containerStyles.scrollContentCollapsed]
          : containerStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, sectionIndex) => (
          <NavigationSectionComponent
            key={section.id}
            section={section}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            showDivider={sectionIndex > 0}
            isCollapsed={isCollapsed}
            notices={notices}
            onNoticeNavigate={onNoticeNavigate}
          />
        ))}

        {shouldShowUserSection && isUserSectionScrollable ? (
          <View style={styles.userSectionInScroll}>
            {userSection}
          </View>
        ) : null}
      </ScrollView>

      {shouldShowUserSection && !isUserSectionScrollable ? userSection : null}
    </View>
  );
}

interface NavigationSectionComponentProps {
  section: NavigationSection;
  currentRoute: string;
  onNavigate: (route: keyof RootStackParamList) => void;
  showDivider: boolean;
  isCollapsed: boolean;
  notices: NonNullable<SidebarProps['notices']>;
  onNoticeNavigate?: SidebarProps['onNoticeNavigate'];
}

function NavigationSectionComponent({
  section,
  currentRoute,
  onNavigate,
  showDivider,
  isCollapsed,
  notices,
  onNoticeNavigate,
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
          notice={notices[item.id]}
          onNoticePress={onNoticeNavigate}
        />
      ))}
    </View>
  );
}

function SidebarToggleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6}>
      <Rect x={3} y={4} width={18} height={16} rx={3} />
      <Path d="M9 4v16" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  headerBlockCollapsed: {
    width: '100%',
    height: 76,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  headerRowExpanded: {
    minHeight: 56,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  collapseButtonExpanded: {
    position: 'absolute',
    right: 0,
    top: 6,
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
