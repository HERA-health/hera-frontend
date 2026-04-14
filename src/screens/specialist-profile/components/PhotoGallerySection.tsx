/**
 * PhotoGallerySection - Modern carousel photo gallery
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PhotoGallerySectionProps } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/common';

const STRINGS = {
  title: 'Galería',
  prevImage: 'Imagen anterior',
  nextImage: 'Imagen siguiente',
  closeGallery: 'Cerrar galería',
};

const MAX_DOTS = 5;
const THUMBNAIL_SIZE = 64;
const FADE_DURATION = 150;

export const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({
  photoGallery,
  specialistName,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const opacity = useSharedValue(1);
  const lightboxOpacity = useSharedValue(1);

  if (!photoGallery?.length) return null;

  const count = photoGallery.length;

  const changeImage = (newIndex: number) => {
    if (newIndex === currentIndex) return;
    opacity.value = withTiming(0, { duration: FADE_DURATION }, () => {
      runOnJS(setCurrentIndex)(newIndex);
      opacity.value = withTiming(1, { duration: FADE_DURATION });
    });
  };

  const goToPrev = () => {
    if (currentIndex > 0) changeImage(currentIndex - 1);
  };

  const goToNext = () => {
    if (currentIndex < count - 1) changeImage(currentIndex + 1);
  };

  const openLightbox = () => {
    setLightboxIndex(currentIndex);
    lightboxOpacity.value = 1;
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setCurrentIndex(lightboxIndex);
    setLightboxVisible(false);
  };

  const lightboxPrev = () => {
    if (lightboxIndex > 0) {
      lightboxOpacity.value = withTiming(0, { duration: FADE_DURATION }, () => {
        runOnJS(setLightboxIndex)(lightboxIndex - 1);
        lightboxOpacity.value = withTiming(1, { duration: FADE_DURATION });
      });
    }
  };

  const lightboxNext = () => {
    if (lightboxIndex < count - 1) {
      lightboxOpacity.value = withTiming(0, { duration: FADE_DURATION }, () => {
        runOnJS(setLightboxIndex)(lightboxIndex + 1);
        lightboxOpacity.value = withTiming(1, { duration: FADE_DURATION });
      });
    }
  };

  const animatedImageStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const animatedLightboxStyle = useAnimatedStyle(() => ({ opacity: lightboxOpacity.value }));

  const carouselCounter = `${String(currentIndex + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
  const lightboxCounter = `${String(lightboxIndex + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;

  const dotCount = Math.min(count, MAX_DOTS);
  const activeDot = count <= MAX_DOTS ? currentIndex : Math.round((currentIndex / (count - 1)) * (MAX_DOTS - 1));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="images-outline" size={20} color={theme.textPrimary} />
        <Text style={styles.title}>{STRINGS.title}</Text>
      </View>

      <AnimatedPressable onPress={openLightbox} style={styles.mainImageWrapper} hoverLift={false} pressScale={0.995}>
        <Animated.Image
          source={{ uri: photoGallery[currentIndex] }}
          style={[styles.mainImage, animatedImageStyle]}
          resizeMode="contain"
          accessibilityLabel={specialistName ? `${specialistName} - ${carouselCounter}` : carouselCounter}
        />

        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{carouselCounter}</Text>
        </View>

        {count > 1 && currentIndex > 0 && (
          <AnimatedPressable
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={goToPrev}
            hoverLift={false}
            pressScale={0.96}
            accessibilityLabel={STRINGS.prevImage}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </AnimatedPressable>
        )}

        {count > 1 && currentIndex < count - 1 && (
          <AnimatedPressable
            style={[styles.navButton, styles.navButtonRight]}
            onPress={goToNext}
            hoverLift={false}
            pressScale={0.96}
            accessibilityLabel={STRINGS.nextImage}
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </AnimatedPressable>
        )}
      </AnimatedPressable>

      {count > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
          {photoGallery.map((url, index) => {
            const isActive = index === currentIndex;
            return (
              <AnimatedPressable
                key={`${url}-${index}`}
                onPress={() => changeImage(index)}
                hoverLift={false}
                pressScale={0.97}
                style={isActive ? [styles.thumbnailWrapper, styles.thumbnailWrapperActive] : styles.thumbnailWrapper}
              >
                <Image source={{ uri: url }} style={[styles.thumbnail, { opacity: isActive ? 1 : 0.68 }]} resizeMode="cover" />
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}

      {count > 1 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i === activeDot && styles.dotActive]} />
          ))}
        </View>
      )}

      <Modal visible={lightboxVisible} transparent={false} animationType="fade" onRequestClose={closeLightbox} statusBarTranslucent>
        <View style={styles.lightboxContainer}>
          <Animated.Image
            source={{ uri: photoGallery[lightboxIndex] }}
            style={[styles.lightboxImage, animatedLightboxStyle]}
            resizeMode="contain"
            accessibilityLabel={specialistName ? `${specialistName} - ${lightboxCounter}` : lightboxCounter}
          />

          <AnimatedPressable
            style={styles.lightboxClose}
            onPress={closeLightbox}
            hoverLift={false}
            pressScale={0.96}
            accessibilityLabel={STRINGS.closeGallery}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </AnimatedPressable>

          <View style={styles.lightboxCounter}>
            <Text style={styles.counterText}>{lightboxCounter}</Text>
          </View>

          {count > 1 && lightboxIndex > 0 && (
            <AnimatedPressable
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={lightboxPrev}
              hoverLift={false}
              pressScale={0.96}
              accessibilityLabel={STRINGS.prevImage}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </AnimatedPressable>
          )}

          {count > 1 && lightboxIndex < count - 1 && (
            <AnimatedPressable
              style={[styles.navButton, styles.navButtonRight]}
              onPress={lightboxNext}
              hoverLift={false}
              pressScale={0.96}
              accessibilityLabel={STRINGS.nextImage}
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </AnimatedPressable>
          )}
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  mainImageWrapper: {
    aspectRatio: 16 / 9,
    maxHeight: 280,
    width: '100%',
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  counterBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 20, 20, 0.36)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: { left: spacing.sm },
  navButtonRight: { right: spacing.sm },
  thumbnailRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  thumbnailWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
  },
  thumbnailWrapperActive: {
    borderColor: theme.primary,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.textMuted,
    opacity: 0.45,
  },
  dotActive: {
    width: 22,
    backgroundColor: theme.primary,
    opacity: 1,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: isDark ? '#0B0F0B' : '#101410',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxClose: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
});

export default PhotoGallerySection;
