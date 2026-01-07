import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing } from '../../constants/colors';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Reusable error state component
 * Use this across all screens for consistent error UI
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Ha ocurrido un error',
  onRetry,
  fullScreen = false,
  icon = 'alert-circle-outline',
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Ionicons name={icon} size={48} color={heraLanding.warning} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color={heraLanding.textOnPrimary} />
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: heraLanding.background,
  },
  message: {
    marginTop: spacing.md,
    fontSize: 16,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.xs,
  },
  buttonText: {
    color: heraLanding.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorState;
