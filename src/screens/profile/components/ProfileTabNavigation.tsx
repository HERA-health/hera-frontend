import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable } from '../../../components/common';
import { spacing, borderRadius } from '../../../constants/colors';
import { ProfileTab } from '../../../constants/types';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileTabNavigationProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isDesktop: boolean;
}

const tabs: Array<{
  id: ProfileTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'information', label: 'Información Personal', icon: 'person-outline' },
  { id: 'payment', label: 'Pagos y Facturación', icon: 'card-outline' },
];

export const ProfileTabNavigation: React.FC<ProfileTabNavigationProps> = ({
  activeTab,
  onTabChange,
  isDesktop,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, isDesktop), [theme, isDark, isDesktop]);

  if (isDesktop) {
    return (
      <View style={styles.desktopWrap}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <AnimatedPressable
              key={tab.id}
              style={[
                styles.desktopTab,
                active && {
                  backgroundColor: theme.primaryAlpha12,
                  borderLeftColor: theme.primary,
                },
              ]}
              onPress={() => onTabChange(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={active ? theme.textPrimary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.desktopTabText,
                  { color: active ? theme.textPrimary : theme.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.mobileWrap}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          <AnimatedPressable
            key={tab.id}
            style={[
              styles.mobileTab,
              {
                backgroundColor: active ? theme.primary : theme.bgCard,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={active ? theme.textOnPrimary : theme.textSecondary}
            />
            <Text
              style={[
                styles.mobileTabText,
                { color: active ? theme.textOnPrimary : theme.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
  isDesktop: boolean
) =>
  StyleSheet.create({
    desktopWrap: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    desktopTab: {
      minHeight: 56,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    desktopTabText: {
      fontSize: 16,
      fontFamily: theme.fontSansSemiBold,
      flex: 1,
    },
    mobileWrap: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: isDesktop ? 0 : spacing.lg,
      paddingVertical: spacing.lg,
      backgroundColor: theme.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    mobileTab: {
      flex: 1,
      minHeight: 52,
      borderWidth: 1,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      shadowColor: isDark ? '#000000' : theme.primary,
      shadowOpacity: isDark ? 0.10 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    mobileTabText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
  });

export default ProfileTabNavigation;
