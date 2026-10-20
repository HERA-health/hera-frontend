import React from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';

// Keep the complete scene and select an existing derivative for its rendered size.
const photos = Platform.OS === 'web' ? {
  small: require('../../../../assets/landing/psychologist-landscape-640.webp'),
  medium: require('../../../../assets/landing/psychologist-landscape-1024.webp'),
  large: require('../../../../assets/landing/psychologist-landscape-1536.webp'),
} : {
  small: require('../../../../assets/landing/psychologist-landscape-640.jpg'),
  medium: require('../../../../assets/landing/psychologist-landscape-1024.jpg'),
  large: require('../../../../assets/landing/psychologist-landscape-1536.jpg'),
};

const TOOLS = [
  { icon: 'calendar-outline', label: 'Agenda y sesiones' },
  { icon: 'people-outline', label: 'Gestión de pacientes' },
  { icon: 'receipt-outline', label: 'Facturación' },
  { icon: 'stats-chart-outline', label: 'Estadísticas' },
] as const;

const PHOTO_BASE_PATH = 'M0 32 C220 32 340 66 540 70 C740 74 880 50 1000 34 L1000 110 L0 110 Z';
// A narrow feather softens the curve without fading the objects in the scene.
const PHOTO_EDGE_LAYERS = [
  { offset: -12, opacity: 0.04 },
  { offset: -10, opacity: 0.1 },
  { offset: -8, opacity: 0.18 },
  { offset: -6, opacity: 0.3 },
  { offset: -4, opacity: 0.5 },
  { offset: -2, opacity: 0.75 },
  { offset: 0, opacity: 1 },
];

interface HeroArtworkProps {
  desktop: boolean;
  mobile: boolean;
  compact?: boolean;
  onExploreDirectory: () => void;
  onExploreProfessionals: () => void;
}

