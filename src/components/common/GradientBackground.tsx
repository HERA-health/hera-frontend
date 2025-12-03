import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { branding } from '../../constants/colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
}

/**
 * GradientBackground Component
 *
 * Provides a beautiful gradient background for screens using the new branding colors.
 * Creates a soft, cozy atmosphere with smooth color transitions.
 *
 * Usage:
 * <GradientBackground>
 *   <YourScreenContent />
 * </GradientBackground>
 */
export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
  return (
    <LinearGradient
      colors={[
        branding.gradientStart,
        branding.gradientMid1,
        branding.gradientMid2,
        branding.gradientEnd,
      ]}
      locations={[0, 0.3, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
