import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable } from '../../../components/common';
import { borderRadius, spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileDisclosureSectionProps {
  title: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  summary?: string;
  testID?: string;
  variant?: 'card' | 'row';
}

export const ProfileDisclosureSection: React.FC<ProfileDisclosureSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  iconName,
  summary,
  testID,
  variant = 'card',
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasContent = React.Children.count(children) > 0;
  const rowVariant = variant === 'row';

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const handleToggle = () => {
    if (!hasContent) return;
    setExpanded((current) => !current);
  };

  return (
    <View style={[styles.container, rowVariant && styles.containerRow]} testID={testID}>
      <AnimatedPressable
        style={[styles.header, rowVariant && styles.headerRow]}
        onPress={handleToggle}
        hoverLift={false}
        pressScale={hasContent ? 0.99 : 1}
        disabled={!hasContent}
        accessibilityRole={hasContent ? 'button' : 'none'}
        accessibilityState={hasContent ? { expanded } : undefined}
        accessibilityLabel={hasContent ? `${expanded ? 'Cerrar' : 'Abrir'} ${title}` : title}
        testID={testID ? `${testID}-header` : undefined}
      >
        <View style={styles.headerMain}>
          {iconName ? (
            <View style={[styles.iconShell, rowVariant && styles.iconShellRow]}>
              <Ionicons name={iconName} size={18} color={theme.primary} />
            </View>
          ) : null}

          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            {summary ? <Text style={styles.summary}>{summary}</Text> : null}
          </View>
        </View>

        {hasContent ? (
          <View style={styles.chevron}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.textMuted}
            />
          </View>
        ) : null}
      </AnimatedPressable>

      {hasContent && expanded ? (
        <View
          style={[styles.content, rowVariant && styles.contentRow]}
          testID={testID ? `${testID}-content` : undefined}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: borderRadius.lg,
    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
    overflow: 'hidden',
  },
  containerRow: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    minHeight: 64,
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.primaryMuted : theme.primaryAlpha12,
  },
  iconShellRow: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  summary: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: theme.textSecondary,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  contentRow: {
    paddingHorizontal: 0,
    paddingBottom: spacing.lg,
  },
});

export default ProfileDisclosureSection;
