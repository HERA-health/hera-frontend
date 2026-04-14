import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { borderRadius, shadows, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { Button, Card } from '../../../components/common';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'leaf-outline',
  actionLabel,
  onAction,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark, width), [theme, isDark, width]);

  return (
    <View style={styles.container}>
      <Card variant="elevated" padding="large" style={styles.card}>
        <View style={styles.topAccent} />

        <View style={styles.iconOuter}>
          <View style={styles.iconMiddle}>
            <View style={styles.iconInner}>
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={38}
                color={theme.primary}
              />
            </View>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.quotePill}>
          <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
          <Text style={styles.quoteText}>El siguiente paso llegará cuando estés lista o listo.</Text>
        </View>

        {actionLabel && onAction ? (
          <Button
            variant="primary"
            size="large"
            onPress={onAction}
            fullWidth
            icon={<Ionicons name="arrow-forward-circle-outline" size={20} color={theme.textOnPrimary} />}
          >
            {actionLabel}
          </Button>
        ) : null}

        <View style={styles.helperRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.textMuted} />
          <Text style={styles.helperText}>Especialistas verificados y confidencialidad garantizada</Text>
        </View>
      </Card>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean, width: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: width > 1100 ? spacing.xxxl : spacing.xl,
      paddingVertical: spacing.xxxl,
      backgroundColor: theme.bg,
    },
    card: {
      width: '100%',
      maxWidth: 480,
      alignItems: 'center',
      gap: spacing.lg,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      ...shadows.lg,
    },
    topAccent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: theme.primary,
    },
    iconOuter: {
      width: 116,
      height: 116,
      borderRadius: 58,
      backgroundColor: theme.primaryAlpha12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    iconMiddle: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: theme.secondaryAlpha12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconInner: {
      width: 70,
      height: 70,
      borderRadius: 24,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    description: {
      maxWidth: 340,
      fontSize: 15,
      lineHeight: 24,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      textAlign: 'center',
    },
    quotePill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    quoteText: {
      fontSize: 13,
      fontFamily: theme.fontSansMedium,
      color: theme.primary,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    helperText: {
      fontSize: 13,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
  });

export default EmptyState;
