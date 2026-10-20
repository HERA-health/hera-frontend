import React, { useId, useRef } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient as CanvasGradient } from 'expo-linear-gradient';
import { AnimatedPressable, type AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import { useTheme } from '../../../contexts/ThemeContext';
import { HeroArtwork } from './HeroArtwork';
import { LANDING_SCROLL_CONTENT_TOP_PADDING } from '../types';

interface HeroSectionProps {
  onFindSpecialist: () => void;
  onExploreProfessionals: () => void;
  onProfessionalAction: () => void;
  professionalActionLabel: string;
  showScrollIndicator?: boolean;
  onScrollIndicatorPress?: () => void;
}

const PROOFS = [
  { icon: 'shield-checkmark-outline', label: 'Perfiles verificados' },
  { icon: 'videocam-outline', label: 'Online y presencial' },
  { icon: 'pricetag-outline', label: 'Precios visibles' },
] as const;

export function HeroSection({
  onFindSpecialist, onExploreProfessionals, onProfessionalAction,
  professionalActionLabel, showScrollIndicator = true, onScrollIndicatorPress,
}: HeroSectionProps) {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const discoveryRef = useRef<AnimatedPressableHandle>(null);
  const waveGradientId = `hero-wave-${useId().replace(/:/g, '')}`;
  const isDesktop = width >= 1100;
  const isMobile = width < 768;
  const compactDesktop = isDesktop && width < 1400;
  const shortDesktop = isDesktop && height < 900;
  const doors = [
    {
      title: 'Soy paciente', icon: 'person-outline' as const,
      description: 'Encuentra un profesional para ti y elige cómo empezar.',
      benefits: ['Perfiles verificados', 'Sesiones online y presenciales', 'Modalidades y tarifas visibles'],
      compactBenefits: 'Perfiles verificados · Online y presencial',
      label: 'Explorar profesionales', onPress: onFindSpecialist,
      background: theme.secondaryMuted, accent: theme.actionPrimary,
    },
    {
      title: 'Soy profesional', icon: 'briefcase-outline' as const,
      description: 'Organiza tu consulta y presenta tu trabajo en HERA.',
      benefits: ['Agenda y sesiones', 'Gestión de pacientes', 'Facturación'],
      compactBenefits: 'Agenda · Pacientes · Facturación',
      label: professionalActionLabel, onPress: onProfessionalAction,
      background: theme.primaryMuted, accent: theme.primary,
    },
  ];

  const proofs = (
    <View style={[styles.proofs, shortDesktop && styles.proofsShort, isMobile && styles.proofsMobile]}>
      {PROOFS.map(({ icon, label }) => (
        <View key={label} style={styles.proof}>
          <Ionicons name={icon} size={19} color={theme.textPrimary} />
          <Text style={[styles.proofText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const wave = (
    <View testID="hero-bottom-wave" pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={styles.wave}>
      <Svg width="100%" height="100%" viewBox="0 0 1440 110" preserveAspectRatio="none">
        <Defs>
          {/* Both waves fade into the shared section canvas, so their closing
              edges never form a horizontal seam when the hero scrolls away. */}
          <LinearGradient id={waveGradientId} x1={0} y1={0} x2={0} y2={110} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={theme.secondary} stopOpacity={1} />
            <Stop offset="35%" stopColor={theme.secondary} stopOpacity={0.9} />
            <Stop offset="70%" stopColor={theme.secondary} stopOpacity={0.35} />
            <Stop offset="92%" stopColor={theme.secondary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M0 20 C125 122 235 55 382 85 C485 108 535 114 610 110 L0 110 Z" fill={`url(#${waveGradientId})`} opacity={0.18} />
        <Path d="M1170 110 C1265 60 1360 42 1440 50 L1440 110 Z" fill={`url(#${waveGradientId})`} opacity={0.25} />
      </Svg>
    </View>
  );

  return (
    <View testID="landing-hero" style={[styles.container, { backgroundColor: theme.surfaceWarm }, isDesktop && { minHeight: Math.max(0, height - LANDING_SCROLL_CONTENT_TOP_PADDING), justifyContent: 'space-between' }, shortDesktop && styles.containerShort, isMobile && styles.containerMobile]}>
      <View style={[styles.content, isDesktop && styles.contentDesktop, shortDesktop && styles.contentShort]}>
        <View style={[styles.copy, isDesktop && styles.copyDesktop]}>
          <View style={[styles.eyebrowRow, (shortDesktop || isMobile) && styles.eyebrowRowShort]}>
            <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansBold }]}>PERSONAS, PROFESIONALES Y CLÍNICAS</Text>
            {!isMobile && <View style={[styles.eyebrowRule, { backgroundColor: theme.secondary }]} />}
          </View>
          <Text accessibilityRole="header" aria-level={1} style={[
            styles.title, compactDesktop && styles.titleCompactDesktop, shortDesktop && styles.titleShort,
            isMobile && styles.titleMobile, width < 380 && styles.titleSmall,
            { color: theme.textPrimary, fontFamily: theme.fontDisplay },
          ]}>
            Tu espacio de confianza para cuidar la salud mental.
          </Text>
          <Text style={[styles.subtitle, shortDesktop && styles.subtitleShort, isMobile && styles.subtitleMobile, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            Encuentra profesionales verificados para cuidar tu salud mental o gestiona tu consulta con agenda, pacientes y facturación. Todo en HERA.
          </Text>
          <View style={[styles.doors, isMobile && styles.doorsMobile]}>
            {doors.map((door, index) => (
              <View key={door.title} style={[styles.door, !isMobile && styles.doorColumn, shortDesktop && styles.doorShort, isMobile && styles.doorMobile, { backgroundColor: door.background }]}>
                <View style={[styles.doorHeading, (shortDesktop || isMobile) && styles.doorHeadingShort]}>
                  <View style={[styles.doorIcon, shortDesktop && styles.doorIconShort, { backgroundColor: index === 0 ? theme.secondaryAlpha12 : theme.primaryAlpha12 }]}>
                    <Ionicons name={door.icon} size={23} color={theme.textPrimary} />
                  </View>
                  <Text accessibilityRole="header" aria-level={2} style={[styles.doorTitle, shortDesktop && styles.doorTitleShort, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{door.title}</Text>
                </View>
                <Text style={[styles.doorDescription, shortDesktop && styles.doorDescriptionShort, isDesktop && width < 1200 && styles.doorDescriptionNarrow, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{door.description}</Text>
                <AnimatedPressable onPress={door.onPress} href={Platform.OS === 'web' && index === 0 ? '/especialistas' : undefined} accessibilityRole={index === 0 ? 'link' : 'button'} accessibilityLabel={door.label} hoverLift={false} pressScale={1} style={[styles.action, compactDesktop && styles.actionCompactDesktop, shortDesktop && styles.actionShort, { backgroundColor: door.accent }]}>
                  <Text style={[styles.actionText, shortDesktop && styles.actionTextShort, { color: theme.actionPrimaryText, fontFamily: theme.fontSansBold }]}>{door.label}</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.actionPrimaryText} />
                </AnimatedPressable>
                {isMobile ? (
                  <Text style={[styles.compactBenefits, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{door.compactBenefits}</Text>
                ) : (
                  <View style={[styles.benefits, shortDesktop && styles.benefitsShort]}>
                    {door.benefits.map(benefit => (
                      <View key={benefit} style={styles.benefit}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />
                        <Text style={[styles.benefitText, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {index === 1 && !isDesktop && (
                  <AnimatedPressable onPress={onExploreProfessionals} accessibilityRole="button" accessibilityLabel="Conocer las herramientas" hoverLift={false} pressScale={1} style={[styles.learnMore, shortDesktop && styles.learnMoreShort]}>
                    <Text style={[styles.learnMoreText, { color: theme.link, fontFamily: theme.fontSansBold }]}>Conocer las herramientas</Text>
                    <Ionicons name="arrow-down" size={14} color={theme.link} />
                  </AnimatedPressable>
                )}
              </View>
            ))}
          </View>
          {!isMobile && proofs}
        </View>
        <View style={[styles.visual, isDesktop && styles.visualDesktop]}>
          <HeroArtwork desktop={isDesktop} mobile={isMobile} compact={shortDesktop} onExploreDirectory={onFindSpecialist} onExploreProfessionals={onExploreProfessionals} />
        </View>
        {isMobile && proofs}
      </View>
      <View style={[styles.footer, shortDesktop && styles.footerShort, isMobile && styles.footerMobile]}>
        <CanvasGradient
          colors={[theme.surfaceWarm, theme.landingCanvas]}
          pointerEvents="none"
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        />
        {wave}
        {!isMobile && (
          // Keep its space when hidden: unmounting it changes the hero height and
          // makes browser scroll anchoring jump around the visibility threshold.
          <View
            testID="hero-discovery-indicator"
            pointerEvents={showScrollIndicator ? 'auto' : 'none'}
            aria-hidden={!showScrollIndicator}
            importantForAccessibility={showScrollIndicator ? 'auto' : 'no-hide-descendants'}
            style={!showScrollIndicator && styles.indicatorHidden}
          >
            <AnimatedPressable
              focusRef={discoveryRef}
              onPress={() => {
                // Hiding a focused web button during smooth scrolling can cancel
                // the browser's animation. Release focus before starting it.
                if (Platform.OS === 'web') discoveryRef.current?.blur();
                onScrollIndicatorPress?.();
              }}
              disabled={!showScrollIndicator}
              tabIndex={showScrollIndicator ? 0 : -1}
              hoverLift={false} pressScale={1} accessibilityRole="button"
              accessibilityLabel="Descubrir especialistas"
              style={[styles.scrollIndicator, shortDesktop && styles.scrollIndicatorShort]}
            >
              <Text style={[styles.scrollText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Descubre HERA</Text>
              <Ionicons name="chevron-down" size={18} color={theme.textPrimary} />
            </AnimatedPressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 36, paddingHorizontal: 40, overflow: 'hidden' },
  containerMobile: { paddingTop: 18, paddingHorizontal: 20 },
  containerShort: { paddingTop: 12 },
  footer: { marginHorizontal: -40, paddingBottom: 44 },
  footerShort: { paddingBottom: 6 },
  footerMobile: { marginHorizontal: -20, paddingBottom: 38 },
  content: { width: '100%', maxWidth: 1420, alignSelf: 'center', gap: 28 },
  contentDesktop: { flexDirection: 'row', alignItems: 'center', gap: 24, minHeight: 660 },
  contentShort: { minHeight: 0 },
  copy: { width: '100%' },
  copyDesktop: { flex: 0.46, minWidth: 0, zIndex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 1.15, flexShrink: 1 },
  eyebrowRule: { width: 50, height: 1, opacity: 0.7 },
  eyebrowRowShort: { marginBottom: 12 },
  title: { fontSize: 48, lineHeight: 58, letterSpacing: -1.3, marginBottom: 18 },
  titleCompactDesktop: { fontSize: 43, lineHeight: 53, letterSpacing: -1 },
  titleShort: { fontSize: 42, lineHeight: 51, marginBottom: 14 },
  titleMobile: { fontSize: 32, lineHeight: 40, letterSpacing: -0.7, marginBottom: 16 },
  titleSmall: { fontSize: 29, lineHeight: 37 },
  subtitle: { fontSize: 17, lineHeight: 25, maxWidth: 560, marginBottom: 24 },
  subtitleMobile: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
  subtitleShort: { fontSize: 17, lineHeight: 25, marginBottom: 18 },
  doors: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  doorsMobile: { flexDirection: 'column', gap: 12 },
  door: { minWidth: 0, padding: 18, borderRadius: 16 },
  doorColumn: { flex: 1 },
  doorMobile: { padding: 16, borderRadius: 16 },
  doorShort: { padding: 16 },
  doorHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  doorHeadingShort: { marginBottom: 8 },
  doorIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  doorIconShort: { width: 36, height: 36 },
  doorTitle: { fontSize: 20, lineHeight: 26, flexShrink: 1, letterSpacing: -0.5 },
  doorTitleShort: { fontSize: 19, lineHeight: 25 },
  doorDescription: { fontSize: 15, lineHeight: 22, marginBottom: 14, minHeight: 44 },
  doorDescriptionShort: { fontSize: 15, lineHeight: 21, minHeight: 42, marginBottom: 12 },
  doorDescriptionNarrow: { minHeight: 66 },
  action: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionCompactDesktop: { minHeight: 48 },
  actionShort: { minHeight: 44, paddingVertical: 10 },
  actionText: { fontSize: 14, lineHeight: 20, flexShrink: 1, textAlign: 'center' },
  actionTextShort: { fontSize: 14 },
  benefits: { gap: 7, marginTop: 14 },
  benefitsShort: { gap: 5, marginTop: 12 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  benefitText: { fontSize: 13, lineHeight: 19, flexShrink: 1 },
  compactBenefits: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  learnMore: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: -10, marginTop: 4 },
  learnMoreShort: { marginTop: 2, marginBottom: -6 },
  learnMoreText: { fontSize: 13, lineHeight: 18, flexShrink: 1, textAlign: 'center' },
  proofs: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 22 },
  proofsShort: { marginTop: 16 },
  proofsMobile: { marginTop: 0, gap: 14, justifyContent: 'center' },
  proof: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  proofText: { fontSize: 13, lineHeight: 19 },
  visual: { width: '100%', maxWidth: 780, alignSelf: 'center' },
  visualDesktop: { flex: 0.54, minWidth: 0 },
  wave: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 96 },
  scrollIndicator: { alignSelf: 'center', alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 12, marginTop: 15 },
  scrollIndicatorShort: { paddingVertical: 6, marginTop: 4 },
  indicatorHidden: { opacity: 0 },
  scrollText: { fontSize: 12, lineHeight: 18 },
});
