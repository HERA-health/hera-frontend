import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Linking, useWindowDimensions, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoSectionProps } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/common';

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const pattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
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
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const videoId = extractYouTubeId(presentationVideoUrl);
  const [thumbUrl, setThumbUrl] = useState(videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);

  const handlePress = async (): Promise<void> => {
    try {
      const supported = await Linking.canOpenURL(presentationVideoUrl);
      if (supported) await Linking.openURL(presentationVideoUrl);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('No se pudo abrir el vídeo:', error.message);
      }
    }
  };

  const containerWidth = Math.min(width - spacing.xl * 2 - spacing.lg * 2, 600);
  const videoHeight = containerWidth * (9 / 16);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="videocam-outline" size={20} color={theme.textPrimary} />
        <Text style={styles.title}>{STRINGS.title}</Text>
      </View>

      <AnimatedPressable onPress={handlePress} style={styles.thumbnailTouch} hoverLift={false} pressScale={0.99}>
        <View style={[styles.thumbnailContainer, { height: videoHeight }]}>
          <View style={styles.darkBase} />
          {thumbUrl && (
            <Image
              source={{ uri: thumbUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onError={() => {
                if (videoId) setThumbUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
              }}
            />
          )}
          <View style={styles.overlay} />
          <View style={styles.playButton}>
            <Ionicons name="play" size={28} color="#fff" style={styles.playIcon} />
          </View>
          <View style={styles.bottomLabel}>
            <Text style={styles.bottomLabelName}>{specialistName}</Text>
            <Text style={styles.bottomLabelSub}>{STRINGS.presentation}</Text>
          </View>
        </View>
      </AnimatedPressable>

      <Text style={styles.browserHint}>{STRINGS.openBrowser}</Text>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...shadows.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '600', color: theme.textPrimary },
  thumbnailTouch: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  thumbnailContainer: { width: '100%', borderRadius: borderRadius.lg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  darkBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1A1A1A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  playIcon: { marginLeft: 4 },
  bottomLabel: { position: 'absolute', bottom: spacing.md, left: spacing.md, zIndex: 1 },
  bottomLabelName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  bottomLabelSub: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  browserHint: { fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: spacing.sm },
});

export default VideoSection;
