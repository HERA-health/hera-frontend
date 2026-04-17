import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { heraLanding, spacing, borderRadius, typography } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { AdminPanelScreen } from './AdminPanelScreen';
import { SpecialistManagementScreen } from './SpecialistManagementScreen';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth > 1024;

type TabKey = 'verifications' | 'management';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
  iconActive: string;
}

const TABS: Tab[] = [
  {
    key: 'verifications',
    label: 'Verificaciones Pendientes',
    icon: 'shield-checkmark-outline',
    iconActive: 'shield-checkmark',
  },
  {
    key: 'management',
    label: 'Gestión de Especialistas',
    icon: 'people-outline',
    iconActive: 'people',
  },
];

export function AdminPanelTabbedScreen() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const [activeTab, setActiveTab] = useState<TabKey>('verifications');

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={heraLanding.textMuted} />
        <Text style={styles.noAccessText}>Acceso restringido a administradores</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Administración</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isActive ? tab.iconActive : tab.icon) as any}
                size={18}
                color={isActive ? heraLanding.primary : heraLanding.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'verifications' && <AdminPanelScreen />}
        {activeTab === 'management' && <SpecialistManagementScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    padding: spacing.xl,
  },
  noAccessText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    maxWidth: isDesktop ? 800 : undefined,
    alignSelf: isDesktop ? 'center' : undefined,
    width: isDesktop ? '100%' : undefined,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    maxWidth: isDesktop ? 800 : undefined,
    alignSelf: isDesktop ? 'center' : undefined,
    width: isDesktop ? '100%' : undefined,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  tabActive: {},
  tabLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textSecondary,
  },
  tabLabelActive: {
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: heraLanding.primary,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
});

export default AdminPanelTabbedScreen;
