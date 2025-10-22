/**
 * ConstrainedContent Component
 * Wraps screen content with max-width constraint for better readability
 * on large screens with permanent drawer navigation
 *
 * Usage:
 * <ConstrainedContent>
 *   <YourScreenContent />
 * </ConstrainedContent>
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { layout } from '../../constants/colors';

interface ConstrainedContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export const ConstrainedContent: React.FC<ConstrainedContentProps> = ({
  children,
  style,
  maxWidth = layout.contentMaxWidth,
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.content, { maxWidth }, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center', // Center the constrained content
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
