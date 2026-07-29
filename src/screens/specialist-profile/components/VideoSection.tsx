import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Linking, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VideoSectionProps } from '../types';
import { spacing, borderRadius } from '../../../constants/colors';
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="videocam-outline" size={20} color={theme.textPrimary} />
        <Text style={styles.title}>{STRINGS.title}</Text>
      </View>

      <AnimatedPressable onPress={handlePress} style={styles.thumbnailTouch} hoverLift={false} pressScale={0.99} accessibilityRole="link">
        <View style={styles.thumbnailContainer}>
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
            <Text style={styles.bottomLabelSub}>{STRINGS.presentation}</Text>
            <Text style={styles.bottomLabelName}>Conoce a {specialistName}</Text>
          </View>
        </View>
      </AnimatedPressable>

      <View style={styles.browserHintRow}>
        <Ionicons name="open-outline" size={13} color={theme.textMuted} />
        <Text style={styles.browserHint}>{STRINGS.openBrowser}</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '600', color: theme.textPrimary },
  thumbnailTouch: { overflow: 'hidden' },
  thumbnailContainer: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  darkBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1A1A1A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  playIcon: { marginLeft: 4 },
  bottomLabel: { position: 'absolute', bottom: spacing.md, left: spacing.md, zIndex: 1 },
  bottomLabelName: { marginTop: 2, fontSize: 18, fontFamily: theme.fontHeading, color: '#FFFFFF' },
  bottomLabelSub: { fontSize: 10, fontFamily: theme.fontSansSemiBold, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.8 },
  browserHintRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  browserHint: { fontSize: 11, color: theme.textMuted, textAlign: 'center' },});

export default VideoSection;
