import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useOptionalProfessionalTour } from '../../onboarding/professionalTourContext';

export function Sidebar({
  locked = false,
  isMobile = false,
  scrollHeader,
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
  const shouldShowUserSection = !locked && userRole === 'CLINIC';

  return (
    <View
      style={[
        containerStyles.sidebar,
        { backgroundColor: sidebarTheme.background.primary },
      ]}
      accessible
      accessibilityLabel="Navegación principal"
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
              style={[styles.collapseButtonExpanded, isMobile ? styles.mobileCloseButton : null]}
              accessibilityLabel={isMobile ? 'Cerrar menú' : 'Colapsar menú'}
            >
              {isMobile ? <Ionicons name="close" size={22} color={sidebarTheme.text.secondary} /> : <SidebarToggleIcon color={sidebarTheme.text.secondary} />}
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
        showsVerticalScrollIndicator={isMobile}
        keyboardShouldPersistTaps="handled"
      >
        {scrollHeader}
        {sections.map((section, sectionIndex) => (
          <NavigationSectionComponent
            key={section.id}
            section={locked ? { ...section, items: section.items.map(item => ({ ...item, disabled: true })) } : section}
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            isMobile={isMobile}
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
  isMobile?: boolean;
  section: NavigationSection;
  currentRoute: string;
  onNavigate: (route: keyof RootStackParamList) => void;
  showDivider: boolean;
  isCollapsed: boolean;
  notices: NonNullable<SidebarProps['notices']>;
  onNoticeNavigate?: SidebarProps['onNoticeNavigate'];
}

export function NavigationSectionComponent({
  section,
  isMobile = false,
  currentRoute,
  onNavigate,
  showDivider,
  isCollapsed,
  notices,
  onNoticeNavigate,
}: NavigationSectionComponentProps): React.ReactElement {
  const { theme } = useTheme();
  const sidebarTheme = getSidebarTheme(theme);
  const tour = useOptionalProfessionalTour();
  const activeItem = section.items.find((item) => item.route === currentRoute);
  const [expanded, setExpanded] = useState(
    Boolean(activeItem) || ['main-nav', 'management', 'professional-profile', 'clinic-main'].includes(section.id),
  );
  const isExpanded = expanded || tour?.isRunning === true;
  const sectionNotices = section.items.flatMap((item) => notices[item.id] ? [notices[item.id]] : []);
  const noticeCount = sectionNotices.reduce((total, notice) => total + (notice.count ?? 1), 0);
  const noticeColor = sectionNotices.some((notice) => notice.tone === 'critical')
    ? theme.error
    : sectionNotices.some((notice) => notice.tone === 'warning') ? theme.warning : theme.selection;

  useEffect(() => {
    if (activeItem) setExpanded(true);
  }, [activeItem?.id, currentRoute]);

  return (
    <View style={[sectionStyles.container, isCollapsed ? sectionStyles.containerCollapsed : null]}>
      {showDivider && isCollapsed && (
        <View
          style={[
            sectionStyles.divider,
            { backgroundColor: sidebarTheme.border },
          ]}
        />
      )}

      {!isCollapsed && section.label && (
        <NavigationControl
          accessibilityLabel={section.label}
          expanded={isExpanded}
          highlightExpanded={false}
          onPress={() => setExpanded((value) => !value)}
          style={[sectionStyles.headerRow, isMobile ? sectionStyles.headerRowMobile : null]}
        >
          <Text
            style={[
              sectionStyles.header,
              { color: sidebarTheme.text.muted, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            {section.label}
          </Text>
          <View style={styles.sectionIndicators}>
            {!isExpanded && activeItem && <View style={[styles.activeSectionDot, { backgroundColor: theme.selection }]} />}
            {!isExpanded && noticeCount > 0 && (
              <Text accessibilityLabel={noticeCount === 1 ? '1 aviso pendiente' : `${noticeCount} avisos pendientes`} style={{ color: noticeColor, fontFamily: theme.fontSansSemiBold, fontSize: 11 }}>
                {noticeCount > 9 ? '9+' : noticeCount}
              </Text>
            )}
            <View style={[styles.disclosureIcon, { backgroundColor: sidebarTheme.background.hover }]}>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={sidebarTheme.text.secondary} />
            </View>
          </View>
        </NavigationControl>
      )}

      {(isCollapsed || isExpanded) && <View style={!isCollapsed ? [sectionStyles.items, { borderLeftColor: sidebarTheme.border }] : undefined}>
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
      </View>}
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
  mobileCloseButton: { width: 48, height: 48 },
  sectionIndicators: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclosureIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  activeSectionDot: { width: 6, height: 6, borderRadius: 3 },
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
