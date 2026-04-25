import React, { ComponentProps, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../components/common';
import { spacing, borderRadius, typography } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AdminPanelScreen } from './AdminPanelScreen';
import { SpecialistManagementScreen } from './SpecialistManagementScreen';

type TabKey = 'verifications' | 'management';
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
];

export function AdminPanelTabbedScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isAdmin = user?.isAdmin ?? false;
  const isDesktop = width >= 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);
  const [activeTab, setActiveTab] = useState<TabKey>('verifications');

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
          Revisión operativa de especialistas y solicitudes de verificación.
        </Text>
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const label = isDesktop ? tab.label : tab.compactLabel;

          return (
            <AnimatedPressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="button"
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
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 'verifications' && <AdminPanelScreen />}
        {activeTab === 'management' && <SpecialistManagementScreen />}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean, isDesktop: boolean) => StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: isDesktop ? spacing.xl : spacing.lg,
    paddingBottom: spacing.md,
    maxWidth: isDesktop ? 1040 : undefined,
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
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    maxWidth: isDesktop ? 1040 : undefined,
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
  content: {
    flex: 1,
  },
});

export default AdminPanelTabbedScreen;
