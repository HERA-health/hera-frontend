import React from 'react';
import { Image, ImageStyle, StyleSheet } from 'react-native';

interface StyledLogoProps {
  size?: number;
  style?: ImageStyle;
}

/**
 * StyledLogo Component
 *
 * Displays the logo image with:
 * - Rounded corners for modern look
 * - Subtle shadow for depth
 * - Clean, simple appearance
 * - No container or borders
 *
 * Usage:
 * <StyledLogo size={150} />
 * <StyledLogo size={100} style={{ marginTop: 20 }} />
 */
export const StyledLogo: React.FC<StyledLogoProps> = ({
  size = 120,
  style
}) => {
  return (
    <Image
      source={require('../../../assets/main-logo.png')}
      style={[
        styles.logo,
        {
          width: size,
          height: size,
          borderRadius: size * 0.2, // 20% rounded corners
        },
        style
      ]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
