import React, { useEffect, useRef } from 'react';
import {
  Animated as RNAnimated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AmbientBackground } from '../../../components/common/AmbientBackground';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { MotionView } from '../../../components/common/MotionView';
import { useTheme } from '../../../contexts/ThemeContext';

interface HeroSectionProps {
  onFindSpecialist: () => void;
  onExploreProfessionals: () => void;
  showScrollIndicator?: boolean;
  onScrollIndicatorPress?: () => void;
}

const HERO_PROOFS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Perfiles verificados' },
  { icon: 'videocam-outline' as const, label: 'Online y presencial' },
  { icon: 'pricetag-outline' as const, label: 'Precios visibles' },
];

const HERO_IMAGE = require('../../../../assets/psicologo_stock_fondo_optimized.jpg');

export const HeroSection: React.FC<HeroSectionProps> = ({
  onFindSpecialist,
  onExploreProfessionals,
  showScrollIndicator = true,
  onScrollIndicatorPress,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 1100;
  const isMobile = width < 768;
  const isCompactMobile = width < 410;
  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      bounceAnim.setValue(0);
      return undefined;
    }

    const bounceAnimation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, [bounceAnim]);

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 7],
  });

  return (
    <View
      style={[
        styles.container,
        isDesktop && styles.containerDesktop,
        isMobile && styles.containerMobile,
      ]}
    >
      <AmbientBackground variant="landing" />

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <View style={[styles.copyColumn, isDesktop && styles.copyColumnDesktop]}>
          <MotionView entering="fadeInUp" delay={0}>
            <View
              style={[
                styles.eyebrowPill,
                {
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.eyebrowMark, { backgroundColor: theme.primary }]} />
              <Text
                style={[
                  styles.eyebrow,
                  { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                PERSONAS Y PROFESIONALES, EN UN MISMO LUGAR
              </Text>
            </View>
          </MotionView>

          <MotionView entering="fadeInUp" delay={90}>
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel="Encuentra apoyo para cuidar tu salud mental. Gestiona tu consulta con sencillez."
              style={[styles.titleGroup, isMobile && styles.titleGroupMobile]}
            >
              <Text
                style={[
                  styles.title,
                  isDesktop && styles.titleDesktop,
                  isMobile && styles.titleMobile,
                  isCompactMobile && styles.titleCompactMobile,
                  { color: theme.textPrimary, fontFamily: theme.fontDisplay },
                ]}
              >
                Encuentra apoyo para cuidar tu salud mental.
              </Text>
              <View
                testID="hero-journey-divider"
                style={[
                  styles.titleDivider,
                  { backgroundColor: theme.borderStrong },
                ]}
              />
              <Text
                style={[
                  styles.title,
                  isDesktop && styles.titleDesktop,
                  isMobile && styles.titleMobile,
                  isCompactMobile && styles.titleCompactMobile,
                  {
                    color: isDark ? theme.link : theme.primary,
                    fontFamily: theme.fontDisplay,
                  },
                ]}
              >
                Gestiona tu consulta con sencillez.
              </Text>
            </View>
          </MotionView>

          <MotionView entering="fadeInUp" delay={170}>
            <Text
              style={[
                styles.subtitle,
                isDesktop && styles.subtitleDesktop,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              HERA conecta a quienes quieren cuidar su salud mental con profesionales
              verificados y reúne perfil público, agenda, pacientes, sesiones y
              facturación en una experiencia clara y privada.
            </Text>
          </MotionView>

          <MotionView
            entering="fadeInUp"
            delay={250}
            style={[styles.actions, ...(isMobile ? [styles.actionsMobile] : [])]}
          >
            <AnimatedPressable
              onPress={onFindSpecialist}
              pressScale={0.97}
              hoverLift
              accessibilityRole="link"
              accessibilityLabel="Explorar profesionales"
              style={[
                styles.primaryAction,
                isMobile && styles.actionMobile,
                {
                  backgroundColor: theme.actionPrimary,
                  shadowColor: theme.shadowSecondary,
                },
              ]}
            >
              <Ionicons name="search-outline" size={19} color={theme.actionPrimaryText} />
              <Text
                style={[
                  styles.primaryActionText,
                  { color: theme.actionPrimaryText, fontFamily: theme.fontSansBold },
                ]}
              >
                Explorar profesionales
              </Text>
              <Ionicons name="arrow-forward" size={18} color={theme.actionPrimaryText} />
            </AnimatedPressable>

            <AnimatedPressable
              onPress={onExploreProfessionals}
              pressScale={0.97}
              hoverLift={false}
              accessibilityRole="link"
              accessibilityLabel="Descubrir HERA para profesionales"
              style={[
                styles.secondaryAction,
                isMobile && styles.actionMobile,
                { backgroundColor: theme.bgElevated, borderColor: theme.borderStrong },
              ]}
            >
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: theme.primary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                HERA para profesionales
              </Text>
              <Ionicons name="arrow-down" size={18} color={theme.primary} />
            </AnimatedPressable>
          </MotionView>

          <MotionView entering="fadeIn" delay={330}>
            <View style={styles.proofs}>
              {HERO_PROOFS.map((proof) => (
                <View key={proof.label} style={styles.proofItem}>
                  <Ionicons name={proof.icon} size={16} color={theme.primary} />
                  <Text
                    style={[
                      styles.proofText,
                      { color: theme.textSecondary, fontFamily: theme.fontSansMedium },
                    ]}
                  >
                    {proof.label}
                  </Text>
                </View>
              ))}
            </View>
          </MotionView>
        </View>

        <MotionView
          entering="fadeIn"
          delay={130}
          duration={650}
          style={[
            styles.visualColumn,
            ...(isDesktop ? [styles.visualColumnDesktop] : []),
          ]}
        >
          <View
            style={[
              styles.imageFrame,
              {
                backgroundColor: theme.bgCard,
                borderColor: isDark ? theme.borderStrong : theme.borderLight,
                shadowColor: isDark ? theme.shadowStrong : theme.shadowSecondary,
              },
            ]}
          >
            <Image
              source={HERO_IMAGE}
              resizeMode="cover"
              style={styles.image}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Profesional de salud mental tomando notas durante una sesión"
            />
            <View style={[styles.imageCaption, { backgroundColor: theme.glassBg }]}>
              <Ionicons name="heart-outline" size={16} color={theme.primary} />
              <Text
                style={[
                  styles.imageCaptionText,
                  { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                ]}
              >
                Un lugar para encontrar apoyo y cuidar cada consulta.
              </Text>
            </View>
          </View>
        </MotionView>
      </View>

      {showScrollIndicator && !isMobile ? (
        <AnimatedPressable
          onPress={onScrollIndicatorPress}
          hoverLift={false}
          pressScale={0.92}
          accessibilityRole="button"
          accessibilityLabel="Descubrir especialistas"
          style={styles.scrollIndicatorContainer}
        >
          <RNAnimated.View
            style={[styles.scrollIndicator, { transform: [{ translateY: bounceTranslate }] }]}
          >
            <Text
              style={[
                styles.scrollIndicatorText,
                { color: theme.textMuted, fontFamily: theme.fontSans },
              ]}
            >
              Descubre HERA
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.primary} />
          </RNAnimated.View>
        </AnimatedPressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 42,
    paddingBottom: 44,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  containerDesktop: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 60,
  },
  containerMobile: {
    paddingTop: 34,
    paddingBottom: 30,
    paddingHorizontal: 18,
  },
  content: {
    width: '100%',
    maxWidth: 1420,
    alignSelf: 'center',
    gap: 38,
  },
  contentDesktop: {
    minHeight: 620,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 60,
  },
  copyColumn: {
    width: '100%',
    maxWidth: 820,
  },
  copyColumnDesktop: {
    flex: 0.52,
    transform: [{ translateY: -10 }],
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    gap: 8,
    marginBottom: 24,
  },
  eyebrowMark: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 50,
    lineHeight: 59,
    letterSpacing: -0.4,
    maxWidth: 800,
  },
  titleGroup: {
    marginBottom: 22,
    maxWidth: 800,
  },
  titleGroupMobile: {
    width: '100%',
  },
  titleDivider: {
    width: 74,
    height: 1,
    marginVertical: 11,
    opacity: 0.72,
  },
  titleDesktop: {
    fontSize: 58,
    lineHeight: 67,
  },
  titleMobile: {
    fontSize: 41,
    lineHeight: 48,
  },
  titleCompactMobile: {
    fontSize: 37,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 720,
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 30,
  },
  subtitleDesktop: {
    fontSize: 18,
    lineHeight: 29,
    maxWidth: 660,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 26,
  },
  actionsMobile: {
    flexDirection: 'column',
  },
  primaryAction: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 9,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  secondaryAction: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
  },
  actionMobile: {
    width: '100%',
  },
  primaryActionText: {
    fontSize: 16,
  },
  secondaryActionText: {
    fontSize: 15,
  },
  proofs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  proofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proofText: {
    fontSize: 13,
  },
  visualColumn: {
    width: '100%',
    alignSelf: 'center',
  },
  visualColumnDesktop: {
    flex: 0.48,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 28,
    borderWidth: 1,
    padding: 8,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 1,
    shadowRadius: 42,
    elevation: 9,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  imageCaption: {
    position: 'absolute',
    left: 26,
    right: 26,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    gap: 8,
  },
  imageCaptionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  scrollIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 26,
    paddingBottom: 6,
  },
  scrollIndicator: {
    alignItems: 'center',
    gap: 3,
  },
  scrollIndicatorText: {
    fontSize: 13,
  },
});
