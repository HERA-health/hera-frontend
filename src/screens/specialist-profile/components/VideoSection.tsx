/**
 * VideoSection - Presentation video preview card
 * Shows real YouTube thumbnail; opens video URL in browser via Linking
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoSectionProps } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const pattern =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
};

const STRINGS = {
  title: 'Vídeo de presentación',
  presentation: 'Presentación',
  openBrowser: 'Se abrirá en tu navegador',
};

export const VideoSection: React.FC<VideoSectionProps> = ({
  presentationVideoUrl,
  specialistName,
  gradientColors,
}) => {
  const { width } = useWindowDimensions();
  const videoId = extractYouTubeId(presentationVideoUrl);
  const [thumbUrl, setThumbUrl] = useState(
    videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null
  );

  const handlePress = async (): Promise<void> => {
    try {
      const supported = await Linking.canOpenURL(presentationVideoUrl);
      if (supported) {
        await Linking.openURL(presentationVideoUrl);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('No se pudo abrir el vídeo:', error.message);
      }
    }
  };

  // 16:9 ratio based on available container width (accounting for card padding)
  const containerWidth = Math.min(width - spacing.xl * 2 - spacing.lg * 2, 600);
  const videoHeight = containerWidth * (9 / 16);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="videocam-outline" size={20} color={heraLanding.textPrimary} />
        <Text style={styles.title}>{STRINGS.title}</Text>
      </View>

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={styles.thumbnailTouch}
      >
        <View style={[styles.thumbnailContainer, { height: videoHeight }]}>
          {/* Dark base fallback */}
          <View style={styles.darkBase} />

          {/* Real YouTube thumbnail */}
          {thumbUrl && (
            <Image
              source={{ uri: thumbUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onError={() => {
                if (videoId) {
                  setThumbUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
                }
              }}
            />
          )}

          {/* Subtle dark overlay for contrast */}
          <View style={styles.overlay} />

          {/* Play button */}
          <View style={styles.playButton}>
            <Ionicons name="play" size={28} color="#fff" style={styles.playIcon} />
          </View>

          {/* Bottom label */}
          <View style={styles.bottomLabel}>
            <Text style={styles.bottomLabelName}>{specialistName}</Text>
            <Text style={styles.bottomLabelSub}>{STRINGS.presentation}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Text style={styles.browserHint}>{STRINGS.openBrowser}</Text>
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

  // Thumbnail
  thumbnailTouch: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A1A',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  // Play button
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  playIcon: {
    marginLeft: 4, // visual center offset for play triangle
  },

  // Bottom label
  bottomLabel: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    zIndex: 1,
  },
  bottomLabelName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  bottomLabelSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },

  // Hint
  browserHint: {
    fontSize: 11,
    color: heraLanding.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default VideoSection;