export function HeroArtwork({
  desktop, mobile, compact = false, onExploreDirectory, onExploreProfessionals,
}: HeroArtworkProps) {
  const { theme } = useTheme();
  const { width, height, scale } = useWindowDimensions();
  const sceneWidth = desktop
    ? (Math.min(width - 80, 1420) - 24) * 0.54
    : Math.min(width - (mobile ? 40 : 80), 780);
  const availableImageWidth = desktop ? sceneWidth + 260 : sceneWidth;
  const sceneHeight = desktop ? (compact ? Math.max(520, Math.min(630, height - 140)) : 680) : availableImageWidth * 2 / 3;
  // Fit the whole photograph in short windows so the header never clips its
  // fade. Keep the subject (two thirds across the photograph) in the same place.
  const imageWidth = Math.min(availableImageWidth, sceneHeight * 3 / 2);
  const imageHeight = imageWidth * 2 / 3;
  const imageLeft = desktop ? -280 + (availableImageWidth - imageWidth) * 2 / 3 : 0;
  const requiredPixels = imageWidth * scale;
  const source = requiredPixels <= 640 ? photos.small : requiredPixels <= 1024 ? photos.medium : photos.large;
  const clearCanvas = `${theme.surfaceWarm}00`;
  const textStyle = { color: theme.textPrimary, fontFamily: theme.fontSans };
  const strongTextStyle = { color: theme.textPrimary, fontFamily: theme.fontSansBold };
  const panelStyle = { backgroundColor: theme.bgCard, shadowColor: theme.shadowNeutral };

  return (
    <View style={[styles.scene, { height: sceneHeight }]}>
      <View
        style={[
          styles.photograph,
          { width: imageWidth, height: imageHeight, top: (sceneHeight - imageHeight) / 2, left: imageLeft },
        ]}
      >
        <Image
          source={source}
          resizeMode="cover"
          style={styles.photo}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Una mujer trabajando con su portátil en un espacio luminoso con plantas"
        />
        <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={styles.photoBlend}>
          {/* Blend primarily into the copy. The lower edge follows the room's
              composition instead of washing out the laptop and table. */}
          <LinearGradient
            colors={[theme.surfaceWarm, theme.surfaceWarm, `${theme.surfaceWarm}B3`, clearCanvas, clearCanvas, theme.surfaceWarm]}
            locations={desktop ? [0.01, 0.14, 0.25, 0.48, 0.88, 0.995] : [0.005, 0.01, 0.025, 0.07, 0.92, 0.995]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[theme.surfaceWarm, `${theme.surfaceWarm}F2`, `${theme.surfaceWarm}B3`, `${theme.surfaceWarm}52`, `${theme.surfaceWarm}14`, clearCanvas]}
            locations={[0, 0.025, 0.065, 0.12, 0.19, 0.26]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.photoBase}>
            <Svg width="100%" height="100%" viewBox="0 0 1000 100" preserveAspectRatio="none">
              {PHOTO_EDGE_LAYERS.map(({ offset, opacity }) => (
                <Path
                  key={offset}
                  d={PHOTO_BASE_PATH}
                  transform={`translate(0 ${offset})`}
                  fill={theme.surfaceWarm}
                  fillOpacity={opacity}
                />
              ))}
            </Svg>
          </View>
        </View>
      </View>

      {desktop && (
        <View style={[styles.panels, width < 1400 && styles.panelsCompact]}>
          <View testID="hero-specialist-preview" style={[styles.panel, styles.profile, panelStyle]}>
            <Text style={[styles.exampleLabel, { color: theme.primary, fontFamily: theme.fontSansBold }]}>Perfil de ejemplo</Text>
            <View style={styles.profileHeading}>
              <View style={[styles.avatar, { backgroundColor: theme.secondaryMuted }]} aria-hidden>
                <Text style={[styles.initials, strongTextStyle]}>LM</Text>
              </View>
              <View style={styles.profileCopy}>
                <Text style={[styles.profileName, strongTextStyle]}>Laura M.</Text>
                <Text style={[styles.profileRole, textStyle]}>Psicología sanitaria</Text>
              </View>
            </View>
            <View style={styles.tags}>
              {['Ansiedad', 'Autoestima'].map(label => (
                <View key={label} style={[styles.tag, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.tagText, textStyle]}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.exampleNote, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              Perfil ficticio, sin relación con la persona de la foto.
            </Text>
          </View>

          <AnimatedPressable
            onPress={onExploreDirectory}
            href={Platform.OS === 'web' ? '/especialistas' : undefined}
            accessibilityRole="link"
            accessibilityLabel="Encuentra tu sesión en el directorio"
            hoverLift={false}
            pressScale={1}
            style={[styles.panel, styles.booking, panelStyle]}
          >
            <Ionicons name="calendar-outline" size={22} color={theme.primary} />
            <View style={styles.bookingCopy}>
              <Text style={[styles.bookingTitle, strongTextStyle]}>Encuentra tu sesión</Text>
              <Text style={[styles.bookingSubtitle, textStyle]}>Online o presencial</Text>
            </View>
            <Ionicons name="arrow-forward" size={15} color={theme.primary} />
          </AnimatedPressable>

          <View style={[styles.tools, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.toolsTitle, strongTextStyle]}>Herramientas para profesionales</Text>
            <View style={styles.toolRows}>
              {TOOLS.map(({ icon, label }) => (
                <View key={label} style={styles.toolRow}>
                  <Ionicons name={icon} size={14} color={theme.textSecondary} />
                  <Text style={[styles.toolLabel, textStyle]}>{label}</Text>
                </View>
              ))}
            </View>
            <AnimatedPressable
              onPress={onExploreProfessionals}
              accessibilityRole="button"
              accessibilityLabel="Conocer las herramientas"
              hoverLift={false}
              pressScale={1}
              style={[styles.toolsLink, { borderTopColor: theme.borderLight }]}
            >
              <Text style={[styles.toolsLinkText, { color: theme.link, fontFamily: theme.fontSansBold }]}>Conocer las herramientas</Text>
              <Ionicons name="arrow-down" size={14} color={theme.link} />
            </AnimatedPressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: '100%', justifyContent: 'center' },
  photograph: { position: 'absolute', left: 0 },
  photo: { width: '100%', height: '100%' },
  // Cover fractional-pixel image edges too; otherwise web can expose a hairline.
  photoBlend: { position: 'absolute', top: -1, bottom: -1, left: -1, right: -1 },
  photoBase: { position: 'absolute', bottom: -1, left: 0, right: 0, height: '16%' },
  panels: { width: 224, alignSelf: 'flex-end', gap: 12 },
  panelsCompact: { width: 208 },
  panel: { borderRadius: 14, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 2 },
  profile: { padding: 16 },
  exampleLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, marginBottom: 10 },
  exampleNote: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  profileHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12, lineHeight: 18 },
  profileCopy: { flex: 1, gap: 2 },
  profileName: { fontSize: 14, lineHeight: 20 },
  profileRole: { fontSize: 12, lineHeight: 17 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 10, lineHeight: 15 },
  booking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 68 },
  bookingCopy: { flex: 1, gap: 2 },
  bookingTitle: { fontSize: 12, lineHeight: 17 },
  bookingSubtitle: { fontSize: 11, lineHeight: 16 },
  tools: { borderRadius: 14, paddingHorizontal: 16, paddingTop: 12 },
  toolsTitle: { fontSize: 12, lineHeight: 18 },
  toolRows: { gap: 8, marginVertical: 10 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  toolLabel: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
  toolsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 46, borderTopWidth: 1 },
  toolsLinkText: { fontSize: 11, lineHeight: 16, flexShrink: 1 },
});
