/**
 * PhotoGallerySection - Horizontal scrolling photo gallery
 * with fullscreen modal viewer and navigation arrows
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoGallerySectionProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const STRINGS = {
  title: 'Galería',
  close: 'Cerrar',
};

export const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({
  photoGallery,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (photoGallery.length === 0) return null;

  const openPhoto = (index: number) => {
    setActiveIndex(index);
    setModalVisible(true);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : photoGallery.length - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev < photoGallery.length - 1 ? prev + 1 : 0));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="images-outline" size={20} color={heraLanding.textPrimary} />
        <Text style={styles.title}>{STRINGS.title}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {photoGallery.map((url, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => openPhoto(index)}
            activeOpacity={0.8}
            style={styles.photoTouchable}
          >
            <Image
              source={{ uri: url }}
              style={index === 0 ? styles.firstPhoto : styles.photo}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Fullscreen Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Image */}
          <Image
            source={{ uri: photoGallery[activeIndex] }}
            style={styles.modalImage}
            resizeMode="contain"
          />

          {/* Navigation arrows */}
          {photoGallery.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={goToPrev}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={goToNext}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}

          {/* Counter */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {photoGallery.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // Scroll
  scrollContent: {
    gap: 10,
  },
  photoTouchable: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  firstPhoto: {
    width: 220,
    height: 150,
    borderRadius: 10,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },

  // Nav arrows
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
    zIndex: 10,
  },
  navArrowLeft: {
    left: spacing.md,
  },
  navArrowRight: {
    right: spacing.md,
  },

  // Counter
  counterPill: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  counterText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default PhotoGallerySection;
