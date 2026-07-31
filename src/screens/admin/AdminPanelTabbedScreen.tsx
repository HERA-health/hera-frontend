import React, { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../components/common';
import { spacing, borderRadius, typography, layout } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AdminPanelScreen } from './AdminPanelScreen';
import { SpecialistManagementScreen } from './SpecialistManagementScreen';
import { AdminHelpView } from '../../components/specialistContact/AdminHelpView';
import { AdminFeedbackView } from '../../components/specialistContact/AdminFeedbackView';
import { getAdminContactSummary } from '../../services/specialistContactService';
import type { ScreenProps } from '../../constants/types';

type TabKey = 'verifications' | 'management' | 'help' | 'feedback';
type IconName = ComponentProps<typeof Ionicons>['name'];

interface Tab {
  key: TabKey;
  label: string;
  compactLabel: string;
  icon: IconName;
  iconActive: IconName;
}

const TABS: Tab[] = [
  {
    key: 'verifications',
    label: 'Verificaciones pendientes',
    compactLabel: 'Verificaciones',
    icon: 'shield-checkmark-outline',
    iconActive: 'shield-checkmark',
  },
  {
    key: 'management',
    label: 'Gestión de especialistas',
    compactLabel: 'Especialistas',
    icon: 'people-outline',
    iconActive: 'people',
  },
  {
    key: 'help',
    label: 'Ayuda de especialistas',
    compactLabel: 'Ayuda',
    icon: 'chatbubbles-outline',
    iconActive: 'chatbubbles',
  },
  {
    key: 'feedback',
    label: 'Comentarios',
    compactLabel: 'Comentarios',
    icon: 'sparkles-outline',
    iconActive: 'sparkles',
  },
];

export function AdminPanelTabbedScreen({
  route,
  navigation,
}: ScreenProps<'AdminPanel'>) {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isAdmin = user?.isAdmin ?? false;
  const isDesktop = width >= 1024;
  const isMobileShell = width < 768;
  const styles = useMemo(
    () => createStyles(theme, isDark, isDesktop, isMobileShell),
    [theme, isDark, isDesktop, isMobileShell],
  );
  const [activeTab, setActiveTab] = useState<TabKey>(
    route.params?.initialTab ?? 'verifications'
  );
  const [contactSummary, setContactSummary] = useState({
    unreadHelpRequests: 0,
    receivedFeedback: 0,
  });

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const refreshContactSummary = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const summary = await getAdminContactSummary();
      setContactSummary({
        unreadHelpRequests: summary.unreadHelpRequests,
        receivedFeedback: summary.receivedFeedback,
      });
    } catch {
      // Contact views remain usable if counters cannot be refreshed.
    }
  }, [isAdmin]);

  const handleHelpRequestChange = useCallback((requestId?: string) => {
    navigation.setParams({ initialTab: 'help', requestId });
  }, [navigation]);

  useEffect(() => {
    void refreshContactSummary();
  }, [activeTab, refreshContactSummary]);

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <View style={styles.accessIcon}>
          <Ionicons name="lock-closed-outline" size={30} color={theme.primary} />
        </View>
        <Text style={styles.noAccessTitle}>Acceso restringido</Text>
        <Text style={styles.noAccessText}>Esta zona está reservada al equipo administrador de HERA.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerEyebrow}>
          <Ionicons name="business-outline" size={14} color={theme.primary} />
          <Text style={styles.headerEyebrowText}>Panel interno</Text>
        </View>
        <Text style={styles.headerTitle}>Administración</Text>
        <Text style={styles.headerSubtitle}>
          Verificación, gestión de especialistas y seguimiento de sus comunicaciones.
        </Text>
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const label = isDesktop ? tab.label : tab.compactLabel;
          const badgeCount = tab.key === 'help'
            ? contactSummary.unreadHelpRequests
            : tab.key === 'feedback'
              ? contactSummary.receivedFeedback
              : 0;

          return (
            <AnimatedPressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                navigation.setParams({ initialTab: tab.key, requestId: undefined });
              }}
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label}${isActive ? ', seleccionada' : ''}`}
              hoverLift={isDesktop}
              pressScale={0.98}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={18}
                color={isActive ? theme.primary : theme.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
                {label}
              </Text>
              {badgeCount > 0 ? (
                <Text style={styles.tabBadge}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 'verifications' && <AdminPanelScreen />}
        {activeTab === 'management' && <SpecialistManagementScreen />}
        {activeTab === 'help' && (
          <AdminHelpView
            initialRequestId={route.params?.requestId}
            onSummaryChanged={refreshContactSummary}
            onRequestChange={handleHelpRequestChange}
          />
        )}
        {activeTab === 'feedback' && (
          <AdminFeedbackView onSummaryChanged={refreshContactSummary} />
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, isDesktop: boolean, isMobileShell: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
    padding: spacing.xl,
  },
  accessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: spacing.lg,
  },
  noAccessTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: theme.textPrimary,
    marginBottom: spacing.xs,
  },
  noAccessText: {
    maxWidth: 360,
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingLeft: isMobileShell ? layout.mobileShellLeftInset : spacing.lg,
    paddingTop: isDesktop ? spacing.xl : spacing.lg,
    paddingBottom: spacing.md,
    maxWidth: isDesktop ? 1180 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  headerEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
    marginBottom: spacing.sm,
  },
  headerEyebrowText: {
    color: theme.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  headerTitle: {
    fontSize: isDesktop ? typography.fontSizes.xxxl : typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: theme.textPrimary,
    letterSpacing: 0,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    maxWidth: 620,
    fontSize: typography.fontSizes.sm,
    lineHeight: 21,
    color: theme.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    maxWidth: isDesktop ? 1180 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 42,
    paddingVertical: spacing.sm,
    paddingHorizontal: isDesktop ? spacing.lg : spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
  },
  tabActive: {
    backgroundColor: theme.primaryAlpha12,
    borderColor: theme.primaryAlpha20,
  },
  tabLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: theme.textSecondary,
  },
  tabLabelActive: {
    color: theme.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    textAlign: 'center',
    lineHeight: 20,
    overflow: 'hidden',
    color: theme.textOnPrimary,
    backgroundColor: theme.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});

export default AdminPanelTabbedScreen;
