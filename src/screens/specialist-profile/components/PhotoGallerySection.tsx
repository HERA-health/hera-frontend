/**
 * PhotoGallerySection - Modern carousel photo gallery
 * Main image with animated fade transition, thumbnail strip, dot indicators,
 * and fullscreen lightbox on tap.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
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
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Carousel fade
  const opacity = useSharedValue(1);
  // Lightbox fade
  const lightboxOpacity = useSharedValue(1);

  if (!photoGallery || photoGallery.length === 0) return null;

  const count = photoGallery.length;

  // ── Carousel helpers ──────────────────────────────────────────────────────

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

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // ── Lightbox helpers ──────────────────────────────────────────────────────

  const openLightbox = () => {
    setLightboxIndex(currentIndex);
    lightboxOpacity.value = 1;
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    // Sync carousel to wherever the user navigated in the lightbox
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

  const animatedLightboxStyle = useAnimatedStyle(() => ({
    opacity: lightboxOpacity.value,
  }));

  // ── Shared display values ─────────────────────────────────────────────────

  const carouselCounter = `${String(currentIndex + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
  const lightboxCounter = `${String(lightboxIndex + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;

  const dotCount = Math.min(count, MAX_DOTS);
  const activeDot =
    count <= MAX_DOTS
      ? currentIndex
      : Math.round((currentIndex / (count - 1)) * (MAX_DOTS - 1));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="images-outline" size={20} color={heraLanding.textPrimary} />
        <Text style={styles.title}>{STRINGS.title}</Text>
      </View>

      {/* Main Image Area */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={openLightbox}
        style={styles.mainImageWrapper}
      >
        <Animated.Image
          source={{ uri: photoGallery[currentIndex] }}
          style={[styles.mainImage, animatedImageStyle]}
          resizeMode="contain"
          accessibilityLabel={specialistName ? `${specialistName} — ${carouselCounter}` : carouselCounter}
        />

        {/* Counter badge */}
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{carouselCounter}</Text>
        </View>

        {/* Prev button — hidden on first image */}
        {count > 1 && currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={(e) => { e.stopPropagation?.(); goToPrev(); }}
            activeOpacity={0.7}
            accessibilityLabel={STRINGS.prevImage}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Next button — hidden on last image */}
        {count > 1 && currentIndex < count - 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={(e) => { e.stopPropagation?.(); goToNext(); }}
            activeOpacity={0.7}
            accessibilityLabel={STRINGS.nextImage}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Thumbnail Strip */}
      {count > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {photoGallery.map((url, index) => {
            const isActive = index === currentIndex;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => changeImage(index)}
                activeOpacity={0.8}
                style={[styles.thumbnailWrapper, isActive && styles.thumbnailWrapperActive]}
              >
                <Image
                  source={{ uri: url }}
                  style={[styles.thumbnail, { opacity: isActive ? 1 : 0.6 }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Dot Indicators */}
      {count > 1 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i === activeDot && styles.dotActive]} />
          ))}
        </View>
      )}

      {/* ── Fullscreen Lightbox ── */}
      <Modal
        visible={lightboxVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeLightbox}
        statusBarTranslucent
      >
        <View style={styles.lightboxContainer}>
          {/* Image */}
          <Animated.Image
            source={{ uri: photoGallery[lightboxIndex] }}
            style={[styles.lightboxImage, animatedLightboxStyle]}
            resizeMode="contain"
            accessibilityLabel={specialistName ? `${specialistName} — ${lightboxCounter}` : lightboxCounter}
          />

          {/* Close button */}
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={closeLightbox}
            activeOpacity={0.7}
            accessibilityLabel={STRINGS.closeGallery}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Counter */}
          <View style={styles.lightboxCounter}>
            <Text style={styles.counterText}>{lightboxCounter}</Text>
          </View>

          {/* Prev arrow */}
          {count > 1 && lightboxIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={lightboxPrev}
              activeOpacity={0.7}
              accessibilityLabel={STRINGS.prevImage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Next arrow */}
          {count > 1 && lightboxIndex < count - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={lightboxNext}
              activeOpacity={0.7}
              accessibilityLabel={STRINGS.nextImage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // Main image
  mainImageWrapper: {
    aspectRatio: 16 / 9,
    maxHeight: 280,
    width: '100%',
    backgroundColor: heraLanding.cardBg,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },

  // Counter badge (shared by carousel and lightbox)
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
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Nav buttons (shared by carousel and lightbox)
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: heraLanding.whiteAlpha30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: {
    left: spacing.sm,
  },
  navButtonRight: {
    right: spacing.sm,
  },

  // Thumbnail strip
  thumbnailRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  thumbnailWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailWrapperActive: {
    borderColor: heraLanding.primary,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },

  // Dot indicators
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
    backgroundColor: heraLanding.textMuted,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: heraLanding.primary,
  },

  // Lightbox
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    flex: 1,
    width: '100%',
  },
  lightboxClose: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: heraLanding.whiteAlpha30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
});

export default PhotoGallerySection;
