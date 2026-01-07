import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { heraLanding, spacing } from '../../constants/colors';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

/**
 * Reusable loading state component
 * Use this across all screens for consistent loading UI
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  fullScreen = false,
  size = 'large',
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={heraLanding.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
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
  },
});

export default LoadingState;
