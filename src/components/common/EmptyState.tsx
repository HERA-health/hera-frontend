import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing } from '../../constants/colors';

interface EmptyStateProps {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
}

/**
 * Reusable empty state component
 * Use this across all screens for consistent empty UI
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon = 'folder-open-outline',
  actionLabel,
  onAction,
  fullScreen = false,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Ionicons name={icon} size={56} color={heraLanding.textMuted} />
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: heraLanding.background,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  buttonText: {
    color: heraLanding.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EmptyState;
