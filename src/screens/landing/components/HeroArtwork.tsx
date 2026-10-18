import React from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';

// Derivatives of the original photograph, never upscaled. The portrait crops
// empty space from the left; the landscape preserves the complete photograph.
const photos = Platform.OS === 'web' ? {
  portraitSmall: require('../../../../assets/landing/psychologist-portrait-480.webp'),
  portraitLarge: require('../../../../assets/landing/psychologist-portrait-853.webp'),
  landscapeSmall: require('../../../../assets/landing/psychologist-landscape-640.webp'),
  landscapeMedium: require('../../../../assets/landing/psychologist-landscape-1024.webp'),
  landscapeLarge: require('../../../../assets/landing/psychologist-landscape-1536.webp'),
} : {
  portraitSmall: require('../../../../assets/landing/psychologist-portrait-480.jpg'),
  portraitLarge: require('../../../../assets/landing/psychologist-portrait-853.jpg'),
  landscapeSmall: require('../../../../assets/landing/psychologist-landscape-640.jpg'),
  landscapeMedium: require('../../../../assets/landing/psychologist-landscape-1024.jpg'),
  landscapeLarge: require('../../../../assets/landing/psychologist-landscape-1536.jpg'),
};

function BotanicalBranch({ color }: { color: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 130 280" fill="none">
      <Path d="M33 272 C10 202 29 115 100 20 M27 211 C61 193 95 170 98 127 C61 140 32 168 27 211 M25 170 C6 141 7 103 25 78 C45 108 40 143 25 170 M47 117 C80 104 111 72 113 42 C80 51 53 79 47 117 M73 60 C65 36 79 13 102 6 C102 29 88 48 73 60" stroke={color} strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface HeroArtworkProps {
  desktop: boolean;
  mobile: boolean;
  compact?: boolean;
  onExploreDirectory: () => void;
}

export function HeroArtwork({ desktop, mobile, compact = false, onExploreDirectory }: HeroArtworkProps) {
  const { theme } = useTheme();
  const { width, height, scale } = useWindowDimensions();
  const sceneWidth = desktop ? (Math.min(width - 80, 1420) - 34) / 2.15 : Math.min(width - (mobile ? 40 : 80), 780);
  // Reserve room for the header, section spacing, discovery link and artwork
  // padding. Very short windows still scroll naturally; never crop the content.
  const portraitWidthLimit = compact ? Math.max(300, (height - 200) * 5 / 6) : 480;
  const imageWidth = desktop ? Math.min(sceneWidth - 64, 480, portraitWidthLimit) : sceneWidth - (mobile ? 8 : 40);
  const requiredPixels = imageWidth * scale;
  const source = desktop
    ? requiredPixels <= 480 ? photos.portraitSmall : photos.portraitLarge
    : requiredPixels <= 640 ? photos.landscapeSmall : requiredPixels <= 1024 ? photos.landscapeMedium : photos.landscapeLarge;

  return (
    <View style={[styles.scene, compact && styles.sceneCompact, !desktop && styles.sceneLandscape, mobile && styles.sceneMobile]}>
      <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 600 680" preserveAspectRatio="none">
          <Path d="M73 73 C120 10 361 -8 444 62 C540 143 433 208 392 281 C315 413 61 354 37 232 C23 163 25 119 73 73Z" fill={theme.secondary} opacity={0.18} />
          <Path d="M437 278 C576 199 633 352 567 474 C515 568 435 692 290 656 C148 620 243 532 304 482 C365 431 364 320 437 278Z" fill={theme.primary} opacity={0.08} />
        </Svg>
        <View style={[styles.branchLeft, mobile && styles.branchMobile]}><BotanicalBranch color={theme.primary} /></View>
        {!mobile && <View style={styles.branchRight}><BotanicalBranch color={theme.primary} /></View>}
      </View>
      <View style={[styles.frame, { width: imageWidth, backgroundColor: theme.secondaryMuted }, !desktop && styles.frameLandscape, mobile && styles.frameMobile]}>
        <Image source={source} resizeMode="cover" style={styles.photo} accessible accessibilityRole="image" accessibilityLabel="Psicóloga de HERA trabajando con su portátil en un espacio luminoso con plantas" />
      </View>
      {!mobile && (
        <View testID="hero-directory-preview" style={[styles.directoryCard, { backgroundColor: theme.secondaryMuted }]}>
          <AnimatedPressable
            onPress={onExploreDirectory}
            href={Platform.OS === 'web' ? '/especialistas' : undefined}
            accessibilityRole="link"
            accessibilityLabel="Explorar el directorio"
            hoverLift={false}
            pressScale={1}
            style={styles.directoryLink}
          >
            <View style={styles.directoryCopy}>
              <Text style={[styles.directoryEyebrow, { color: theme.textSecondary, fontFamily: theme.fontSansBold }]}>DIRECTORIO HERA</Text>
              <Text style={[styles.directoryLinkText, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>Explorar profesionales</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={theme.primary} accessible={false} aria-hidden />
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: '100%', alignItems: 'center', paddingTop: 46, paddingBottom: 48 },
  sceneCompact: { paddingTop: 24, paddingBottom: 24 },
  sceneLandscape: { paddingTop: 32, paddingBottom: 30 },
  sceneMobile: { paddingTop: 12, paddingBottom: 10 },
  frame: { aspectRatio: 5 / 6, overflow: 'hidden', borderTopLeftRadius: 100, borderTopRightRadius: 32, borderBottomRightRadius: 110, borderBottomLeftRadius: 32 },
  frameLandscape: { aspectRatio: 3 / 2, borderTopLeftRadius: 70, borderBottomRightRadius: 80 },
  frameMobile: { borderTopLeftRadius: 48, borderTopRightRadius: 18, borderBottomRightRadius: 54, borderBottomLeftRadius: 18 },
  photo: { width: '100%', height: '100%' },
  branchLeft: { position: 'absolute', top: 2, left: -6, width: 100, height: 225, transform: [{ rotate: '-8deg' }], opacity: 0.6 },
  branchRight: { position: 'absolute', bottom: 24, right: 10, width: 80, height: 180, transform: [{ rotate: '34deg' }], opacity: 0.45 },
  branchMobile: { width: 60, height: 135 },
  directoryCard: { position: 'absolute', bottom: 0, right: 0, width: 236, borderRadius: 14 },
  directoryLink: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  directoryCopy: { flex: 1, gap: 4 },
  directoryEyebrow: { fontSize: 9, lineHeight: 13, letterSpacing: 1.2 },
  directoryLinkText: { fontSize: 14, lineHeight: 20 },
});
