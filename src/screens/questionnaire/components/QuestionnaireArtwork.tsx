import React from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';

export function QuestionnaireBackdrop() {
  const { theme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const mobile = width < 768;
  const artworkWidth = mobile ? 340 : Math.min(640, width * 0.4);
  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
      }}
      testID="questionnaire-backdrop"
    >
      <LinearGradient
        colors={[theme.surfaceWarm, theme.bg, theme.bgMuted]}
        locations={[0, 0.6, 1]}
        style={{ flex: 1 }}
      />
      <Image
        source={mobile
          ? require('../../../../assets/questionnaire/still-life-cutout-mobile.webp')
          : require('../../../../assets/questionnaire/still-life-cutout-desktop.webp')}
        accessible={false}
        resizeMode="contain"
        style={{ position: 'absolute', width: artworkWidth, height: Math.min(artworkWidth * 0.75, height * 0.55), left: mobile ? -100 : -90, bottom: mobile ? -45 : -25, opacity: isDark ? 0.14 : 0.27 }}
      />
    </View>
  );
}
