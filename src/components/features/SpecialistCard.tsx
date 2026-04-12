/**
 * SpecialistCard — HERA Design System v5.0
 *
 * Redesigned with:
 * - useTheme() for dark mode
 * - AnimatedPressable with hover lift + scale
 * - Affinity badge → SVG circular progress ring
 * - Top 3 gradient border via MaskedView + LinearGradient
 * - Fraunces for name/price
 * - GlassCard tags
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { GlassCard } from '../common/GlassCard';
import { Specialist } from '../../constants/types';
import { spacing } from '../../constants/colors';

interface SpecialistCardProps {
  specialist: Specialist;
  onPress: () => void;
  style?: any;
  position?: 1 | 2 | 3;
}

// ─── Affinity Ring (SVG) ─────────────────────────────────────────────────────

function AffinityRing({ pct, theme }: { pct: number; theme: any }) {
  const R = 20;
  const stroke = 3;
  const circumference = 2 * Math.PI * R;
  const progress = circumference - (pct / 100) * circumference;

  const ringColor =
    pct >= 80 ? theme.success :
    pct >= 60 ? theme.warningAmber :
    theme.secondary;

  return (
    <View style={styles.affinityRingWrapper}>
      <Svg width={50} height={50}>
        {/* Track */}
        <Circle
          cx={25}
          cy={25}
          r={R}
          stroke={theme.border}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={25}
          cy={25}
          r={R}
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90, 25, 25)`}
        />
      </Svg>
      <View style={styles.affinityLabel}>
        <Text style={[styles.affinityPct, { color: ringColor, fontFamily: theme.fontSansBold }]}>
          {pct}%
        </Text>
      </View>
    </View>
  );
}

// ─── Gradient border for top 3 ────────────────────────────────────────────────

function GradientBorderCard({ colors, children, style }: {
  colors: [string, string];
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <MaskedView
      maskElement={
        <View style={[style, styles.maskBase]}>
          {/* Outer mask = full card shape */}
        </View>
      }
      style={style}
    >
      {/* Gradient fill */}
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Inner white cutout */}
      <View style={styles.gradientBorderInner}>
        {children}
      </View>
    </MaskedView>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function SpecialistCard({ specialist, onPress, style, position }: SpecialistCardProps) {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;
  const { theme } = useTheme();

  const affinityPct = specialist.affinityPercentage ?? 0;

  const medalGradients: Record<number, [string, string]> = {
    1: theme.medals.gold,
    2: theme.medals.silver,
    3: theme.medals.bronze,
  };

  const cardContent = (
    <>
      {/* Medal badge */}
      {position && (
        <LinearGradient
          colors={medalGradients[position]}
          style={styles.medalBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.medalEmoji}>
            {position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
          </Text>
        </LinearGradient>
      )}

      {/* Main content */}
      <View style={[styles.mainContent, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
        {/* Left: Avatar + Info */}
        <View style={[styles.leftSection, { flexDirection: isWideScreen ? 'row' : 'column' }]}>
          <View style={styles.avatarContainer}>
            {specialist.avatar || specialist.user?.avatar ? (
              <Image
                source={{ uri: specialist.user?.avatar || specialist.avatar }}
                style={[styles.avatarImage, { borderColor: theme.primaryMuted }]}
              />
            ) : (
              <LinearGradient
                colors={[theme.primary, theme.secondary]}
                style={[styles.avatar]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.avatarText, { fontFamily: theme.fontSansBold }]}>
                  {specialist.initial}
                </Text>
              </LinearGradient>
            )}
            {specialist.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.primaryAlpha12, borderColor: theme.bgCard }]}>
                <Ionicons name="shield-checkmark" size={13} color={theme.primary} />
              </View>
            )}
          </View>

          <View style={[
            styles.infoSection,
            {
              marginLeft: isWideScreen ? spacing.md : 0,
              marginTop: isWideScreen ? 0 : spacing.md,
              flex: isWideScreen ? 1 : undefined,
            }
          ]}>
            <Text style={[styles.name, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]} numberOfLines={1}>
              {specialist.name}
            </Text>
            <Text style={[styles.specialization, { color: theme.textSecondary, fontFamily: theme.fontSans }]} numberOfLines={1}>
              {specialist.specialization}
            </Text>
            <View style={styles.ratingRow}>
              <View style={[styles.ratingPill, { backgroundColor: theme.starRating + '18' }]}>
                <Ionicons name="star" size={14} color={theme.starRating} />
                <Text style={[styles.ratingText, { color: theme.starRating, fontFamily: theme.fontSansBold }]}>
                  {specialist.rating}
                </Text>
              </View>
              <Text style={[styles.reviewCount, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                ({specialist.reviewCount} reseñas)
              </Text>
            </View>
          </View>
        </View>

        {/* Right: Affinity ring */}
        <View style={[
          styles.affinitySection,
          { marginTop: isWideScreen ? 0 : spacing.md, marginLeft: isWideScreen ? spacing.md : 0 }
        ]}>
          <AffinityRing pct={affinityPct} theme={theme} />
          <Text style={[styles.matchLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
            match
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]} numberOfLines={2}>
        {specialist.description}
      </Text>

      {/* Tags — GlassCard pills */}
      <View style={styles.tags}>
        {specialist.tags.slice(0, 3).map((tag, index) => (
          <GlassCard key={index} intensity={35} borderRadius={8} style={styles.tag}>
            <Text style={[styles.tagText, { color: theme.primaryDark, fontFamily: theme.fontSansSemiBold }]}>
              {tag}
            </Text>
          </GlassCard>
        ))}
        {specialist.tags.length > 3 && (
          <GlassCard intensity={35} borderRadius={8} style={styles.tag}>
            <Text style={[styles.tagText, { color: theme.primaryDark, fontFamily: theme.fontSansSemiBold }]}>
              +{specialist.tags.length - 3}
            </Text>
          </GlassCard>
        )}
      </View>

      {/* First visit badge */}
      {specialist.firstVisitFree && (
        <View style={[styles.firstVisitBadge, { backgroundColor: theme.secondaryAlpha12 }]}>
          <Ionicons name="gift-outline" size={13} color={theme.secondary} />
          <Text style={[styles.firstVisitText, { color: theme.secondaryDark, fontFamily: theme.fontSansSemiBold }]}>
            Primera visita gratuita
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
            €{specialist.pricePerSession}
          </Text>
          <Text style={[styles.priceLabel, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
            / sesión
          </Text>
        </View>

        <AnimatedPressable
          onPress={onPress}
          pressScale={0.95}
          hoverLift={false}
          style={[styles.ctaWrapper, { overflow: 'hidden' }]}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaText, { fontFamily: theme.fontSansBold }]}>Ver Perfil</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      pressScale={0.98}
      hoverLift={true}
      style={[
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderColor: position ? medalGradients[position]?.[0] + '30' : theme.border,
          borderWidth: position ? 1.5 : 1,
          shadowColor: theme.shadowCard,
        },
        style,
      ]}
    >
      {cardContent}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    position: 'relative',
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  maskBase: {
    borderRadius: 18,
  },
  gradientBorderInner: {
    margin: 1.5,
    borderRadius: 17,
    overflow: 'hidden',
  },

  // Medal
  medalBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  medalEmoji: {
    fontSize: 20,
  },

  // Main content
  mainContent: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },

  // Avatar
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  // Info
  infoSection: { justifyContent: 'center' },
  name: { fontSize: 18, marginBottom: 2 },
  specialization: { fontSize: 14, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: { fontSize: 13 },
  reviewCount: { fontSize: 12 },

  // Affinity ring
  affinitySection: {
    alignItems: 'center',
  },
  affinityRingWrapper: {
    width: 50,
    height: 50,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinityLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinityPct: { fontSize: 11 },
  matchLabel: { fontSize: 11, marginTop: 2 },

  // Description
  description: { fontSize: 14, lineHeight: 20, marginBottom: spacing.md },

  // Tags
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  tag: { paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12 },

  // First visit
  firstVisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    gap: 4,
  },
  firstVisitText: { fontSize: 12 },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  price: { fontSize: 26 },
  priceLabel: { fontSize: 12 },
  ctaWrapper: {
    borderRadius: 12,
    shadowColor: 'rgba(139, 157, 131, 0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 5,
  },
  ctaText: { fontSize: 14, color: '#FFFFFF' },
});
